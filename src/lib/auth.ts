import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { docMoc, ghiMoc } from "@/lib/moc";

const COOKIE = "admin_session";

/** Mốc "đăng xuất mọi máy" gần nhất. */
const MOC_DANG_XUAT = "dangXuatMoiMay";

/**
 * Phiếu đăng nhập bằng mật khẩu chung KHÔNG nằm trong database — nó chỉ là dấu
 * băm của mật khẩu, nên không xoá từng cái được. Cách đá mọi máy ra là ĐỔI thứ
 * đem đi băm: mốc "đăng xuất mọi máy". Đổi mốc thì mọi phiếu phát trước đó hết
 * giá trị ngay, mà mật khẩu vẫn nguyên.
 *
 * Bọc cache của React: một lượt tải hỏi quyền vài lần vẫn chỉ đọc database một
 * lần. Chỉ trang và đường API của phần quản trị mới hỏi tới đây — đường ảnh
 * của khách không đụng vào (đo 16/09/2026).
 *
 * Chưa từng bấm đăng xuất mọi máy thì mốc là "v1" — đúng chuỗi cũ, nên phiếu
 * đang có vẫn dùng bình thường.
 */
const mocDangXuat = cache(async (): Promise<string> => {
  const m = await docMoc(MOC_DANG_XUAT);
  return m ? String(m.getTime()) : "v1";
});

/**
 * Cong admin bang mot mat khau duy nhat trong bien moi truong.
 * Du cho mot studio tu dung; neu sau nay nhieu nguoi dung thi thay bang
 * dang nhap that.
 */
async function expectedToken(): Promise<string | null> {
  // Phai trim: khi nap bien moi truong len Vercel, gia tri de bi dinh mot ky tu
  // xuong dong o cuoi — luc do mat khau dung van bao sai ma khong hieu tai sao.
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) return null;
  return createHmac("sha256", password).update(`admin-${await mocDangXuat()}`).digest("hex");
}

/** Chua dat mat khau => trang admin mo tu do (chi nen xay ra khi chay o may). */
export function adminPasswordIsSet(): boolean {
  return !!process.env.ADMIN_PASSWORD?.trim();
}

export async function isAdmin(): Promise<boolean> {
  const token = await expectedToken();
  if (!token) return true;

  const got = (await cookies()).get(COOKIE)?.value;
  if (!got || got.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(token));
}

export async function signIn(password: string): Promise<boolean> {
  const token = await expectedToken();
  if (!token) return true;

  const candidate = createHmac("sha256", password).update(`admin-${await mocDangXuat()}`).digest("hex");
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

/**
 * ĐĂNG XUẤT MỌI MÁY, cả hai kiểu đăng nhập:
 * - Phiếu mật khẩu chung: ghi mốc mới, mọi phiếu cũ hết giá trị (xem mocDangXuat).
 * - Tài khoản nhân viên: xoá sạch bảng phiên đăng nhập.
 *
 * Dùng khi có người nghỉ việc, mất điện thoại, hay khi muốn cả tiệm bắt đầu
 * dùng tài khoản riêng thay cho mật khẩu chung (studio bấm lần đầu 16/09/2026).
 * Mật khẩu KHÔNG đổi: ai còn mật khẩu thì đăng nhập lại như thường; ai chưa
 * được cấp mật khẩu thì từ đây không vào được nữa.
 */
export async function dangXuatMoiMay(): Promise<{ soPhien: number }> {
  await ghiMoc(MOC_DANG_XUAT, new Date());
  if (!databaseIsConfigured()) return { soPhien: 0 };
  const { count } = await getPrisma().phienDangNhap.deleteMany({});
  return { soPhien: count };
}
