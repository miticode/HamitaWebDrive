import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { Prisma } from "@/generated/prisma/client";

/**
 * Dựng nội dung một bản sao lưu database.
 *
 * DÙNG CHUNG cho mọi đường lấy bản sao lưu — lệnh `npm run db:backup`, nút tải
 * về ở trang quản lý, và bản tự động lên Drive mỗi đêm. Để mỗi bên tự viết một
 * bản thì sớm muộn cũng lệch nhau.
 *
 * KHÔNG LẤY những thứ là CHÌA KHOÁ, dù bảng của chúng vẫn được sao lưu:
 * - `GoogleAccount.refreshToken`: mở được TOÀN BỘ Drive của studio và không
 *   hết hạn. Phục hồi xong chỉ cần bấm "Kết nối lại" ở trang quản lý.
 * - `NhanVien.matKhau`: dù đã băm, một tệp chép đi chép lại vẫn cho người khác
 *   ngồi dò mật khẩu yếu. Phục hồi xong quản lý cấp lại mật khẩu cho nhân viên.
 *
 * Một tệp sao lưu nằm trên ổ đĩa, trên Drive, bị tải qua trình duyệt — không
 * phải chỗ để giữ chìa khoá.
 */

/*
  MỌI BẢNG phải nằm ở MỘT trong hai danh sách dưới đây. Bảng mới chưa khai báo
  thì taoBanSaoLuu() BÁO LỖI thay vì lặng lẽ bỏ qua.

  Vì sao phải khắt khe thế: đo ngày 15/09/2026, bản sao lưu chỉ lấy 6 bảng
  trong khi database đã có 13. BiaMuc (ảnh bìa từng thư mục), GoiMuc (gói ảnh
  từng thư mục), Moc (mốc đã gửi thông báo), cùng toàn bộ nhân viên và nhật ký
  đều KHÔNG được sao lưu — và không ai biết, vì bản sao lưu thiếu bảng trông y
  hệt bản đủ bảng cho tới đúng lúc cần phục hồi. Chú thích cũ ở đầu tệp này đã
  cảnh báo đúng chuyện ấy mà vẫn xảy ra; chỉ lời nhắc thì không đủ.
*/
const BANG_SAO_LUU = [
  "Gallery",
  "SelectionList",
  "Selection",
  "MucXong",
  "PushSub",
  "BiaMuc",
  "GoiMuc",
  "Moc",
  "GoogleAccount",
  "NhanVien",
  "NhatKy",
  "ThongTinStudio",
  "NoiQuy",
  "DichVu",
  "GiaHangMuc",
  "KhachHang",
  "HopDong",
  "ChiTietHopDong",
  "PhieuThu",
] as const;

/** Bảng cố ý không sao lưu, kèm lý do. */
const BANG_BO_QUA: Record<string, string> = {
  LoginAttempt: "bản ghi tạm để chặn dò mật khẩu, tự xoá sau 15 phút",
  PhienDangNhap: "phiên đăng nhập của nhân viên — phục hồi xong đăng nhập lại là có",
};

/** Bảng có trong database mà chưa khai báo sao lưu hay bỏ qua. Rỗng = đủ. */
export function bangChuaKhaiBao(): string[] {
  const daKhai = new Set<string>([...BANG_SAO_LUU, ...Object.keys(BANG_BO_QUA)]);
  return Object.values(Prisma.ModelName).filter((m) => !daKhai.has(m));
}

export type BanSaoLuu = {
  phienBan: number;
  luc: string;
  ghiChu: string;
  soLuong: Record<string, number>;
  bang: Record<string, unknown[]>;
};

/**
 * Tên tệp dạng hamita-2026-08-26-1614.json — sắp xếp chữ là ra đúng thứ tự
 * thời gian.
 *
 * Tính theo GIỜ STUDIO (nguyên tắc 35), không theo giờ máy đang chạy: trên
 * Vercel máy chạy giờ UTC, bản sao lưu lúc 3 giờ sáng Việt Nam sẽ mang tên
 * "…-2000" của hôm trước — nhìn tên tệp là hiểu sai ngày.
 */
export function tenTepSaoLuu(luc: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MUI_GIO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(luc)
      .map((x) => [x.type, x.value]),
  );
  return `hamita-${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}.json`;
}

export async function taoBanSaoLuu(luc = new Date()): Promise<BanSaoLuu> {
  const thieu = bangChuaKhaiBao();
  if (thieu.length > 0) {
    throw new Error(
      `Bảng mới chưa khai báo sao lưu: ${thieu.join(", ")}. Thêm vào BANG_SAO_LUU hoặc BANG_BO_QUA trong src/lib/saoLuu.ts.`,
    );
  }

  const prisma = getPrisma();
  const [
    gallery,
    selectionList,
    selection,
    mucXong,
    pushSub,
    biaMuc,
    goiMuc,
    moc,
    googleAccount,
    nhanVien,
    nhatKy,
    thongTinStudio,
    noiQuy,
    dichVu,
    giaHangMuc,
    khachHang,
    hopDong,
    chiTietHopDong,
    phieuThu,
  ] = await Promise.all([
    prisma.gallery.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.selectionList.findMany({ orderBy: { position: "asc" } }),
    prisma.selection.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mucXong.findMany(),
    prisma.pushSub.findMany(),
    prisma.biaMuc.findMany(),
    prisma.goiMuc.findMany(),
    prisma.moc.findMany(),
    prisma.googleAccount.findMany({
      // Cố tình KHÔNG lấy refreshToken — xem chú thích đầu tệp.
      select: { id: true, email: true, connectedAt: true },
    }),
    // Cố tình KHÔNG lấy mật khẩu — xem chú thích đầu tệp.
    prisma.nhanVien.findMany({ omit: { matKhau: true }, orderBy: { taoLuc: "asc" } }),
    prisma.nhatKy.findMany({ orderBy: { luc: "asc" } }),
    prisma.thongTinStudio.findMany(),
    prisma.noiQuy.findMany({ orderBy: { thuTu: "asc" } }),
    prisma.dichVu.findMany({ orderBy: { maDV: "asc" } }),
    prisma.giaHangMuc.findMany({ orderBy: { taoLuc: "asc" } }),
    /*
      Bốn bảng đợt 2 lúc này chỉ là bản chép từ AppSheet, vẫn sao lưu: tới ngày
      chuyển hẳn sang web thì chúng thành bản gốc, lúc đó mới thêm là muộn.
    */
    prisma.khachHang.findMany({ orderBy: { taoLuc: "asc" } }),
    prisma.hopDong.findMany({ orderBy: { taoLuc: "asc" } }),
    prisma.chiTietHopDong.findMany({ orderBy: { taoLuc: "asc" } }),
    prisma.phieuThu.findMany({ orderBy: { taoLuc: "asc" } }),
  ]);

  /*
    Tên khoá trong tệp giữ đúng kiểu cũ (chữ đầu viết thường) để bản sao lưu
    phiên bản 1 và phiên bản 2 cùng đọc được bằng một script phục hồi.
  */
  const bang = {
    gallery,
    selectionList,
    selection,
    mucXong,
    pushSub,
    biaMuc,
    goiMuc,
    moc,
    googleAccount,
    nhanVien,
    nhatKy,
    thongTinStudio,
    noiQuy,
    dichVu,
    giaHangMuc,
    khachHang,
    hopDong,
    chiTietHopDong,
    phieuThu,
  };

  return {
    phienBan: 2,
    luc: luc.toISOString(),
    ghiChu:
      "Sao lưu database web Hamita Studio. KHÔNG chứa phiếu đăng nhập Google và " +
      "mật khẩu nhân viên — phục hồi xong phải bấm 'Kết nối lại' Google và cấp " +
      "lại mật khẩu cho nhân viên.",
    soLuong: Object.fromEntries(Object.entries(bang).map(([k, v]) => [k, v.length])),
    bang,
  };
}
