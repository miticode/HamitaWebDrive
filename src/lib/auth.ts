import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "admin_session";

/**
 * Cong admin bang mot mat khau duy nhat trong bien moi truong.
 * Du cho mot studio tu dung; neu sau nay nhieu nguoi dung thi thay bang
 * dang nhap that.
 */
function expectedToken(): string | null {
  // Phai trim: khi nap bien moi truong len Vercel, gia tri de bi dinh mot ky tu
  // xuong dong o cuoi — luc do mat khau dung van bao sai ma khong hieu tai sao.
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  return createHmac("sha256", password).update("admin-v1").digest("hex");
}

/** Chua dat mat khau => trang admin mo tu do (chi nen xay ra khi chay o may). */
export function adminPasswordIsSet(): boolean {
  return expectedToken() !== null;
}

export async function isAdmin(): Promise<boolean> {
  const token = expectedToken();
  if (!token) return true;

  const got = (await cookies()).get(COOKIE)?.value;
  if (!got || got.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(token));
}

export async function signIn(password: string): Promise<boolean> {
  const token = expectedToken();
  if (!token) return true;

  const candidate = createHmac("sha256", password).update("admin-v1").digest("hex");
  if (candidate !== token) return false;

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return true;
}

export async function signOut(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
