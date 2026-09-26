/**
 * Bildirim maillerini gerçek Zara verisiyle test adresine gönderir.
 *
 *   npx tsx scripts/send-test-mails.mts ornek@gmail.com
 *   npx tsx scripts/send-test-mails.mts ornek@gmail.com stokta
 *   npx tsx scripts/send-test-mails.mts ornek@gmail.com takip
 *
 * Üçüncü argüman verilmezse ikisi de gönderilir.
 * Ürün bilgisi canlı çekiliyor, yani görsel ve fiyat gerçek.
 */
import "@/lib/load-env";
import { env } from "@/lib/env";
import { renderMail } from "@/lib/mail/render";
import { sendMail } from "@/lib/mail/send";
import { StockAlert, stockAlertText } from "@/lib/mail/templates/StockAlert";
import { WatchConfirmed, watchConfirmedText } from "@/lib/mail/templates/WatchConfirmed";
import { getProductByReference, getSizes, getStoresNear, buildProductUrl } from "@/lib/zara/client";
import { findCity, normalizeTr } from "@/lib/zara/cities";

const [alici, hangi] = process.argv.slice(2);

if (!alici || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(alici)) {
  console.error("Kullanım: npx tsx scripts/send-test-mails.mts <e-posta> [stokta|takip]");
  process.exit(1);
}

const e = env();
if (e.APP_URL.includes("localhost")) {
  console.error(
    "DUR: APP_URL localhost'u gösteriyor. Maildeki linkler telefonda açılmaz.\n" +
      ".env içinde canlı adresi yaz.",
  );
  process.exit(1);
}

const REFERANS = "08059577";
const SEHIR = "istanbul";

console.log("Zara'dan gerçek ürün bilgisi alınıyor...");
const urun = await getProductByReference(REFERANS);
const renk = urun.colors[0]!;
const bedenler = await getSizes(renk.productId);
const beden = bedenler.find((b) => b.name === "M") ?? bedenler[0]!;

const sehir = findCity(SEHIR)!;
const hedefSehir = normalizeTr(sehir.name);
const magazalar = (await getStoresNear(sehir.latitude, sehir.longitude))
  .filter((s) => normalizeTr(s.city) === hedefSehir)
  .slice(0, 4)
  .map((s) => ({ label: s.label, mapsUrl: s.mapsUrl }));

console.log(`  ${urun.name} · ${renk.name} · Beden ${beden.name} · ${urun.price} TL`);
console.log(`  ${magazalar.length} mağaza\n`);

// Gerçek bir takip kimliği olmadığı için örnek bir "durdur" linki.
const durdurUrl = `${e.APP_URL}/takip/ornek-test-kaydi/durdur`;

/** "Stokta!" bildirimi. */
async function stoktaMaili() {
  const props = {
    productName: urun.name,
    imageUrl: renk.imageUrl ?? "",
    productUrl: buildProductUrl(urun, renk.productId),
    colorName: renk.name,
    size: beden.name,
    price: urun.price,
    city: sehir.name,
    stores: magazalar,
    unsubscribeUrl: durdurUrl,
    lowStock: false,
  };
  const { html, text } = await renderMail(StockAlert(props), stockAlertText(props));
  const r = await sendMail({
    to: alici,
    subject: `[TEST] Stokta: ${urun.name} (${beden.name}) — ${sehir.name}`,
    html,
    text,
    unsubscribeUrl: durdurUrl,
  });
  console.log(r.ok ? "✓ 'Beklediğin beden geldi' gönderildi" : `✗ hata: ${r.error}`);
}

/** "Takibe alındı" onayı. */
async function takipMaili() {
  const props = {
    productName: urun.name,
    imageUrl: renk.imageUrl ?? "",
    colorName: renk.name,
    size: beden.name,
    price: urun.price,
    city: sehir.name,
    unsubscribeUrl: durdurUrl,
  };
  const { html, text } = await renderMail(WatchConfirmed(props), watchConfirmedText(props));
  const r = await sendMail({
    to: alici,
    subject: `[TEST] Takibe alındı: ${urun.name} (${beden.name})`,
    html,
    text,
    unsubscribeUrl: durdurUrl,
  });
  console.log(r.ok ? "✓ 'Gözüm üstünde' gönderildi" : `✗ hata: ${r.error}`);
}

if (!hangi || hangi === "stokta") await stoktaMaili();
if (!hangi || hangi === "takip") await takipMaili();

console.log(`\nAlıcı: ${alici}`);
console.log("Konu satırlarında [TEST] var; gerçek bildirimlerde olmayacak.");
