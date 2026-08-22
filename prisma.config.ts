import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next doc .env.local, con Prisma CLI thi khong — nap tay de ca hai dung chung
// mot noi khai bao, khoi phai chep DATABASE_URL ra hai cho.
loadEnv({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Chi dung cho lenh migrate/introspect. Luc chay that thi PrismaClient nhan
  // ket noi qua driver adapter trong src/lib/db.ts.
  // Gia tri gia o day de `prisma generate` chay duoc khi chua co Neon.
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://user:pass@localhost:5432/chua-cau-hinh",
  },
});
