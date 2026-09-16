import { databaseIsConfigured } from "@/lib/db";
import { docMoc, ghiMoc } from "@/lib/moc";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { dongBoAppSheet } from "@/lib/dongBoAppSheet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Tải cả file AppSheet (~30.000 dòng) rồi so từng dòng — lần đầu mất cả phút. */
export const maxDuration = 300;

/** Người lạ gọi đường này thì tối đa một lần mỗi 20 giờ. */
const KHOANG_NGUOI_LA_MS = 20 * 60 * 60 * 1000;

/**
 * Chép hợp đồng, khách, phiếu thu từ AppSheet sang web (src/lib/dongBoAppSheet.ts).
 *
 * Hai người gọi: lịch chạy của Vercel mỗi đêm 2 giờ 30 giờ Việt Nam
 * (vercel.json — trước bản sao lưu 3 giờ, để bản sao lưu đêm đó có dữ liệu
 * mới), và nút "Đồng bộ ngay" của quản lý. Chặn người lạ đúng như đường sao
 * lưu: có CRON_SECRET thì bắt mã, chưa có thì người lạ tối đa một lần mỗi 20 giờ.
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
