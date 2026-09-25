/**
 * Faz 0 - 3. tur: cerezli oturum + itxrest stockInStore endpoint'inin parametrelerini bulma.
 *
 * Bulunan sabitler (app shell'den):
 *   storeId   = 11766   (Zara Turkiye)
 *   catalogId = 33054
 *   langId    = 240
 *   stockInStore = /itxrest/1/bam/store/{storeId}/physical-store/product/availability
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const STORE_ID = 11766;
const LANG_ID = 240;
const PRODUCT_ID = 580760534;

/** Basit cerez kavanozu: Set-Cookie topla, sonraki isteklerde geri gonder. */
const jar = new Map();
function absorb(res) {
  const raw = res.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

function baseHeaders(extra = {}) {
  const h = {
    "User-Agent": UA,
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    ...extra,
  };
  const c = cookieHeader();
  if (c) h.Cookie = c;
  return h;
}

async function hit(label, url, extraHeaders = {}) {
  try {
    const res = await fetch(url, {
      headers: baseHeaders({
        Accept: "application/json, text/plain, */*",
        Referer: "https://www.zara.com/tr/tr/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        ...extraHeaders,
      }),
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    absorb(res);
    const body = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(body.slice(0, 500));
    const chal = /bm-verify|_sec\/verify/i.test(body.slice(0, 1200));
    const tag = deny ? "WAF_DENY" : chal ? "CHALLENGE" : res.status === 200 ? "OK" : String(res.status);
    console.log(`[${tag.padEnd(10)}] ${String(res.status).padStart(3)} ${String(body.length).padStart(8)}b  ${label}`);
    if (!deny && !chal) console.log(`     ${body.slice(0, 300).replace(/\s+/g, " ")}`);
    return { label, url, status: res.status, tag, body };
  } catch (e) {
    console.log(`[ERR       ]   0        0b  ${label}  ${e?.message}`);
    return { label, url, status: 0, tag: "ERR", body: "" };
  }
}

const sleep = () => new Promise((s) => setTimeout(s, 1800 + Math.random() * 2000));

// 1) Once cerez topla (engellenmeyen bir sayfadan)
console.log("--- 1) Oturum cerezleri toplaniyor ---");
const warm = await fetch("https://www.zara.com/tr/tr/search-services/typeahead?query=x", {
  headers: baseHeaders({ Accept: "text/html,application/xhtml+xml", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" }),
  signal: AbortSignal.timeout(25000),
});
absorb(warm);
console.log("Cerezler:", [...jar.keys()].join(", "), "\n");
await sleep();

const results = [];

// 2) products-details'i cerezlerle tekrar dene
console.log("--- 2) products-details (cerezli) ---");
results.push(await hit("products-details + cookie", `https://www.zara.com/tr/tr/products-details?productIds=${PRODUCT_ID}&ajax=true`));
await sleep();

// 3) stockInStore endpoint'i - parametre varyantlari
console.log("\n--- 3) itxrest stockInStore parametre varyantlari ---");
const BASE = `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}/physical-store/product/availability`;
const VARIANTS = [
  ["bos", `${BASE}`],
  ["productId", `${BASE}?productId=${PRODUCT_ID}`],
  ["productIds", `${BASE}?productIds=${PRODUCT_ID}`],
  ["productId+lang+app", `${BASE}?productId=${PRODUCT_ID}&languageId=${LANG_ID}&appId=1`],
  ["productIds+lang+app", `${BASE}?productIds=${PRODUCT_ID}&languageId=${LANG_ID}&appId=1`],
];
for (const [l, u] of VARIANTS) {
  results.push(await hit(l, u));
  await sleep();
}

// 4) Diger itxrest yollari (kesif)
console.log("\n--- 4) Diger itxrest yollari ---");
const OTHERS = [
  ["catalog/product detail", `https://www.zara.com/itxrest/3/catalog/store/${STORE_ID}/product/id/${PRODUCT_ID}/detail?languageId=${LANG_ID}&appId=1`],
  ["catalog/products id", `https://www.zara.com/itxrest/3/catalog/store/${STORE_ID}/products?productIds=${PRODUCT_ID}&languageId=${LANG_ID}&appId=1`],
  ["bam physical-store list", `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}/physical-store?languageId=${LANG_ID}&appId=1`],
  ["bam physical-stores list", `https://www.zara.com/itxrest/2/bam/store/${STORE_ID}/physical-store?languageId=${LANG_ID}&appId=1`],
];
for (const [l, u] of OTHERS) {
  results.push(await hit(l, u));
  await sleep();
}

const { writeFile } = await import("node:fs/promises");
await writeFile(
  new URL("./out/probe3.json", import.meta.url),
  JSON.stringify(results.map((r) => ({ ...r, body: r.body.slice(0, 3000) })), null, 2),
);
console.log("\nrecon/out/probe3.json yazildi.");
