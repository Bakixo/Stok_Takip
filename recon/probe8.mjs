/**
 * Faz 0 - 8. tur: yerellestirme (TR isimler) + urun kodundan/linkten cozumleme.
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const S = 11766, PID = 580760534, SEO = "08059577";

const mk = (extra = {}) => ({
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.zara.com/tr/tr/",
  ...extra,
});

async function hit(label, url, headers = mk()) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    const t = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(t.slice(0, 400));
    const tag = deny ? "WAF" : res.status === 200 ? "OK " : String(res.status);
    console.log(`[${tag.padEnd(4)}] ${String(t.length).padStart(7)}b  ${label}`);
    return { label, url, status: res.status, body: t };
  } catch (e) {
    console.log(`[ERR ]        0b  ${label} ${e?.message}`);
    return { label, url, status: 0, body: "" };
  }
}
const nap = () => new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));

const A = `https://www.zara.com/api/storefront/1/stores/${S}`;

console.log("=== 1) Yerellestirme denemeleri (urun adi TR olmali) ===");
const locVariants = [
  ["locale=tr_TR", `${A}/products/id/${PID}?locale=tr_TR`],
  ["languageId=240", `${A}/products/id/${PID}?languageId=240`],
  ["lang=tr", `${A}/products/id/${PID}?lang=tr`],
  ["locale=tr-TR", `${A}/products/id/${PID}?locale=tr-TR`],
  ["parametresiz", `${A}/products/id/${PID}`],
];
for (const [l, u] of locVariants) {
  const r = await hit(l, u);
  try {
    const j = JSON.parse(r.body);
    const c = j.simplifiedCommercialComponent;
    console.log(`        ad="${c?.name}"  renk="${c?.color?.name}"`);
  } catch { /* json degil */ }
  await nap();
}

console.log("\n=== 2) Accept-Language ile yerellestirme ===");
{
  const r = await hit("Accept-Language: tr-TR (tek)", `${A}/products/id/${PID}`, mk({ "Accept-Language": "tr-TR" }));
  try {
    const c = JSON.parse(r.body).simplifiedCommercialComponent;
    console.log(`        ad="${c?.name}" renk="${c?.color?.name}"`);
  } catch { /* yoksay */ }
  await nap();
}

console.log("\n=== 3) Urun koduyla arama (kullanici '8059/577' yazarsa) ===");
const searchVariants = [
  ["search-products ajax", `https://www.zara.com/tr/tr/search-products?searchTerm=${SEO}&ajax=true`],
  ["search ajax", `https://www.zara.com/tr/tr/search?searchTerm=${SEO}&ajax=true`],
  ["storefront search", `${A}/search?query=${SEO}`],
  ["storefront products by reference", `${A}/products/reference/${SEO}`],
  ["catalog search itxrest", `https://www.zara.com/itxrest/1/catalog/store/${S}/productsArray?productIds=${PID}&languageId=240`],
];
for (const [l, u] of searchVariants) {
  const r = await hit(l, u);
  console.log(`        ${r.body.slice(0, 200).replace(/\s+/g, " ")}`);
  await nap();
}

console.log("\n=== 4) Derin link (renk+beden onceden secili) test URL'leri ===");
console.log(`  temel : https://www.zara.com/tr/tr/-p${SEO}.html?v1=${PID}`);
console.log(`  +beden: https://www.zara.com/tr/tr/-p${SEO}.html?v1=${PID}&size=580756907`);
