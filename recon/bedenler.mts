/** Takip edilen ürünlerin tüm bedenlerinin canlı durumu. */
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { getSizes } from "@/lib/zara/client";
import { AVAILABILITY_LABEL, isPurchasable } from "@/lib/zara/types";

const url = readFileSync(".env.vercel", "utf8").match(
  /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
)![1]!;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows } = await c.query<{
  productId: string;
  productName: string;
  colorName: string;
  takipEdilen: string;
}>(`
  SELECT "productId", "productName", "colorName",
         string_agg(DISTINCT size, ', ') AS "takipEdilen"
  FROM "Watch"
  WHERE status IN ('ACTIVE', 'FOUND')
  GROUP BY "productId", "productName", "colorName"
`);
await c.end();

for (const r of rows) {
  console.log(`\n${r.productName} · ${r.colorName}`);
  console.log(`  (takip edilen bedenler: ${r.takipEdilen})\n`);
  const bedenler = await getSizes(r.productId);
  for (const b of bedenler) {
    const al = isPurchasable(b.availability);
    const takipte = r.takipEdilen.split(", ").includes(b.name);
    console.log(
      `  ${b.name.padEnd(5)} ${AVAILABILITY_LABEL[b.availability].padEnd(16)}` +
        `${al ? " ← ALINABİLİR" : ""}${takipte ? "  [takipte]" : ""}`,
    );
  }
}
