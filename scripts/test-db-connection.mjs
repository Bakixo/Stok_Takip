/**
 * Canlı veritabanı bağlantısını deploy etmeden önce dener.
 *
 *   node scripts/test-db-connection.mjs
 *
 * Bağlantı adresini sorar (ekrana yazılır ama hiçbir yere kaydedilmez),
 * şemayı geçici olarak postgresql'e çevirir, tabloları oluşturmayı dener
 * ve sonunda şemayı yerel ayarına (sqlite) geri alır.
 *
 * Şifre hiçbir çıktıda görünmez.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = resolve(root, "prisma/schema.prisma");

/** Adresi şifresiz göster. */
function mask(url) {
  return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:***@");
}

/** datasource bloğundaki provider satırını değiştirir. */
function setProvider(provider) {
  const src = readFileSync(schemaPath, "utf8");
  writeFileSync(
    schemaPath,
    src.replace(/(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/, `$1"${provider}"`),
    "utf8",
  );
}

/** Şemanın şu anki sağlayıcısı — sonunda buna geri döneceğiz. */
function currentProvider() {
  const m = readFileSync(schemaPath, "utf8").match(
    /datasource\s+db\s*\{[^}]*?provider\s*=\s*"([^"]+)"/,
  );
  return m?.[1] ?? "sqlite";
}

let url = process.env.SUPABASE_URL?.trim();

if (!url) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  url = (await rl.question("Supabase bağlantı adresi (postgresql://...): ")).trim();
  rl.close();
}

if (!url) {
  console.error("\nAdres girilmedi.");
  process.exit(1);
}

// --- Adresi denemeden önce biçim kontrolü ---
console.log(`\nAdres: ${mask(url)}\n`);

const sorunlar = [];
if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
  sorunlar.push("postgresql:// ile başlamıyor");
}
if (url.includes("[YOUR-PASSWORD]") || url.includes("[ŞİFRE]")) {
  sorunlar.push("şifre yer tutucusu hâlâ duruyor — gerçek şifreyi yaz");
}
if (url.includes(":6543")) {
  sorunlar.push(
    "port 6543 (transaction pooler) — bunun yerine port 5432 olan Session pooler adresini kullan",
  );
}
if (/@db\.[a-z0-9]+\.supabase\.co/.test(url)) {
  sorunlar.push(
    "bu Direct connection adresi (IPv6) — Railway bağlanamaz, Session pooler adresini kullan",
  );
}
// Şifre kısmında kodlanmamış özel karakter var mı?
const pwd = url.match(/:\/\/[^:]+:([^@]*)@/)?.[1] ?? "";
if (/[@/?#[\]]/.test(pwd)) {
  sorunlar.push("şifrede yüzde-kodlaması gereken karakter var (@ / ? # [ ])");
}

if (sorunlar.length > 0) {
  console.error("Adreste sorun var:");
  for (const s of sorunlar) console.error(`  • ${s}`);
  process.exit(1);
}

// --- Gerçek bağlantı denemesi ---
const geriDon = currentProvider();
let cikis = 0;

try {
  setProvider("postgresql");
  console.log("Bağlanılıyor ve tablolar oluşturuluyor...\n");

  const sonuc = spawnSync(
    process.execPath,
    [resolve(root, "node_modules/prisma/build/index.js"), "db", "push", "--skip-generate"],
    {
      cwd: root,
      stdio: "inherit",
      // .env'deki yerel DATABASE_URL'i ezmek için açıkça geçiyoruz.
      env: { ...process.env, DATABASE_PROVIDER: "postgresql", DATABASE_URL: url },
    },
  );

  if (sonuc.status === 0) {
    console.log("\n✓ Bağlantı çalışıyor ve tablolar oluştu.");
    console.log("  Bu adresi Railway'de DATABASE_URL değişkenine yaz.");
  } else {
    cikis = sonuc.status ?? 1;
    console.error("\n✗ Bağlanılamadı. Sık görülen sebepler:");
    console.error("  • Şifre yanlış → Supabase panelinden sıfırla");
    console.error("  • Şifrede kodlanmamış özel karakter var");
    console.error("  • Proje duraklatılmış → Supabase panelinden başlat");
  }
} finally {
  // Yerel geliştirme sqlite ile devam etsin.
  setProvider(geriDon);
  console.log(`\n(şema tekrar "${geriDon}" olarak ayarlandı)`);
}

process.exit(cikis);
