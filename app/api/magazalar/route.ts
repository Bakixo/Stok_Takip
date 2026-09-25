/**
 * GET /api/magazalar?sehir=<slug>
 * Seçilen ildeki Zara mağazalarını döndürür.
 *
 * Not: Zara'nın mağaza bazlı STOK sorgusu dışarıya kapalı (bkz. FAZ0-RAPOR.md).
 * Bu uç yalnızca mağaza konumlarını verir; stok bilgisi içermez.
 */
import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getStoresNear } from "@/lib/zara/client";
import { findCity, normalizeTr } from "@/lib/zara/cities";
import { ZaraError } from "@/lib/zara/http";

export async function GET(request: Request) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const slug = new URL(request.url).searchParams.get("sehir");
  const city = slug ? findCity(slug) : undefined;
  if (!city) {
    return NextResponse.json({ error: "Geçersiz şehir" }, { status: 400 });
  }
  if (!city.hasStore) {
    return NextResponse.json({ stores: [], cityName: city.name });
  }

  try {
    const target = normalizeTr(city.name);
    const nearby = await getStoresNear(city.latitude, city.longitude);
    // Zara en yakın mağazaları döndürür; komşu ildekileri ayıkla.
    const stores = nearby.filter((s) => normalizeTr(s.city) === target);
    return NextResponse.json({ stores, cityName: city.name });
  } catch (err) {
    const status = err instanceof ZaraError && err.isBlocked ? 503 : 502;
    return NextResponse.json({ error: "Mağazalar alınamadı" }, { status });
  }
}
