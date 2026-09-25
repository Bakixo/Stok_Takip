/**
 * Uygulama ikonu — çalışma anında üretilir, ayrı bir görsel dosyası gerekmez.
 * Siyah zemin üzerinde serif "S": uygulamanın editoryal kimliğiyle aynı dil.
 */
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 340,
          lineHeight: 1,
          // Optik denge: serif "S" görsel olarak biraz yukarıda durur
          paddingBottom: 28,
        }}
      >
        S
      </div>
    ),
    size,
  );
}
