/**
 * Kiểu dữ liệu và phép kiểm của SỔ CHI — dùng chung cho cả máy chủ và trình
 * duyệt. Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 3).
 *
 * Để ở tệp riêng chứ KHÔNG để trong tệp `"use server"`: tệp server action chỉ
 * được xuất ra hàm async — xuất một mảng hằng thì Next biến nó thành tham
 * chiếu sang máy chủ, và phía trình duyệt gọi `.includes` trên đó sẽ nổ
 * "… is not a function" (vấp thật 23/09/2026, xem `TRANG_THAI_VIEC`).
 */

/**
 * CHÚ Ý CHỮ HOA: bên AppSheet bảng Chi ghi "Chuyển **K**hoản" còn bảng Thu ghi
 * "Chuyển **k**hoản". Đây KHÔNG phải gõ nhầm ở đây — web ghi đúng chuỗi mà
 * bảng Chi bên đó đang dùng, để cột này chỉ có một cách viết thay vì hai.
 *
 * Dọn chữ hoa chữ thường là việc của đợt 7, làm một lượt sau khi chuyển xong;
 * làm bây giờ là lúc đối chiếu hai bên không khớp nữa.
 */
export const HINH_THUC_CHI = ["Tiền mặt", "Chuyển Khoản"] as const;

/** Khoản chi hay gõ nhất bên AppSheet — chỉ để gợi ý, vẫn gõ tự do được. */
export const KHOAN_CHI_HAY_DUNG = [
  "Trả lương",
  "Lấy váy",
  "Trang phục",
  "Mua hàng",
  "Đồ concept",
  "Thiết bị",
  "Mặt bằng",
  "Giặt đồ",
  "Tạm ứng",
  "Phí phim trường",
  "Chi phí in ảnh",
  "Chi phí khác",
] as const;

/**
 * Trạng thái của một khoản chi.
 *
 * Giống hệt quy tắc bên phiếu thu (`trangThaiThu`): người không phải quản lý
 * lập thì phiếu nằm CHỜ DUYỆT, quản lý lập thì tính là đã chi luôn. Tiền ra
 * khỏi két phải có người chịu trách nhiệm, mà người đó không thể là chính
 * người vừa lập phiếu.
 *
 * Bên AppSheet bảng Chi KHÔNG có trạng thái "Chờ duyệt" — chỉ có hai trạng
 * thái đã chi. Nên "Chờ duyệt" chỉ xuất hiện ở phiếu lập trên web, và đó là
 * chủ ý: đây là chỗ web chặt hơn AppSheet, không phải chỗ web lệch.
 */
export function trangThaiChi(hinhThuc: string, laQuanLy: boolean): string {
  if (!laQuanLy) return "Chờ duyệt";
  return hinhThuc === "Tiền mặt" ? "Đã chi tiền mặt" : "Đã chi chuyển khoản";
}

export const CHO_DUYET = "Chờ duyệt";

export type DuLieuChi = {
  ngayChi: string;
  khoanChi: string;
  soTien: number;
  hinhThuc: string;
  taiKhoan?: string;
  dienGiai?: string;
  nguoiNhan?: string;
  ghiChu?: string;
};

export type DongChiMoi = {
  ngayChi: string;
  khoanChi: string;
  soTien: number;
  hinhThuc: string;
  taiKhoan: string;
  dienGiai: string;
  nguoiNhan: string;
  ghiChu: string;
};

/**
 * Kiểm trước khi ghi. Chạy ở CẢ HAI phía: trình duyệt để báo sớm cho người
 * gõ, máy chủ để thật sự chặn — nguyên tắc 3, không tin việc trang đã giấu nút.
 */
export function kiemChi(du: DuLieuChi): { loi: string } | DongChiMoi {
  const soTien = Math.round(Number(du.soTien));
  if (!Number.isFinite(soTien) || soTien <= 0 || soTien > 999_999_999) {
    return { loi: "Số tiền chưa đúng." };
  }

  const hinhThuc = String(du.hinhThuc ?? "").trim();
  if (!(HINH_THUC_CHI as readonly string[]).includes(hinhThuc)) {
    return { loi: "Hình thức chi chưa đúng." };
  }

  const ngayChi = String(du.ngayChi ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayChi)) return { loi: "Ngày chi chưa đúng." };

  /*
    Khoản chi BẮT BUỘC phải có. Bên AppSheet cột này để trống được, và đúng 15
    dòng đang trống — nhìn vào sổ chỉ thấy một số tiền ra mà không biết ra vì
    gì. Không để web đẻ thêm dòng như vậy nữa.
  */
  const khoanChi = String(du.khoanChi ?? "").trim();
  if (!khoanChi) return { loi: "Phải ghi khoản chi là gì." };
  if (khoanChi.length > 120) return { loi: "Khoản chi dài quá." };

  const taiKhoan = String(du.taiKhoan ?? "").trim();
  if (hinhThuc !== "Tiền mặt" && !taiKhoan) {
    return { loi: "Chuyển khoản thì phải ghi chi từ tài khoản nào." };
  }

  return {
    soTien,
    hinhThuc,
    ngayChi,
    khoanChi,
    taiKhoan,
    dienGiai: String(du.dienGiai ?? "").trim(),
    nguoiNhan: String(du.nguoiNhan ?? "").trim(),
    ghiChu: String(du.ghiChu ?? "").trim(),
  };
}
