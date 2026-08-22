import { headers } from "next/headers";
import { databaseIsConfigured, getPrisma } from "@/lib/db";

/**
 * Chan do mat khau trang admin.
 *
 * Cho phep MAX_FAILS lan sai trong WINDOW_MS, sau do khoa theo dia chi IP.
 * Khong the dua vao mat khau manh: nguoi dung co the dat mat khau de doan,
 * nen lop nay la thu duy nhat dung giua ke do va toan bo album cua khach.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

/** Dem tam khi chua co database (chi khi chay o may). */
const memory = new Map<string, number[]>();

export async function clientIp(): Promise<string> {
  const h = await headers();
  // Vercel dat IP that o dau x-forwarded-for; cac gia tri sau la proxy trung gian.
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip")?.trim() || "khong-ro";
}

function since(): Date {
  return new Date(Date.now() - WINDOW_MS);
}

/** Con bao nhieu lan thu nua truoc khi bi khoa. 0 nghia la da khoa. */
export async function remainingAttempts(ip: string): Promise<number> {
  if (!databaseIsConfigured()) {
    const times = (memory.get(ip) ?? []).filter((t) => t > Date.now() - WINDOW_MS);
    memory.set(ip, times);
    return Math.max(0, MAX_FAILS - times.length);
  }

  const fails = await getPrisma().loginAttempt.count({
    where: { ip, createdAt: { gte: since() } },
  });
  return Math.max(0, MAX_FAILS - fails);
}

export async function recordFailure(ip: string): Promise<void> {
  if (!databaseIsConfigured()) {
    const times = (memory.get(ip) ?? []).filter((t) => t > Date.now() - WINDOW_MS);
    times.push(Date.now());
    memory.set(ip, times);
    return;
  }

  const prisma = getPrisma();
  await prisma.loginAttempt.create({ data: { ip } });
  // Don cac ban ghi qua han, khong thi bang nay phinh mai.
  await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: since() } } });
}

/** Dang nhap dung thi xoa lich su sai, khong bat nguoi dung that cho oan. */
export async function clearFailures(ip: string): Promise<void> {
  if (!databaseIsConfigured()) {
    memory.delete(ip);
    return;
  }
  await getPrisma().loginAttempt.deleteMany({ where: { ip } });
}

export const LOCK_MINUTES = WINDOW_MS / 60000;
