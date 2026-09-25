/**
 * Stok kontrolünü dışarıdan tetikleyen uç nokta.
 *
 *   GET|POST /api/kontrol
 *   Authorization: Bearer <CRON_SECRET>     (ya da ?key=<CRON_SECRET>)
 *
 * Vercel'de sürekli çalışan bir süreç barındıramadığımız için, kontrol
 * turunu ücretsiz bir cron servisi (ör. cron-job.org) 15 dakikada bir
 * burayı çağırarak tetikliyor. Kendi sunucunda çalıştırıyorsan bunun
 * yerine `npm run worker` yeterli; ikisi aynı `runCheckCycle` kodunu
 * kullanıyor.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runCheckCycle } from "@/worker/check";

/** Vercel Hobby planında bir fonksiyon en fazla 300 sn çalışabilir. */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Fonksiyon sınırından biraz önce durup özeti döndürebilmek için pay bırak. */
const BUDGET_MS = 270_000;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Sır tanımlı değilse uç nokta tamamen kapalı.
  if (!secret) return false;

  const header = request.headers.get("authorization") ?? "";
  const fromHeader = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const fromQuery = new URL(request.url).searchParams.get("key")?.trim() ?? "";
  const provided = fromHeader || fromQuery;
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function handle(request: Request) {
  if (!authorized(request)) {
    // Sırrın tanımlı olup olmadığını dışarıya sızdırmadan reddet.
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const summary = await runCheckCycle({ budgetMs: BUDGET_MS });
    return NextResponse.json({
      ok: !summary.failureReason,
      ...summary,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[kontrol] tur başarısız:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

// cron servisleri genelde GET atar; POST da kabul ediyoruz.
export const GET = handle;
export const POST = handle;
