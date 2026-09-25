/**
 * Faz 0 - arama API'sini yakala (kullanici urun kodu yazarsa cozumleme icin).
 */
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const browser = await chromium.launch({ channel: "chrome", headless: false });
const ctx = await browser.newContext({ locale: "tr-TR", timezoneId: "Europe/Istanbul", viewport: { width: 1366, height: 900 } });
const page = await ctx.newPage();

const hits = [];
page.on("response", async (res) => {
  const u = res.url();
  if (!/zara\.com/.test(u)) return;
  if (!/search|typeahead|suggest|query/i.test(u)) return;
  const ct = res.headers()["content-type"] ?? "";
  if (!/json/i.test(ct)) return;
  const rec = { method: res.request().method(), url: u, status: res.status(), post: res.request().postData() ?? null };
  try { rec.body = (await res.text()).slice(0, 3000); } catch { /* yoksay */ }
  hits.push(rec);
  console.log(`  ← ${rec.status} ${rec.method} ${u.replace("https://www.zara.com", "").slice(0, 160)}`);
});

await page.goto("https://www.zara.com/tr/tr/search?searchTerm=08059577", { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(9000);
try {
  const rj = page.locator("#onetrust-reject-all-handler").first();
  if (await rj.isVisible({ timeout: 3000 })) await rj.click();
} catch { /* yok */ }
await page.waitForTimeout(6000);
await page.screenshot({ path: "recon/out/shots/40-search.png" });

const txt = await page.evaluate(() => document.body.innerText.slice(0, 900));
console.log("\n--- sayfa metni ---\n" + txt.split("\n").filter((l) => l.trim()).slice(0, 20).join("\n"));

await writeFile(new URL("./out/search-hits.json", import.meta.url), JSON.stringify(hits, null, 2));
console.log(`\n=== ARAMA ISTEKLERI (${hits.length}) ===`);
for (const h of hits) {
  console.log(`\n${h.status} ${h.method} ${h.url}`);
  if (h.post) console.log(`POST: ${h.post.slice(0, 400)}`);
  console.log(`BODY: ${(h.body || "").slice(0, 700)}`);
}
await browser.close();
