/**
 * Faz 0 - 7. tur: engelli /tr/tr/store-product-availability icin
 * korumasiz /api/storefront muadili var mi?
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const S = 11766, PID = 580760534, SKU = 580756907, PS = 16004; // PS: Istanbul Meclis-i Mebusan magazasi

const H = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR",
  Referer: "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534",
};

async function hit(label, url) {
  try {
    const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(20000) });
    const t = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(t.slice(0, 400));
    const tag = deny ? "WAF" : res.status === 200 ? "OK " : String(res.status);
    console.log(`[${tag.padEnd(4)}] ${String(t.length).padStart(6)}b  ${label}`);
    if (!deny) console.log(`        ${t.slice(0, 260).replace(/\s+/g, " ")}`);
    return { label, url, status: res.status, body: t.slice(0, 3000) };
  } catch (e) {
    console.log(`[ERR ]       0b  ${label} ${e?.message}`);
    return { label, url, status: 0, body: "" };
  }
}
const nap = () => new Promise((r) => setTimeout(r, 1200 + Math.random() * 1000));

const A = `https://www.zara.com/api/storefront/1/stores/${S}`;
const CANDS = [
  ["storefront: availability + physicalStoreIds", `${A}/products/id/${PID}/availability?physicalStoreIds=${PS}`],
  ["storefront: store-product-availability", `${A}/store-product-availability?productId=${PID}&physicalStoreIds=${PS}`],
  ["storefront: physical-stores/{id}/products", `${A}/physical-stores/${PS}/products/id/${PID}/availability`],
  ["storefront: products/id/{pid}/physical-stores-availability", `${A}/products/id/${PID}/physical-stores-availability?physicalStoreIds=${PS}`],
  ["storefront: products/id/{pid}/stores-availability", `${A}/products/id/${PID}/stores-availability?physicalStoreIds=${PS}`],
  ["storefront: sku availability + store", `${A}/products/sku/${SKU}/availability?physicalStoreIds=${PS}`],
  ["storefront v2: availability", `https://www.zara.com/api/storefront/2/stores/${S}/products/id/${PID}/availability?physicalStoreIds=${PS}`],
  // /tr/tr yolunun farkli yazimlari (WAF kurali tam yol eslesmesi olabilir)
  ["web: storeProductAvailability (camel)", `https://www.zara.com/tr/tr/storeProductAvailability?productId=${PID}&physicalStoreIds=${PS}&ajax=true`],
  ["web: store-product-availability (ajax yok)", `https://www.zara.com/tr/tr/store-product-availability?productId=${PID}&physicalStoreIds=${PS}`],
  // itxrest bam varyantlari (dogru parametre adiyla)
  ["bam: physicalStoreIds", `https://www.zara.com/itxrest/1/bam/store/${S}/physical-store/product/availability?productId=${PID}&physicalStoreIds=${PS}`],
  ["bam: physical-store/{id}/product", `https://www.zara.com/itxrest/1/bam/store/${S}/physical-store/${PS}/product/availability?productId=${PID}`],
];

const out = [];
for (const [l, u] of CANDS) { out.push(await hit(l, u)); await nap(); }

const { writeFile } = await import("node:fs/promises");
await writeFile(new URL("./out/probe7.json", import.meta.url), JSON.stringify(out, null, 2));
console.log("\nrecon/out/probe7.json yazildi.");
