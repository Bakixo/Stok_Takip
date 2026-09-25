/**
 * Worker'ın tek bir kontrol turu.
 *
 * Akış:
 *   1. Aktif takipleri al, productId'ye göre grupla (aynı ürün için tek istek).
 *   2. Her ürün için canlı stoğu sorgula.
 *   3. Takip edilen beden stoğa girdiyse mail at ve takibi FOUND yap.
 *   4. Zara engel döndürürse turu hemen bitir; bir sonraki tur tekrar dener.
 */
import { prisma } from "@/lib/db";
import { getAvailability } from "@/lib/zara/client";
import { ZaraError } from "@/lib/zara/http";
import { isPurchasable, type Availability } from "@/lib/zara/types";
import { sendStockAlert } from "@/lib/mail/notifications";

export interface RunSummary {
  productCount: number;
  foundCount: number;
  errorCount: number;
  /** Tur tamamen başarısız olduysa sebebi (ör. bot engeli). */
  failureReason?: string;
  /** Süre dolduğu için kontrol edilemeyen ürün sayısı. */
  skippedCount?: number;
}

export interface CycleOptions {
  /**
   * Turun kullanabileceği en uzun süre (ms).
   *
   * Serverless ortamda (Vercel) fonksiyonun sert bir zaman sınırı var;
   * süre dolmadan durup kalanları bir sonraki tura bırakıyoruz. Takipler
   * en eski kontrolden başlayarak sıralandığı için hiçbiri aç kalmıyor.
   * Verilmezse sınır yok (kendi sunucunda çalışan worker böyle kullanır).
   */
  budgetMs?: number;
}

export async function runCheckCycle(options: CycleOptions = {}): Promise<RunSummary> {
  const startedAt = new Date();
  const deadline = options.budgetMs ? Date.now() + options.budgetMs : Infinity;
  const run = await prisma.workerRun.create({ data: { startedAt } });

  const summary: RunSummary = { productCount: 0, foundCount: 0, errorCount: 0 };

  try {
    const watches = await prisma.watch.findMany({
      where: { status: "ACTIVE" },
      // En uzun süredir kontrol edilmeyen önce gelsin: süre dolup tur
      // yarıda kesilse bile sıra herkese geliyor.
      orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    });

    if (watches.length === 0) {
      console.log("[worker] aktif takip yok");
      return summary;
    }

    // Dedupe: aynı renk varyantını birden çok kişi izliyorsa tek istek yeter.
    const byProduct = new Map<string, typeof watches>();
    for (const w of watches) {
      const list = byProduct.get(w.productId);
      if (list) list.push(w);
      else byProduct.set(w.productId, [w]);
    }

    console.log(
      `[worker] ${watches.length} takip, ${byProduct.size} benzersiz ürün sorgulanacak`,
    );

    let skipped = 0;
    for (const [productId, group] of byProduct) {
      // Zara isteği arası bekleme ~2-8 sn; bir istek daha sığmayacaksa dur.
      if (Date.now() + 10_000 > deadline) {
        skipped = byProduct.size - summary.productCount;
        console.log(`[worker] süre doldu, ${skipped} ürün sonraki tura bırakıldı`);
        break;
      }

      summary.productCount++;
      const checkedAt = new Date();

      let availability: Map<string, Availability>;
      try {
        availability = await getAvailability(productId);
      } catch (err) {
        summary.errorCount++;
        const message = err instanceof Error ? err.message : String(err);

        await prisma.$transaction([
          prisma.checkLog.createMany({
            data: group.map((w) => ({ watchId: w.id, checkedAt, result: "error", error: message })),
          }),
          prisma.watch.updateMany({
            where: { id: { in: group.map((w) => w.id) } },
            data: { lastCheckedAt: checkedAt },
          }),
        ]);

        // Bot engeli bütün turu etkiler; devam etmek durumu kötüleştirir.
        if (err instanceof ZaraError && err.isBlocked) {
          summary.failureReason = `Zara isteği engelledi: ${message}`;
          console.error(`[worker] ENGEL — tur durduruluyor: ${message}`);
          break;
        }
        console.warn(`[worker] ürün ${productId} kontrol edilemedi: ${message}`);
        continue;
      }

      // Bu ürünü izleyen her takibi tek tek değerlendir.
      for (const watch of group) {
        const state = availability.get(watch.skuId) ?? "out_of_stock";
        const inStock = isPurchasable(state);

        await prisma.checkLog.create({
          data: { watchId: watch.id, checkedAt, result: state },
        });

        if (!inStock) {
          await prisma.watch.update({
            where: { id: watch.id },
            data: { lastCheckedAt: checkedAt },
          });
          continue;
        }

        // Stok bulundu — mail at, takibi kapat.
        // `state` bu noktada in_stock ya da low_on_stock (isPurchasable geçti).
        const sent = await sendStockAlert(watch, state as "in_stock" | "low_on_stock");
        if (sent) {
          summary.foundCount++;
          await prisma.watch.update({
            where: { id: watch.id },
            data: {
              status: "FOUND",
              foundAt: checkedAt,
              foundState: state,
              lastCheckedAt: checkedAt,
            },
          });
          console.log(`[worker] ✓ ${watch.productName} (${watch.size}) → ${watch.email}`);
        } else {
          // Mail gitmediyse takip açık kalsın; bir sonraki turda tekrar denenir.
          summary.errorCount++;
          await prisma.watch.update({
            where: { id: watch.id },
            data: { lastCheckedAt: checkedAt },
          });
          console.error(`[worker] mail gönderilemedi: ${watch.id}`);
        }
      }
    }

    if (skipped > 0) summary.skippedCount = skipped;
    return summary;
  } finally {
    await prisma.workerRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        productCount: summary.productCount,
        foundCount: summary.foundCount,
        errorCount: summary.errorCount,
        failureReason: summary.failureReason ?? null,
      },
    });
  }
}
