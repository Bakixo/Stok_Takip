/**
 * Veritabanındaki bir takip için "Stokta!" mailini üretip dosyaya yazar.
 * Mailin tamamını (mağaza listesi dahil) görmek için.
 *
 *   npx tsx scripts/preview-stock-mail.mts
 */
import "@/lib/load-env";
import { writeFile } from "node:fs/promises";
import { prisma } from "@/lib/db";
import { renderMail } from "@/lib/mail/render";
import { StockAlert, stockAlertText, type StockAlertProps } from "@/lib/mail/templates/StockAlert";
import { getStoresNear } from "@/lib/zara/client";
import { findCity, normalizeTr } from "@/lib/zara/cities";
import { env } from "@/lib/env";

const watch = await prisma.watch.findFirst({ orderBy: { createdAt: "desc" } });
if (!watch) throw new Error("Veritabanında takip yok. Önce seed-test-watch.mjs çalıştır.");

const city = findCity(watch.city);
let stores: Array<{ label: string; mapsUrl: string }> = [];
if (city?.hasStore) {
  const target = normalizeTr(city.name);
  const nearby = await getStoresNear(city.latitude, city.longitude);
  stores = nearby
    .filter((s) => normalizeTr(s.city) === target)
    .slice(0, 6)
    .map((s) => ({ label: s.label, mapsUrl: s.mapsUrl }));
  console.log(`${city.name}: ${nearby.length} yakın mağaza, ${stores.length} tanesi şehir içinde`);
}

const props: StockAlertProps = {
  productName: watch.productName,
  imageUrl: watch.imageUrl,
  productUrl: watch.productUrl,
  colorName: watch.colorName,
  size: watch.size,
  price: watch.price,
  city: city?.name ?? watch.city,
  stores,
  unsubscribeUrl: `${env().APP_URL}/takip/${watch.id}/durdur`,
};
const { html, text } = await renderMail(StockAlert(props), stockAlertText(props));

await writeFile("recon/out/mail-preview.html", html, "utf8");
console.log("\n=== DÜZ METİN ===\n");
console.log(text);
console.log(`\nHTML → recon/out/mail-preview.html (${html.length} bayt)`);

await prisma.$disconnect();
