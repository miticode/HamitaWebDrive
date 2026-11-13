import { databaseIsConfigured } from "@/lib/db";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { dongBoAppSheet } from "@/lib/dongBoAppSheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Tải cả file AppSheet (~30.000 dòng) rồi so từng dòng — lần đầu mất cả phút. */
export const maxDuration = 300;

/**
 * Chép hợp đồng, khách, phiếu thu từ AppSheet sang web (src/lib/dongBoAppSheet.ts).
 *
 * CHỈ MỘT NGƯỜI GỌI: nút "Đồng bộ ngay" của quản lý.
 *
 * Lịch chạy mỗi đêm 2 giờ 30 đã BỎ ngày 13/11/2026 — anh chốt chỉ đồng bộ
 * bằng nút bấm. (Lịch này vốn đã tắt từ 21/09, bật lại 13/11 rồi bỏ hẳn trong
 * cùng ngày.) Đường này giữ nguyên vì nút bấm gọi vào đây.
 *
 * ━━ ĐÓNG CỬA NGƯỜI LẠ 13/11/2026 ━━
 *
 * Bản cũ cho người CHƯA ĐĂNG NHẬP gọi được, tối đa một lần mỗi 50 phút. Lý do
 * khi đó chính đáng: lịch của Vercel chạy mỗi giờ mà chưa đặt CRON_SECRET, nên
 * chính nó cũng bị tính là người lạ — khoá chặt là lịch chết theo.
 *
 * Cùng ngày hôm nay hai lịch Vercel đã BỎ HẲN, nên không còn ai cần gọi mà
 * không đăng nhập. Cửa đó giờ chỉ còn là chỗ để phá: ai biết địa chỉ cũng kích
 * được một lượt chép đè, cứ 50 phút một lần — đúng thứ có thể đè mất hợp đồng
 * cũ vừa sửa trên web. Kịch bản thử phân quyền 13/11 bắt được.
 *
 * CRON_SECRET giữ lại: ngày nào anh bật lại lịch thì khai biến đó là chạy được
 * ngay, không phải sửa mã.
 */
export async function GET(req: Request) {
  if (!databaseIsConfigured()) {
    return Response.json({ error: "Chưa có database" }, { status: 503 });
  }

  const quanTri = await quyenAlbumNguyHiem();
  const biMat = process.env.CRON_SECRET?.trim();
  const dungMa = !!biMat && req.headers.get("authorization") === `Bearer ${biMat}`;

  if (!quanTri && !dungMa) {
    return Response.json({ error: "Không có quyền" }, { status: 401 });
  }

  try {
    const ketQua = await dongBoAppSheet(quanTri ? "Quản lý bấm đồng bộ" : "Đồng bộ tự động");
    return Response.json({ ok: true, ketQua });
  } catch (loi) {
    console.error("[dong-bo] khong dong bo duoc:", loi);
    if (!quanTri) return Response.json({ error: "Không đồng bộ được" }, { status: 500 });
    return Response.json({ error: loi instanceof Error ? loi.message : String(loi) }, { status: 500 });
  }
}
