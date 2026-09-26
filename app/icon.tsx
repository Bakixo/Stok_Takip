/**
 * Uygulama ikonu — çalışma anında üretilir.
 *
 * Tasarım kararları:
 *  - Zemin siyah değil çok koyu mürekkep: ana ekranda düz siyah ikonlar
 *    arasında hafifçe ayrışıyor, uygulamanın kendi rengiyle de uyumlu.
 *  - "S" harfinin noktası yerine küçük bir çiçek: uygulamadaki açılış
 *    animasyonuyla aynı dil.
 *  - Harf, kenarlardan %18 içeride. Android "adaptive icon" ikonun
 *    kenarlarını kırpabiliyor; bu pay olmadan bazı telefonlarda kesiliyor.
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
          position: "relative",
          background: "#141414",
        }}
      >
        {/* Güvenli alan: Android kırpmasına karşı kenarlardan pay */}
        <div
          style={{
            width: "64%",
            height: "64%",
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
              fontSize: 300,
              lineHeight: 1,
              color: "#fcfcfc",
              // Serif "S" optik olarak yukarıda durur; aşağı itiyoruz.
              transform: "translateY(6px)",
            }}
          >
            S
          </div>

          {/* Sağ üstte küçük çiçek — açılış animasyonuyla aynı motif */}
          <div
            style={{
              position: "absolute",
              top: -18,
              right: -34,
              display: "flex",
            }}
          >
            <svg width="112" height="112" viewBox="0 0 40 40">
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
