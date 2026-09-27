/** WorkerRun.startedAt saat dilimi sorunu var mı? */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = readFileSync(".env.vercel", "utf8").match(
  /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
)![1]!;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

const { rows: tip } = await c.query<{ data_type: string }>(
  `SELECT data_type FROM information_schema.columns
   WHERE table_name = 'WorkerRun' AND column_name = 'startedAt'`,
);
console.log("kolon tipi :", tip[0]?.data_type);
console.log("node saat dilimi:", Intl.DateTimeFormat().resolvedOptions().timeZone);

const { rows } = await c.query<{ startedAt: Date; dk: string }>(
  `SELECT "startedAt",
          ROUND(EXTRACT(EPOCH FROM (NOW() - "startedAt")) / 60) AS dk
   FROM "WorkerRun" ORDER BY "startedAt" DESC LIMIT 5`,
);

console.log("\n  sunucu hesabı | istemci hesabı");
for (const r of rows) {
  const istemci = Math.round((Date.now() - new Date(r.startedAt).getTime()) / 60000);
  console.log(`  ${String(r.dk).padStart(6)} dk  |  ${String(istemci).padStart(6)} dk`);
}

await c.end();
