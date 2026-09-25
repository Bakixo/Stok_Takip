/**
 * Faz 0 - uctan uca dogrulama.
 * Calisan boru hattini gercek urunlerle test eder:
 *   link/kod -> urun (TR ad, renkler, gorsel, fiyat) -> bedenler+SKU -> online stok -> sehir magazalari
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const STORE = 11766;

const H = {
  "User-Agent": UA,
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "tr-TR,tr;q=0.9",
  Referer: "https://www.zara.com/tr/tr/",
};

const nap = (min = 1500, max = 3000) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

async function getJson(url) {
  const res = await fetch(url, { headers: H, signal: AbortSignal.timeout(25000) });
  const t = await res.text();
  if (/Access Denied|errors\.edgesuite/i.test(t.slice(0, 300))) throw new Error("Akamai WAF 403");
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${t.slice(0, 120)}`);
  return JSON.parse(t);
}

/** Kullanici girdisini (URL veya kod) referans + productId'ye cevirir. */
function parseInput(input) {
  const s = input.trim();
  // URL: .../slug-pXXXXXXXX.html?v1=NNNN
  const url = s.match(/-p(\d{6,10})\.html/i);
  if (url) {
    const v1 = s.match(/[?&]v1=(\d+)/);
    return { reference: url[1], productId: v1 ? Number(v1[1]) : null, kind: "url" };
  }
  // Kod: 1234/567/800  ya da  1234/567  ya da  08059577
  const parts = s.split("/").map((x) => x.replace(/\D/g, "")).filter(Boolean);
  if (parts.length >= 2) {
    // aile(4) + model(3) -> 8 haneli referans; varsa 3. parca renk kodu
    const ref = (parts[0] + parts[1]).padStart(8, "0");
    return { reference: ref, colorId: parts[2] ?? null, kind: "code" };
  }
  if (parts.length === 1 && parts[0].length >= 7) {
    return { reference: parts[0].padStart(8, "0"), colorId: null, kind: "code" };
  }
  throw new Error("Girdi anlasilamadi: " + s);
}

/** Referanstan urunu cozer (TR isimler burada). */
async function resolveByReference(reference) {
  const u = `https://www.zara.com/itxrest/1/search/store/${STORE}/reference`
    + `?reference=${reference}&locale=tr_TR&scope=default&origin=search&ajax=true`;
  const j = await getJson(u);
  if (j.status !== "SUCCESS" || !j.results?.length) throw new Error("Urun bulunamadi: " + reference);
  return j.results[0].content;
}

/** Renk varyantinin bedenlerini + online stogunu verir. */
async function getSizes(productId) {
  const det = await getJson(`https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/${productId}`);
  const c = det.simplifiedCommercialComponent;
  return (c.sizes || []).map((s) => ({
    sku: s.identifier.sku,
    name: s.nomenclature?.name,
    availability: s.availability,
    price: s.pricing?.price?.current?.value / 100,
  }));
}

/** Canli online stok (hafif endpoint - worker bunu kullanacak). */
async function getOnlineAvailability(productId) {
  const j = await getJson(`https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/${productId}/availability`);
  return j.sizes;
}

/** Sehirdeki magazalar. */
async function getStores(lat, lon) {
  const j = await getJson(`https://www.zara.com/itxrest/1/bam/store/${STORE}/physical-store?latitude=${lat}&longitude=${lon}&languageId=240&appId=1`);
  return j.physicalStores;
}

const TESTS = [
  "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534",
  "8059/577/250",
];

for (const input of TESTS) {
  console.log("\n" + "=".repeat(70));
  console.log("GIRDI:", input);
  console.log("=".repeat(70));

  const parsed = parseInput(input);
  console.log(`  ayristirma: tip=${parsed.kind} referans=${parsed.reference} renk=${parsed.colorId ?? "-"} productId=${parsed.productId ?? "-"}`);
  await nap();

  const p = await resolveByReference(parsed.reference);
  console.log(`\n  URUN: ${p.name}`);
  console.log(`  kod  : ${p.detail.displayReference}   fiyat: ${(p.price / 100).toLocaleString("tr-TR")} TL`);
  console.log(`  renkler:`);
  for (const c of p.detail.colors) console.log(`     ${c.id} ${c.name.padEnd(14)} productId=${c.productId}`);

  // hangi renk varyanti?
  const chosen = parsed.productId
    ? p.detail.colors.find((c) => c.productId === parsed.productId) ?? p.detail.colors[0]
    : parsed.colorId
      ? p.detail.colors.find((c) => c.id === parsed.colorId) ?? p.detail.colors[0]
      : p.detail.colors[0];
  console.log(`  secilen renk: ${chosen.name} (${chosen.id}) -> productId=${chosen.productId}`);
  await nap();

  const sizes = await getSizes(chosen.productId);
  console.log(`\n  BEDENLER:`);
  for (const s of sizes) console.log(`     ${String(s.name).padEnd(6)} sku=${s.sku}  ${s.availability}`);
  await nap();

  const live = await getOnlineAvailability(chosen.productId);
  console.log(`\n  CANLI ONLINE STOK (worker'in kullanacagi cagri):`);
  for (const s of live) {
    const nm = sizes.find((x) => x.sku === s.sku)?.name ?? "?";
    console.log(`     ${String(nm).padEnd(6)} sku=${s.sku}  ${s.availability}`);
  }

  const img = p.detail.colors[0]?.xmedia?.[0];
  if (img) console.log(`\n  GORSEL: https://static.zara.net${img.path}.jpg?ts=${img.timestamp}&w=750`);
  console.log(`  DERIN LINK: https://www.zara.com/tr/tr/${p.seo.keyword}-p${p.seo.seoProductId}.html?v1=${chosen.productId}`);
  await nap();
}

console.log("\n" + "=".repeat(70));
console.log("SEHIR MAGAZALARI (Istanbul, Ankara, Izmir)");
console.log("=".repeat(70));
for (const [city, lat, lon] of [["İstanbul", 41.0082, 28.9784], ["Ankara", 39.9334, 32.8597], ["İzmir", 38.4237, 27.1428]]) {
  const st = await getStores(lat, lon);
  const inCity = st.filter((s) => (s.city || "").toLocaleUpperCase("tr").includes(city.toLocaleUpperCase("tr")));
  console.log(`\n  ${city}: toplam ${st.length} yakin magaza, ${inCity.length} tanesi sehir icinde`);
  for (const s of inCity.slice(0, 4)) console.log(`     #${s.id} ${s.addressLines[0]?.slice(0, 62)}`);
  await nap();
}
console.log("\nUCTAN UCA TEST TAMAM.");
