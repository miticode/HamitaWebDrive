import { NextRequest } from "next/server";
import { z } from "zod";
import { daMoKhoa } from "@/lib/access";
import { getGalleryBySlug, setMucXong } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  /** Ma thu muc con. Chuoi rong = anh nam ngay thu muc goc. */
  albumId: z.string().max(200),
  tenMuc: z.string().min(1).max(300),
  xong: z.boolean(),
});

/**
 * Khach tu bao "da chon xong anh" cho MOT thu muc.
 *
 * Truoc day trang thai nay tinh chung ca album: khach chon xong thu muc dau
 * roi sang thu muc thu hai, thi o thu muc thu hai van hien "da bao xong" trong
 * khi ho chua dong vao. Moi thu muc mot trang thai rieng thi dung thuc te hon
 * — studio cung biet duoc khach dang lam toi dau.
 *
 * Cung dieu kien bao mat voi chon anh: phai da mo khoa dung ma, vi day cung la
 * mot phan cua viec chon.
 */
export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const body = parsed.data;
  const gallery = await getGalleryBySlug(body.slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  if (!(await daMoKhoa(gallery.id, gallery.accessCode))) {
    return Response.json({ error: "Cần mã của studio để báo" }, { status: 403 });
  }

  await setMucXong(gallery.id, body.albumId, body.tenMuc, body.xong);
  return Response.json({ ok: true });
}
