/*
  HÀNG CHỜ HẬU KỲ — hai bước mà ảnh đã chụp xong và đang nằm chờ chỉnh.

  Anh yêu cầu 26/11/2026: "hiện lên cho a phần trạng thái số 5 và số 14".

  Tách ra khỏi trang vì ba nơi cùng cần biết hai số này — trang Đầu việc (để
  bày lối vào và đếm), trang hàng chờ (để lọc), và phép đổi bước
  (`buocSauKhiGuiAnhHoanThien` trong buocAnhGoc.ts, đi ra từ đúng hai bước
  ấy). Chép ba bản là sớm muộn ba bản lệch nhau một con số.
*/

/** Bước 5 nhánh chụp studio, bước 14 nhánh tiệc. */
export const BUOC_HAU_KY = [5, 14] as const;

export type BuocHauKy = (typeof BUOC_HAU_KY)[number];

/**
 * Tên NGẮN của bước, dùng trên chip.
 *
 * Không tra bảng `BuocHopDong` trong database dù tên thật nằm ở đó: tên thật
 * của bước 14 là "Đang chỉnh sửa hình , clip tiệc" — hăm chín ký tự kèm một
 * dấu phẩy lạc chỗ, đặt lên chip thì chip rộng gấp ba cái bên cạnh. Đây là
 * NHÃN trên nút, không phải trạng thái ghi vào hợp đồng, nên được phép gọn.
 */
export function tenBuocHauKy(buoc: number): string {
  return buoc === 5 ? "Đang Retouch" : "Chỉnh sửa tiệc";
}

/** Một ngày tính bằng mili giây. */
const MOT_NGAY = 86_400_000;

/**
 * Buổi chụp CUỐI CÙNG ĐÃ QUA trong một hợp đồng — mốc để đếm ngày chờ chỉnh.
 *
 * Không lấy buổi gần nhất nói chung: hợp đồng cưới thường còn một buổi tiệc ở
 * tương lai, lấy buổi ấy thì ra số ngày ÂM và màn hình nói nhà này chưa tới
 * lượt — trong khi ảnh chụp hôm trước đã nằm trên Drive chờ chỉnh.
 *
 * `null` khi chưa buổi nào qua. Đó là chuyện có thật (hợp đồng bị gõ nhầm sang
 * bước 5 trước ngày chụp), và gọi tên nó ra đúng hơn là đếm bừa một con số.
 */
export function mocDaQua(ngays: readonly (string | null)[], nay: string): string | null {
  const qua = ngays.filter((n): n is string => !!n && n <= nay).sort();
  return qua.length ? qua[qua.length - 1] : null;
}

/**
 * Số ngày từ `ngay` tới `nay`, theo GIỜ STUDIO (nguyên tắc 35).
 *
 * Dựng mốc từ chuỗi "YYYY-MM-DD" kèm +07:00 chứ không dùng `new Date()` của
 * máy: lệch bảy tiếng là lệch hẳn một ngày với mọi buổi chụp buổi sáng.
 */
export function soNgayCho(ngay: string, nay: string): number {
  const a = new Date(`${ngay}T00:00:00+07:00`).getTime();
  const b = new Date(`${nay}T00:00:00+07:00`).getTime();
  return Math.round((b - a) / MOT_NGAY);
}

/** Chờ từng này ngày trở lên thì tô vàng. Hai tuần: quá một nhịp hẹn khách. */
export const CHO_LAU = 14;
