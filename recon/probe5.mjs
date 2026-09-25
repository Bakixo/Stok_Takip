/**
 * Faz 0 - 5. tur: beden/SKU kaynagini ve stok endpoint'inin dogru cagri seklini bulma.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const STORE_ID = 11766;
const LANG_ID = 240;
const PID = 580760534;
const SEO = "08059577";

const jar = new Map();
const absorb = (res) => {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [p] = line.split(";");
    const i = p.indexOf("=");
    if (i > 0) jar.set(p.slice(0, i).trim(), p.slice(i + 1).trim());
  }
};
const cook = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

const NAV = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-User": "?1",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};
const XHR = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Referer: `https://www.zara.com/tr/tr/`,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

async function hit(label, url, { headers = XHR, method = "GET", body } = {}) {
  try {
    const h = { ...headers };
    const c = cook();
    if (c) h.Cookie = c;
    if (body) h["Content-Type"] = "application/json";
    const res = await fetch(url, { method, headers: h, body, redirect: "follow", signal: AbortSignal.timeout(25000) });
    absorb(res);
    const t = await res.text();
    const deny = /Access Denied|errors\.edgesuite/i.test(t.slice(0, 500));
    const chal = /bm-verify|_sec\/verify/i.test(t.slice(0, 1500));
    const tag = deny ? "WAF_DENY" : chal ? "CHALLENGE" : res.status === 200 ? "OK" : String(res.status);
    console.log(`[${tag.padEnd(10)}] ${String(res.status).padStart(3)} ${String(t.length).padStart(8)}b  ${label}`);
    if (tag === "OK" || (!deny && !chal)) console.log(`     ${t.slice(0, 260).replace(/\s+/g, " ")}`);
    return { label, url, method, status: res.status, tag, body: t };
  } catch (e) {
    console.log(`[ERR       ]   0        0b  ${label} ${e?.message}`);
    return { label, url, status: 0, tag: "ERR", body: "" };
  }
}
const nap = () => new Promise((s) => setTimeout(s, 2000 + Math.random() * 2500));

console.log("--- cerez isitma ---");
absorb(await fetch("https://www.zara.com/tr/tr/search-services/typeahead?query=x", { headers: NAV, signal: AbortSignal.timeout(25000) }));
console.log("cerezler:", [...jar.keys()].join(", "), "\n");
await nap();

const out = [];

console.log("--- A) PDP HTML (isitilmis cerezle, navigate header) ---");
out.push(await hit("PDP html", `https://www.zara.com/tr/tr/-p${SEO}.html?v1=${PID}`, { headers: NAV }));
await nap();
out.push(await hit("PDP html (seo slug)", `https://www.zara.com/tr/tr/pilili-poplin-gomlek-p${SEO}.html?v1=${PID}`, { headers: NAV }));
await nap();

console.log("\n--- B) itxrest catalog surumleri (beden/SKU icin) ---");
for (const v of [1, 2, 3, 4, 5]) {
  out.push(await hit(`catalog v${v} product detail`, `https://www.zara.com/itxrest/${v}/catalog/store/${STORE_ID}/product/id/${PID}/detail?languageId=${LANG_ID}&appId=1`));
  await nap();
}

console.log("\n--- C) stok endpoint: POST ve surum varyantlari ---");
const paths = [
  `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}/physical-store/product/availability`,
  `https://www.zara.com/itxrest/2/bam/store/${STORE_ID}/physical-store/product/availability`,
];
for (const p of paths) {
  out.push(await hit(`POST ${p.match(/itxrest\/(\d)/)[1]}`, `${p}?latitude=41.0082&longitude=28.9784`, {
    method: "POST",
    body: JSON.stringify({ productIds: [PID] }),
  }));
  await nap();
}

const { writeFile } = await import("node:fs/promises");
for (const r of out) {
  await writeFile(new URL(`./out/p5_${r.label.replace(/[^a-z0-9]+/gi, "_")}.txt`, import.meta.url), r.body);
}
console.log("\nCevaplar recon/out/p5_*.txt olarak kaydedildi.");
