/**
 * Đơn từ — kiểu dữ liệu và phép kiểm, dùng chung máy chủ và trình duyệt.
 * Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 5).
 *
 * Mọi danh mục dưới đây lấy ĐÚNG CHỮ bên AppSheet, không tự đặt lại: 456 dòng
 * cũ mang đúng những chuỗi này, đổi chữ là bản chép và bản mới thành hai loại
 * dữ liệu khác nhau trong cùng một bảng.
 */

export const LOAI_DON = ["Xin nghỉ", "Nghỉ buổi chiều", "Xin ứng lương"] as const;

/** Chỉ có nghĩa với đơn xin nghỉ. Đo được: 332 hưởng lương, 119 không. */
export const LOAI_NGHI = ["Hưởng lương", "Không hưởng lương"] as const;

export const DON_DANG_TAO = "Đang tạo";
export const DON_DA_DUYET = "Đã duyệt";
export const DON_KHONG_DUYET = "Không duyệt";

export type DuLieuDon = {
  loaiDon: string;
  loaiNghi?: string;
  ngayYeuCau: string;
  lyDo: string;
  soTien?: number;
};

export type DonHopLe = {
  loaiDon: string;
  loaiNghi: string | null;
  ngayYeuCau: string;
  lyDo: string;
  soTien: number | null;
};

export function kiemDon(du: DuLieuDon): { loi: string } | DonHopLe {
  const loaiDon = String(du.loaiDon ?? "").trim();
  if (!(LOAI_DON as readonly string[]).includes(loaiDon)) return { loi: "Loại đơn chưa đúng." };

  const ngayYeuCau = String(du.ngayYeuCau ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ngayYeuCau)) return { loi: "Ngày chưa đúng." };

  const lyDo = String(du.lyDo ?? "").trim();
  if (!lyDo) return { loi: "Phải ghi lý do." };
  if (lyDo.length > 500) return { loi: "Lý do dài quá." };

  const laUngLuong = loaiDon === "Xin ứng lương";

  /*
    Hai ô phụ thuộc vào loại đơn, và KHÔNG cho gửi chéo: xin nghỉ mà kèm số
    tiền, hay xin ứng lương mà kèm "hưởng lương", là dấu hiệu người gõ chọn
    nhầm loại — nhận vào thì tới lúc tính lương mới phát hiện.
  */
  let soTien: number | null = null;
  if (laUngLuong) {
    const n = Math.round(Number(du.soTien));
    if (!Number.isFinite(n) || n <= 0 || n > 999_999_999) return { loi: "Số tiền xin ứng chưa đúng." };
    soTien = n;
  }

  let loaiNghi: string | null = null;
  if (!laUngLuong) {
    const l = String(du.loaiNghi ?? "").trim();
    if (!(LOAI_NGHI as readonly string[]).includes(l)) return { loi: "Phải chọn nghỉ hưởng lương hay không." };
    loaiNghi = l;
  }

  return { loaiDon, loaiNghi, ngayYeuCau, lyDo, soTien };
}
