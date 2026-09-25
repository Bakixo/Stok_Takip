/**
 * Faz 0 - 4. tur: magaza listesi (lat/long) + magaza stok endpoint'i.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const STORE_ID = 11766;
const LANG_ID = 240;
const PRODUCT_ID = 580760534;
const IST = { lat: 41.0082, lon: 28.9784 }; // Istanbul merkez

const jar = new Map();
function absorb(res) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const H = (extra = {}) => {
  const h = {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
    Referer: "https://www.zara.com/tr/tr/",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    ...extra,
  };
  const c = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  if (c) h.Cookie = c;
  return h;
};

async function hit(label, url, init = {}) {
  try {
    const res = await fetch(url, { headers: H(init.headers), redirect: "follow", signal: AbortSignal.timeout(25000), ...init });
    absorb(res);
    const body = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(body.slice(0, 500));
    const tag = deny ? "WAF_DENY" : res.status === 200 ? "OK" : String(res.status);
    console.log(`[${tag.padEnd(9)}] ${String(res.status).padStart(3)} ${String(body.length).padStart(8)}b  ${label}`);
    if (!deny) console.log(`     ${body.slice(0, 340).replace(/\s+/g, " ")}`);
    return { label, url, status: res.status, tag, body };
  } catch (e) {
    console.log(`[ERR      ]   0        0b  ${label} ${e?.message}`);
    return { label, url, status: 0, tag: "ERR", body: "" };
  }
}
const sleep = () => new Promise((s) => setTimeout(s, 1800 + Math.random() * 2000));

// cerez isit
absorb(await fetch("https://www.zara.com/tr/tr/search-services/typeahead?query=x", {
  headers: H({ Accept: "text/html", "Sec-Fetch-Dest": "document", "Sec-Fetch-Mode": "navigate" }),
  signal: AbortSignal.timeout(25000),
}));
await sleep();

const out = [];
const BAM = `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}`;

console.log("--- Magaza listesi (lat/long) ---");
for (const [l, u] of [
  ["physical-store lat", `${BAM}/physical-store?latitude=${IST.lat}`],
  ["physical-store lat+lon", `${BAM}/physical-store?latitude=${IST.lat}&longitude=${IST.lon}`],
  ["physical-store lat+lon+lang", `${BAM}/physical-store?latitude=${IST.lat}&longitude=${IST.lon}&languageId=${LANG_ID}&appId=1`],
]) { out.push(await hit(l, u)); await sleep(); }

console.log("\n--- Magaza stok (lat/long + urun) ---");
const AV = `${BAM}/physical-store/product/availability`;
for (const [l, u] of [
  ["avail lat+lon", `${AV}?latitude=${IST.lat}&longitude=${IST.lon}`],
  ["avail lat+lon+productId", `${AV}?latitude=${IST.lat}&longitude=${IST.lon}&productId=${PRODUCT_ID}`],
  ["avail lat+lon+skuIds", `${AV}?latitude=${IST.lat}&longitude=${IST.lon}&skuIds=${PRODUCT_ID}`],
]) { out.push(await hit(l, u)); await sleep(); }

const { writeFile } = await import("node:fs/promises");
await writeFile(new URL("./out/probe4.json", import.meta.url), JSON.stringify(out.map(r => ({ ...r, body: r.body.slice(0, 20000) })), null, 2));
console.log("\nrecon/out/probe4.json yazildi.");
