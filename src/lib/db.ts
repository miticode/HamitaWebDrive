import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Ket noi Postgres qua driver serverless cua Neon.
 * Prisma 7 khong con engine nhi phan nen bat buoc dung driver adapter.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export function databaseIsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Thieu DATABASE_URL.");

  // Giu lai giua cac lan hot-reload cua next dev, khong thi moi lan sua file
  // lai mo them mot pool ket noi moi.
  if (!globalThis.__prisma) {
    globalThis.__prisma = new PrismaClient({
      adapter: new PrismaNeon({ connectionString }),
    });
  }
  return globalThis.__prisma;
}
