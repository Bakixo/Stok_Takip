/**
 * Zara Türkiye istemcisi.
 *
 * Kullanılan endpoint'ler Faz 0'da gerçek isteklerle doğrulandı (bkz. FAZ0-RAPOR.md).
 * Hepsi çerezsiz ve oturumsuz çalışır.
 */
import { zaraFetchJson, ZaraError } from "./http";
import { normalizeTr } from "./cities";
import type { Availability, ZaraColor, ZaraProduct, ZaraSize, ZaraStore } from "./types";
import { buildProductUrl } from "./types";

/** Zara Türkiye mağaza kimliği (app shell'den doğrulandı). */
const STORE_ID = 11766;
const LANG_ID = 240;
const LOCALE = "tr_TR";

// ---------------------------------------------------------------------------
// Ham cevap şekilleri (yalnızca kullandığımız alanlar)
// ---------------------------------------------------------------------------

interface RawXmedia {
  /** Zara'nın hazır verdiği URL; içinde {width} yer tutucusu bulunur. */
  url?: string;
  path?: string;
  name?: string;
  timestamp?: string;
  type?: string;
}

interface RawRefContent {
  id: number;
  name: string;
  price: number;
  detail?: {
    displayReference?: string;
    colors?: Array<{
      id: string;
      name: string;
      productId: number;
      xmedia?: RawXmedia[];
    }>;
  };
  /** Ürünün tüm renkleri, hex kodlarıyla — her sonuçta aynı liste tekrarlanır. */
  availableColors?: Array<{ colorName: string; hexColor: string }>;
  seo?: { keyword?: string; seoProductId?: string };
}

interface RawRefSearch {
  status: string;
  /** Zara her RENK için ayrı bir sonuç döndürür; hepsi birleştirilmeli. */
  results?: Array<{ content?: RawRefContent }>;
}

interface RawProductDetail {
  simplifiedCommercialComponent?: {
    sizes?: Array<{
      identifier?: { sku?: number };
      nomenclature?: { name?: string };
      availability?: string;
    }>;
  };
}

interface RawAvailability {
  sizes?: Array<{ sku: number; availability: string; colorId: string }>;
}

interface RawStores {
  physicalStores?: Array<{
    id: number;
    addressLines?: string[];
    city?: string;
    latitude: number;
    longitude: number;
    phones?: string[];
    sections?: string[];
  }>;
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

const KNOWN_STATES: readonly string[] = ["in_stock", "low_on_stock", "out_of_stock", "coming_soon"];

/** Bilinmeyen bir durum gelirse onu "tükendi" saymak, yanlış bildirimden güvenlidir. */
function toAvailability(raw: string | undefined): Availability {
  return KNOWN_STATES.includes(raw ?? "") ? (raw as Availability) : "out_of_stock";
}

/**
 * Zara görsel URL'i.
 *
 * Tercihen cevaptaki hazır `url` kullanılır ({width} yer tutucusu doldurulur).
 * O yoksa yoldan kurulur: dosya adı yolun son parçası olarak tekrar eder
 * (.../08059577250-p/08059577250-p.jpg), yalnızca yola .jpg eklemek 404 verir.
 */
function mediaUrl(x: RawXmedia | undefined, width = 750): string | null {
  if (!x) return null;
  if (x.url) return x.url.replace("{width}", String(width));
  if (!x.path || !x.name) return null;
  const ts = x.timestamp ? `?ts=${x.timestamp}&w=${width}` : `?w=${width}`;
  return `https://static.zara.net${x.path}/${x.name}.jpg${ts}`;
}

/** Görsel olmayan ortamları (video vb.) ayıklar. */
function firstImage(media: RawXmedia[] | undefined): RawXmedia | undefined {
  return media?.find((m) => !m.type || m.type === "image");
}

/**
 * Kullanıcı girdisini (ürün linki veya ürün kodu) Zara referansına çevirir.
 *
 * Kabul edilenler:
 *   https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534
 *   8059/577/250   ·   8059/577   ·   08059577
 */
export function parseUserInput(input: string): {
  reference: string;
  productId?: string;
  colorId?: string;
} {
  const s = input.trim();
  if (!s) throw new ZaraError("Boş girdi", "parse");

  // Link biçimi: .../{slug}-p{reference}.html?v1={productId}
  const fromUrl = s.match(/-p(\d{6,10})\.html/i);
  if (fromUrl?.[1]) {
    const v1 = s.match(/[?&]v1=(\d+)/);
    return { reference: fromUrl[1], productId: v1?.[1] };
  }

  // Kod biçimi: aile / model / renk
  const parts = s.split("/").map((p) => p.replace(/\D/g, "")).filter(Boolean);
  if (parts.length >= 2) {
    return {
      reference: `${parts[0]}${parts[1]}`.padStart(8, "0"),
      colorId: parts[2],
    };
  }
  if (parts.length === 1 && parts[0] && parts[0].length >= 7) {
    return { reference: parts[0].padStart(8, "0") };
  }

  throw new ZaraError(
    "Zara linki ya da ürün kodu anlaşılamadı. Örnek: 8059/577/250",
    "parse",
  );
}

// ---------------------------------------------------------------------------
// API çağrıları
// ---------------------------------------------------------------------------

/**
 * Referanstan ürünü çözer. Türkçe ad ve renk isimleri bu endpoint'ten gelir.
 */
export async function getProductByReference(reference: string): Promise<ZaraProduct> {
  const url =
    `https://www.zara.com/itxrest/1/search/store/${STORE_ID}/reference` +
    `?reference=${encodeURIComponent(reference)}&locale=${LOCALE}&scope=default&origin=search&ajax=true`;

  const raw = await zaraFetchJson<RawRefSearch>(url);
  const contents = (raw.results ?? [])
    .map((r) => r.content)
    .filter((c): c is RawRefContent => c != null);

  const content = contents[0];
  if (raw.status !== "SUCCESS" || !content) {
    throw new ZaraError(`"${reference}" için ürün bulunamadı`, "not_found");
  }

  // Zara her renk için ayrı bir sonuç döndürür; hepsini tek ürüne topla.
  // Hex kodları availableColors'tan renk adıyla eşleştirilir.
  const hexByName = new Map(
    (content.availableColors ?? []).map((c) => [normalizeTr(c.colorName), c.hexColor]),
  );

  const colors: ZaraColor[] = [];
  const seen = new Set<string>();
  for (const c of contents) {
    for (const col of c.detail?.colors ?? []) {
      if (seen.has(col.id)) continue;
      seen.add(col.id);
      colors.push({
        id: col.id,
        name: col.name,
        productId: String(col.productId),
        imageUrl: mediaUrl(firstImage(col.xmedia)),
        hexCode: hexByName.get(normalizeTr(col.name)) ?? null,
      });
    }
  }

  if (colors.length === 0) {
    throw new ZaraError(`"${reference}" ürününün renkleri okunamadı`, "parse");
  }

  return {
    reference,
    displayReference: content.detail?.displayReference ?? reference,
    name: content.name,
    price: content.price / 100,
    seoKeyword: content.seo?.keyword ?? "urun",
    seoProductId: content.seo?.seoProductId ?? reference,
    colors,
  };
}

/**
 * Bir renk varyantının bedenlerini döndürür (SKU + beden adı + o anki stok).
 * Beden adları yalnızca bu endpoint'te var.
 */
export async function getSizes(productId: string): Promise<ZaraSize[]> {
  const url = `https://www.zara.com/api/storefront/1/stores/${STORE_ID}/products/id/${productId}`;
  const raw = await zaraFetchJson<RawProductDetail>(url);

  const sizes = raw.simplifiedCommercialComponent?.sizes ?? [];
  const mapped = sizes
    .filter((s) => s.identifier?.sku != null && s.nomenclature?.name)
    .map<ZaraSize>((s) => ({
      name: s.nomenclature!.name!,
      skuId: String(s.identifier!.sku!),
      availability: toAvailability(s.availability),
    }));

  if (mapped.length === 0) {
    throw new ZaraError(`Ürün ${productId} için beden bulunamadı`, "parse");
  }
  return mapped;
}

/**
 * Canlı stok durumu — worker'ın periyodik olarak çağırdığı hafif uç (~300 bayt).
 * Dönen harita: skuId -> durum.
 */
export async function getAvailability(productId: string): Promise<Map<string, Availability>> {
  const url = `https://www.zara.com/api/storefront/1/stores/${STORE_ID}/products/id/${productId}/availability`;
  const raw = await zaraFetchJson<RawAvailability>(url);

  const map = new Map<string, Availability>();
  for (const s of raw.sizes ?? []) {
    map.set(String(s.sku), toAvailability(s.availability));
  }
  if (map.size === 0) {
    throw new ZaraError(`Ürün ${productId} için stok bilgisi boş döndü`, "parse");
  }
  return map;
}

/**
 * Verilen koordinatın çevresindeki Zara mağazaları.
 * Zara mağaza adı döndürmediği için adres satırı etiket olarak kullanılır.
 */
export async function getStoresNear(latitude: number, longitude: number): Promise<ZaraStore[]> {
  const url =
    `https://www.zara.com/itxrest/1/bam/store/${STORE_ID}/physical-store` +
    `?latitude=${latitude}&longitude=${longitude}&languageId=${LANG_ID}&appId=1`;

  const raw = await zaraFetchJson<RawStores>(url);

  return (raw.physicalStores ?? []).map((s) => {
    const lines = s.addressLines ?? [];
    return {
      id: String(s.id),
      label: tidyAddress(lines[0] ?? `Mağaza ${s.id}`),
      addressLines: lines.map(tidyAddress),
      city: s.city ?? "",
      latitude: s.latitude,
      longitude: s.longitude,
      phones: s.phones ?? [],
      sections: s.sections ?? [],
      mapsUrl: `https://www.google.com/maps/search/?api=1&query=${s.latitude},${s.longitude}`,
    };
  });
}

/** Zara adresleri çift boşluk ve tutarsız büyük harf içerir; okunur hâle getirir. */
function tidyAddress(line: string): string {
  return line.replace(/\s{2,}/g, " ").trim();
}

export { buildProductUrl };
