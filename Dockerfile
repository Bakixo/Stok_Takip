# ─────────────────────────────────────────────────────────────
#  Stokta — web + worker tek imajda
#  Railway / Render / Fly.io için hazır.
#
#  Not: Next'in `output: "standalone"` modu bilerek kullanılmıyor.
#  Standalone yalnızca web uygulamasının bağımlılıklarını izler; worker'ın
#  kullandığı node-cron, nodemailer, zod gibi paketleri dışarıda bırakır ve
#  worker açılışta çöker. Bunun yerine imajda gerçek üretim bağımlılıkları
#  kuruluyor.
# ─────────────────────────────────────────────────────────────

# --- 1) Derleme ---
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma'nın Alpine'da ihtiyaç duyduğu kütüphaneler
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Prisma istemcisi Postgres için üretilsin; gerçek bağlantı çalışma anında gelir.
ENV DATABASE_PROVIDER=postgresql
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db"
RUN npm run build


# --- 2) Çalıştırma ---
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Üretim bağımlılıkları. tsx ve prisma "dependencies" altında çünkü ikisi de
# çalışma anında gerekiyor: tsx worker'ı çalıştırır, prisma şemayı uygular.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Uygulama kaynakları (worker TypeScript olarak çalışır)
COPY --chown=nextjs:nodejs prisma ./prisma
COPY --chown=nextjs:nodejs lib ./lib
COPY --chown=nextjs:nodejs worker ./worker
COPY --chown=nextjs:nodejs scripts ./scripts
COPY --chown=nextjs:nodejs public ./public
COPY --chown=nextjs:nodejs tsconfig.json next.config.ts ./

# Derlenmiş Next çıktısı
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# Üretilmiş Prisma istemcisi. Yeniden üretmek yerine kopyalanıyor: builder
# aynı temel imaj olduğu için motor ikilisi uyumlu ve sağlayıcı zaten doğru.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/schema.prisma ./prisma/schema.prisma

USER nextjs
EXPOSE 3000

# Şemayı uygula, sonra web + worker'ı başlat.
CMD ["node", "scripts/start-production.mjs"]
