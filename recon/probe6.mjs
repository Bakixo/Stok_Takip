/**
 * Faz 0 - 6. tur: /api/storefront namespace kesfi (fiziksel magaza stogu araniyor).
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const S = 11766;
const PID = 580760534;
const SKU = 580756907; // M bedeni
const LAT = 41.0082, LON = 28.9784;

const H = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR",
  Referer: "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html",
};

async function hit(label, url, init = {}) {
  try {
    const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(20000), ...init });
    const t = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(t.slice(0, 400));
    const tag = deny ? "WAF" : res.status === 200 ? "OK " : String(res.status);
    console.log(`[${tag.padEnd(4)}] ${String(t.length).padStart(7)}b  ${label}`);
    if (!deny && t.length < 100000) console.log(`        ${t.slice(0, 250).replace(/\s+/g, " ")}`);
    return { label, url, status: res.status, body: t };
  } catch (e) {
    console.log(`[ERR ]        0b  ${label} ${e?.message}`);
    return { label, url, status: 0, body: "" };
  }
}
const nap = () => new Promise((s) => setTimeout(s, 1200 + Math.random() * 1200));

const B = `https://www.zara.com/api/storefront/1/stores/${S}`;
const CANDS = [
  ["kok", `https://www.zara.com/api/storefront/1/`],
  ["stores kok", `https://www.zara.com/api/storefront/1/stores/${S}`],
  ["product detail", `${B}/products/id/${PID}`],
  ["product detail /detail", `${B}/products/id/${PID}/detail`],
  ["fiziksel: physical-stores", `${B}/products/id/${PID}/physical-stores`],
  ["fiziksel: physical-store-availability", `${B}/products/id/${PID}/physical-store-availability`],
  ["fiziksel: stores-availability", `${B}/products/id/${PID}/stores-availability`],
  ["fiziksel: availability + koordinat", `${B}/products/id/${PID}/availability?latitude=${LAT}&longitude=${LON}`],
  ["fiziksel: sku availability", `${B}/products/sku/${SKU}/availability`],
  ["fiziksel: sku physical-stores", `${B}/products/sku/${SKU}/physical-stores`],
  ["physical-stores kok", `${B}/physical-stores?latitude=${LAT}&longitude=${LON}`],
  ["physical-stores + urun", `${B}/physical-stores/availability?productId=${PID}&latitude=${LAT}&longitude=${LON}`],
  ["physical-stores + sku", `${B}/physical-stores/availability?skuId=${SKU}&latitude=${LAT}&longitude=${LON}`],
  ["stock-in-store", `${B}/stock-in-store?skuId=${SKU}&latitude=${LAT}&longitude=${LON}`],
];

const out = [];
for (const [l, u] of CANDS) {
  out.push(await hit(l, u));
  await nap();
}

const { writeFile } = await import("node:fs/promises");
await writeFile(new URL("./out/probe6.json", import.meta.url), JSON.stringify(out.map(r => ({ ...r, body: r.body.slice(0, 4000) })), null, 2));
console.log("\nrecon/out/probe6.json yazildi.");
