/**
 * Canlı ortam giriş noktası: şemayı uygula, sonra web + worker'ı başlat.
 *
 *   node scripts/start-production.mjs
 *
 * Konteyner (Railway/Render/Fly) bunu çalıştırır. Süreçlerden biri ölürse
 * diğeri de kapanır ve platform konteyneri yeniden başlatır.
 *
 * .cmd/.sh sarmalayıcıları çağrılmıyor; paketlerin JS giriş dosyaları
 * doğrudan bu Node çalıştırılabiliriyle başlatılıyor.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function binary(relativePath, packageName) {
  const full = resolve(root, relativePath);
  if (!existsSync(full)) {
    console.error(`[start] "${packageName}" bulunamadı: ${relativePath}`);
    process.exit(1);
  }
  return full;
}

const PRISMA = binary("node_modules/prisma/build/index.js", "prisma");
const NEXT = binary("node_modules/next/dist/bin/next", "next");
const TSX = binary("node_modules/tsx/dist/cli.mjs", "tsx");

// --- 0) Ortam değişkenleri tam mı? ---
// Eksik bir değişken uygulamayı zaten çökertir; asıl sorun log'da bunun
// yığın izi (stack trace) olarak görünüp anlaşılmaması. Burada önden
// kontrol edip okunur bir liste basıyoruz.
const REQUIRED = [
  ["DATABASE_PROVIDER", 'veritabanı türü — canlıda "postgresql"'],
  ["DATABASE_URL", "Postgres bağlantı adresi"],
  ["ACCESS_PIN", "uygulamaya giriş kodu"],
  ["SESSION_SECRET", "oturum imza anahtarı (en az 16 karakter)"],
  ["SMTP_USER", "Gmail adresi"],
  ["SMTP_PASS", "Gmail uygulama şifresi"],
  ["ADMIN_EMAIL", "hata uyarılarının gideceği adres"],
  ["APP_URL", "uygulamanın tam adresi, https:// ile — maillerdeki linkler buna göre kurulur"],
];

const eksik = REQUIRED.filter(([key]) => !process.env[key]?.trim());

if (eksik.length > 0) {
  console.error("\n" + "=".repeat(60));
  console.error(` EKSİK ORTAM DEĞİŞKENİ (${eksik.length} adet)`);
  console.error("=".repeat(60));
  for (const [key, aciklama] of eksik) {
    console.error(`  ${key}`);
    console.error(`      ${aciklama}`);
  }
  console.error("=".repeat(60));
  console.error(" Bunları platformun Variables/Environment bölümüne ekle,");
  console.error(" sonra yeniden dağıt.\n");
  process.exit(1);
}

// APP_URL biçimi maillerdeki linkleri doğrudan etkiliyor; erken uyar.
const appUrl = process.env.APP_URL.trim();
if (!/^https?:\/\//.test(appUrl)) {
  console.error(`\nAPP_URL "https://" ile başlamalı. Şu an: "${appUrl}"\n`);
  process.exit(1);
}
if (appUrl.includes("localhost")) {
  console.warn(
    `\n[uyarı] APP_URL localhost'u gösteriyor (${appUrl}).\n` +
      `        Maillerdeki linkler alıcının telefonunda açılmaz.\n`,
  );
}
if (appUrl.endsWith("/")) {
  console.warn(`[uyarı] APP_URL sonunda / var; linklerde çift eğik çizgi oluşur.`);
}

// --- 1) Şemayı veritabanına uygula ---
// Migration dosyası tutmuyoruz; şema tek kaynak. İlk açılışta tabloları
// oluşturur, sonraki açılışlarda şema zaten uyumluysa hiçbir şey yapmaz.
console.log("[start] veritabanı şeması uygulanıyor...");
const push = spawnSync(process.execPath, [PRISMA, "db", "push", "--skip-generate"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});

if (push.status !== 0) {
  console.error(
    "[start] şema uygulanamadı. DATABASE_URL doğru mu ve veritabanına erişilebiliyor mu?",
  );
  process.exit(push.status ?? 1);
}

// --- 2) Web ve worker ---
const jobs = [
  { name: "web", args: [NEXT, "start"] },
  { name: "worker", args: [TSX, "worker/index.ts"] },
];

const children = [];
let shuttingDown = false;

for (const job of jobs) {
  const child = spawn(process.execPath, job.args, {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  children.push(child);

  const pipe = (stream, out) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) out.write(`[${job.name}] ${line}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("error", (err) => {
    console.error(`[${job.name}] başlatılamadı: ${err.message}`);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`[${job.name}] çıktı (kod ${code}) — konteyner kapanıyor`);
    shutdown(code ?? 1);
  });
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 1000);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

console.log(`[start] web (port ${process.env.PORT ?? 3000}) ve worker başlatıldı`);
