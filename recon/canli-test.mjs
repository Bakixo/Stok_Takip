/**
 * Canlı siteyi dışarıdan test eder: giriş → ürün arama → beden listesi.
 * Ürün gelirse Cloudflare aracısı çalışıyor demektir.
 *
 *   node recon/canli-test.mjs <PIN>
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "https://stokta-firuze.vercel.app";
const PIN = process.argv[2];

if (!PIN) {
  console.error("Kullanım: node recon/canli-test.mjs <PIN>");
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
page.on("pageerror", (e) => hatalar.push(`pageerror: ${e.message}`));
page.on("response", (r) => {
  if (r.status() >= 500) hatalar.push(`${r.status()} ${r.url().slice(0, 80)}`);
});

const ss = async (n) => {
  await page.screenshot({ path: `recon/out/canli/${n}.png` });
  console.log(`   [ss] ${n}.png`);
};

console.log("1) Giris sayfasi");
await page.goto(`${BASE}/giris`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
console.log("   baslik:", await page.title());
await ss("01-giris");

console.log("2) PIN giriliyor");
await page.fill("#pin", PIN);
await page.click('button[type="submit"]');
try {
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
  console.log("   giris BASARILI");
} catch {
  console.log("   giris BASARISIZ — PIN yanlis olabilir");
  console.log("   sayfa:", (await page.locator("body").innerText()).slice(0, 200));
  await ss("02-hata");
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(2000);
await ss("02-ana");

console.log("3) Urun araniyor (Cloudflare aracisi testi)");
await page.fill('input[aria-label="Zara linki veya ürün kodu"]', "8059/577/250");
await page.click('button[type="submit"]');
await page.waitForURL(/\/urun/, { timeout: 40000 });
await page.waitForTimeout(6000);
await ss("03-urun");

const govde = await page.locator("body").innerText();

if (/Zara şu an cevap vermiyor|İstek engellendi/i.test(govde)) {
  console.log("\n   SONUC: ARACI CALISMIYOR — Zara hala engelliyor");
  console.log("   " + govde.split("\n").filter(Boolean).slice(0, 5).join("\n   "));
} else if (/PİLİLİ POPLİN GÖMLEK/i.test(govde)) {
  console.log("\n   SONUC: ARACI CALISIYOR — urun geldi!");
  console.log("   " + govde.split("\n").filter(Boolean).slice(0, 6).join("\n   "));

  console.log("\n4) Bedenler yukleniyor mu");
  try {
    await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 30000 });
    const n = await page.locator('[role="radiogroup"][aria-label="Beden"] button').count();
    console.log(`   ${n} beden geldi`);
    await ss("04-bedenler");
  } catch {
    console.log("   bedenler gelmedi");
  }
} else {
  console.log("\n   SONUC: beklenmeyen icerik");
  console.log("   " + govde.split("\n").filter(Boolean).slice(0, 8).join("\n   "));
}

console.log(`\n=== Sunucu hatalari: ${hatalar.length} ===`);
hatalar.slice(0, 5).forEach((h) => console.log("   " + h));

await browser.close();
