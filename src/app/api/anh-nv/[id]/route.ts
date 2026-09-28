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
      /*
        Ảnh riêng thì cấm CDN giữ hộ, chỉ cho chính trình duyệt người xem nhớ.

        Ảnh công khai thì giữ thật lâu, vì địa chỉ luôn mang sẵn `?v=<lúc cập
        nhật>` (xem src/app/page.tsx): đổi ảnh là địa chỉ đổi theo, nên nội
        dung ở MỘT địa chỉ cụ thể không bao giờ đổi.

        Trước 28/09/2026 chỗ này để 5 phút. Hệ quả: trang giới thiệu tuy đã
        dựng sẵn nhưng cứ 5 phút lại có người ghé là từng tấm ảnh nhân viên
        đọc database một lượt — đúng thứ vừa bỏ công cắt ở trang.
      */
      "Cache-Control": anh.congKhai ? "public, max-age=31536000, immutable" : "private, max-age=60",
    },
  });
}
