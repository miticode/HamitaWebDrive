import { getPrisma } from "@/lib/db";
import { BUOC_XONG, CAC_BUOC } from "@/lib/hopDongChung";

/**
 * MƯỜI TÁM BƯỚC CỦA HỢP ĐỒNG, đọc từ database — đợt 6 (13/11/2026).
 *
 * Trước hôm nay danh sách này cứng trong `hopDongChung.ts` (CAC_BUOC): studio
 * muốn đổi chữ một bước là phải sửa mã và dựng lại bản production. Bảng
 * `BuocHopDong` chép từ trang tính "Trạng thái" bên AppSheet (18 dòng), và sửa
 * được bằng tay trên database.
 *
 * `CAC_BUOC` KHÔNG BỊ XOÁ và vẫn là lưới đỡ: bảng chưa chép, hoặc ai đó xoá
 * sạch nó, thì ô chọn trạng thái không được phép trở nên trống trơn — lúc đó
 * không lập nổi một hợp đồng nào.
 */

export type Buoc = {
  ten: string;
  thuTu: number;
  truoc: string | null;
  sau: string | null;
  trachNhiem: string | null;
};

/**
 * Danh sách bước để đổ vào ô chọn. Bảng rỗng thì trả `CAC_BUOC`.
 *
 * Xếp theo `thuTu` (số đầu tên), rồi theo tên — "11.Đã giao váy tiệc" thiếu
 * dấu cách vẫn đọc ra số 11 và đứng đúng chỗ.
 */
export async function docCacBuoc(): Promise<string[]> {
  const ds = await getPrisma().buocHopDong.findMany({
    orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
    select: { ten: true },
  });
  return ds.length ? ds.map((b) => b.ten) : [...CAC_BUOC];
}

/** Như trên nhưng kèm bước trước/sau và trách nhiệm. */
export async function docBuocDayDu(): Promise<Buoc[]> {
  const ds = await getPrisma().buocHopDong.findMany({
    orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
    select: { ten: true, thuTu: true, truoc: true, sau: true, trachNhiem: true },
  });
  return ds.length
    ? ds
    : CAC_BUOC.map((ten, i) => ({
        ten,
        thuTu: i + 1,
        truoc: i > 0 ? CAC_BUOC[i - 1] : null,
        sau: i < CAC_BUOC.length - 1 ? CAC_BUOC[i + 1] : null,
        trachNhiem: null,
      }));
}

/**
 * Bước liền sau một bước, hoặc null khi đã hết nhánh.
 *
 * KHÔNG dùng cột "Trạng thái sau" chép từ AppSheet — đo 13/11/2026 trên đúng
 * 18 dòng đó thì nó hỏng quá nửa:
 *
 * | Tình trạng | Số bước |
 * |---|---|
 * | thiếu hẳn (ô trống) | 7 — bước 11, 13, 14, 15, 16, 17, 18 |
 * | trỏ về CHÍNH NÓ | 1 — bước 9 |
 * | trỏ tới chuỗi không có trong bảng (gõ sai) | 2 — bước 7, 10 |
 * | nhảy sai nhánh (12 trỏ về 9) | 1 |
 * | **dùng được** | **7** |
 *
 * Bảy dòng dùng được ấy đều trỏ đúng sang bước mang số liền sau — tức quy tắc
 * thật của bảng là "số kế tiếp", và cột kia chỉ là một bản chép tay hỏng. Nên
 * suy theo `thuTu`, và dừng ở hai bước kết thúc nhánh (9 chụp ở studio, 18
 * tiệc). Suy thế này đúng cho cả 18 bước, thay vì đúng 7 và nói sai 4.
 *
 * TRÁCH NHIỆM thì vẫn lấy thẳng từ bảng: 11/18 bước có, 7 bước trống, và
 * không dòng nào mâu thuẫn — dữ liệu đó tin được.
 */
export function buocTiepTheo(cacBuoc: Buoc[], tenHienTai: string | null): Buoc | null {
  const nay = cacBuoc.find((b) => b.ten === tenHienTai);
  if (!nay || BUOC_XONG.includes(nay.thuTu)) return null;
  return cacBuoc.find((b) => b.thuTu === nay.thuTu + 1) ?? null;
}

/** Bước này có phải điểm kết của một nhánh không (9 hoặc 18). */
export function laBuocXong(cacBuoc: Buoc[], tenHienTai: string | null): boolean {
  const nay = cacBuoc.find((b) => b.ten === tenHienTai);
  return !!nay && BUOC_XONG.includes(nay.thuTu);
}
