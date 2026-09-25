/**
 * "Takibe alındı" onay maili. Kısa ve sakin — asıl haber sonra gelecek.
 */
import { Img, Text } from "@react-email/components";
import { formatPrice, locative } from "@/lib/tr";
import { C, s, Shell, StatusLine } from "./shared";

export interface WatchConfirmedProps {
  productName: string;
  imageUrl: string;
  colorName: string;
  size: string;
  price: number;
  city: string;
  unsubscribeUrl: string;
}

export function WatchConfirmed(p: WatchConfirmedProps) {
  return (
    <Shell preview={`${p.productName} (${p.size}) takibe alındı.`} unsubscribeUrl={p.unsubscribeUrl}>
      <StatusLine color={C.watching}>Takibe alındı</StatusLine>

      <Text style={s.h1}>Gözüm üstünde.</Text>

      <Text style={s.lead}>
        <strong style={{ color: C.ink }}>{p.size}</strong> bedeni stoğa girdiğinde
        sana hemen haber vereceğim. On beş dakikada bir kontrol ediyorum.
      </Text>

      {/* Ürün özeti: görsel solda, bilgiler sağda — Outlook için tablo. */}
      <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
        <tbody>
          <tr>
            {p.imageUrl && (
              <td width="96" valign="top" style={{ paddingRight: "16px" }}>
                <Img
                  src={p.imageUrl}
                  alt={`${p.productName} — ${p.colorName}`}
                  width="96"
                  style={{
                    width: "96px",
                    height: "auto",
                    display: "block",
                    backgroundColor: "#f0f0ef",
                  }}
                />
              </td>
            )}
            <td valign="top">
              <Text style={{ fontSize: "15px", fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>
                {p.productName}
              </Text>
              <Text style={{ fontSize: "14px", color: C.body, margin: "0 0 4px" }}>
                {p.colorName} · Beden {p.size}
              </Text>
              <Text style={{ fontSize: "14px", color: C.body, margin: 0 }}>
                {formatPrice(p.price)}
              </Text>
              <Text style={{ fontSize: "13px", color: C.muted, margin: "8px 0 0" }}>
                {locative(p.city)}
              </Text>
            </td>
          </tr>
        </tbody>
      </table>
    </Shell>
  );
}

export function watchConfirmedText(p: WatchConfirmedProps): string {
  return [
    "STOKTA",
    "",
    "Gözüm üstünde.",
    "",
    `${p.size} bedeni stoğa girdiğinde sana hemen haber vereceğim.`,
    "On beş dakikada bir kontrol ediyorum.",
    "",
    p.productName,
    `${p.colorName} · Beden ${p.size} · ${formatPrice(p.price)}`,
    locative(p.city),
    "",
    "—",
    "",
    `Bu takibi durdur: ${p.unsubscribeUrl}`,
  ].join("\n");
}

WatchConfirmed.PreviewProps = {
  productName: "HACİMLİ KOLLU POPLİN GÖMLEK",
  imageUrl:
    "https://static.zara.net/assets/public/8b9b/6a0b/dab24c0ab4c9/9251a5591c8b/08059577250-p/08059577250-p.jpg?ts=1790085261087&w=750",
  colorName: "Beyaz",
  size: "S",
  price: 1790,
  city: "Ankara",
  unsubscribeUrl: "https://ornek.app/takip/abc123/durdur",
} satisfies WatchConfirmedProps;

export default WatchConfirmed;
