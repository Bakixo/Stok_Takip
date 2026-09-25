/**
 * Worker gibi Next.js dışında çalışan süreçler için .env yükleyici.
 *
 * Node'un yerleşik yükleyicisini kullanır; ayrı bir bağımlılık gerekmez.
 * Canlıda değişkenler platformdan (Railway/Render) geldiği için .env
 * bulunamaması normaldir ve sessizce geçilir.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (err) {
    console.warn(`[env] .env okunamadı: ${err instanceof Error ? err.message : String(err)}`);
  }
}
