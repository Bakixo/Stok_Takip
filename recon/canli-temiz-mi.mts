/** Canlı veritabanında sahte/test adresi kalmış mı? */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = readFileSync(".env.vercel", "utf8").match(
  /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
)![1]!;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows } = await c.query<{ email: string; adet: string }>(`
  SELECT email, COUNT(*)::text AS adet
  FROM "Watch"
  WHERE email LIKE '%ornek.com' OR email LIKE '%example.com'
  GROUP BY email
`);

if (rows.length === 0) {
  console.log("  [X] canlı veritabanında sahte adres yok");
} else {
  for (const r of rows) console.log(`  [!] ${r.email} — ${r.adet} takip`);
}

const { rows: toplam } = await c.query<{ n: string }>(
  `SELECT COUNT(DISTINCT email)::text AS n FROM "Watch"`,
);
console.log(`  toplam benzersiz kullanıcı: ${toplam[0]!.n}`);

await c.end();
