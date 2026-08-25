import { isAdmin } from "@/lib/auth";
import { listCounts, listGalleries } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Trang quản lý hỏi đường này để biết có gì mới mà không phải tải lại cả trang.
 *
 * Chỉ trả về đúng những con số cần để so sánh — không kèm ảnh bìa, tên thư mục
 * hay bất cứ thứ gì nặng. Trang này được hỏi lại đều đặn suốt lúc studio mở
 * trang quản lý, nên mỗi lần phải thật nhẹ.
 *
 * KHÔNG gọi Drive (nguyên tắc 9): tất cả đọc từ database.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const [galleries, counts] = await Promise.all([listGalleries(), listCounts()]);

  // Gộp số ảnh đã chọn theo từng album, để so được cả khi khách chọn thêm
  // chứ không chỉ lúc họ bấm nút báo xong.
  const soDaChon = new Map<string, number>();
  for (const c of counts) {
    soDaChon.set(c.galleryId, (soDaChon.get(c.galleryId) ?? 0) + c.count);
  }

  return Response.json(
    {
      album: galleries.map((g) => ({
        id: g.id,
        ten: g.clientName ?? g.title,
        slug: g.slug,
        baoXongLuc: g.selectionsDoneAt,
        daChon: soDaChon.get(g.id) ?? 0,
      })),
    },
    // Không được để CDN giữ lại: hỏi để biết cái mới nhất mà nhận bản cũ thì vô nghĩa.
    { headers: { "Cache-Control": "no-store" } }
  );
}
