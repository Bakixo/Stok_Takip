/**
 * Faz 0 - 2. yakalama: beden adlari + "magazada bul" (store stock) endpoint'ini tetikle.
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const PDP = "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534";
const OUT = new URL("./out/", import.meta.url);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  viewport: { width: 1366, height: 900 },
  geolocation: { latitude: 41.0082, longitude: 28.9784 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();

const calls = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/zara\.com/.test(url)) return;
  if (/\.(png|jpg|jpeg|webp|avif|svg|woff2?|css|gif|ico|mp4)(\?|$)/i.test(url)) return;
  const ct = res.headers()["content-type"] ?? "";
  const rec = { method: res.request().method(), url, status: res.status(), ct, postData: res.request().postData()?.slice(0, 1200) ?? null };
  if (/json/i.test(ct)) {
    try {
      const b = await res.text();
      rec.bytes = b.length;
      rec.bodyHead = b.slice(0, 4000);
    } catch { /* yoksay */ }
  }
  calls.push(rec);
});

await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(7000);
try {
  const rj = page.locator("#onetrust-reject-all-handler").first();
  if (await rj.isVisible({ timeout: 3000 })) await rj.click();
} catch { /* banner yok */ }
await page.waitForTimeout(2500);

// --- 1) Sayfadaki urun durumunu cek (beden adlari icin) ---
const product = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const seen = new Set();
  let found = null;
  // window.zara agacinda bedenleri olan urun nesnesini ara
  const visit = (o, depth) => {
    if (found || !o || typeof o !== "object" || depth > 7 || seen.has(o)) return;
    seen.add(o);
    if (Array.isArray(o?.sizes) && o.sizes.some((s) => s && s.sku && s.name)) {
      found = o;
      return;
    }
    for (const v of Object.values(o)) visit(v, depth + 1);
  };
  visit(w.zara, 0);
  try {
    return JSON.parse(JSON.stringify(found));
  } catch {
    return null;
  }
});
await writeFile(new URL("./pdp-product.json", OUT), JSON.stringify(product, null, 2));
console.log("Sayfadan urun nesnesi:", product ? "BULUNDU" : "yok");
if (product?.sizes) {
  console.log("Bedenler:");
  for (const s of product.sizes) console.log(`  sku=${s.sku} name=${s.name} avail=${s.availability}`);
}

// --- 2) "Magazada bul" akisini tetikle ---
console.log("\n--- Magaza stok akisi araniyor ---");
const SIZE_TRIGGERS = ['button:has-text("BEDEN")', 'button:has-text("Beden")', '[data-qa-action="size-selector"]'];
for (const sel of SIZE_TRIGGERS) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2500 })) {
      await el.click();
      console.log("Beden seciciye tiklandi:", sel);
      await page.waitForTimeout(2500);
      break;
    }
  } catch { /* dene */ }
}

const STORE_TRIGGERS = [
  'button:has-text("MAĞAZADA")', 'button:has-text("Mağazada")',
  'a:has-text("MAĞAZADA")', 'button:has-text("mağaza")',
  '[data-qa-action*="store"]', '[data-qa-id*="store"]',
];
let clicked = false;
for (const sel of STORE_TRIGGERS) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2500 })) {
      await el.click();
      console.log("Magaza butonuna tiklandi:", sel);
      clicked = true;
      await page.waitForTimeout(6000);
      break;
    }
  } catch { /* dene */ }
}
if (!clicked) {
  console.log("Magaza butonu bulunamadi. Gorunur buton metinleri:");
  const texts = await page.evaluate(() =>
    [...document.querySelectorAll("button,a")]
      .map((e) => e.textContent?.trim())
      .filter((t) => t && t.length > 1 && t.length < 45)
      .slice(0, 60),
  );
  console.log(texts.join(" | "));
}

await writeFile(new URL("./browser-calls2.json", OUT), JSON.stringify(calls, null, 2));
console.log(`\n=== Tum JSON istekleri (${calls.length} toplam) ===`);
for (const c of calls.filter((c) => /json/i.test(c.ct))) {
  console.log(`${c.status} ${c.method} ${c.url.replace("https://www.zara.com", "")}`);
}

await browser.close();
