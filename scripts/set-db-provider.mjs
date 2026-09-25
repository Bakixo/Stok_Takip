/**
 * prisma/schema.prisma içindeki datasource provider satırını
 * DATABASE_PROVIDER ortam değişkenine göre günceller.
 *
 * Prisma provider alanında env() kabul etmediği için gerekli.
 * Geliştirmede "sqlite", canlıda "postgresql".
 *
 *   node scripts/set-db-provider.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// .env varsa yükle (canlıda değişkenler platformdan gelir)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    /* yoksay */
  }
}

const provider = process.env.DATABASE_PROVIDER ?? "sqlite";
const ALLOWED = ["sqlite", "postgresql"];
if (!ALLOWED.includes(provider)) {
  console.error(`DATABASE_PROVIDER "${provider}" geçersiz. Beklenen: ${ALLOWED.join(" | ")}`);
  process.exit(1);
}

const schemaPath = resolve(process.cwd(), "prisma/schema.prisma");
const source = await readFile(schemaPath, "utf8");

// datasource bloğundaki provider satırını hedefle (generator'ınkine dokunma)
const updated = source.replace(
  /(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/,
  `$1"${provider}"`,
);

if (updated === source) {
  console.log(`[db] provider zaten "${provider}"`);
} else {
  await writeFile(schemaPath, updated, "utf8");
  console.log(`[db] provider "${provider}" olarak ayarlandı`);
}
