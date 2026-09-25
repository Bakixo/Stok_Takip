/**
 * Zara'nın gerçek cevaplarını tests/fixtures/ altına kaydeder.
 * Testler bu kayıtlara karşı çalışır; ağa çıkmaz.
 *
 *   node scripts/record-fixtures.mjs
 *
 * Zara cevap şekli değişirse tekrar çalıştır ve testleri gözden geçir.
 */
import { mkdir, writeFile } from "node:fs/promises";

const STORE = 11766;
const H = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.zara.com/tr/tr/",
};

const OUT = new URL("../tests/fixtures/", import.meta.url);
await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Tek renkli ürün, çok renkli ürün ve stok cevapları. */
const TARGETS = [
  [
    "reference-tek-renk",
    `https://www.zara.com/itxrest/1/search/store/${STORE}/reference?reference=08059577&locale=tr_TR&scope=default&origin=search&ajax=true`,
  ],
  [
    "reference-cok-renk",
    `https://www.zara.com/itxrest/1/search/store/${STORE}/reference?reference=08417800&locale=tr_TR&scope=default&origin=search&ajax=true`,
  ],
  [
    "reference-bulunamadi",
    `https://www.zara.com/itxrest/1/search/store/${STORE}/reference?reference=00000000&locale=tr_TR&scope=default&origin=search&ajax=true`,
  ],
  [
    "product-detail",
    `https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/580760534`,
  ],
  [
    "availability",
    `https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/580760534/availability`,
  ],
  [
    "availability-karisik",
    `https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/552262997/availability`,
  ],
  [
    "stores-istanbul",
    `https://www.zara.com/itxrest/1/bam/store/${STORE}/physical-store?latitude=41.0082&longitude=28.9784&languageId=240&appId=1`,
  ],
];

for (const [name, url] of TARGETS) {
  try {
    const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(25000) });
    const text = await res.text();
    await writeFile(new URL(`${name}.json`, OUT), text, "utf8");
    console.log(`✓ ${name.padEnd(26)} ${res.status}  ${text.length} b`);
  } catch (e) {
    console.log(`✗ ${name.padEnd(26)} ${e.message}`);
  }
  await sleep(1500 + Math.random() * 1500);
}

console.log("\nFixture'lar tests/fixtures/ altına yazıldı.");
