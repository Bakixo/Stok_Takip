/**
 * İki kullanıcı aynı PIN'le girdiğinde birbirinin takiplerini
 * göremiyor ve silemiyor mu?
 */
import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const PIN = process.argv[2] ?? "240917";

const browser = await chromium.launch({ channel: "chrome", headless: true });

/** Belirtilen e-postayla giriş yapmış bir tarayıcı oturumu açar. */
async function kullanici(eposta) {
  const ctx = await browser.newContext({ locale: "tr-TR", viewport: { width: 393, height: 852 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/giris`, { waitUntil: "domcontentloaded" });
  await page.fill("#pin", PIN);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  if (page.url().includes("/eposta")) {
    await page.fill("#eposta", eposta);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`, { timeout: 20000 });
  }
  return { ctx, page, eposta };
}

/** Bir ürünü takibe alır. */
async function takibeAl(page, kod) {
  await page.goto(`${BASE}/urun?giris=${encodeURIComponent(kod)}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[role="radiogroup"][aria-label="Beden"]', { timeout: 40000 });
  await page.waitForTimeout(1000);

  const bedenler = page.locator('[role="radiogroup"][aria-label="Beden"] button');
  let sec = 0;
  for (let i = 0; i < (await bedenler.count()); i++) {
    const e = (await bedenler.nth(i).getAttribute("aria-label")) ?? "";
    if (/Tükendi/.test(e)) { sec = i; break; }
  }
  await bedenler.nth(sec).click();
  await page.waitForTimeout(800);
  await page.fill('input[aria-label="Şehir ara"]', "istanbul");
  await page.waitForTimeout(500);
  await page.click('button:has-text("İstanbul")');
  await page.waitForTimeout(3000);
  const btn = page.locator('button:has-text("Takibe Al")');
  if ((await btn.count()) > 0) {
    await btn.click();
    await page.waitForTimeout(4000);
    return true;
  }
  return false;
}

/** Takiplerim sayfasındaki ürün adları. */
async function takipler(page) {
  await page.goto(`${BASE}/takiplerim`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  return page.evaluate(() =>
    [...document.querySelectorAll("li p")]
      .map((e) => e.textContent?.trim() ?? "")
      .filter((t) => /GÖMLEK|SWEATSHIRT|PANTOLON|TİŞÖRT/i.test(t)),
  );
}

console.log("=== Kullanici A: ayse@ornek.com ===");
const a = await kullanici("ayse@ornek.com");
const aEkledi = await takibeAl(a.page, "7701/256");
console.log("  takip eklendi:", aEkledi);
console.log("  kendi listesi :", await takipler(a.page));

console.log("\n=== Kullanici B: burak@ornek.com (ayni PIN) ===");
const b = await kullanici("burak@ornek.com");
const bListe = await takipler(b.page);
console.log("  gordugu liste :", bListe.length ? bListe : "(bos)");

console.log(
  bListe.length === 0
    ? "\n  [X] IZOLASYON CALISIYOR — B, A'nin takibini gormuyor"
    : "\n  [!] SIZINTI — B, A'nin takibini goruyor",
);

// B, A'nın takibini silebiliyor mu?
console.log("\n=== B, A'nin takibini silmeye calisiyor ===");
const silSonuc = await b.page.evaluate(async () => {
  const r = await fetch("/takiplerim");
  return r.status;
});
console.log("  (dogrudan server action cagrisi tarayicidan yapilamiyor, sahiplik");
console.log("   kontrolu sunucuda: cancelWatch where:{ id, email })");
void silSonuc;

await browser.close();
