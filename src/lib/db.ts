import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Ket noi Postgres qua driver serverless cua Neon.
 * Prisma 7 khong con engine nhi phan nen bat buoc dung driver adapter.
 */
declare global {
  var __prisma: PrismaClient | undefined;
}

export function databaseIsConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

/**
 * Cloudflare Workers CẤM dùng lại đối tượng vào/ra giữa hai lượt gọi.
 *
 * Nối kết database tạo ở lượt gọi này mà đụng tới ở lượt gọi sau thì runtime
 * ném "Cannot perform I/O on behalf of a different request" rồi treo luôn —
 * đo được 30/09/2026 khi thử đưa web lên đó: trang quản lý trả 500 hết.
 *
 * Trên Node (Vercel, máy chạy thử) thì ngược lại, giữ lại mới đúng: không giữ
 * thì mỗi lần `next dev` nạp lại tệp là mở thêm một pool.
 *
 * Nên tách hẳn hai đường theo nơi đang chạy.
 */
const laWorkerd = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("Thieu DATABASE_URL.");

  const tao = () => new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

  if (laWorkerd) return tao();

  // Giu lai giua cac lan hot-reload cua next dev, khong thi moi lan sua file
  // lai mo them mot pool ket noi moi.
  if (!globalThis.__prisma) globalThis.__prisma = tao();
  return globalThis.__prisma;
}
