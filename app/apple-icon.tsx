/**
 * iOS ana ekran ikonu.
 *
 * Apple ikonu kendisi yuvarlatıyor (squircle) ve kırpmıyor, bu yüzden
 * güvenli alan Android'inkinden daha geniş tutulabilir. Motif ve renkler
 * app/icon.tsx ile aynı.
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
          position: "relative",
          background: "#141414",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "Georgia, serif",
              fontSize: 116,
              lineHeight: 1,
              color: "#fcfcfc",
              transform: "translateY(3px)",
            }}
          >
            S
          </div>

          {/* Çiçek harfe değmesin diye biraz daha yukarı ve sağa */}
          <div style={{ position: "absolute", top: -16, right: -26, display: "flex" }}>
            <svg width="44" height="44" viewBox="0 0 40 40">
              <g transform="translate(20 20)">
                {[0, 72, 144, 216, 288].map((a) => (
                  <ellipse
                    key={a}
                    cx="0"
                    cy="-11"
                    rx="6.5"
                    ry="9"
                    fill="#f2789f"
                    transform={`rotate(${a})`}
                  />
                ))}
                <circle cx="0" cy="0" r="4.5" fill="#ffd166" />
              </g>
            </svg>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
