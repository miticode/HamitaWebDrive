import { NextRequest } from "next/server";
import { docAnhNhanVien } from "@/lib/doiNgu";
import { layNguoiDung } from "@/lib/phienNhanVien";

export const runtime = "nodejs";

/**
 * Ảnh đại diện một nhân viên (anh yêu cầu 25/09/2026).
 *
 * Ảnh nằm trong database chứ không phải Drive, nên route này đọc thẳng từ đó.
 *
 * AI ĐƯỢC XEM: người đang hiện ở khu "Đội ngũ" thì ảnh công khai — khách vào
 * trang giới thiệu phải thấy. Người chưa bật cờ đó (hoặc đã nghỉ làm) thì chỉ
 * người đã đăng nhập mới xem được: ảnh nhân viên là thứ của họ, chưa ai đồng ý
 * đưa ra ngoài thì đừng đưa.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const anh = await docAnhNhanVien(id);
  if (!anh) return new Response("Không có ảnh", { status: 404 });

  if (!anh.congKhai && !(await layNguoiDung())) {
    return new Response("Không có quyền", { status: 403 });
  }

  /*
    ETag theo lúc cập nhật: đổi ảnh là chuỗi này đổi nên trình duyệt tải lại
    ngay, còn chưa đổi thì trả 304, khỏi kéo lại vài chục KB mỗi lượt xem.
  */
  const etag = `"nv-${id}-${anh.capNhatLuc.getTime()}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(anh.duLieu), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(anh.duLieu.length),
      ETag: etag,
      // Ảnh riêng thì cấm CDN giữ hộ, chỉ cho chính trình duyệt người xem nhớ.
      "Cache-Control": anh.congKhai ? "public, max-age=300, stale-while-revalidate=86400" : "private, max-age=60",
    },
  });
}
