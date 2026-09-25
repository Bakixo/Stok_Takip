/**
 * Faz 0 - gercek tarayici ile ag yakalama.
 * Zara PDP'sini gercek Chrome ile acar, sitenin kendi XHR/fetch isteklerini kaydeder.
 * Amac: beden/SKU ve magaza stok endpoint'lerinin GERCEK cagri seklini gormek.
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const PDP = "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534";
const OUT = new URL("./out/", import.meta.url);
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  headless: false, // Akamai headless'i kolay yakalar; gorunur pencere daha gercekci
});
const ctx = await browser.newContext({
  locale: "tr-TR",
  timezoneId: "Europe/Istanbul",
  viewport: { width: 1366, height: 900 },
  geolocation: { latitude: 41.0082, longitude: 28.9784 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();

/** Ilginc olan tum ag trafigi. */
const calls = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/zara\.com/.test(url)) return;
  if (/\.(png|jpg|jpeg|webp|avif|svg|woff2?|css|gif|ico|mp4)(\?|$)/i.test(url)) return;
  const req = res.request();
  const rec = {
    method: req.method(),
    url,
    status: res.status(),
    resourceType: req.resourceType(),
    reqHeaders: req.headers(),
    postData: req.postData()?.slice(0, 1500) ?? null,
    ct: res.headers()["content-type"] ?? "",
  };
  try {
    if (/json/i.test(rec.ct)) {
      const body = await res.text();
      rec.bytes = body.length;
      rec.bodyHead = body.slice(0, 2500);
    }
  } catch {
    /* gövde okunamadi */
  }
  calls.push(rec);
});

console.log("PDP aciliyor:", PDP);
await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90000 });

// Akamai interstitial olabilir; cozulmesini bekle
await page.waitForTimeout(8000);
console.log("Baslik:", await page.title());
console.log("URL   :", page.url());

// Cerez banner'i varsa kapat (gizliligi koruyan secenek)
for (const sel of ['#onetrust-reject-all-handler', 'button:has-text("Reddet")', 'button:has-text("Tümünü reddet")']) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2500 })) {
      await el.click();
      console.log("Cerez banneri reddedildi:", sel);
      break;
    }
  } catch {
    /* yok */
  }
}
await page.waitForTimeout(3000);

// Sayfadaki gomulu uygulama durumunu al (bedenler burada olabilir)
const state = await page.evaluate(() => {
  const w = /** @type {any} */ (window);
  const pick = (o) => {
    try {
      return JSON.parse(JSON.stringify(o));
    } catch {
      return null;
    }
  };
  return {
    keys: Object.keys(w).filter((k) => /zara|state|initial|preload|__/i.test(k)).slice(0, 40),
    appConfigStoreId: w?.zara?.appConfig?.storeId ?? null,
    viewPayload: pick(w?.zara?.viewPayload) ?? null,
  };
});
await writeFile(new URL("./browser-state.json", OUT), JSON.stringify(state, null, 2));
console.log("window anahtarlari:", state.keys.join(", "));

await writeFile(new URL("./browser-calls.json", OUT), JSON.stringify(calls, null, 2));
console.log(`\n${calls.length} istek kaydedildi -> recon/out/browser-calls.json`);
console.log("\n=== JSON donen istekler ===");
for (const c of calls.filter((c) => /json/i.test(c.ct))) {
  console.log(`${c.status} ${c.method} ${c.url.slice(0, 150)}`);
}

await browser.close();
