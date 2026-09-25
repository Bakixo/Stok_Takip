/**
 * Faz 0 - 2. tur: urun detay (beden/SKU), magaza listesi ve magaza stok endpoint adaylarini test eder.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const H = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
  Referer: "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

const PRODUCT_ID = 580760534; // PILILI POPLIN GOMLEK
const SEO_ID = "08059577";

const CANDIDATES = [
  // --- Urun detay / bedenler ---
  ["detay: products-details", `https://www.zara.com/tr/tr/products-details?productIds=${PRODUCT_ID}&ajax=true`],
  ["detay: product/{id}/extra-detail", `https://www.zara.com/tr/tr/product/${PRODUCT_ID}/extra-detail?ajax=true`],
  ["detay: products?productIds", `https://www.zara.com/tr/tr/products?productIds=${PRODUCT_ID}&ajax=true`],
  ["detay: PDP HTML", `https://www.zara.com/tr/tr/pilili-poplin-gomlek-p${SEO_ID}.html?v1=${PRODUCT_ID}`],

  // --- Magaza listesi ---
  ["magaza: /stores", "https://www.zara.com/tr/tr/stores?ajax=true"],
  ["magaza: store-locator", "https://www.zara.com/tr/tr/store-locator?ajax=true"],
  ["magaza: physical-stores", "https://www.zara.com/tr/tr/physical-stores?ajax=true"],
  ["magaza: itxrest bam", "https://www.zara.com/itxrest/2/bam/store/11719/physical-store?lang=tr"],

  // --- Magaza stok (urun bazli) ---
  ["stok: product/{id}/physical-stores", `https://www.zara.com/tr/tr/product/${PRODUCT_ID}/physical-stores?ajax=true`],
  ["stok: product/{id}/stock", `https://www.zara.com/tr/tr/product/${PRODUCT_ID}/stock?ajax=true`],
  ["stok: product/{id}/availability", `https://www.zara.com/tr/tr/product/${PRODUCT_ID}/availability?ajax=true`],
  ["stok: products-availability", `https://www.zara.com/tr/tr/products-availability?productIds=${PRODUCT_ID}&ajax=true`],
];

function classify(status, body, ct) {
  const head = body.slice(0, 1000);
  if (/bm-verify|_sec\/verify|akam-logo/i.test(head)) return "AKAMAI_INTERSTITIAL";
  if (status === 404) return "404";
  if (status === 403) return "403";
  if (/^application\/json/i.test(ct || "")) return status === 200 ? "JSON_OK" : `JSON_${status}`;
  if (status === 200) return "HTML_OK";
  return String(status);
}

const { writeFile, mkdir } = await import("node:fs/promises");
await mkdir(new URL("./out/", import.meta.url), { recursive: true });

const results = [];
for (const [label, url] of CANDIDATES) {
  let r;
  try {
    const res = await fetch(url, { headers: H, redirect: "follow", signal: AbortSignal.timeout(25000) });
    const ct = res.headers.get("content-type") || "";
    const body = await res.text();
    r = { label, url, status: res.status, ct: ct.split(";")[0], bytes: body.length, verdict: classify(res.status, body, ct), body };
  } catch (e) {
    r = { label, url, status: 0, verdict: "ERR", bytes: 0, body: String(e?.message || e) };
  }
  results.push(r);
  console.log(`[${r.verdict.padEnd(12)}] ${String(r.status).padStart(3)} ${String(r.bytes).padStart(8)}b  ${label}`);
  if (r.verdict.startsWith("JSON") || r.verdict === "HTML_OK") {
    console.log(`     ${r.body.slice(0, 260).replace(/\s+/g, " ")}`);
  }
  // her isteği dosyaya da yaz (sonra incelemek icin)
  const safe = label.replace(/[^a-z0-9]+/gi, "_");
  await writeFile(new URL(`./out/p2_${safe}.txt`, import.meta.url), r.body);
  await new Promise((s) => setTimeout(s, 1800 + Math.random() * 2200));
}
console.log("\nCevaplar recon/out/p2_*.txt olarak kaydedildi.");
