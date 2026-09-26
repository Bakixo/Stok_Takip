/**
 * Vercel bölgesini değiştirip Cloudflare'in hangi merkezine düştüğünü
 * ve Zara'nın oradan erişilebilir olup olmadığını ölçer.
 *
 *   node scripts/bolge-dene.mjs syd1 bom1 arn1
 *
 * Her bölge için: vercel.json'u güncelle → commit → push → dağıtımı bekle
 * → /api/colo'yu oku. Doğru bölge bulununca durur.
 */
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

const UC = "https://stokta-firuze.vercel.app/api/colo";
const bolgeler = process.argv.slice(2);

if (bolgeler.length === 0) {
  console.error("Kullanım: node scripts/bolge-dene.mjs <bolge> [bolge...]");
  process.exit(1);
}

const sh = (cmd) => execSync(cmd, { stdio: "pipe", encoding: "utf8" }).trim();
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function oku() {
  try {
    const res = await fetch(UC, { signal: AbortSignal.timeout(25000), cache: "no-store" });
    return await res.json();
  } catch {
    return null;
  }
}

const baslangic = await oku();
console.log("Baslangic:", JSON.stringify(baslangic), "\n");

for (const bolge of bolgeler) {
  console.log(`--- ${bolge} deneniyor ---`);

  await writeFile(
    "vercel.json",
    JSON.stringify({ $schema: "https://openapi.vercel.sh/vercel.json", regions: [bolge] }, null, 2) + "\n",
  );

  try {
    sh("git add vercel.json");
    sh(`git commit -q -m "bolge denemesi: ${bolge}"`);
    sh("git push -q origin main");
  } catch (e) {
    console.log("  git hatasi:", String(e).slice(0, 120));
    continue;
  }

  // Dağıtım yeni bölgeyle ayağa kalkana kadar bekle (en fazla ~4 dk)
  let sonuc = null;
  for (let i = 0; i < 24; i++) {
    await bekle(10000);
    const v = await oku();
    if (v?.vercelBolge === bolge) {
      sonuc = v;
      break;
    }
    process.stdout.write(".");
  }
  console.log();

  if (!sonuc) {
    console.log(`  ${bolge}: dagitim zaman asimina ugradi, atlaniyor\n`);
    continue;
  }

  const durum = sonuc.calisiyor ? "CALISIYOR" : "engelli";
  console.log(`  ${bolge} → colo ${sonuc.cfColo} → Zara ${sonuc.zaraStatus}  [${durum}]\n`);

  if (sonuc.calisiyor) {
    console.log(`BULUNDU: ${bolge} bolgesi calisiyor (Cloudflare ${sonuc.cfColo}).`);
    process.exit(0);
  }
}

console.log("Denenen bolgelerin hicbiri calismadi.");
process.exit(1);
