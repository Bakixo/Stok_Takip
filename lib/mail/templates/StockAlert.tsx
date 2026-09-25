/**
 * "Stokta!" maili — asıl bildirim.
 *
 * Konu: Stokta: {Ürün adı} ({beden}) — {şehir}
 */
import { Img, Link, Section, Text } from "@react-email/components";
import { formatPrice, locativeAdj } from "@/lib/tr";
import { BigButton, C, s, SANS, Shell, StatusLine } from "./shared";

export interface StockAlertProps {
  productName: string;
  imageUrl: string;
  productUrl: string;
  colorName: string;
  size: string;
  /** TL cinsinden. */
  price: number;
  city: string;
  /** Şehirdeki mağazalar — konum bilgisi, stok durumu değil. */
  stores: Array<{ label: string; mapsUrl: string }>;
  unsubscribeUrl: string;
  /** "Son birkaç adet" durumunda başlık ve renk değişir. */
  lowStock?: boolean;
}

export function StockAlert(p: StockAlertProps) {
  const heading = p.lowStock ? "Son birkaç adet kaldı." : "Beklediğin beden geldi.";

  return (
    <Shell
      preview={`${p.productName} — ${p.size} bedeni stokta.`}
      unsubscribeUrl={p.unsubscribeUrl}
    >
      {/* Etiket "Stokta" olamaz — hemen üstündeki marka adıyla çakışır. */}
      <StatusLine color={p.lowStock ? C.watching : C.stock}>
        {p.lowStock ? "Son birkaç adet" : "Bulundu"}
      </StatusLine>

      <Text style={s.h1}>{heading}</Text>

      {p.imageUrl && (
        <Img
          src={p.imageUrl}
          // Görsel yüklenmezse bile hangi ürün olduğu anlaşılsın.
          alt={`${p.productName} — ${p.colorName}`}
          width="496"
          style={{
            width: "100%",
            maxWidth: "496px",
            height: "auto",
            display: "block",
            backgroundColor: "#f0f0ef",
            margin: "0 0 24px",
          }}
        />
      )}

      <Text style={{ fontSize: "17px", fontWeight: 600, color: C.ink, margin: "0 0 6px" }}>
        {p.productName}
      </Text>
      <Text style={{ fontSize: "15px", color: C.body, margin: "0 0 28px" }}>
        {p.colorName} · Beden {p.size} · {formatPrice(p.price)}
      </Text>

      <BigButton href={p.productUrl}>Ürüne Git</BigButton>

      <Text style={{ fontSize: "13px", color: C.muted, textAlign: "center", margin: "14px 0 0" }}>
        Stoklar hızlı tükenebilir.
      </Text>

      {p.stores.length > 0 && (
        <Section style={{ marginTop: "36px" }}>
          <Text
            style={{
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.ink,
              margin: "0 0 6px",
            }}
          >
            {locativeAdj(p.city)} mağazalar
          </Text>
          <Text style={{ fontSize: "13px", lineHeight: 1.5, color: C.muted, margin: "0 0 16px" }}>
            Mağaza stoğu Zara tarafından dışarıya verilmiyor; bu liste yalnızca
            nereye bakacağını göstermek için.
          </Text>

          {p.stores.map((store) => (
            <Text
              key={store.mapsUrl}
              style={{
                fontSize: "14px",
                lineHeight: 1.5,
                margin: "0 0 10px",
                fontFamily: SANS,
              }}
            >
              <Link href={store.mapsUrl} style={{ color: C.ink, textDecoration: "underline" }}>
                {store.label}
              </Link>
            </Text>
          ))}
        </Section>
      )}
    </Shell>
  );
}

/**
 * Mailin düz metin sürümü.
 *
 * HTML'den otomatik türetmiyoruz: türetici başlıkları İngilizce kurallarıyla
 * büyütüp Türkçe "i" harfini bozuyor ("geldi" → "GELDI").
 */
export function stockAlertText(p: StockAlertProps): string {
  const lines = [
    "STOKTA",
    "",
    p.lowStock ? "Son birkaç adet kaldı." : "Beklediğin beden geldi.",
    "",
    p.productName,
    `${p.colorName} · Beden ${p.size} · ${formatPrice(p.price)}`,
    "",
    `Ürüne git: ${p.productUrl}`,
    "",
    "Stoklar hızlı tükenebilir.",
  ];

  if (p.stores.length > 0) {
    lines.push(
      "",
      "—",
      "",
      `${locativeAdj(p.city)} mağazalar`,
      "(Mağaza stoğu Zara tarafından dışarıya verilmiyor; bu liste yalnızca",
      "nereye bakacağını göstermek için.)",
      "",
      ...p.stores.map((store) => `• ${store.label}\n  ${store.mapsUrl}`),
    );
  }

  lines.push("", "—", "", `Bu takibi durdur: ${p.unsubscribeUrl}`);
  return lines.join("\n");
}

/** react-email önizlemesi için örnek veri. */
StockAlert.PreviewProps = {
  productName: "PİLİLİ POPLİN GÖMLEK",
  imageUrl:
    "https://static.zara.net/assets/public/8b9b/6a0b/dab24c0ab4c9/9251a5591c8b/08059577250-p/08059577250-p.jpg?ts=1790085261087&w=750",
  productUrl: "https://www.zara.com/tr/tr/pilili-poplin-gomlek-p08059577.html?v1=580760534",
  colorName: "Beyaz",
  size: "M",
  price: 1890,
  city: "İstanbul",
  stores: [
    {
      label: "ŞİŞLİ TEŞVİKİYE CADDESİ, 41",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=41.05069,28.99273",
    },
    {
      label: "KADIKÖY ÇEÇEN SOKAK, 549",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=41.00226,29.05460",
    },
  ],
  unsubscribeUrl: "https://ornek.app/takip/abc123/durdur",
} satisfies StockAlertProps;

export default StockAlert;
