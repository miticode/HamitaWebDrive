import { getPrisma } from "@/lib/db";
import { CAC_BUOC } from "@/lib/hopDongChung";

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
