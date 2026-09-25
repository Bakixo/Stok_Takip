/**
 * Faz 0 - 4. yakalama: "Magazadaki stok durumu" akisi.
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const PDP = "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534";
const OUT = new URL("./out/", import.meta.url);
const SHOT = new URL("./out/shots/", import.meta.url);
await mkdir(SHOT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  viewport: { width: 1366, height: 950 },
  geolocation: { latitude: 41.0082, longitude: 28.9784 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();

const hits = [];
page.on("request", (req) => {
  const u = req.url();
  if (/availability|physical|stock|bam\/|store.*product/i.test(u) && /zara\.com|inditex/.test(u)) {
    console.log(`  → ${req.method()} ${u.replace("https://www.zara.com", "")}`);
    if (req.postData()) console.log(`     POST: ${req.postData().slice(0, 600)}`);
  }
});
page.on("response", async (res) => {
  const u = res.url();
  if (!/zara\.com|inditex/.test(u)) return;
  if (!/availability|physical|stock|bam\/|store.*product/i.test(u)) return;
  const rec = { method: res.request().method(), url: u, status: res.status(), reqHeaders: res.request().headers(), post: res.request().postData() ?? null };
  try { rec.body = (await res.text()).slice(0, 8000); } catch { /* yoksay */ }
  hits.push(rec);
  console.log(`  ← ${rec.status} ${u.replace("https://www.zara.com", "")}`);
});

const shot = async (n) => { await page.screenshot({ path: `recon/out/shots/${n}.png` }); console.log(`   [ss] ${n}.png`); };

await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(7000);
try {
  const rj = page.locator("#onetrust-reject-all-handler").first();
  if (await rj.isVisible({ timeout: 3000 })) await rj.click();
} catch { /* yok */ }
await page.waitForTimeout(2000);

console.log('\n--- "Magazadaki stok durumu" tiklaniyor ---');
const btn = page.locator('button:has-text("Mağazadaki stok durumu")').first();
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(6000);
await shot("10-stock-panel");

// Panelde ne var?
const panelText = await page.evaluate(() => document.body.innerText.slice(0, 4000));
console.log("\n--- Panel metni (kesit) ---");
console.log(panelText.split("\n").filter((l) => l.trim()).slice(0, 45).join("\n"));

// Sehir/konum girisi varsa doldur
const inputs = await page.evaluate(() =>
  [...document.querySelectorAll("input")]
    .filter((e) => e.offsetParent !== null)
    .map((e) => ({ type: e.type, name: e.name, ph: e.placeholder, id: e.id })),
);
console.log("\n--- Gorunur inputlar ---");
console.log(JSON.stringify(inputs, null, 1));

// Beden secip tekrar dene
console.log("\n--- Beden secilip tekrar deneniyor ---");
for (const s of ["XS", "S", "M", "L", "XL"]) {
  try {
    const b = page.locator(`button:text-is("${s}")`).first();
    if (await b.isVisible({ timeout: 1500 })) { await b.click(); console.log("beden secildi:", s); await page.waitForTimeout(5000); break; }
  } catch { /* dene */ }
}
await shot("11-after-size");

// Sehir arama kutusu varsa Istanbul yaz
for (const sel of ['input[placeholder*="ehir"]', 'input[placeholder*="onum"]', 'input[type="search"]', 'input[placeholder*="ara"]', 'input[placeholder*="Ara"]']) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 1500 })) {
      await el.fill("İstanbul");
      console.log("sehir yazildi:", sel);
      await page.waitForTimeout(2000);
      await el.press("Enter");
      await page.waitForTimeout(6000);
      break;
    }
  } catch { /* dene */ }
}
await shot("12-after-city");

const finalText = await page.evaluate(() => document.body.innerText.slice(0, 3000));
console.log("\n--- Son panel metni ---");
console.log(finalText.split("\n").filter((l) => l.trim()).slice(0, 40).join("\n"));

await writeFile(new URL("./stock-hits.json", OUT), JSON.stringify(hits, null, 2));
console.log(`\n=== YAKALANAN STOK ISTEKLERI (${hits.length}) ===`);
for (const h of hits) {
  console.log(`\n${h.status} ${h.method} ${h.url}`);
  if (h.post) console.log(`POST: ${h.post.slice(0, 500)}`);
  console.log(`BODY: ${(h.body || "").slice(0, 900)}`);
}

console.log("\n30 sn acik kaliyor...");
await page.waitForTimeout(30000);
await browser.close();
