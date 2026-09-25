/**
 * Cloudflare aracısını sınar: çalışıyor mu, güvenli mi?
 *
 *   npx tsx scripts/test-proxy.mts https://<worker>.workers.dev <PROXY_KEY>
 *
 * Hem "çalışıyor mu" hem "açık proxy'ye dönüşmüş mü" kontrol edilir.
 */
const [base, key] = process.argv.slice(2);

if (!base || !key) {
  console.error("Kullanım: npx tsx scripts/test-proxy.mts <worker-adresi> <PROXY_KEY>");
  process.exit(1);
}

const kok = base.replace(/\/+$/, "");
const ZARA_STOK =
  "https://www.zara.com/api/storefront/1/stores/11766/products/id/580760534/availability";
const ZARA_REF =
  "https://www.zara.com/itxrest/1/search/store/11766/reference" +
  "?reference=08059577&locale=tr_TR&scope=default&origin=search&ajax=true";

async function iste(etiket: string, hedef: string, anahtar: string | null, beklenen: number) {
  const url = `${kok}/?u=${encodeURIComponent(hedef)}`;
  try {
    const res = await fetch(url, {
      headers: anahtar ? { "X-Proxy-Key": anahtar } : {},
      signal: AbortSignal.timeout(25000),
    });
    const govde = await res.text();
    const gecti = res.status === beklenen;
    console.log(
      `  ${gecti ? "[X]" : "[!]"} ${etiket.padEnd(38)} HTTP ${res.status} (beklenen ${beklenen})`,
    );
    if (!gecti) console.log(`      ${govde.slice(0, 160).replace(/\s+/g, " ")}`);
    return gecti;
  } catch (e) {
    console.log(`  [!] ${etiket.padEnd(38)} HATA: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

console.log("=== Calisiyor mu ===");
const a = await iste("dogru anahtar + stok sorgusu", ZARA_STOK, key, 200);
const b = await iste("dogru anahtar + referans arama", ZARA_REF, key, 200);

console.log("\n=== Guvenli mi (hepsi reddedilmeli) ===");
const c = await iste("anahtarsiz", ZARA_STOK, null, 401);
const d = await iste("yanlis anahtar", ZARA_STOK, "yanlis-anahtar-12345", 401);
const e = await iste("baska site (example.com)", "https://example.com/", key, 403);
const f = await iste(
  "izinsiz zara yolu",
  "https://www.zara.com/tr/tr/store-product-availability?productId=1",
  key,
  403,
);

const hepsi = [a, b, c, d, e, f];
const basarili = hepsi.filter(Boolean).length;
console.log(`\nSonuc: ${basarili}/${hepsi.length} test gecti`);

if (basarili === hepsi.length) {
  console.log("Araci hem calisiyor hem guvenli. Vercel'e su iki degiskeni ekle:");
  console.log(`  ZARA_PROXY_URL    = ${kok}`);
  console.log(`  ZARA_PROXY_SECRET = (Cloudflare'deki PROXY_KEY ile ayni)`);
} else {
  console.log("Bazi testler gecmedi — yukaridaki satirlara bak.");
  process.exit(1);
}
