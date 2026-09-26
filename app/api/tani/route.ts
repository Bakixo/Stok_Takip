/**
 * Teşhis ucu: sunucunun Zara'ya erişip erişemediğini ham hâliyle raporlar.
 *
 *   GET /api/tani?key=<CRON_SECRET>
 *
 * Uygulama "Zara cevap vermiyor" dediğinde sebebin ne olduğunu
 * (engel mi, ağ hatası mı, başka bir şey mi) buradan görüyoruz.
 * Kalıcı bir uç; barındırma değişirse tekrar işe yarar.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided =
    (header.startsWith("Bearer ") ? header.slice(7).trim() : "") ||
    (new URL(request.url).searchParams.get("key")?.trim() ?? "");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tek bir Zara isteği atar ve ham sonucu özetler. */
async function probe(label: string, url: string) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "tr-TR,tr;q=0.9",
        Referer: "https://www.zara.com/tr/tr/",
      },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    const head = text.slice(0, 300);
    return {
      label,
      status: res.status,
      ms: Date.now() - started,
      bytes: text.length,
      engellendi: res.status === 403 || /Access Denied|errors\.edgesuite|bm-verify/i.test(head),
      ozet: head.replace(/\s+/g, " ").slice(0, 200),
    };
  } catch (err) {
    return {
      label,
      status: 0,
      ms: Date.now() - started,
      hata: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Veritabanına gerçekten bağlanılıyor mu?
 * Hata mesajı Next.js'in "digest" numarasının arkasında kaldığı için
 * burada açıkça döndürülüyor.
 */
async function veritabani() {
  const url = process.env.DATABASE_URL ?? "";
  const bilgi = {
    saglayici: process.env.DATABASE_PROVIDER ?? "(tanimsiz)",
    port: url.match(/:(\d+)\//)?.[1] ?? "(yok)",
    pgbouncer: url.includes("pgbouncer=true"),
    host: url.match(/@([^:/?]+)/)?.[1] ?? "(yok)",
  };

  const basladi = Date.now();
  try {
    const { prisma } = await import("@/lib/db");
    const sayi = await prisma.watch.count();
    return { ...bilgi, baglanti: "OK", takipSayisi: sayi, ms: Date.now() - basladi };
  } catch (err) {
    return {
      ...bilgi,
      baglanti: "HATA",
      ms: Date.now() - basladi,
      hata: (err instanceof Error ? err.message : String(err)).slice(0, 500),
    };
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Sunucunun dışarıya hangi IP ile çıktığı — engel IP kaynaklıysa burada görünür.
  let disIp = "bilinmiyor";
  try {
    const r = await fetch("https://api.ipify.org?format=json", {
      signal: AbortSignal.timeout(8000),
    });
    disIp = ((await r.json()) as { ip?: string }).ip ?? "bilinmiyor";
  } catch {
    /* önemli değil */
  }

  const sonuclar = await Promise.all([
    probe(
      "referans-arama",
      "https://www.zara.com/itxrest/1/search/store/11766/reference" +
        "?reference=08059577&locale=tr_TR&scope=default&origin=search&ajax=true",
    ),
    probe(
      "stok-sorgusu",
      "https://www.zara.com/api/storefront/1/stores/11766/products/id/580760534/availability",
    ),
  ]);

  return NextResponse.json({
    disIp,
    bolge: process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? "bilinmiyor",
    araci: {
      tanimli: Boolean(process.env.ZARA_PROXY_URL?.trim()),
      anahtarVar: Boolean(process.env.ZARA_PROXY_SECRET?.trim()),
      adres: process.env.ZARA_PROXY_URL?.trim() ?? "(tanimsiz)",
    },
    appUrl: process.env.APP_URL ?? "(tanimsiz)",
    veritabani: await veritabani(),
    // Not: asagidaki istekler DOGRUDAN Zara'ya gider (araci kullanmaz),
    // boylece ham engel durumu gorunur.
    zaraDogrudan: sonuclar,
  });
}
