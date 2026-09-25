/**
 * PWA manifesti — "ana ekrana ekle" için. Next.js bunu /manifest.webmanifest
 * adresinden sunar. İkonlar icon.tsx / apple-icon.tsx tarafından üretilir.
 */
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stokta",
    short_name: "Stokta",
    description: "Zara'da beklediğin beden gelince haber ver.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfcfc",
    theme_color: "#141414",
    lang: "tr",
    dir: "ltr",
    categories: ["shopping", "utilities"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
