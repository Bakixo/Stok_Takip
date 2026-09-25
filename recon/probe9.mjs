/**
 * Faz 0 - 9. tur: availability sozlugunu ogren (in_stock disinda hangi degerler var?).
 * Bir kategoriden urunleri tarar, SKU bazli stok degerlerini toplar.
 */
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const STORE = 11766;
const H = { "User-Agent": UA, Accept: "application/json", "Accept-Language": "tr-TR", Referer: "https://www.zara.com/tr/tr/" };
const nap = () => new Promise((r) => setTimeout(r, 900 + Math.random() * 900));

const getJson = async (u) => {
  const res = await fetch(u, { headers: H, signal: AbortSignal.timeout(25000) });
  const t = await res.text();
  if (/Access Denied/i.test(t.slice(0, 200))) throw new Error("WAF");
  return JSON.parse(t);
};

// Birkac farkli kategoriden urun topla (indirimli/eski koleksiyon daha cok tukenmis beden icerir)
const CATS = [2419737 /* ozel fiyatlar */, 2420331 /* beyaz gomlek */, 2467841 /* sweatshirt */];
const productIds = [];
for (const c of CATS) {
  try {
    const j = await getJson(`https://www.zara.com/tr/tr/category/${c}/products?ajax=true`);
    const found = [];
    const walk = (o, d) => {
      if (!o || typeof o !== "object" || d > 10 || found.length > 40) return;
      if (Array.isArray(o)) return o.forEach((x) => walk(x, d + 1));
      if (o.type === "Product" && o.detail?.colors) {
        for (const col of o.detail.colors) if (col.productId) found.push(col.productId);
      }
      Object.values(o).forEach((x) => walk(x, d + 1));
    };
    walk(j, 0);
    console.log(`kategori ${c}: ${found.length} renk varyanti`);
    productIds.push(...found.slice(0, 18));
  } catch (e) {
    console.log(`kategori ${c}: HATA ${e.message}`);
  }
  await nap();
}

const uniq = [...new Set(productIds)].slice(0, 40);
console.log(`\n${uniq.length} urun varyantinin stok durumu taranıyor...\n`);

const vocab = new Map();
let checked = 0, oos = 0;
for (const pid of uniq) {
  try {
    const j = await getJson(`https://www.zara.com/api/storefront/1/stores/${STORE}/products/id/${pid}/availability`);
    checked++;
    const states = (j.sizes || []).map((s) => s.availability);
    for (const v of states) vocab.set(v, (vocab.get(v) || 0) + 1);
    if (states.some((s) => s !== "in_stock")) {
      oos++;
      console.log(`  ${pid}: ${states.join(", ")}`);
    }
  } catch (e) {
    console.log(`  ${pid}: HATA ${e.message}`);
  }
  await nap();
}

console.log(`\n=== SONUC ===`);
console.log(`Taranan: ${checked} varyant, ${oos} tanesinde en az bir beden tukenmis`);
console.log(`\nAvailability sozlugu:`);
for (const [k, v] of [...vocab].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${v} beden`);
