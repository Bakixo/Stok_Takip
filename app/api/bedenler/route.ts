/**
 * GET /api/bedenler?productId=...
 * Bir renk varyantının bedenlerini ve o anki stok durumunu döndürür.
 */
import { NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";
import { getSizes } from "@/lib/zara/client";
import { ZaraError } from "@/lib/zara/http";

export async function GET(request: Request) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId || !/^\d+$/.test(productId)) {
    return NextResponse.json({ error: "productId gerekli" }, { status: 400 });
  }

  try {
    const sizes = await getSizes(productId);
    return NextResponse.json({ sizes });
  } catch (err) {
    if (err instanceof ZaraError) {
      const status = err.isBlocked ? 503 : err.kind === "not_found" ? 404 : 502;
      return NextResponse.json({ error: userMessage(err) }, { status });
    }
    return NextResponse.json({ error: "Bedenler alınamadı" }, { status: 500 });
  }
}

function userMessage(err: ZaraError): string {
  if (err.isBlocked) return "Zara şu an cevap vermiyor, birazdan tekrar dene.";
  if (err.kind === "not_found") return "Bu renk için beden bilgisi bulunamadı.";
  return "Bedenler alınamadı.";
}
