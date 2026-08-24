import { NextRequest } from "next/server";
import { z } from "zod";
import { daMoKhoa } from "@/lib/access";
import { getGalleryBySlug, setSelectionsDone } from "@/lib/store";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  xong: z.boolean(),
});

/**
 * Khach tu bao "da chon xong anh". Cung dieu kien bao mat voi chon anh — phai
 * da mo khoa dung ma — vi day cung la mot phan cua viec chon.
 *
 * Ap dung cho ca gallery, khong rieng tung thu muc con: moi thu muc dung
 * chung mot danh sach chon nen "xong" cung phai la mot trang thai chung.
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

  await setSelectionsDone(gallery.id, body.xong);
  return Response.json({ ok: true });
}
