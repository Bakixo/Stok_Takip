/** Arkadaşın takibi neden mail üretmedi? Ham kayıtlara bakalım. */
import { readFileSync } from "node:fs";
import { resolveMx } from "node:dns/promises";
import { Client } from "pg";

const url = readFileSync(".env.vercel", "utf8").match(
  /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
)![1]!;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows } = await c.query<{
  email: string;
  productName: string;
  size: string;
  status: string;
  foundState: string | null;
  olusturuldu_dk: string;
  bulundu_dk: string | null;
  kontrol_dk: string | null;
}>(`
  SELECT email, "productName", size, status, "foundState",
         ROUND(EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60)::text     AS olusturuldu_dk,
         ROUND(EXTRACT(EPOCH FROM (NOW() - "foundAt")) / 60)::text       AS bulundu_dk,
         ROUND(EXTRACT(EPOCH FROM (NOW() - "lastCheckedAt")) / 60)::text AS kontrol_dk
  FROM "Watch"
  ORDER BY "createdAt"
`);

const maskele = (e: string) => {
  const [ad = "", alan = ""] = e.split("@");
  return `${ad.slice(0, 2)}${"*".repeat(Math.max(3, ad.length - 2))}@${alan}`;
};

console.log("\n=== TAKİPLER ===\n");
for (const r of rows) {
  console.log(`  ${maskele(r.email)}`);
  console.log(`    ${r.productName} (${r.size})`);
  console.log(`    durum: ${r.status}${r.foundState ? ` · ${r.foundState}` : ""}`);
  console.log(`    oluşturuldu: ${r.olusturuldu_dk} dk önce`);
  if (r.bulundu_dk) console.log(`    BULUNDU işareti: ${r.bulundu_dk} dk önce`);
  console.log(`    son kontrol: ${r.kontrol_dk ?? "—"} dk önce`);
  console.log();
}

// Alan adları gerçekten mail alabiliyor mu?
console.log("=== ALAN ADI KONTROLÜ (MX kaydı) ===\n");
const alanlar = [...new Set(rows.map((r) => r.email.split("@")[1]!))];
for (const alan of alanlar) {
  try {
    const mx = await resolveMx(alan);
    console.log(`  ${alan.padEnd(22)} MX var (${mx.length} kayıt) — mail alabilir`);
  } catch (e) {
    console.log(`  ${alan.padEnd(22)} MX YOK — bu adrese mail GİTMEZ  (${(e as Error).message})`);
  }
}

// Bulunan takip için kontrol geçmişi
console.log("\n=== BULUNAN TAKİBİN KONTROL GEÇMİŞİ ===\n");
const { rows: loglar } = await c.query<{ result: string; dk: string }>(`
  SELECT cl.result,
         ROUND(EXTRACT(EPOCH FROM (NOW() - cl."checkedAt")) / 60)::text AS dk
  FROM "CheckLog" cl
  JOIN "Watch" w ON w.id = cl."watchId"
  WHERE w.status = 'FOUND'
  ORDER BY cl."checkedAt" DESC
  LIMIT 8
`);
if (loglar.length === 0) console.log("  (kayıt yok)");
for (const l of loglar) console.log(`  ${l.dk.padStart(5)} dk önce  ${l.result}`);

await c.end();
