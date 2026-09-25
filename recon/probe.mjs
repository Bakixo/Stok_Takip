/**
 * Faz 0 keşif aracı: Zara TR endpoint'lerinin sunucu tarafından erişilebilirliğini test eder.
 * Hiçbir bot korumasını atlatmaya çalışmaz; sadece "ne engelleniyor, ne engellenmiyor"u raporlar.
 *
 * Kullanım: node recon/probe.mjs
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Gerçek bir Chrome'un gönderdiği header seti. */
const BROWSER_HEADERS = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

/** XHR/fetch benzeri istekler icin header seti. */
const XHR_HEADERS = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
  "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  Referer: "https://www.zara.com/tr/",
  Origin: "https://www.zara.com",
};

/** Cevabin ne oldugunu siniflandirir. */
function classify(status, body, contentType) {
  const head = body.slice(0, 1200);
  if (/bm-verify|_sec\/verify|akam-logo/i.test(head)) return "AKAMAI_INTERSTITIAL";
  if (/Access Denied|Reference #\d|errors\.edgesuite/i.test(head)) return "AKAMAI_DENY";
  if (status === 403) return "HTTP_403";
  if (status === 404) return "HTTP_404";
  if (status >= 500) return "HTTP_5XX";
  if (/^application\/json/i.test(contentType || "")) return "JSON_OK";
  if (status === 200) return "HTML_OK";
  return `HTTP_${status}`;
}

async function probe(label, url, { headers = XHR_HEADERS, method = "GET" } = {}) {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(25000),
    });
    const contentType = res.headers.get("content-type") || "";
    const body = await res.text();
    const verdict = classify(res.status, body, contentType);
    return {
      label,
      url,
      status: res.status,
      ms: Date.now() - started,
      contentType: contentType.split(";")[0],
      bytes: body.length,
      verdict,
      preview: body.slice(0, 320).replace(/\s+/g, " "),
      body,
    };
  } catch (err) {
    return {
      label,
      url,
      status: 0,
      ms: Date.now() - started,
      verdict: "NETWORK_ERROR",
      preview: String(err?.message || err),
      body: "",
    };
  }
}

const TARGETS = [
  // --- Ana site (Akamai arkasinda oldugu dogrulandi) ---
  ["Ana sayfa (HTML)", "https://www.zara.com/tr/", { headers: BROWSER_HEADERS }],

  // --- Olasi ic REST katmani ---
  ["itxrest: kategori agaci", "https://www.zara.com/itxrest/1/catalog/store/11719/category?languageId=-43&appId=1"],
  ["itxrest: fiziksel magaza listesi", "https://www.zara.com/itxrest/2/bam/store/11719/physical-store?languageId=-43&appId=1"],

  // --- Public web API yollari ---
  ["web: kategori listesi", "https://www.zara.com/tr/tr/categories?ajax=true"],
  ["web: magazalar sayfasi", "https://www.zara.com/tr/tr/z-stores.html?ajax=true"],
  ["web: arama onerisi", "https://www.zara.com/tr/tr/search-services/typeahead?query=gomlek"],

  // --- Statik / CDN (genelde korumasiz) ---
  ["static: medya CDN kok", "https://static.zara.net/photos/"],
];

const results = [];
for (const [label, url, opts] of TARGETS) {
  const r = await probe(label, url, opts);
  results.push(r);
  console.log(
    `[${r.verdict.padEnd(20)}] ${String(r.status).padStart(3)} ${String(r.bytes ?? 0).padStart(7)}b ${String(r.ms).padStart(5)}ms  ${label}`,
  );
  console.log(`    ${url}`);
  console.log(`    ${r.preview.slice(0, 220)}`);
  console.log("");
  // Insan benzeri aralik: 1.5-3.5 sn
  await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
}

const { writeFile } = await import("node:fs/promises");
await writeFile(
  new URL("./out/probe-results.json", import.meta.url),
  JSON.stringify(
    results.map(({ body, ...rest }) => ({ ...rest, bodyHead: body.slice(0, 4000) })),
    null,
    2,
  ),
);
console.log("Sonuclar recon/out/probe-results.json dosyasina yazildi.");
