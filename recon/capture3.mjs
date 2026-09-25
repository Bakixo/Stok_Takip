/**
 * Faz 0 - 3. yakalama: "magazada bul" akisini adim adim yurut, ekran goruntusu al,
 * fiziksel magaza stok isteginin gercek halini yakala.
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
  viewport: { width: 1366, height: 900 },
  geolocation: { latitude: 41.0082, longitude: 28.9784 },
  permissions: ["geolocation"],
});
const page = await ctx.newPage();

const calls = [];
const interesting = [];
page.on("response", async (res) => {
  const url = res.url();
  if (!/zara\.com|inditex\.com/.test(url)) return;
  if (/\.(png|jpg|jpeg|webp|avif|svg|woff2?|css|gif|ico|mp4)(\?|$)/i.test(url)) return;
  const ct = res.headers()["content-type"] ?? "";
  const rec = { method: res.request().method(), url, status: res.status(), ct, post: res.request().postData()?.slice(0, 1000) ?? null };
  if (/json/i.test(ct)) {
    try { rec.body = (await res.text()).slice(0, 5000); } catch { /* yoksay */ }
  }
  calls.push(rec);
  if (/availability|physical|store.*stock|stock.*store|bam\//i.test(url)) {
    interesting.push(rec);
    console.log(`  >>> ILGINC: ${rec.status} ${rec.method} ${url.replace("https://www.zara.com", "")}`);
  }
});

const shot = async (n) => { await page.screenshot({ path: new URL(`./${n}.png`, SHOT).pathname.replace(/^\//, ""), fullPage: false }); console.log(`   [ss] ${n}.png`); };

await page.goto(PDP, { waitUntil: "domcontentloaded", timeout: 90000 });
await page.waitForTimeout(7000);
try {
  const rj = page.locator("#onetrust-reject-all-handler").first();
  if (await rj.isVisible({ timeout: 3000 })) { await rj.click(); console.log("cerez reddedildi"); }
} catch { /* yok */ }
await page.waitForTimeout(2500);
await shot("01-pdp");

// Sayfadaki tum gorunur buton/link metinleri
const listButtons = async (tag) => {
  const t = await page.evaluate(() =>
    [...document.querySelectorAll("button,a,[role=button]")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => (e.textContent || "").trim().replace(/\s+/g, " "))
      .filter((t) => t && t.length > 1 && t.length < 50),
  );
  console.log(`\n[${tag}] gorunur butonlar (${t.length}):`);
  console.log("   " + [...new Set(t)].join(" | "));
  return t;
};
await listButtons("PDP");

// 1) Beden secicisini ac
console.log("\n--- Beden secici aciliyor ---");
for (const sel of ['button:has-text("BEDEN SEÇ")', 'button:has-text("Beden seç")', 'button:has-text("EKLE")', 'button:has-text("SEPETE")']) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 })) { await el.click(); console.log("tiklandi:", sel); await page.waitForTimeout(3000); break; }
  } catch { /* dene */ }
}
await shot("02-size-panel");
await listButtons("BEDEN PANELI");

// 2) Bir beden sec (M)
console.log("\n--- M bedeni seciliyor ---");
for (const sel of ['button:has-text("M"):not(:has-text("XM"))', '[data-qa-action="size-in-stock"]']) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 })) { await el.click(); console.log("tiklandi:", sel); await page.waitForTimeout(3000); break; }
  } catch { /* dene */ }
}
await shot("03-size-selected");
await listButtons("BEDEN SECILDI");

// 3) Magaza bul
console.log("\n--- Magazada bul araniyor ---");
for (const sel of [
  'button:has-text("MAĞAZADA BUL")', 'button:has-text("Mağazada bul")',
  'button:has-text("MAĞAZALARDA")', 'button:has-text("MAĞAZADA")',
  'a:has-text("MAĞAZADA BUL")',
]) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 })) {
      await el.click();
      console.log("tiklandi:", sel);
      await page.waitForTimeout(8000);
      break;
    }
  } catch { /* dene */ }
}
await shot("04-store-modal");
await listButtons("MAGAZA MODAL");

await writeFile(new URL("./browser-calls3.json", OUT), JSON.stringify(calls, null, 2));
await writeFile(new URL("./interesting-calls.json", OUT), JSON.stringify(interesting, null, 2));
console.log(`\n=== ILGINC ISTEKLER (${interesting.length}) ===`);
for (const c of interesting) console.log(`${c.status} ${c.method} ${c.url}\n   ${(c.body || "").slice(0, 300)}`);

console.log("\nTarayici 20 sn acik kalacak (manuel inceleme icin)...");
await page.waitForTimeout(20000);
await browser.close();
