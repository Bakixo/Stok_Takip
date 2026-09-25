/**
 * Hoş geldin maili — ilk girişte bir kez gider.
 *
 * Hediye notunu Baki yazacak: metni .env içindeki WELCOME_NOTE değişkenine
 * koyman yeterli, şablon onu olduğu gibi gösterir. Boş bırakılırsa not
 * bölümü hiç görünmez.
 */
import { Text } from "@react-email/components";
import { BigButton, C, s, Shell } from "./shared";

export interface WelcomeProps {
  appUrl: string;
  /** Hediye notu. Boşsa not bölümü gizlenir. */
  note?: string;
}

export function Welcome({ appUrl, note }: WelcomeProps) {
  return (
    <Shell
      preview="Stokta'ya hoş geldin."
      footerNote="Stokta — yalnızca senin için yapıldı."
    >
      <Text style={s.h1}>Hoş geldin.</Text>

      <Text style={s.lead}>
        Bu küçük uygulama tek bir iş yapıyor: Zara&apos;da istediğin ürünün
        istediğin bedeni tükendiyse, stoğa geri girdiği anda sana haber veriyor.
      </Text>

      {note && (
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ margin: "0 0 28px" }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  borderLeft: `2px solid ${C.ink}`,
                  padding: "4px 0 4px 18px",
                }}
              >
                {/* Not birden çok paragraf olabilir. */}
                {note.split(/\n{2,}/).map((paragraph, i) => (
                  <Text
                    key={i}
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.6,
                      color: C.ink,
                      fontStyle: "italic",
                      margin: i === 0 ? "0" : "12px 0 0",
                    }}
                  >
                    {paragraph}
                  </Text>
                ))}
              </td>
            </tr>
          </tbody>
        </table>
      )}

      <Text style={{ ...s.lead, margin: "0 0 12px" }}>
        Nasıl çalışıyor:
      </Text>
      <Text style={{ fontSize: "15px", lineHeight: 1.7, color: C.body, margin: "0 0 28px" }}>
        1. Zara&apos;dan ürün linkini kopyala, uygulamaya yapıştır.
        <br />
        2. Renk, beden ve şehri seç.
        <br />
        3. Stok varsa doğrudan ürüne git; yoksa takibe al.
        <br />
        4. Beden geldiğinde e-posta kutunda olacağım.
      </Text>

      <BigButton href={appUrl}>Uygulamayı Aç</BigButton>

      <Text style={{ fontSize: "13px", color: C.muted, textAlign: "center", margin: "14px 0 0" }}>
        Telefonda tarayıcı menüsünden &quot;Ana ekrana ekle&quot; dersen
        uygulama gibi açılır.
      </Text>
    </Shell>
  );
}

export function welcomeText(p: WelcomeProps): string {
  const lines = [
    "STOKTA",
    "",
    "Hoş geldin.",
    "",
    "Bu küçük uygulama tek bir iş yapıyor: Zara'da istediğin ürünün",
    "istediğin bedeni tükendiyse, stoğa geri girdiği anda sana haber veriyor.",
  ];

  if (p.note) lines.push("", ...p.note.split("\n").map((l) => `  ${l}`));

  lines.push(
    "",
    "Nasıl çalışıyor:",
    "1. Zara'dan ürün linkini kopyala, uygulamaya yapıştır.",
    "2. Renk, beden ve şehri seç.",
    "3. Stok varsa doğrudan ürüne git; yoksa takibe al.",
    "4. Beden geldiğinde e-posta kutunda olacağım.",
    "",
    `Uygulamayı aç: ${p.appUrl}`,
    "",
    'Telefonda tarayıcı menüsünden "Ana ekrana ekle" dersen uygulama gibi açılır.',
  );
  return lines.join("\n");
}

Welcome.PreviewProps = {
  appUrl: "https://stokta.ornek.app",
  note: "Buraya hediye notun gelecek.\n\nİkinci paragraf da yazabilirsin; şablon paragrafları ayrı ayrı gösterir.",
} satisfies WelcomeProps;

export default Welcome;
