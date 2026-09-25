/**
 * Mail şablonlarının ortak parçaları ve stilleri.
 *
 * Mail istemcileri (Gmail, Outlook, iOS Mail) modern CSS'in çoğunu desteklemez:
 * stiller satır içi, düzen tablo tabanlı, renkler sabit hex olmalı.
 *
 * Koyu mod: Gmail ve Outlook açık renkli gövdeleri kendiliğinden çevirir.
 * Bu yüzden zemin saf beyaz yerine kırık beyaz, metin saf siyah yerine koyu
 * gri — otomatik çevirme sonrası da okunur kalsın diye.
 */
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export const C = {
  bg: "#f5f5f4",
  card: "#ffffff",
  ink: "#141414",
  body: "#4a4a4a",
  muted: "#8a8a8a",
  line: "#e7e7e6",
  /** Durum vurguları — arayüzdekilerle aynı dil. */
  stock: "#3f8f5f",
  watching: "#b8791f",
} as const;

export const SERIF = "Georgia, 'Times New Roman', Times, serif";
export const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const s = {
  body: {
    backgroundColor: C.bg,
    fontFamily: SANS,
    margin: 0,
    padding: "32px 12px",
  } satisfies React.CSSProperties,

  container: {
    backgroundColor: C.card,
    margin: "0 auto",
    maxWidth: "560px",
    padding: "40px 32px",
  } satisfies React.CSSProperties,

  brand: {
    fontFamily: SERIF,
    fontSize: "20px",
    color: C.ink,
    margin: "0 0 32px",
    letterSpacing: "0.01em",
  } satisfies React.CSSProperties,

  h1: {
    fontFamily: SERIF,
    fontSize: "30px",
    lineHeight: 1.15,
    fontWeight: 400,
    color: C.ink,
    margin: "0 0 20px",
  } satisfies React.CSSProperties,

  lead: {
    fontSize: "16px",
    lineHeight: 1.55,
    color: C.body,
    margin: "0 0 28px",
  } satisfies React.CSSProperties,

  hr: {
    border: "none",
    borderTop: `1px solid ${C.line}`,
    margin: "32px 0",
  } satisfies React.CSSProperties,

  footer: {
    fontSize: "12px",
    lineHeight: 1.6,
    color: C.muted,
    textAlign: "center",
    margin: 0,
  } satisfies React.CSSProperties,

  footerLink: {
    color: C.muted,
    textDecoration: "underline",
  } satisfies React.CSSProperties,
};

/** Durum etiketi: renkli nokta + küçük büyük harf metin. */
export function StatusLine({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Text
      style={{
        fontSize: "12px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: C.ink,
        margin: "0 0 14px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "8px",
          backgroundColor: color,
          marginRight: "8px",
        }}
      />
      {children}
    </Text>
  );
}

/**
 * Büyük siyah buton.
 *
 * React Email'in <Button>'ı yerine tablo kullanıyoruz: Outlook'ta dolgu
 * (padding) güvenilir şekilde ancak tablo hücresinde uygulanıyor.
 */
export function BigButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td
            align="center"
            style={{ backgroundColor: C.ink, borderRadius: "2px" }}
          >
            <Link
              href={href}
              style={{
                display: "block",
                padding: "17px 24px",
                color: "#ffffff",
                fontFamily: SANS,
                fontSize: "15px",
                fontWeight: 500,
                letterSpacing: "0.04em",
                textDecoration: "none",
              }}
            >
              {children}
            </Link>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

interface ShellProps {
  preview: string;
  children: ReactNode;
  /** Alt bilgideki takibi durdurma linki. */
  unsubscribeUrl?: string;
  footerNote?: string;
}

/** Tüm maillerin dış kabuğu. */
export function Shell({ preview, children, unsubscribeUrl, footerNote }: ShellProps) {
  return (
    <Html lang="tr" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Text style={s.brand}>Stokta</Text>
          {children}
          <Hr style={s.hr} />
          <Text style={s.footer}>
            {footerNote ?? "Stokta — Zara'da beklediğin beden gelince haber verir."}
            {unsubscribeUrl && (
              <>
                <br />
                <Link href={unsubscribeUrl} style={s.footerLink}>
                  Bu takibi durdur
                </Link>
              </>
            )}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
