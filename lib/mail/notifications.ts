/**
 * Uygulamanın gönderdiği mailler — tek yerde toplandı.
 * Hem web (takip oluşturma) hem worker (stok bildirimi) buradan çağırır.
 */
import type { Watch } from "@prisma/client";
import { env } from "@/lib/env";
import { findCity, normalizeTr } from "@/lib/zara/cities";
import { getStoresNear } from "@/lib/zara/client";
import { renderMail } from "./render";
import { sendMail } from "./send";
import { StockAlert, stockAlertText, type StockAlertProps } from "./templates/StockAlert";
import {
  WatchConfirmed,
  watchConfirmedText,
  type WatchConfirmedProps,
} from "./templates/WatchConfirmed";
import { Welcome, welcomeText } from "./templates/Welcome";

/** Mailden tek tıkla takibi durdurma linki. */
export function unsubscribeUrl(watchId: string): string {
  return `${env().APP_URL}/takip/${watchId}/durdur`;
}

/**
 * Şehirdeki Zara mağazalarını getirir.
 * Hata olursa boş liste döner — mağaza listesi maili geciktirecek kadar önemli değil.
 */
async function storesForCity(
  citySlug: string,
  limit = 6,
): Promise<Array<{ label: string; mapsUrl: string }>> {
  const city = findCity(citySlug);
  if (!city?.hasStore) return [];

  try {
    const target = normalizeTr(city.name);
    const nearby = await getStoresNear(city.latitude, city.longitude);
    return nearby
      .filter((s) => normalizeTr(s.city) === target)
      .slice(0, limit)
      .map((s) => ({ label: s.label, mapsUrl: s.mapsUrl }));
  } catch (err) {
    console.warn(
      `[mail] mağaza listesi alınamadı (${city.name}): ${err instanceof Error ? err.message : err}`,
    );
    return [];
  }
}

/** "Stokta!" bildirimi. */
export async function sendStockAlert(
  watch: Watch,
  state: "in_stock" | "low_on_stock",
): Promise<boolean> {
  const city = findCity(watch.city);
  const cityName = city?.name ?? watch.city;

  const props: StockAlertProps = {
    productName: watch.productName,
    imageUrl: watch.imageUrl,
    productUrl: watch.productUrl,
    colorName: watch.colorName,
    size: watch.size,
    price: watch.price,
    city: cityName,
    stores: await storesForCity(watch.city),
    unsubscribeUrl: unsubscribeUrl(watch.id),
    lowStock: state === "low_on_stock",
  };

  const { html, text } = await renderMail(StockAlert(props), stockAlertText(props));

  const result = await sendMail({
    to: watch.email,
    subject: `Stokta: ${watch.productName} (${watch.size}) — ${cityName}`,
    html,
    text,
    unsubscribeUrl: props.unsubscribeUrl,
  });
  return result.ok;
}

/** "Takibe alındı" onayı. */
export async function sendWatchConfirmed(watch: Watch): Promise<boolean> {
  const props: WatchConfirmedProps = {
    productName: watch.productName,
    imageUrl: watch.imageUrl,
    colorName: watch.colorName,
    size: watch.size,
    price: watch.price,
    city: findCity(watch.city)?.name ?? watch.city,
    unsubscribeUrl: unsubscribeUrl(watch.id),
  };

  const { html, text } = await renderMail(WatchConfirmed(props), watchConfirmedText(props));

  const result = await sendMail({
    to: watch.email,
    subject: `Takibe alındı: ${watch.productName} (${watch.size})`,
    html,
    text,
    unsubscribeUrl: props.unsubscribeUrl,
  });
  return result.ok;
}

/** Hoş geldin maili — hediye notu .env içindeki WELCOME_NOTE'tan gelir. */
export async function sendWelcome(to: string): Promise<boolean> {
  const e = env();
  const props = { appUrl: e.APP_URL, note: process.env.WELCOME_NOTE || undefined };

  const { html, text } = await renderMail(Welcome(props), welcomeText(props));

  const result = await sendMail({
    to,
    subject: "Stokta'ya hoş geldin",
    html,
    text,
  });
  return result.ok;
}
