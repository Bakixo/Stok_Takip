/**
 * Prisma istemcisi — tek örnek (singleton).
 * Next.js geliştirme modunda sıcak yeniden yükleme her seferinde yeni bir
 * bağlantı havuzu açmasın diye global üzerinde saklanır.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
