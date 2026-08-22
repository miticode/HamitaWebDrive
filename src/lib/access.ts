import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Ma chon anh cua album.
 *
 * Chi co mot cach lam duy nhat: ai co link deu xem anh thoai mai, nhung phai co
 * ma cua studio moi tim/tick duoc. Tranh nguoi ngoai chon bay vao danh sach in
 * cua khach, ma van de khoe anh cho ho hang.
 *
 * Ca nha dung chung mot ma nen lua chon cung la mot danh sach chung — nho vay
 * co dau chon tren dien thoai roi mo laptop van thay dung, va hai nguoi cung
 * tim mot tam thi chi tinh mot lan.
 */

/** Chu de doc, bo nhung ky tu de nhin nham: 0/O, 1/I/l. */
const CHU = "ABCDEFGHJKMNPQRSTUVWXYZ";
const SO = "23456789";

/** Sinh ma dang "HAMITA-KP47" — doc qua dien thoai cho khach van khong nham. */
export function sinhMa(): string {
  let ra = "";
  for (let i = 0; i < 2; i++) ra += CHU[Math.floor(Math.random() * CHU.length)];
  for (let i = 0; i < 2; i++) ra += SO[Math.floor(Math.random() * SO.length)];
  return `HAMITA-${ra}`;
}

/** So sanh ma khach nhap voi ma that: bo qua hoa thuong va khoang trang. */
export function maKhop(nhap: string, that: string | null): boolean {
  if (!that) return false;
  const a = Buffer.from(nhap.trim().toUpperCase());
  const b = Buffer.from(that.trim().toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

function tenCookie(galleryId: string): string {
  return `mo-album-${galleryId}`;
}

/*
  Chu ky lay tu chinh ma cua album. Nho vay khi anh doi ma, moi phieu cu tu het
  hieu luc — khong can them buoc thu hoi nao.
*/
function chuKy(galleryId: string, code: string): string {
  return createHmac("sha256", code).update(galleryId).digest("hex").slice(0, 32);
}

export async function daMoKhoa(galleryId: string, code: string | null): Promise<boolean> {
  if (!code) return true; // Album chua co ma thi tam cho chon
  const got = (await cookies()).get(tenCookie(galleryId))?.value;
  return got === chuKy(galleryId, code);
}

export async function ghiNhanMoKhoa(galleryId: string, code: string): Promise<void> {
  (await cookies()).set(tenCookie(galleryId), chuKy(galleryId, code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 120, // 120 ngay, du cho ca mua cuoi
    path: "/",
  });
}
