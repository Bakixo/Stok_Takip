/**
 * Zara TR iç API'lerinin döndürdüğü verilerin bizim kullandığımız hâli.
 * Ham cevap şekilleri `raw.ts` içinde; burası uygulamanın gördüğü sadeleştirilmiş model.
 */

/** Zara'nın beden bazında döndürdüğü stok durumları (Faz 0'da 275 beden taranarak doğrulandı). */
export type Availability = "in_stock" | "low_on_stock" | "out_of_stock" | "coming_soon";

/** Kullanıcı için "alınabilir" sayılan durumlar. */
export const IN_STOCK_STATES: readonly Availability[] = ["in_stock", "low_on_stock"] as const;

export function isPurchasable(a: Availability): boolean {
  return IN_STOCK_STATES.includes(a);
}

/** Türkçe etiketler. */
export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: "Stokta",
  low_on_stock: "Son birkaç adet",
  out_of_stock: "Tükendi",
  coming_soon: "Çok yakında",
};

/** Bir ürünün tek bir renk varyantı. */
export interface ZaraColor {
  /** Renk kodu, ör. "250". */
  id: string;
  /** Türkçe renk adı, ör. "Beyaz". */
  name: string;
  /** Bu rengin Zara ürün id'si — stok sorguları bununla yapılır. */
  productId: string;
  /** Ürün görseli (tam URL). */
  imageUrl: string | null;
  /** Zara'nın verdiği renk kodu (#rrggbb); yoksa görsel swatch kullanılır. */
  hexCode: string | null;
}

/** Bir renk varyantının tek bedeni. */
export interface ZaraSize {
  /** Beden adı, ör. "M" ya da "38". */
  name: string;
  /** Bedenin SKU id'si — stok cevabında bununla eşleşir. */
  skuId: string;
  availability: Availability;
}

/** Kullanıcının girdiği link/koddan çözülmüş ürün. */
export interface ZaraProduct {
  /** Ürün ailesi referansı, ör. "08059577". */
  reference: string;
  /** Kullanıcıya gösterilen kod, ör. "8059/577". */
  displayReference: string;
  /** Türkçe ürün adı. */
  name: string;
  /** Fiyat, TL cinsinden (Zara kuruş döndürür, burada bölünmüştür). */
  price: number;
  /** URL oluşturmak için SEO parçaları. */
  seoKeyword: string;
  seoProductId: string;
  colors: ZaraColor[];
}

/** Şehirdeki bir Zara mağazası. */
export interface ZaraStore {
  id: string;
  /** Zara mağaza adı döndürmediği için adres satırı etiket olarak kullanılır. */
  label: string;
  addressLines: string[];
  city: string;
  latitude: number;
  longitude: number;
  phones: string[];
  /** "Woman", "Man", "Kids" ... */
  sections: string[];
  /** Google Haritalar linki. */
  mapsUrl: string;
}

/** Ürün sayfasına derin link üretir. */
export function buildProductUrl(
  product: Pick<ZaraProduct, "seoKeyword" | "seoProductId">,
  productId: string,
): string {
  return `https://www.zara.com/tr/tr/${product.seoKeyword}-p${product.seoProductId}.html?v1=${productId}`;
}
