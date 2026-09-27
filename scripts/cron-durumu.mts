/**
 * Cron gerçekten 15 dakikada bir çalışıyor mu?
 *
 *   npx tsx scripts/cron-durumu.mts
 *
 * Son turların zamanlarını ve aralarındaki boşlukları gösterir.
 * Boşluk 15 dakikadan çok büyükse cron duraklamış demektir.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function baglantiAdresi(): string {
  const ortam = process.env.DATABASE_URL?.trim();
  if (ortam?.startsWith("postgres")) return ortam;
  for (const dosya of [".env.vercel", ".env"]) {
    const yol = resolve(process.cwd(), dosya);
    if (!existsSync(yol)) continue;
    const m = readFileSync(yol, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    if (m?.[1]?.startsWith("postgres")) return m[1].trim();
  }
  console.error("Canlı DATABASE_URL bulunamadı (.env.vercel).");
  process.exit(1);
}

const c = new Client({ connectionString: baglantiAdresi(), ssl: { rejectUnauthorized: false } });
await c.connect();

try {
  const { rows } = await c.query<{ startedAt: Date; failureReason: string | null }>(
    `SELECT "startedAt", "failureReason" FROM "WorkerRun" ORDER BY "startedAt" DESC LIMIT 12`,
  );

  if (rows.length === 0) {
    console.log("\nHiç tur kaydı yok — cron hiç çalışmamış.\n");
    process.exit(0);
  }

  console.log("\n=== SON TURLAR (en yeni üstte) ===\n");

  let oncekiZaman: number | null = null;
  for (const r of rows) {
    const t = new Date(r.startedAt);
    const gecen = Math.round((Date.now() - t.getTime()) / 60000);
    const bosluk =
      oncekiZaman === null ? "" : `  ↑ ${Math.round((oncekiZaman - t.getTime()) / 60000)} dk ara`;
    const durum = r.failureReason ? "  BAŞARISIZ" : "";
    console.log(
      `  ${t.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}  (${gecen} dk önce)${durum}${bosluk}`,
    );
    oncekiZaman = t.getTime();
  }

  const sonGecen = Math.round((Date.now() - new Date(rows[0]!.startedAt).getTime()) / 60000);
  console.log("\n=== DEĞERLENDİRME ===\n");
  if (sonGecen <= 20) {
    console.log(`  Cron çalışıyor. Son tur ${sonGecen} dk önce.`);
  } else {
    console.log(`  Cron DURMUŞ görünüyor. Son tur ${sonGecen} dk önce,`);
    console.log("  oysa 15 dakikada bir çalışması gerekiyor.");
    console.log("\n  Bakılacak yerler:");
    console.log("   • cron-job.org → işin durumu 'Enabled' mı");
    console.log("   • Son çalıştırma sonucu ne dönmüş (401 ise anahtar yanlış)");
    console.log("   • cron-job.org art arda hata alan işleri kendiliğinden durdurabiliyor");
  }
  console.log();
} finally {
  await c.end();
}
