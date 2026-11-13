/**
 * SỔ SỰ CỐ — bảng "Log" bên AppSheet. Đợt 6 (13/11/2026).
 *
 * Hai trạng thái giữ nguyên chữ bên AppSheet, vì 13 dòng cũ đang mang đúng
 * chuỗi này.
 *
 * Bên AppSheet bảng này gần như chết: ba cột "Xử lý", "Thời gian tạo", "Thời
 * gian xử lý" rỗng cả 22 dòng, nên không dòng nào biết mình xảy ra lúc nào.
 * Trên web thì `taoLuc` và `xongLuc` là thời điểm thật — sổ chỉ bắt đầu có ích
 * từ dòng ghi trên web trở đi.
 */

export const SU_CO_DANG_TAO = "Đang tạo";
export const SU_CO_DA_XONG = "Đã xong";

export type DuLieuSuCo = { vanDe: string; thongTin: string };

const gon = (s: unknown) => String(s ?? "").trim().replace(/[ \t]+/g, " ");

export function kiemSuCo(du: DuLieuSuCo): { loi: string } | { vanDe: string; thongTin: string | null } {
  const vanDe = gon(du.vanDe);
  if (!vanDe) return { loi: "Chưa nói sự cố gì." };
  if (vanDe.length > 200) return { loi: "Tên sự cố dài quá, tối đa 200 ký tự." };

  const thongTin = gon(du.thongTin);
  if (thongTin.length > 2000) return { loi: "Chi tiết dài quá, tối đa 2000 ký tự." };

  return { vanDe, thongTin: thongTin || null };
}
