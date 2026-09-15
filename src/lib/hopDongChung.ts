/**
 * Quy tắc dùng chung cho hợp đồng — trang quản lý lẫn bộ đồng bộ AppSheet.
 *
 * Không nhập Prisma: tệp này chạy được cả ở máy khách.
 */

/**
 * "12. Đã xong tiệc" → { buoc: 12, ten: "Đã xong tiệc" }.
 * Chịu được cả kiểu gõ thiếu cách bên AppSheet ("11.Đã giao váy tiệc").
 */
export function tachTrangThai(s: string | null | undefined): { buoc: number | null; ten: string } {
  const t = String(s ?? "").trim();
  const m = t.match(/^(\d{1,2})\s*\.\s*(.*)$/);
  return m ? { buoc: Number(m[1]), ten: m[2].trim() } : { buoc: null, ten: t };
}

/**
 * Bước cuối của hai nhánh trong bảng "Trạng thái" bên AppSheet: 9 là xong
 * nhánh chụp ở studio, 18 là xong nhánh tiệc.
 */
export const BUOC_XONG = [9, 18];

/**
 * Bước đang chờ KHÁCH làm gì đó — chọn ảnh gốc (4, 13) hay duyệt ảnh chỉnh (6,
 * 15). Tô màu riêng: đây là những hợp đồng sale cần nhắc khách.
 */
export const BUOC_CHO_KHACH = [4, 6, 13, 15];

/** "2026-09-15" → "15/09/2026". */
export function ngayVN(s: string | null | undefined): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : s;
}
