import { NextRequest } from "next/server";
import { z } from "zod";
import { getPrisma, databaseIsConfigured } from "@/lib/db";
import { getGalleryBySlug } from "@/lib/store";
import { pushDaBat } from "@/lib/push";

export const runtime = "nodejs";

/**
 * Khách đăng ký / huỷ nhận thông báo đẩy cho một album.
 *
 * KHÔNG đòi mã của studio ở đây, khác với việc chọn ảnh. Lý do: nhận tin "có
 * ảnh mới" là việc vô hại, mà bắt nhập mã thì đúng những người cần nhắc nhất —
 * họ hàng được gửi link, người chưa từng nhập mã — lại không bao giờ đăng ký
 * được. Kẻ xấu có đăng ký cũng chỉ nhận được đúng câu "có ảnh mới", không thấy
 * gì thêm.
 */

const Dang = z.object({
  slug: z.string().min(1),
  endpoint: z.string().url().max(1000),
  p256dh: z.string().min(1).max(300),
  auth: z.string().min(1).max(300),
});

export async function POST(req: NextRequest) {
  if (!pushDaBat() || !databaseIsConfigured()) {
    return Response.json({ error: "Chưa bật thông báo" }, { status: 503 });
  }

  const parsed = Dang.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  const { slug, endpoint, p256dh, auth } = parsed.data;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  /*
    upsert theo endpoint: cùng một máy đăng ký lại (mở app lần nữa, đổi album)
    thì cập nhật chứ không sinh thêm dòng — không thì studio nhắn một lần mà
    khách nhận ba thông báo giống hệt nhau.
  */
  await getPrisma().pushSub.upsert({
    where: { endpoint },
    create: { galleryId: gallery.id, endpoint, p256dh, auth },
    update: { galleryId: gallery.id, p256dh, auth },
  });

  return Response.json({ ok: true });
}

const Huy = z.object({ endpoint: z.string().url().max(1000) });

export async function DELETE(req: NextRequest) {
  if (!databaseIsConfigured()) return Response.json({ ok: true });

  const parsed = Huy.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Dữ liệu sai" }, { status: 400 });

  await getPrisma().pushSub.deleteMany({ where: { endpoint: parsed.data.endpoint } });
  return Response.json({ ok: true });
}
