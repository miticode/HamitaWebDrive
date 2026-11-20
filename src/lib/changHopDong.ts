/*
  NĂM CHẶNG CỦA MỘT HỢP ĐỒNG — anh duyệt 20/11/2026 (KE-HOACH-GIAO-DIEN §4.3).

  Bảng `BuocHopDong` có MƯỜI TÁM bước, chia hai nhánh song song: 1–9 cho nhánh
  chụp ở studio, 10–18 cho nhánh tiệc. Hai nhánh đi qua đúng cùng một chuỗi
  việc, chỉ khác tên:

      1  Chưa có ngày chụp        10  Chờ ngày tiệc
      2  Đã có ngày chụp          11  Đã giao váy tiệc
      3  Đã chụp                  12  Đã xong tiệc
      4  Đã gửi ảnh gốc, chờ chọn 13  Đã gửi ảnh gốc tiệc, chờ chọn
      5  Đang Retouch             14  Đang chỉnh sửa hình, clip tiệc
      6  Chờ Khách duyệt          15  Chờ Khách duyệt
      7  Gửi in                   16  Gửi in tiệc
      8  Đã nhận hình in          17  Đã nhận hình in tiệc
      9  Hoàn thành               18  Hoàn thành ngày tiệc

  Mười tám chữ là quá nhiều để nhìn một cái ra "nhà này đang kẹt đâu" — mà đó
  đúng là câu người ta mở hợp đồng ra để hỏi. Trước 20/11 trang chi tiết chỉ
  hiện một chip mang tên bước, nên muốn biết còn bao xa tới lúc giao hình thì
  phải thuộc lòng cả mười tám bước.

  Gom thành NĂM CHẶNG, gióng hai nhánh về cùng một thước:

      ① Chuẩn bị   ② Chụp   ③ Khách chọn   ④ Duyệt & in   ⑤ Giao

  Năm chứ không phải bốn hay sáu: bốn thì "khách chọn" và "duyệt" dồn làm một,
  mà đó là hai lần chờ khách khác nhau — lần đầu chọn file gốc, lần sau duyệt
  ảnh đã chỉnh. Sáu thì tách "gửi in" khỏi "duyệt", nhưng hai việc ấy cùng một
  người làm liền tay.

  KHÔNG thay bảng mười tám bước. Bảng đó vẫn là nguồn thật, vẫn sửa được trên
  web, và mọi phép đổi trạng thái vẫn chạy trên nó. Đây chỉ là một cách NHÌN.
*/

export type Chang = {
  so: 1 | 2 | 3 | 4 | 5;
  ten: string;
  /** Bước nào của nhánh chụp và nhánh tiệc rơi vào chặng này. */
  buoc: readonly number[];
};

export const CHANG: readonly Chang[] = [
  { so: 1, ten: "Chuẩn bị", buoc: [1, 2, 10, 11] },
  { so: 2, ten: "Chụp", buoc: [3, 12] },
  { so: 3, ten: "Khách chọn", buoc: [4, 5, 13, 14] },
  { so: 4, ten: "Duyệt & in", buoc: [6, 7, 15, 16] },
  { so: 5, ten: "Giao", buoc: [8, 9, 17, 18] },
] as const;

/** Chặng của một bước. Bước lạ hoặc chưa gõ thì null. */
export function changCuaBuoc(buoc: number | null | undefined): Chang | null {
  if (buoc == null) return null;
  return CHANG.find((c) => c.buoc.includes(buoc)) ?? null;
}

/**
 * Hợp đồng này đã XONG chưa — bước 9 hoặc 18.
 *
 * Tách riêng khỏi "đang ở chặng 5": chặng 5 gồm cả bước 8 ("đã nhận hình in",
 * tức hình về tiệm nhưng chưa giao khách) lẫn bước 9. Dải tiến độ cần phân
 * biệt hai cái đó, không thì nhà chưa nhận hình nhìn y như nhà đã xong.
 */
export function daXong(buoc: number | null | undefined): boolean {
  return buoc === 9 || buoc === 18;
}

/**
 * Hợp đồng đi nhánh TIỆC (bước 10–18) hay nhánh CHỤP (1–9).
 *
 * null khi chưa gõ bước. Dùng để nói đúng tên việc trong câu nhắc — "chờ ngày
 * tiệc" với nhà đi nhánh tiệc, "chờ ngày chụp" với nhà kia.
 */
export function laNhanhTiec(buoc: number | null | undefined): boolean | null {
  if (buoc == null) return null;
  return buoc >= 10;
}
