import { boDau, laMucHoanThien } from "@/lib/constants";
import { nhanhCuaMuc, type Nhanh } from "@/lib/nhanhBuoi";

/*
  KHÁCH ĐÃ CHỌN XONG HẾT FILE GỐC CHƯA — anh hỏi 26/11/2026: "còn nếu khách
  đã chọn xong hình nhà gái và ấn báo nhưng nhà trai thì chưa chọn xong thì
  sao? trạng thái hợp đồng sẽ như thế nào".

  Trước 26/11: hợp đồng nhảy thẳng sang "14. Đang chỉnh sửa hình , clip tiệc"
  ngay khi khách báo xong MỘT thư mục file gốc bất kỳ. Cùng một lỗ hổng với
  phía studio gửi ảnh gốc, chỉ khác cửa vào — ở đó là buổi chụp, ở đây là thư
  mục trong album.

  Đo 26/11 trên 201 album:

     có từ 2 thư mục file gốc        49
     khách mới chọn xong MỘT PHẦN    17   ← "✓nhà gái · chưa nhà trai"

  Cả 17 album ấy đang chưa gắn hợp đồng nên chưa gây hậu quả thật, nhưng ghép
  album xong là lỗi bung ra ngay.

  KHÔNG CẦN CỘT MỚI, khác phía buổi chụp: dấu "khách đã báo xong thư mục này"
  vốn đã nằm trong bảng `MucXong` từ 08/10/2026 (nguyên tắc 20 — trạng thái
  tính RIÊNG từng thư mục con). Việc còn thiếu chỉ là ĐẾM xem đã đủ chưa.
*/

/**
 * Thư mục này có phải chỗ khách chọn FILE GỐC không.
 *
 * Hai phép loại, và cả hai đều cần:
 *
 *   · bỏ thư mục HOÀN THIỆN — khách bấm ở đó là DUYỆT ảnh đã chỉnh, không
 *     phải chọn file gốc (nguyên tắc 49, và `/api/gallery-done` đã lọc từ
 *     19/11/2026).
 *   · đòi tên có chữ "gốc". Thiếu phép này thì đếm cả thư mục ảnh sản phẩm —
 *     đo 26/11: "hamita 26g 15x21 mica titan", "ptb", "Trung Thu" cùng nằm
 *     trong album. Studio để đó cho khách xem, không phải để chọn, nên đợi
 *     chúng "xong" là đợi mãi mãi.
 */
export function laMucChonGoc(tenMuc: string): boolean {
  return boDau(tenMuc).includes("goc") && !laMucHoanThien(tenMuc);
}

/**
 * Những thư mục file gốc CÙNG NHÁNH mà khách chưa báo xong.
 *
 * Rỗng = đã đủ, nơi gọi được phép đổi bước.
 *
 * XÉT RIÊNG TỪNG NHÁNH, cùng lẽ với `buocTuDauBuoi`: một album cưới có cả
 * "file gốc hình cổng" (nhánh chụp) lẫn "file gốc nhà gái / nhà trai" (nhánh
 * tiệc). Đòi đủ cả ba mới cho bước 4 chạy thì hợp đồng kẹt ở khâu ảnh cổng
 * cho tới sau đám cưới — đo 26/11 có 3 album đúng cảnh ấy.
 *
 * `subfolders` rỗng nghĩa là ảnh nằm thẳng trong thư mục gốc, không có thư
 * mục con nào: lúc đó không có gì để đếm và hàm trả rỗng, tức giữ nguyên
 * hành vi cũ. Đó là đa số album một buổi.
 */
export function mucGocConThieu(
  subfolders: readonly string[] | null | undefined,
  /** Tên các thư mục khách ĐÃ báo xong (`MucXong.loai === "xong"`). */
  daBaoXong: ReadonlySet<string>,
  nhanh: Nhanh,
): string[] {
  const can = (subfolders ?? []).filter((t) => t && laMucChonGoc(t) && nhanhCuaMuc(t) === nhanh);
  return can.filter((t) => !daBaoXong.has(t));
}
