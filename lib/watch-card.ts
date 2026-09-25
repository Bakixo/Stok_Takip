/**
 * Veritabanı kaydını arayüzün kullandığı sade karta çevirir.
 * Sunucu bileşenlerinden istemci bileşenlerine yalnızca bu düz nesne geçer
 * (Date gibi serileştirilemeyen alanlar burada dizgiye dönüşür).
 */
import type { Watch } from "@prisma/client";
import { findCity } from "@/lib/zara/cities";
import { isWatchStatus, type WatchStatus } from "@/lib/watch-status";

export interface WatchCard {
  id: string;
  productName: string;
  imageUrl: string;
  productUrl: string;
  colorName: string;
  size: string;
  price: number;
  cityName: string;
  status: WatchStatus;
  /** ISO dizgi — istemcide göreli zamana çevrilir. */
  createdAt: string;
  lastCheckedAt: string | null;
  foundAt: string | null;
}

export function toWatchCard(w: Watch): WatchCard {
  return {
    id: w.id,
    productName: w.productName,
    imageUrl: w.imageUrl,
    productUrl: w.productUrl,
    colorName: w.colorName,
    size: w.size,
    price: w.price,
    cityName: findCity(w.city)?.name ?? w.city,
    status: isWatchStatus(w.status) ? w.status : "ACTIVE",
    createdAt: w.createdAt.toISOString(),
    lastCheckedAt: w.lastCheckedAt?.toISOString() ?? null,
    foundAt: w.foundAt?.toISOString() ?? null,
  };
}
