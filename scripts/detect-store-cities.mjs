/**
 * 81 ili tek tek Zara'nın mağaza API'sine sorar ve lib/zara/cities.ts içindeki
 * `hasStore` / `storeCount` alanlarını günceller.
 *
 * Tek seferlik bir betiktir; mağaza ağı değişirse tekrar çalıştırılır.
 * İstekler arasında 2-4 sn bekler (81 il ≈ 4-5 dakika).
 *
 *   node scripts/detect-store-cities.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

const STORE_ID = 11766;
const CITIES_FILE = new URL("../lib/zara/cities.ts", import.meta.url);

const H = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.zara.com/tr/tr/",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Türkçe normalizasyon — API'nin döndürdüğü şehir adıyla ("İSTANBUL")
 * bizim listemizdeki adı ("İstanbul") karşılaştırmak için.
 *
 * Mesafe yerine şehir adı eşleşmesi kullanılıyor: API en yakın mağazaları
 * döndürdüğü için Yalova'ya bir İstanbul mağazası, Manisa'ya bir İzmir
 * mağazası düşüyor ve mesafe ölçütü yanlış pozitif üretiyor.
 */
function normalizeTr(s) {
  return s
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replace(/[^a-z0-9]/g, "");
}

const source = await readFile(CITIES_FILE, "utf8");

// cities.ts içindeki satırlardan il listesini çıkar
const rows = [...source.matchAll(
  /\{ slug: "([a-z]+)", name: "([^"]+)", latitude: ([\d.]+), longitude: ([\d.]+),/g,
)].map((m) => ({ slug: m[1], name: m[2], lat: Number(m[3]), lon: Number(m[4]) }));

console.log(`${rows.length} il sorgulanacak...\n`);

const results = new Map();
for (const [i, city] of rows.entries()) {
  const url =
    `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}/physical-store` +
    `?latitude=${city.lat}&longitude=${city.lon}&languageId=240&appId=1`;
  try {
    const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(25000) });
    const text = await res.text();
    if (!res.ok || /Access Denied/i.test(text.slice(0, 200))) {
      throw new Error(`HTTP ${res.status}`);
    }
    const stores = JSON.parse(text).physicalStores ?? [];
    const target = normalizeTr(city.name);
    const inCity = stores.filter((s) => normalizeTr(s.city ?? "") === target);
    results.set(city.slug, inCity.length);
    const mark = inCity.length > 0 ? "✓" : "·";
    const others = stores.length - inCity.length;
    console.log(
      `${String(i + 1).padStart(2)}/${rows.length} ${mark} ${city.name.padEnd(16)} ${inCity.length} mağaza` +
        (others > 0 ? `  (${others} komşu ilde, sayılmadı)` : ""),
    );
  } catch (e) {
    results.set(city.slug, 0);
    console.log(`${String(i + 1).padStart(2)}/${rows.length} ! ${city.name.padEnd(16)} HATA: ${e.message}`);
  }
  await sleep(2000 + Math.random() * 2000);
}

// Dosyayı güncelle
let updated = source;
for (const [slug, count] of results) {
  const re = new RegExp(
    `(\\{ slug: "${slug}",[^}]*?hasStore: )(?:true|false)(, storeCount: )\\d+`,
  );
  updated = updated.replace(re, `$1${count > 0}$2${count}`);
}
await writeFile(CITIES_FILE, updated, "utf8");

const withStore = [...results.values()].filter((n) => n > 0).length;
console.log(`\nTamam: ${withStore} ilde Zara mağazası bulundu. cities.ts güncellendi.`);
