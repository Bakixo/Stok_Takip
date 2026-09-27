/** Canlı veritabanında MailLog tablosunu oluşturur (yoksa). */
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = readFileSync(".env.vercel", "utf8").match(
  /^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m,
)![1]!;
const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();

await c.query(`
  CREATE TABLE IF NOT EXISTS "MailLog" (
    id TEXT PRIMARY KEY,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to" TEXT NOT NULL,
    subject TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    "messageId" TEXT,
    error TEXT,
    "watchId" TEXT
  )
`);
await c.query(`CREATE INDEX IF NOT EXISTS "MailLog_sentAt_idx" ON "MailLog"("sentAt")`);
await c.query(
  `CREATE INDEX IF NOT EXISTS "MailLog_status_sentAt_idx" ON "MailLog"(status, "sentAt")`,
);

const { rows } = await c.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "MailLog"`);
console.log("MailLog tablosu hazır. Kayıt sayısı:", rows[0]!.n);

await c.end();
