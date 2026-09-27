/**
 * Gönderilen maillerin kaydını gösterir.
 *
 *   npx tsx scripts/mail-kayitlari.mts
 *   npx tsx scripts/mail-kayitlari.mts --acik     (adresler maskesiz)
 *
 * "Mail gitti mi?" sorusunu tahminle değil kayıtla cevaplar.
 * Adresler varsayılan olarak maskelidir.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

const acik = process.argv.includes("--acik");

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

const maskele = (e: string) => {
  if (acik) return e;
  const [ad = "", alan = ""] = e.split("@");
  return `${ad.slice(0, 2)}${"*".repeat(Math.max(3, ad.length - 2))}@${alan}`;
};

const TUR: Record<string, string> = {
  stock_alert: "Stokta!",
  watch_confirmed: "Takibe alındı",
  welcome: "Hoş geldin",
  renewal: "Hatırlatma",
  admin_alert: "Admin uyarısı",
};

const DURUM: Record<string, string> = {
  sent: "gönderildi",
  dry_run: "KURU MOD — gitmedi",
  failed: "BAŞARISIZ",
};

const c = new Client({ connectionString: baglantiAdresi(), ssl: { rejectUnauthorized: false } });
await c.connect();

try {
  const varMi = await c.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM information_schema.tables WHERE table_name = 'MailLog'`,
  );
  if (varMi.rows[0]!.n === "0") {
    console.log("\nMailLog tablosu yok — şema henüz canlıya uygulanmamış.\n");
    process.exit(0);
  }

  const { rows } = await c.query<{
    to: string;
    kind: string;
    status: string;
    error: string | null;
    dk: string;
  }>(`
    SELECT "to", kind, status, error,
           ROUND(EXTRACT(EPOCH FROM (NOW() - "sentAt")) / 60)::text AS dk
    FROM "MailLog" ORDER BY "sentAt" DESC LIMIT 25
  `);

  console.log(`\n=== SON MAİLLER (${rows.length}) ===\n`);
  if (rows.length === 0) {
    console.log("  Henüz kayıt yok. Yeni şema uygulandıktan sonraki mailler burada görünecek.\n");
  }
  for (const r of rows) {
    const isaret = r.status === "sent" ? "✓" : r.status === "dry_run" ? "○" : "✗";
    console.log(
      `  ${isaret} ${(TUR[r.kind] ?? r.kind).padEnd(16)} ${maskele(r.to).padEnd(26)} ${DURUM[r.status] ?? r.status}  (${r.dk} dk önce)`,
    );
    if (r.error) console.log(`      ${r.error.slice(0, 120)}`);
  }

  const { rows: ozet } = await c.query<{ status: string; adet: string }>(
    `SELECT status, COUNT(*)::text AS adet FROM "MailLog" GROUP BY status`,
  );
  if (ozet.length > 0) {
    console.log("\n=== TOPLAM ===\n");
    for (const o of ozet) console.log(`  ${(DURUM[o.status] ?? o.status).padEnd(22)} ${o.adet}`);
  }

  if (!acik) console.log("\n(Adresler maskeli. Tam hâli için: --acik)");
  console.log();
} finally {
  await c.end();
}
