/**
 * Hangi Vercel bölgesi, Cloudflare'in hangi merkezine düşüyor ve
 * Zara oradan erişilebiliyor mu?
 *
 *   GET /api/colo
 *
 * Bilerek anahtarsız: hiçbir gizli bilgi döndürmüyor, yalnızca üç veri
 * (bölge, merkez, durum kodu). Bölge denemelerini hızlı yapabilmek için.
 * Doğru bölge bulunduğunda bu dosya silinebilir.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const proxy = process.env.ZARA_PROXY_URL?.trim();
  const bolge = process.env.VERCEL_REGION ?? "bilinmiyor";

  if (!proxy) {
    return NextResponse.json({ bolge, hata: "ZARA_PROXY_URL tanimsiz" }, { status: 500 });
  }

  try {
    const res = await fetch(`${proxy.replace(/\/+$/, "")}/?tani=1`, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const veri = (await res.json()) as { colo?: string; zaraStatus?: number };
    return NextResponse.json({
      vercelBolge: bolge,
      cfColo: veri.colo ?? "?",
      zaraStatus: veri.zaraStatus ?? 0,
      calisiyor: veri.zaraStatus === 200,
    });
  } catch (err) {
    return NextResponse.json({
      vercelBolge: bolge,
      hata: err instanceof Error ? err.message : String(err),
    });
  }
}
