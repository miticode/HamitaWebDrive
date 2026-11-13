import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { databaseIsConfigured } from "@/lib/db";
import { docMoc, ghiMoc } from "@/lib/moc";
import { taoBanSaoLuu } from "@/lib/saoLuu";
import { LoiSaoLuuDrive, luuLenDrive } from "@/lib/saoLuuDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Đọc hết mọi bảng, nén, gửi lên Drive — nặng hơn một request thường. */
export const maxDuration = 60;

/**
 * Sao lưu database lên Google Drive của studio.
 *
 * Hai người gọi:
 * - (CŨ) lịch chạy của Vercel mỗi đêm 3 giờ sáng — ĐÃ BỎ 13/11/2026, anh chốt
 *   chỉ sao lưu bằng nút bấm. Đường này vẫn giữ nguyên vì nút bấm gọi vào đây;
 *   chỉ không còn ai gọi tự động nữa.
 * - Nút "Sao lưu lên Drive ngay" ở trang quản lý album (đã đăng nhập).
 *
 * ━━ ĐÓNG CỬA NGƯỜI LẠ 13/11/2026 ━━
 *
 * Bản cũ cho người chưa đăng nhập gọi được, tối đa một lần mỗi 20 giờ, vì lịch
 * Vercel chưa có CRON_SECRET nên cũng bị tính là người lạ. Hôm nay lịch đã bỏ
 * hẳn, nên cửa đó chỉ còn là chỗ để phá — mỗi lượt là đọc HẾT mọi bảng, nén,
 * rồi đẩy lên Drive. Giờ chỉ quản lý đã đăng nhập, hoặc đúng CRON_SECRET.
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

  const luc = new Date();
  try {
    const ban = await taoBanSaoLuu(luc);
    const kq = await luuLenDrive(ban, luc);
    // "saoLuu" là mốc trang quản lý đọc để báo "lần cuối cách đây bao lâu";
    // "saoLuuTuDong" riêng cho bản lên Drive, để biết lịch chạy đêm có sống không.
    await ghiMoc("saoLuu", luc);
    await ghiMoc("saoLuuTuDong", luc);
    return Response.json({ ok: true, tenTep: kq.tenTep, kb: kq.kb, soLuong: ban.soLuong });
  } catch (loi) {
    console.error("[sao-luu] khong sao luu duoc:", loi);
    /*
      Chỉ nói lý do cụ thể cho quản lý. Người lạ chỉ nhận một câu chung —
      không có lý do gì để kể cho họ biết web đang kết nối Drive thế nào.
    */
    if (!quanTri) return Response.json({ error: "Không sao lưu được" }, { status: 500 });
    return Response.json(
      {
        error: loi instanceof Error ? loi.message : String(loi),
        canKetNoiLai: loi instanceof LoiSaoLuuDrive && loi.canKetNoiLai,
      },
      { status: 500 },
    );
  }
}
