/**
 * Faz 2 arayüz testi: PIN girişi → ürün çözümleme → renk/beden/şehir →
 * takibe alma. Her adımda mobil boyutta ekran görüntüsü alır.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const PIN = "1234";
const PRODUCT = "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534";

await mkdir("recon/out/ui", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  // iPhone 14 Pro benzeri
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const shot = async (n) => {
  await page.screenshot({ path: `recon/out/ui/${n}.png` });
  console.log(`   [ss] ${n}.png`);
};

console.log("1) Giriş sayfası");
await page.goto(`${BASE}/giris`, { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await shot("01-giris");

console.log("2) PIN giriliyor");
await page.fill("#pin", PIN);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 20000 });
await page.waitForTimeout(1200);
await shot("02-ana");

console.log("3) Ürün linki yapıştırılıyor");
await page.fill('input[aria-label="Zara linki veya ürün kodu"]', PRODUCT);
await page.waitForTimeout(400);
await page.click('button[type="submit"]');
await page.waitForURL(/\/urun/, { timeout: 30000 });
// Ürün + bedenler yüklensin
await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 40000 });
await page.waitForTimeout(1200);
await shot("03-urun");

const title = await page.locator("h1").first().textContent();
console.log(`   ürün başlığı: ${title?.trim()}`);

console.log("4) Beden seçiliyor");
const sizeButtons = page.locator('[role="radiogroup"][aria-label="Beden"] button');
const sizeCount = await sizeButtons.count();
console.log(`   ${sizeCount} beden bulundu`);
await sizeButtons.first().click();
await page.waitForTimeout(1000);
await shot("04-beden-secildi");

console.log("5) Şehir seçiliyor");
await page.waitForSelector('input[aria-label="Şehir ara"]', { timeout: 15000 });
await page.fill('input[aria-label="Şehir ara"]', "istanbul");
await page.waitForTimeout(700);
await page.click('button:has-text("İstanbul")');
await page.waitForTimeout(3500);
await shot("05-sonuc");

const resultText = await page.locator("section").last().innerText();
console.log("   sonuç paneli:");
console.log("   " + resultText.split("\n").filter(Boolean).slice(0, 10).join("\n   "));

console.log("\n6) Takiplerim");
await page.goto(`${BASE}/takiplerim`, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await shot("06-takiplerim");

console.log("\n7) Koyu mod");
await ctx.close();
const darkCtx = await browser.newContext({
  locale: "tr-TR",
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "dark",
});
const darkPage = await darkCtx.newPage();
await darkPage.goto(`${BASE}/giris`, { waitUntil: "networkidle" });
await darkPage.waitForTimeout(900);
await darkPage.screenshot({ path: "recon/out/ui/07-koyu-giris.png" });
console.log("   [ss] 07-koyu-giris.png");

await darkPage.fill("#pin", PIN);
await darkPage.click('button[type="submit"]');
await darkPage.waitForURL(`${BASE}/`, { timeout: 20000 });
await darkPage.waitForTimeout(1400);
await darkPage.screenshot({ path: "recon/out/ui/08-koyu-ana.png" });
console.log("   [ss] 08-koyu-ana.png");

console.log(`\n=== Konsol hataları: ${errors.length} ===`);
for (const e of errors.slice(0, 12)) console.log(`   ${e.slice(0, 200)}`);

await browser.close();
