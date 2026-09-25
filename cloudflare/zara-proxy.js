/**
 * Cloudflare Worker — Zara aracısı (proxy).
 *
 * Neden var: Zara'nın bot koruması AWS IP'lerini engelliyor, yani Vercel'den
 * (uygulamanın çalıştığı yer) Zara'ya erişilemiyor. Cloudflare'in ağı engelli
 * değil — ölçüldü. Uygulama Zara isteklerini bu aracı üzerinden geçiriyor.
 *
 * Kurulum:
 *   1. Workers & Pages → Create → Start with Hello World! → Deploy
 *   2. Edit code → bu dosyanın tamamını yapıştır → Deploy
 *   3. Settings → Variables and Secrets → yeni secret ekle:
 *        Ad   : PROXY_KEY
 *        Deger: (uzun rastgele bir dize — Vercel'de ZARA_PROXY_SECRET ile ayni)
 *   4. Worker adresini Vercel'de ZARA_PROXY_URL degiskenine yaz
 *
 * Kullanim:
 *   GET https://<worker>.workers.dev/?u=<urlencoded-zara-adresi>
 *   Header: X-Proxy-Key: <PROXY_KEY>
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * Yalnizca uygulamanin gercekten kullandigi yollar gecebilir.
 * Boylece acik bir proxy'ye donusmez: anahtari sizsa bile baskasi
 * bunu rastgele siteler icin kullanamaz.
 */
const IZINLI_YOLLAR = [
  /^\/itxrest\/1\/search\/store\/\d+\/reference$/,
  /^\/itxrest\/1\/bam\/store\/\d+\/physical-store$/,
  /^\/api\/storefront\/1\/stores\/\d+\/products\/id\/\d+$/,
  /^\/api\/storefront\/1\/stores\/\d+\/products\/id\/\d+\/availability$/,
];

function hata(mesaj, status) {
  return new Response(JSON.stringify({ error: mesaj }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** Sabit sureli karsilastirma — anahtari zamanlama ile tahmin etmeyi zorlastirir. */
function anahtarEsit(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET") return hata("Yalnizca GET", 405);

    // --- Yetki ---
    const beklenen = env.PROXY_KEY;
    if (!beklenen) return hata("PROXY_KEY tanimli degil", 500);
    if (!anahtarEsit(request.headers.get("x-proxy-key") ?? "", beklenen)) {
      return hata("Yetkisiz", 401);
    }

    // --- Hedef adres ---
    const ham = new URL(request.url).searchParams.get("u");
    if (!ham) return hata("u parametresi gerekli", 400);

    let hedef;
    try {
      hedef = new URL(ham);
    } catch {
      return hata("Gecersiz adres", 400);
    }

    if (hedef.protocol !== "https:" || hedef.hostname !== "www.zara.com") {
      return hata("Yalnizca www.zara.com", 403);
    }
    if (!IZINLI_YOLLAR.some((kalip) => kalip.test(hedef.pathname))) {
      return hata("Bu yol izinli degil", 403);
    }

    // --- Zara'ya ilet ---
    try {
      const cevap = await fetch(hedef.toString(), {
        headers: {
          "User-Agent": UA,
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          Referer: "https://www.zara.com/tr/tr/",
        },
      });

      const govde = await cevap.text();

      // Durum kodu oldugu gibi aktarilir: uygulama 403'u "engel" olarak
      // tanimak icin buna bakiyor.
      return new Response(govde, {
        status: cevap.status,
        headers: {
          "content-type": cevap.headers.get("content-type") ?? "application/json",
          "cache-control": "no-store",
        },
      });
    } catch (err) {
      return hata(`Zara'ya ulasilamadi: ${err}`, 502);
    }
  },
};
