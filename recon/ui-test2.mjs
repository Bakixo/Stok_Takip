/**
 * Faz 2 arayüz testi — 2. tur: çok renkli ürün, renk değiştirme,
 * tükenmiş beden → "Takibe Al" akışı.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const PIN = "1234";

await mkdir("recon/out/ui", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const shot = async (n) => {
  await page.screenshot({ path: `recon/out/ui/${n}.png` });
  console.log(`   [ss] ${n}.png`);
};

// giriş
await page.goto(`${BASE}/giris`, { waitUntil: "networkidle" });
await page.fill("#pin", PIN);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 20000 });

console.log("1) Çok renkli ürün (kod ile)");
await page.fill('input[aria-label="Zara linki veya ürün kodu"]', "7701/256");
await page.click('button[type="submit"]');
await page.waitForURL(/\/urun/, { timeout: 30000 });
await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 40000 });
await page.waitForTimeout(1500);
await shot("10-cokrenkli");

const swatches = page.locator('[role="radiogroup"][aria-label="Renk"] button');
const colorCount = await swatches.count();
console.log(`   renk sayısı: ${colorCount}${colorCount === 0 ? " (tek renk — bölüm gizli)" : ""}`);

if (colorCount > 1) {
  console.log("2) Renk değiştiriliyor");
  await swatches.nth(Math.min(2, colorCount - 1)).click();
  await page.waitForTimeout(2500);
  await shot("11-renk-degisti");
} else {
  console.log("2) Renk değiştirme atlandı");
}

console.log("3) Tükenmiş beden aranıyor");
const sizes = page.locator('[role="radiogroup"][aria-label="Beden"] button');
const n = await sizes.count();
let picked = -1;
for (let i = 0; i < n; i++) {
  const label = await sizes.nth(i).getAttribute("aria-label");
  console.log(`   ${label}`);
  if (picked < 0 && /Tükendi|Çok yakında/.test(label ?? "")) picked = i;
}
if (picked < 0) {
  console.log("   (tükenmiş beden yok, ilki seçiliyor)");
  picked = 0;
}
await sizes.nth(picked).click();
await page.waitForTimeout(1200);

console.log("4) Şehir: Ankara");
await page.waitForSelector('input[aria-label="Şehir ara"]', { timeout: 15000 });
await page.fill('input[aria-label="Şehir ara"]', "ankara");
await page.waitForTimeout(600);
await page.click('button:has-text("Ankara")');
await page.waitForTimeout(3500);
await shot("12-sonuc");

const panel = await page.locator("section").last().innerText();
console.log("   panel:\n   " + panel.split("\n").filter(Boolean).slice(0, 8).join("\n   "));

// Takibe alma formu varsa doldur
const emailInput = page.locator("#email");
if ((await emailInput.count()) > 0) {
  console.log("\n5) Takibe alınıyor");
  await emailInput.fill("arkadas@example.com");
  await page.waitForTimeout(400);
  await page.click('button:has-text("Takibe Al")');
  await page.waitForTimeout(3000);
  await shot("13-takibe-alindi");
  const done = await page.locator("section").last().innerText();
  console.log("   " + done.split("\n").filter(Boolean).slice(0, 5).join("\n   "));
} else {
  console.log("\n5) Beden stokta — 'Ürüne Git' gösteriliyor (takip formu yok)");
}

console.log("\n6) Takiplerim");
await page.goto(`${BASE}/takiplerim`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await shot("14-takiplerim");

console.log(`\n=== Konsol hataları: ${errors.length} ===`);
errors.slice(0, 10).forEach((e) => console.log(`   ${e.slice(0, 180)}`));

await browser.close();
