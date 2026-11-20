import { cache } from "react";
import { getPrisma } from "@/lib/db";
import { LOAI_LICH } from "@/lib/hopDongChung";
import { MA_ALBUM_THEO_BUOI } from "@/lib/goiNhieuNgay";

/*
  LOẠI BUỔI CHỤP, ĐỌC TỪ DATABASE — anh yêu cầu 18/11/2026.

  Trước đó 12 loại nằm cứng trong `hopDongChung.ts`. Đo 18/11 thì thấy lỗ:
  ba loại CÓ THẬT trong dữ liệu mà không có trong bảng cứng — "Chụp sự kiện"
  (4 buổi), "Chụp chịu lạy" (3), "chụp đầy tháng" (1). Lịch cũ mang chúng
  nhưng người lập không chọn lại được, y hệt chuyện "DẠM NGÕ" thiếu trong
  danh sách loại hợp đồng hồi 14/11.

  Bảng rỗng thì dùng lại bảng cứng, giống hệt cách `BuocHopDong` làm: web
  không bao giờ hiện ô chọn trống, kể cả khi chưa ai nhập gì.
*/

export type LoaiBuoiGon = {
  ten: string;
  /** Mã album suy ra từ loại này, null nếu không suy ra mã nào. */
  maAlbum: string | null;
};

/** Bảng cứng dựng thành danh sách — dùng khi bảng trong database còn rỗng. */
function macDinh(): LoaiBuoiGon[] {
  return LOAI_LICH.map((ten) => ({
    ten,
    maAlbum: MA_ALBUM_THEO_BUOI[ten.trim().toLowerCase()] ?? null,
  }));
}

/**
 * Danh sách loại buổi cho Ô CHỌN — chỉ những loại đang dùng.
 *
 * `cache` của React: một lượt dựng trang gọi bao nhiêu lần cũng chỉ hỏi
 * database một lần. Trang lập hợp đồng cần danh sách này, mà nó còn đọc dịch
 * vụ, bước, giá hạng mục — mỗi truy vấn thừa là một lần Neon thức thêm
 * (nguyên tắc 53).
 */
export const docLoaiBuoi = cache(async (): Promise<LoaiBuoiGon[]> => {
  const ds = await getPrisma().loaiBuoi.findMany({
    where: { dangDung: true },
    select: { ten: true, maAlbum: true },
    orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
  });
  return ds.length > 0 ? ds : macDinh();
});

/**
 * Bảng tra loại buổi → mã album, dùng lúc tạo album.
 *
 * Lấy CẢ loại đã ngưng dùng: hợp đồng cũ vẫn mang những loại đó, và album của
 * chúng phải ra đúng mã như ngày xưa. Ngưng dùng chỉ có nghĩa "đừng cho chọn
 * mới", không phải "quên nó đi".
 */
export const docMaTheoBuoi = cache(async (): Promise<Map<string, string>> => {
  const ds = await getPrisma().loaiBuoi.findMany({
    where: { maAlbum: { not: null } },
    select: { ten: true, maAlbum: true },
  });
  if (ds.length === 0) {
    return new Map(Object.entries(MA_ALBUM_THEO_BUOI));
  }
  return new Map(ds.map((x) => [x.ten.trim().toLowerCase(), x.maAlbum!]));
});

/** Mã album của một loại buổi, tra trong bảng đã đọc. */
export function maTheoBuoi(bang: Map<string, string>, loai: string | null | undefined): string | null {
  if (!loai) return null;
  return bang.get(loai.trim().toLowerCase()) ?? null;
}

/**
 * Bảng tra loại buổi → MÀU trên lịch (anh chốt 20/11/2026).
 *
 * Lấy CẢ loại đã ngưng dùng, cùng lý do với `docMaTheoBuoi`: lịch cũ vẫn mang
 * những loại đó và vẫn phải hiện đúng màu. Ngưng dùng chỉ có nghĩa "đừng cho
 * chọn mới".
 *
 * Chỉ trả loại ĐÃ GÁN MÀU. Loại chưa gán không nằm trong bảng, và nơi gọi để
 * `mauMacDinh` lo — xem `nhomCuaBuoi` trong lichChung.ts.
 *
 * `cache` của React như hai hàm trên: trang Lịch vẽ cả lưới lẫn bảng danh
 * sách, không việc gì hỏi database hai lần (nguyên tắc 53).
 */
export const docMauTheoBuoi = cache(async (): Promise<Map<string, string>> => {
  const ds = await getPrisma().loaiBuoi.findMany({
    where: { mau: { not: null } },
    select: { ten: true, mau: true },
  });
  return new Map(ds.map((x) => [x.ten.trim().toLowerCase(), x.mau!]));
});

/** Màu studio đã gán cho một loại buổi, hoặc null nếu chưa ai gán. */
export function mauTheoBuoi(bang: Map<string, string>, loai: string | null | undefined): string | null {
  if (!loai) return null;
  return bang.get(loai.trim().toLowerCase()) ?? null;
}
