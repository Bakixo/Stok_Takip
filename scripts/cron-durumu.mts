/**
 * Cron gerçekten 15 dakikada bir çalışıyor mu?
 *
 *   npx tsx scripts/cron-durumu.mts
 *
 * Not: Prisma'nın DateTime kolonları Postgres'te `timestamp without time zone`
 * olarak duruyor. `pg` sürücüsü bunu yerel saat sanıp okuduğu için istemcide
 * hesaplanan "kaç dakika önce" değeri saat dilimi kadar kayıyor. Bu yüzden
 * bütün zaman farkları VERİTABANINDA hesaplanıyor.
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
  const { rows } = await c.query<{
    saat: string;
    dk: string;
    onceki_ara: string | null;
    basarisiz: boolean;
  }>(`
    SELECT
      to_char("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Istanbul', 'DD.MM HH24:MI') AS saat,
      ROUND(EXTRACT(EPOCH FROM (NOW() - "startedAt")) / 60)::text AS dk,
      ROUND(EXTRACT(EPOCH FROM (
        LAG("startedAt") OVER (ORDER BY "startedAt" DESC) - "startedAt"
      )) / 60)::text AS onceki_ara,
      ("failureReason" IS NOT NULL) AS basarisiz
    FROM "WorkerRun"
    ORDER BY "startedAt" DESC
    LIMIT 12
  `);

  if (rows.length === 0) {
    console.log("\nHiç tur kaydı yok — cron hiç çalışmamış.\n");
    process.exit(0);
  }

  console.log("\n=== SON TURLAR (en yeni üstte, Türkiye saati) ===\n");
  for (const r of rows) {
    const ara = r.onceki_ara ? `  ↑ ${r.onceki_ara} dk ara` : "";
    const durum = r.basarisiz ? "  BAŞARISIZ" : "";
    console.log(`  ${r.saat}  (${r.dk} dk önce)${durum}${ara}`);
  }

  const sonDk = Number(rows[0]!.dk);
  console.log("\n=== DEĞERLENDİRME ===\n");
  if (sonDk <= 20) {
    console.log(`  Cron çalışıyor. Son tur ${sonDk} dk önce.`);
  } else {
    console.log(`  Cron durmuş olabilir: son tur ${sonDk} dk önce,`);
    console.log("  oysa 15 dakikada bir çalışması gerekiyor.");
    console.log("\n  Bakılacak yerler:");
    console.log("   • cron-job.org → iş 'Enabled' mı");
    console.log("   • History sekmesinde son çalıştırmalar ne dönmüş");
  }
  console.log();
} finally {
  await c.end();
}
