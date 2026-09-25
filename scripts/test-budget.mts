/** Süre bütçesinin turu erken durdurduğunu doğrular. */
import "@/lib/load-env";
import { runCheckCycle } from "@/worker/check";
import { prisma } from "@/lib/db";

const budget = Number(process.argv[2] ?? 15000);
console.log(`bütçe: ${budget / 1000} sn\n`);

const t = Date.now();
const summary = await runCheckCycle({ budgetMs: budget });
const gecen = (Date.now() - t) / 1000;

console.log("\nözet:", JSON.stringify(summary));
console.log(`geçen süre: ${gecen.toFixed(1)} sn`);
console.log(
  gecen <= budget / 1000 + 12
    ? "✓ bütçeye uyuldu"
    : "✗ bütçe aşıldı",
);

await prisma.$disconnect();
