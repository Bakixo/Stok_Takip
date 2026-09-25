/**
 * Geliştirmede web + worker'ı birlikte çalıştırır.
 * Çıktıları etiketler, Ctrl+C ile ikisini birden kapatır.
 *
 *   node scripts/dev-all.mjs        → next dev + worker
 *   node scripts/dev-all.mjs start  → next start + worker
 *
 * Not: `npx`/`next.cmd` gibi .cmd sarmalayıcıları çağrılmıyor. Node 18.20+
 * Windows'ta .cmd dosyalarını shell olmadan başlatmayı reddediyor (EINVAL)
 * ve shell açmak da gereksiz. Bunun yerine paketlerin JS giriş dosyaları
 * doğrudan bu Node çalıştırılabiliriyle çağrılıyor.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "start" ? "start" : "dev";

/** Paketin JS giriş dosyası — yoksa açıklayıcı hata ver. */
function binary(relativePath, packageName) {
  const full = resolve(root, relativePath);
  if (!existsSync(full)) {
    console.error(
      `\n"${packageName}" bulunamadı (${relativePath}).\nÖnce "npm install" çalıştır.\n`,
    );
    process.exit(1);
  }
  return full;
}

const jobs = [
  {
    name: "web",
    color: "\x1b[36m",
    args: [binary("node_modules/next/dist/bin/next", "next"), mode],
  },
  {
    name: "worker",
    color: "\x1b[35m",
    args: [binary("node_modules/tsx/dist/cli.mjs", "tsx"), "worker/index.ts"],
  },
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

  const label = `${job.color}[${job.name}]\x1b[0m`;

  /** Satır satır etiketle; yarım kalan satırı tamponla. */
  const pipe = (stream, out) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) out.write(`${label} ${line}\n`);
    });
    stream.on("end", () => {
      if (buffer) out.write(`${label} ${buffer}\n`);
    });
  };
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("error", (err) => {
    console.error(`${label} başlatılamadı: ${err.message}`);
    shutdown(1);
  });

  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.log(`${label} çıktı (kod ${code}) — diğeri de kapatılıyor`);
    shutdown(code ?? 1);
  });
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const c of children) {
    if (!c.killed) c.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 500);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
