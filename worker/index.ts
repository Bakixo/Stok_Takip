/**
 * Stokta worker'ı.
 *
 *   npm run worker        → cron ile sürekli çalışır
 *   npm run worker:once   → tek tur çalışıp çıkar (test için)
 *
 * Web uygulamasıyla aynı `lib/zara` istemcisini kullanır; böylece hız sınırı
 * ve engel tespiti tek yerden yönetilir.
 */
import "@/lib/load-env";
import cron from "node-cron";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { runCheckCycle } from "./check";
import { sendAdminAlert, sendRenewalReminders } from "./maintenance";

/** Art arda kaç tur başarısız olursa admin'e uyarı gider. */
const FAILURE_THRESHOLD = 5;

let consecutiveFailures = 0;
let alertSent = false;
let running = false;

async function tick(): Promise<void> {
  // Bir tur uzun sürerse bir sonraki cron tetiklemesi üstüne binmesin.
  if (running) {
    console.warn("[worker] önceki tur hâlâ sürüyor, bu tetikleme atlandı");
    return;
  }
  running = true;
  const started = Date.now();

  try {
    const summary = await runCheckCycle();
    const seconds = ((Date.now() - started) / 1000).toFixed(1);

    if (summary.failureReason) {
      consecutiveFailures++;
      console.error(
        `[worker] tur başarısız (${consecutiveFailures}/${FAILURE_THRESHOLD}): ${summary.failureReason}`,
      );

      if (consecutiveFailures >= FAILURE_THRESHOLD && !alertSent) {
        await sendAdminAlert(consecutiveFailures, summary.failureReason);
        alertSent = true;
      }
    } else {
      if (consecutiveFailures > 0) {
        console.log(`[worker] tur düzeldi (${consecutiveFailures} başarısız turdan sonra)`);
      }
      consecutiveFailures = 0;
      alertSent = false;
      console.log(
        `[worker] tur tamam — ${summary.productCount} ürün, ${summary.foundCount} bulundu, ` +
          `${summary.errorCount} hata, ${seconds} sn`,
      );
    }
  } catch (err) {
    consecutiveFailures++;
    console.error("[worker] beklenmeyen hata:", err);
  } finally {
    running = false;
  }
}

async function main(): Promise<void> {
  const once = process.argv.includes("--once");
  const e = env();

  if (once) {
    console.log("[worker] tek tur çalıştırılıyor...");
    await tick();
    await sendRenewalReminders();
    await prisma.$disconnect();
    return;
  }

  if (!cron.validate(e.CRON_SCHEDULE)) {
    throw new Error(`CRON_SCHEDULE geçersiz: "${e.CRON_SCHEDULE}"`);
  }

  console.log(`[worker] başladı — zamanlama: ${e.CRON_SCHEDULE} (Europe/Istanbul)`);
  cron.schedule(e.CRON_SCHEDULE, tick, { timezone: "Europe/Istanbul" });

  // Günde bir kez: 30 günü geçen takipler için "hâlâ takip edeyim mi?" maili.
  cron.schedule("0 11 * * *", sendRenewalReminders, { timezone: "Europe/Istanbul" });

  // İlk turu hemen çalıştır; 15 dakika bekletme.
  void tick();
}

/** Kapanışta veritabanı bağlantısını düzgün bırak. */
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`\n[worker] ${signal} alındı, kapanıyor...`);
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

main().catch(async (err) => {
  console.error("[worker] başlatılamadı:", err);
  await prisma.$disconnect();
  process.exit(1);
});
