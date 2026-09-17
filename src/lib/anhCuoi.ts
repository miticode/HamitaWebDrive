import { boDau } from "./constants";

/**
 * Các mục nhỏ của trang Ảnh cưới (/anh-cuoi), anh yêu cầu 17/09/2026.
 *
 * File này chạy cả ở máy khách (trang quản lý) nên KHÔNG được nhập gì dính tới
 * Prisma (nguyên tắc 43).
 *
 * `ma`: mã đầu tên album (src/lib/maAlbum.ts) dùng để GỢI Ý album khi thêm vào
 * mục — anh chốt: Dạm ngõ là DN, Nhà gái là HER, Nhà trai là HIS, Đính hôn là
 * ĐH. Phóng sự cưới chưa có mã nên để null: ô chọn hiện mọi album.
 *
 * `key` là đoạn cuối đường dẫn (/anh-cuoi/dinh-hon) — link gửi khách, đừng đổi.
 */
export const MUC_ANH_CUOI = [
  { key: "dam-ngo", ten: "Dạm ngõ", ma: "DN" },
  { key: "dinh-hon", ten: "Đính hôn", ma: "ĐH" },
  { key: "nha-gai", ten: "Ngày cưới – Nhà gái", ma: "HER" },
  { key: "nha-trai", ten: "Ngày cưới – Nhà trai", ma: "HIS" },
  { key: "phong-su", ten: "Phóng sự cưới", ma: null },
] as const satisfies readonly { key: string; ten: string; ma: string | null }[];

export type MucAnhCuoi = (typeof MUC_ANH_CUOI)[number]["key"];

export function laMucAnhCuoi(s: string): s is MucAnhCuoi {
  return MUC_ANH_CUOI.some((m) => m.key === s);
}

/**
 * Tên album có mang mã này không. So theo ĐẦU TỪ sau khi bỏ dấu, cùng cách hàng
 * nút lọc ở trang quản lý album: "HIS - HER - Công Hiếu & Ngọc Hằng" khớp cả
 * HIS lẫn HER, còn "Hershey" không khớp HER vì phải đứng riêng một từ.
 */
export function coMa(ten: string, ma: string): boolean {
  const key = boDau(ma);
  return boDau(ten)
    .split(/[^a-z0-9]+/)
    .some((t) => t === key);
}
