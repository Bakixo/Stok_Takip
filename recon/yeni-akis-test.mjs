/**
 * Yeni akışı yerelde sınar: PIN → e-posta sorusu → ana sayfa (yaprak animasyonu)
 * → ürün → tek dokunuşla takibe al.
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3000";
const PIN = process.argv[2] ?? "2409";

await mkdir("recon/out/yeni", { recursive: true });

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
page.on("console", (m) => m.type() === "error" && hatalar.push(m.text()));

const ss = async (n) => {
  await page.screenshot({ path: `recon/out/yeni/${n}.png` });
  console.log(`   [ss] ${n}.png`);
};

console.log("1) Giris");
await page.goto(`${BASE}/giris`, { waitUntil: "networkidle" });
await page.fill("#pin", PIN);
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
console.log("   url:", page.url());

console.log("2) E-posta sorulmali");
if (!page.url().includes("/eposta")) {
  console.log("   [!] e-posta sayfasina yonlendirmedi");
} else {
  console.log("   [X] /eposta sayfasina yonlendirdi");
}
await ss("01-eposta-sorusu");
console.log("   " + (await page.locator("h1").first().innerText()));

console.log("3) E-posta giriliyor");
await page.fill("#eposta", "firuze@ornek.com");
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/`, { timeout: 20000 });
// Yaprak animasyonu tam ortasindayken yakala
await page.waitForTimeout(2200);
await ss("02-yapraklar");

const yaprakSayisi = await page.evaluate(
  () => document.querySelectorAll('[aria-hidden="true"] span').length,
);
console.log(`   ekranda ${yaprakSayisi} yaprak ogesi var`);

await page.waitForTimeout(2000);
await ss("03-ana");

console.log("4) Urun → tek dokunusla takibe al");
await page.fill('input[aria-label="Zara linki veya ürün kodu"]', "7701/256");
await page.click('button[type="submit"]');
await page.waitForURL(/\/urun/, { timeout: 40000 });
await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 40000 });
await page.waitForTimeout(1200);

const bedenler = page.locator('[role="radiogroup"][aria-label="Beden"] button');
let secilen = 0;
for (let i = 0; i < (await bedenler.count()); i++) {
  const e = (await bedenler.nth(i).getAttribute("aria-label")) ?? "";
  if (/Tükendi/.test(e)) { secilen = i; break; }
}
await bedenler.nth(secilen).click();
await page.waitForTimeout(1000);

await page.fill('input[aria-label="Şehir ara"]', "istanbul");
await page.waitForTimeout(600);
await page.click('button:has-text("İstanbul")');
await page.waitForTimeout(3500);
await ss("04-sonuc");

const epostaKutusu = await page.locator("#email").count();
console.log(`   e-posta kutusu var mi: ${epostaKutusu > 0 ? "EVET (olmamali)" : "hayir (dogru)"}`);

const panel = await page.locator("section").last().innerText();
console.log("   " + panel.split("\n").filter(Boolean).slice(0, 6).join("\n   "));

console.log(`\n=== Hatalar: ${hatalar.length} ===`);
hatalar.slice(0, 6).forEach((h) => console.log("   " + h.slice(0, 160)));

await browser.close();
