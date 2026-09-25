/**
 * Faz 0 - 5. yakalama: "MAGAZADAKI STOK DURUMU" panelinde beden secip
 * "STOK DURUMUNU SORGULA" butonuna basarak gercek magaza stok istegini yakala.
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
  const rec = {
    method: res.request().method(),
    url: u,
    status: res.status(),
    reqHeaders: res.request().headers(),
    post: res.request().postData() ?? null,
  };
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

console.log('--- Panel aciliyor ---');
const acc = page.locator('button:has-text("Mağazadaki stok durumu")').first();
await acc.scrollIntoViewIfNeeded();
await acc.click();
await page.waitForTimeout(4000);

// Panelin kendi icindeki beden chip'ini sec ("STOK DURUMUNU SORGULA" ile ayni kapsayicida)
console.log('--- Panel icinde M bedeni seciliyor ---');
const picked = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const query = btns.find((b) => /STOK DURUMUNU SORGULA/i.test(b.textContent || ""));
  if (!query) return { ok: false, reason: "sorgula butonu yok" };
  // Sorgula butonunun kapsayicisinda beden chiplerini bul
  let root = query.parentElement;
  for (let i = 0; i < 5 && root; i++) {
    const chips = [...root.querySelectorAll("button")].filter((b) =>
      /^(XS|S|M|L|XL|XXL)$/i.test((b.textContent || "").trim()),
    );
    if (chips.length >= 3) {
      const m = chips.find((c) => (c.textContent || "").trim().toUpperCase() === "M") || chips[0];
      m.click();
      return { ok: true, size: (m.textContent || "").trim(), chipCount: chips.length };
    }
    root = root.parentElement;
  }
  return { ok: false, reason: "beden chipleri bulunamadi" };
});
console.log("beden secimi:", JSON.stringify(picked));
await page.waitForTimeout(2500);
await page.screenshot({ path: "recon/out/shots/20-size-picked.png" });

console.log('--- "STOK DURUMUNU SORGULA" tiklaniyor ---');
const q = page.locator('button:has-text("STOK DURUMUNU SORGULA")').first();
await q.scrollIntoViewIfNeeded();
await q.click();
await page.waitForTimeout(9000);
await page.screenshot({ path: "recon/out/shots/21-stock-result.png" });

const txt = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")];
  const q = btns.find((b) => /STOK DURUMUNU SORGULA|MAĞAZALARI/i.test(b.textContent || ""));
  let root = q?.closest("section,aside,div[class*=store],div[class*=stock]") || document.body;
  for (let i = 0; i < 4 && root && root.innerText.length < 200; i++) root = root.parentElement;
  return (root?.innerText || "").slice(0, 2500);
});
console.log("\n--- Panel sonucu ---\n" + txt);

// Konum/sehir istenirse doldur
const inputs = await page.evaluate(() =>
  [...document.querySelectorAll("input")].filter((e) => e.offsetParent !== null)
    .map((e) => ({ type: e.type, ph: e.placeholder, name: e.name })),
);
console.log("\n--- gorunur inputlar ---\n" + JSON.stringify(inputs));

await writeFile(new URL("./out/stock-hits2.json", import.meta.url), JSON.stringify(hits, null, 2));
console.log(`\n=== YAKALANAN (${hits.length}) ===`);
for (const h of hits) {
  console.log(`\n${h.status} ${h.method} ${h.url}`);
  if (h.post) console.log(`POST: ${h.post.slice(0, 600)}`);
  console.log(`BODY: ${(h.body || "").slice(0, 1200)}`);
}

console.log("\n25 sn acik...");
await page.waitForTimeout(25000);
await browser.close();
