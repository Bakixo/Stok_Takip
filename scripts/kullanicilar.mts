/**
 * Canlı veritabanındaki kullanıcıları ve takipleri özetler.
 *
 *   npx tsx scripts/kullanicilar.mts
 *   npx tsx scripts/kullanicilar.mts --acik      (adresleri maskesiz göster)
 *
 * E-posta adresleri varsayılan olarak MASKELİ: "fi****@gmail.com".
 * Kimin kullandığını ve kaç takibi olduğunu görmeye yeter, adresi ifşa etmez.
 * Ekranı biriyle paylaşırken ya da ekran görüntüsü alırken güvenli.
 *
 * Bağlantı adresi .env.vercel dosyasından okunur (canlı DATABASE_URL orada).
 * İstersen ortam değişkeniyle de verebilirsin: DATABASE_URL=... npx tsx ...
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const kok = process.cwd();
const acik = process.argv.includes("--acik");

/** Bağlantı adresini bul: ortam değişkeni → .env.vercel → .env */
function baglantiAdresi(): string {
  const ortam = process.env.DATABASE_URL?.trim();
  if (ortam?.startsWith("postgres")) return ortam;

  for (const dosya of [".env.vercel", ".env"]) {
    const yol = resolve(kok, dosya);
    if (!existsSync(yol)) continue;
    const m = readFileSync(yol, "utf8").match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
    const url = m?.[1]?.trim();
    if (url?.startsWith("postgres")) return url;
  }

  console.error(
    "Canlı veritabanı adresi bulunamadı.\n" +
      ".env.vercel içinde postgres:// ile başlayan bir DATABASE_URL olmalı.",
  );
  process.exit(1);
}

/** "firuze@gmail.com" → "fi****@gmail.com" */
function maskele(eposta: string): string {
  if (acik) return eposta;
  const [ad = "", alan = ""] = eposta.split("@");
  const bas = ad.slice(0, 2);
  return `${bas}${"*".repeat(Math.max(3, ad.length - 2))}@${alan}`;
}

function geceSure(tarih: Date | null): string {
  if (!tarih) return "—";
  const dk = Math.floor((Date.now() - tarih.getTime()) / 60000);
  if (dk < 1) return "az önce";
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  return `${Math.floor(sa / 24)} gün önce`;
}

const client = new Client({
  connectionString: baglantiAdresi(),
  // Supabase pooler TLS istiyor; sertifika zinciri doğrulaması gerekmiyor.
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  // --- Kullanıcı bazında özet ---
  const { rows: kullanicilar } = await client.query<{
    email: string;
    aktif: string;
    bulundu: string;
    iptal: string;
    ilk: Date;
    son: Date | null;
  }>(`
    SELECT
      email,
      COUNT(*) FILTER (WHERE status = 'ACTIVE')    AS aktif,
      COUNT(*) FILTER (WHERE status = 'FOUND')     AS bulundu,
      COUNT(*) FILTER (WHERE status = 'CANCELLED') AS iptal,
      MIN("createdAt")     AS ilk,
      MAX("lastCheckedAt") AS son
    FROM "Watch"
    GROUP BY email
    ORDER BY MIN("createdAt")
  `);

  console.log(`\n=== KULLANICILAR (${kullanicilar.length}) ===\n`);

  if (kullanicilar.length === 0) {
    console.log("  Henüz kimse takip oluşturmamış.\n");
  } else {
    for (const k of kullanicilar) {
      console.log(`  ${maskele(k.email).padEnd(28)} aktif ${k.aktif} · bulundu ${k.bulundu} · iptal ${k.iptal}`);
      console.log(`  ${" ".repeat(28)} ilk takip: ${geceSure(k.ilk)} · son kontrol: ${geceSure(k.son)}`);
      console.log();
    }
  }

  // --- Takip durumu toplamı ---
  const { rows: durum } = await client.query<{ status: string; adet: string }>(
    `SELECT status, COUNT(*) AS adet FROM "Watch" GROUP BY status ORDER BY status`,
  );
  console.log("=== TAKİPLER ===\n");
  for (const d of durum) console.log(`  ${d.status.padEnd(12)} ${d.adet}`);
  if (durum.length === 0) console.log("  (yok)");

  // --- Worker sağlığı ---
  const { rows: turlar } = await client.query<{
    toplam: string;
    basarisiz: string;
    son: Date | null;
  }>(`
    SELECT COUNT(*) AS toplam,
           COUNT(*) FILTER (WHERE "failureReason" IS NOT NULL) AS basarisiz,
           MAX("startedAt") AS son
    FROM "WorkerRun"
  `);
  const t = turlar[0]!;
  console.log("\n=== WORKER ===\n");
  console.log(`  toplam tur : ${t.toplam}`);
  console.log(`  başarısız  : ${t.basarisiz}`);
  console.log(`  son tur    : ${geceSure(t.son)}`);

  // --- Son 24 saatteki kontroller ---
  const { rows: kontrol } = await client.query<{ result: string; adet: string }>(`
    SELECT result, COUNT(*) AS adet
    FROM "CheckLog"
    WHERE "checkedAt" > NOW() - INTERVAL '24 hours'
    GROUP BY result
    ORDER BY COUNT(*) DESC
  `);
  console.log("\n=== SON 24 SAATTEKİ KONTROLLER ===\n");
  if (kontrol.length === 0) console.log("  (yok — cron çalışmamış olabilir)");
  for (const k of kontrol) console.log(`  ${k.result.padEnd(14)} ${k.adet}`);

  if (!acik) {
    console.log("\n(Adresler maskeli. Tam hâli için: --acik)");
  }
  console.log();
} finally {
  await client.end();
}
