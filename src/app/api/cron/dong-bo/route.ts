import { databaseIsConfigured } from "@/lib/db";
import { docMoc, ghiMoc } from "@/lib/moc";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { dongBoAppSheet } from "@/lib/dongBoAppSheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Tải cả file AppSheet (~30.000 dòng) rồi so từng dòng — lần đầu mất cả phút. */
export const maxDuration = 300;

/**
 * Người lạ gọi đường này thì tối đa một lần mỗi 50 phút.
 *
 * Vì sao không khoá chặt như đường sao lưu (20 giờ): lịch của Vercel chạy MỖI
 * GIỜ và chưa đặt CRON_SECRET, nên chính lịch đó cũng bị tính là "người lạ" —
 * khoá 20 giờ là ngày chỉ chép được một lần. Chép lại vô hại: không đổi thì
 * chỉ hỏi Drive một câu rồi thôi, mà có đổi thì đằng nào cũng phải chép.
 */
const KHOANG_NGUOI_LA_MS = 50 * 60 * 1000;

/**
 * Chép hợp đồng, khách, phiếu thu từ AppSheet sang web (src/lib/dongBoAppSheet.ts).
 *
 * CHỈ MỘT NGƯỜI GỌI: nút "Đồng bộ ngay" của quản lý.
 *
 * Lịch chạy mỗi đêm 2 giờ 30 đã BỎ ngày 13/11/2026 — anh chốt chỉ đồng bộ
 * bằng nút bấm. (Lịch này vốn đã tắt từ 21/09, bật lại 13/11 rồi bỏ hẳn trong
 * cùng ngày.) Đường này giữ nguyên vì nút bấm gọi vào đây.
 *
 * Chặn người lạ: có CRON_SECRET thì bắt mã, chưa có thì tối đa một lần mỗi
 * 50 phút.
 */
export async function GET(req: Request) {
  if (!databaseIsConfigured()) {
    return Response.json({ error: "Chưa có database" }, { status: 503 });
  }

  const quanTri = await quyenAlbumNguyHiem();
  const biMat = process.env.CRON_SECRET?.trim();
  const dungMa = !!biMat && req.headers.get("authorization") === `Bearer ${biMat}`;

  if (!quanTri && !dungMa) {
    if (biMat) return Response.json({ error: "Không có quyền" }, { status: 401 });
    const lanThu = await docMoc("dongBoThu");
    if (lanThu && Date.now() - lanThu.getTime() < KHOANG_NGUOI_LA_MS) {
      return Response.json({ boQua: "Đã đồng bộ trong 20 giờ qua." });
    }
    await ghiMoc("dongBoThu", new Date());
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
