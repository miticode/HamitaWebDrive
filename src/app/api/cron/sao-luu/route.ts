import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { databaseIsConfigured } from "@/lib/db";
import { docMoc, ghiMoc } from "@/lib/moc";
import { taoBanSaoLuu } from "@/lib/saoLuu";
import { LoiSaoLuuDrive, luuLenDrive } from "@/lib/saoLuuDrive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Đọc hết mọi bảng, nén, gửi lên Drive — nặng hơn một request thường. */
export const maxDuration = 60;

/** Người lạ gọi đường này thì tối đa một lần mỗi 20 giờ. */
const KHOANG_NGUOI_LA_MS = 20 * 60 * 60 * 1000;

/**
 * Sao lưu database lên Google Drive của studio.
 *
 * Hai người gọi:
 * - (CŨ) lịch chạy của Vercel mỗi đêm 3 giờ sáng — ĐÃ BỎ 13/11/2026, anh chốt
 *   chỉ sao lưu bằng nút bấm. Đường này vẫn giữ nguyên vì nút bấm gọi vào đây;
 *   chỉ không còn ai gọi tự động nữa.
 * - Nút "Sao lưu lên Drive ngay" ở trang quản lý album (đã đăng nhập).
 *
 * Chặn người lạ thế nào: nếu đặt biến môi trường CRON_SECRET thì Vercel gửi kèm
 * mã đó, ai không có mã (và không đăng nhập quản lý) thì bị từ chối. Chưa đặt
 * thì vẫn chạy được — để anh không phải vào cài đặt Vercel mới có sao lưu —
 * nhưng người lạ gọi thì tối đa MỘT LẦN MỖI 20 GIỜ, tính cả lần hỏng. Gọi phá
 * mấy cũng chỉ ra thêm một bản sao lưu mỗi ngày, không đọc database liên tục
 * được.
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

    const lanThu = await docMoc("saoLuuTuDongThu");
    if (lanThu && Date.now() - lanThu.getTime() < KHOANG_NGUOI_LA_MS) {
      return Response.json({ boQua: "Đã sao lưu tự động trong 20 giờ qua." });
    }
    await ghiMoc("saoLuuTuDongThu", new Date());
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
