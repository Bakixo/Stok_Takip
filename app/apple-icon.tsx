/**
 * iOS ana ekran ikonu. Apple ikonu kendisi yuvarlatır, bu yüzden köşe
 * yuvarlaması yok; kenar boşluğu biraz daha geniş tutuldu.
 */
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141414",
          color: "#fcfcfc",
          fontFamily: "Georgia, serif",
          fontSize: 116,
          lineHeight: 1,
          paddingBottom: 10,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
