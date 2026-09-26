/**
 * Canlı sitede tam akış: giriş → ürün → renk/beden/şehir → takibe al.
 * Takip oluşunca gerçek "Takibe alındı" maili gider.
 *
 *   node recon/canli-tam-test.mjs <PIN> <eposta>
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "https://stokta-firuze.vercel.app";
const [PIN, EPOSTA] = process.argv.slice(2);

if (!PIN || !EPOSTA) {
  console.error("Kullanım: node recon/canli-tam-test.mjs <PIN> <eposta>");
  process.exit(1);
}

await mkdir("recon/out/canli", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  locale: "tr-TR",
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const hatalar = [];
page.on("pageerror", (e) => hatalar.push(e.message));
page.on("response", (r) => r.status() >= 500 && hatalar.push(`${r.status()} ${r.url().slice(0, 70)}`));

const ss = async (n) => {
  await page.screenshot({ path: `recon/out/canli/${n}.png` });
  console.log(`   [ss] ${n}.png`);
};

// giriş
await page.goto(`${BASE}/giris`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.fill("#pin", PIN);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 30000 });
console.log("1) giris OK");

// stoğu tükenmiş beden olan bir ürün seç
console.log("2) urun araniyor (7701/256 — bazi bedenleri tukenmis)");
await page.fill('input[aria-label="Zara linki veya ürün kodu"]', "7701/256");
await page.click('button[type="submit"]');
await page.waitForURL(/\/urun/, { timeout: 40000 });
await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 40000 });
await page.waitForTimeout(1500);

const bedenler = page.locator('[role="radiogroup"][aria-label="Beden"] button');
const n = await bedenler.count();
console.log(`   ${n} beden geldi`);

let secilen = -1;
for (let i = 0; i < n; i++) {
  const etiket = (await bedenler.nth(i).getAttribute("aria-label")) ?? "";
  console.log(`     ${etiket}`);
  if (secilen < 0 && /Tükendi/.test(etiket)) secilen = i;
}
if (secilen < 0) {
  console.log("   tukenmis beden yok, ilki seciliyor");
  secilen = 0;
}
await bedenler.nth(secilen).click();
await page.waitForTimeout(1200);

console.log("3) sehir: Istanbul");
await page.waitForSelector('input[aria-label="Şehir ara"]', { timeout: 20000 });
await page.fill('input[aria-label="Şehir ara"]', "istanbul");
await page.waitForTimeout(700);
await page.click('button:has-text("İstanbul")');
await page.waitForTimeout(5000);
await ss("10-sonuc");

const panel = await page.locator("section").last().innerText();
console.log("   panel:\n   " + panel.split("\n").filter(Boolean).slice(0, 6).join("\n   "));

// takibe alma formu varsa doldur
const email = page.locator("#email");
if ((await email.count()) > 0) {
  console.log(`4) takibe aliniyor → ${EPOSTA}`);
  await email.fill(EPOSTA);
  await page.waitForTimeout(400);
  await page.click('button:has-text("Takibe Al")');
  await page.waitForTimeout(6000);
  await ss("11-takibe-alindi");
  const son = await page.locator("section").last().innerText();
  console.log("   " + son.split("\n").filter(Boolean).slice(0, 5).join("\n   "));
} else {
  console.log("4) beden stokta — 'Urune Git' gosteriliyor, takip formu yok");
}

console.log("\n5) Takiplerim sayfasi");
await page.goto(`${BASE}/takiplerim`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);
await ss("12-takiplerim");
console.log("   " + (await page.locator("body").innerText()).split("\n").filter(Boolean).slice(0, 8).join("\n   "));

console.log(`\n=== Sunucu hatalari: ${hatalar.length} ===`);
hatalar.slice(0, 5).forEach((h) => console.log("   " + h));

await browser.close();
