/**
 * Cloudflare Worker — Zara erişim testi.
 *
 * Amaç: Cloudflare'in ağından Zara'ya erişilebiliyor mu, onu ölçmek.
 * Bilinen durum: AWS (Vercel) 403, Azure (GitHub Actions) 200, ev 200.
 *
 * Kurulum (CLI gerekmez):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Create Worker
 *   2. Bir ad ver → Deploy
 *   3. "Edit code" → bu dosyanın tamamını yapıştır → Deploy
 *   4. Verilen https://<ad>.<hesap>.workers.dev adresini tarayıcıda aç
 *
 * Çıktı JSON: her endpoint için HTTP kodu ve engellenip engellenmediği.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const HEDEFLER = [
  [
    "referans-arama",
    "https://www.zara.com/itxrest/1/search/store/11766/reference" +
      "?reference=08059577&locale=tr_TR&scope=default&origin=search&ajax=true",
  ],
  [
    "stok-sorgusu",
    "https://www.zara.com/api/storefront/1/stores/11766/products/id/580760534/availability",
  ],
];

export default {
  async fetch() {
    const sonuclar = [];

    for (const [etiket, url] of HEDEFLER) {
      const basladi = Date.now();
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": UA,
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "tr-TR,tr;q=0.9",
            Referer: "https://www.zara.com/tr/tr/",
          },
        });
        const metin = await res.text();
        const bas = metin.slice(0, 200);
        sonuclar.push({
          etiket,
          status: res.status,
          ms: Date.now() - basladi,
          bayt: metin.length,
          engellendi:
            res.status === 403 || /Access Denied|errors\.edgesuite|bm-verify/i.test(bas),
          ozet: bas.replace(/\s+/g, " ").slice(0, 150),
        });
      } catch (err) {
        sonuclar.push({ etiket, status: 0, hata: String(err) });
      }
    }

    const hepsiCalisiyor = sonuclar.every((s) => s.status === 200);

    return new Response(
      JSON.stringify(
        { sonuc: hepsiCalisiyor ? "ERISIM VAR" : "ENGELLI", sonuclar },
        null,
        2,
      ),
      { headers: { "content-type": "application/json; charset=utf-8" } },
    );
  },
};
