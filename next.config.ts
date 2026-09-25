import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Zara görselleri yalnızca kendi CDN'inden gelir.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "static.zara.net" }],
    formats: ["image/avif", "image/webp"],
  },
  // `output: "standalone"` bilerek kullanılmıyor.
  //
  // Standalone çıktısı yalnızca Next uygulamasının izini sürüyor; worker'ın
  // kullandığı node-cron, nodemailer, zod gibi paketleri dahil etmiyor ve
  // worker konteynerde açılışta çöküyor. Bunun yerine imajda gerçek üretim
  // bağımlılıkları kuruluyor (bkz. Dockerfile) ve `next start` çalıştırılıyor.
};

export default nextConfig;
