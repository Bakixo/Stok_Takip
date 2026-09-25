/**
 * Faz 0 - 6. yakalama (nihai): beden checkbox'ini isaretle -> "STOK DURUMUNU SORGULA".
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";

const PDP = "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534";
await mkdir(new URL("./out/shots/", import.meta.url), { recursive: true });

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
page.on("response", async (res) => {
  const u = res.url();
  if (!/zara\.com|inditex/.test(u)) return;
  if (!/availability|physical|stock|bam\//i.test(u)) return;
  const rec = { method: res.request().method(), url: u, status: res.status(), reqHeaders: res.request().headers(), post: res.request().postData() ?? null };
  try { rec.body = await res.text(); } catch { /* yoksay */ }
  hits.push(rec);
  console.log(`  ← ${rec.status} ${rec.method} ${u.replace("https://www.zara.com", "")}`);
});

await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(7000);
try {
  const rj = page.locator("#onetrust-reject-all-handler").first();
  if (await rj.isVisible({ timeout: 3000 })) await rj.click();
} catch { /* yok */ }
await page.waitForTimeout(2000);

const acc = page.locator('button:has-text("Mağazadaki stok durumu")').first();
await acc.scrollIntoViewIfNeeded();
await acc.click();
await page.waitForTimeout(4000);

// Form icindeki beden checkbox'larini incele
const info = await page.evaluate(() => {
  const form = document.querySelector('[class*="product-stock-availability-size-selector-form"]')
    || document.querySelector('[class*="stock-availability"]');
  if (!form) return { ok: false };
  const root = form.closest("form") || form.parentElement || form;
  const boxes = [...root.querySelectorAll('input[type="checkbox"]')].map((b) => ({
    name: b.name,
    label: (b.closest("label")?.innerText || b.parentElement?.innerText || "").trim(),
  }));
  return { ok: true, formClass: form.className, boxes };
});
console.log("form bilgisi:", JSON.stringify(info, null, 1));

// M bedenini isaretle (label metnine gore)
console.log("\n--- M bedeni isaretleniyor ---");
let checked = false;
for (const label of ["M", "S", "L", "XS", "XL"]) {
  try {
    const cb = page.locator(`label:has-text("${label}") input[type="checkbox"]`).first();
    if ((await cb.count()) > 0) {
      await cb.check({ force: true, timeout: 5000 });
      console.log("isaretlendi:", label);
      checked = true;
      break;
    }
  } catch { /* dene */ }
}
if (!checked) {
  // Fallback: dogrudan name ile
  for (const n of ["size_3", "size_2", "size_1"]) {
    try {
      await page.locator(`input[name="${n}"]`).first().check({ force: true, timeout: 4000 });
      console.log("isaretlendi (name):", n);
      checked = true;
      break;
    } catch { /* dene */ }
  }
}
await page.waitForTimeout(2500);
await page.screenshot({ path: "recon/out/shots/30-checked.png" });

console.log('--- SORGULA tiklaniyor ---');
const q = page.locator('button:has-text("STOK DURUMUNU SORGULA")').first();
try {
  await q.click({ timeout: 15000 });
} catch (e) {
  console.log("buton hala pasif:", e.message.split("\n")[0]);
}
await page.waitForTimeout(10000);
await page.screenshot({ path: "recon/out/shots/31-result.png" });

const txt = await page.evaluate(() => {
  const el = document.querySelector('[class*="stock-availability"]')?.closest("div,section,aside");
  let r = el;
  for (let i = 0; i < 5 && r && r.innerText.length < 300; i++) r = r.parentElement;
  return (r?.innerText || document.body.innerText).slice(0, 2500);
});
console.log("\n--- Panel sonucu ---\n" + txt);

await writeFile(new URL("./out/stock-hits-final.json", import.meta.url), JSON.stringify(hits, null, 2));
console.log(`\n=== YAKALANAN ISTEKLER (${hits.length}) ===`);
for (const h of hits) {
  console.log(`\n${h.status} ${h.method} ${h.url}`);
  if (h.post) console.log(`POST: ${h.post.slice(0, 800)}`);
  console.log(`BODY: ${(h.body || "").slice(0, 1500)}`);
}

console.log("\n25 sn acik...");
await page.waitForTimeout(25000);
await browser.close();
