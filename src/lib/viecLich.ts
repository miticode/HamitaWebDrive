import { boDau } from "@/lib/constants";

/*
  VIỆC NÀO HIỆN LÊN LỊCH CHỤP — anh chốt 19/11/2026.

  Anh nói rõ: "chỉ hiện những việc hôm đó làm, còn hậu kì thì không hiện".
  Quản lý mở một ngày trên lịch là để chia người cho buổi chụp hôm đó —
  Photoshop với Dựng phim làm sau cả tuần, hiện ra chỉ làm rối.

  LIỆT KÊ PHÍA HẬU KỲ, không liệt kê phía hiện trường. Hai lý do:

    - Bảng giá hạng mục chỉ có 20 tên, trong đó hậu kỳ vỏn vẹn 5 (đo
      19/11/2026). Liệt kê 5 cái thì đủ được; liệt kê phía kia là 15 cái và
      còn đẻ thêm mỗi khi studio thêm hạng mục mới.
    - Sót một tên thì hậu quả hai bên khác hẳn nhau. Sót phía hậu kỳ: một
      dòng thừa trên lịch, liếc qua là bỏ. Sót phía hiện trường: một người
      KHÔNG ĐƯỢC CHIA VIỆC cho buổi chụp, tới hôm đó mới phát hiện thiếu
      người. Nên chọn cách thà hiện thừa.

  Đo 19/11 trên dữ liệu thật — 20 hạng mục trong bảng giá và 78 tên loại việc
  cũ chép từ AppSheet:

    HẬU KỲ   Photoshop 54 · photoshop 1 (5) · Xưởng in 20 · Dựng phim TT 12
             · Dựng phim PS 4 · EDIT CLIP 41 · edit 25 · Edit 4

    HIỆN TRƯỜNG   PHOTO 56 · stylist 31 · Hair 28 · Makeup 28 · Photo 1 (14)
                  · Photo 2 (11) · Camera 9 · makeup 1/2 · Camera 1/2
                  · hoa cầm tay 1/2 · Mâm Quả · và mọi tên bắt đầu bằng
                  "chụp"/"quay" của dữ liệu cũ
*/

/**
 * Dấu hiệu việc LÀM SAU ngày chụp.
 *
 * `\b` quanh "edit" là có ý: thiếu nó thì một tên như "credit" cũng khớp.
 * "photoshop", "dựng phim", "xưởng in" thì không cần, vì không cụm nào khác
 * chứa chúng mà mang nghĩa khác.
 */
const DAU_HIEU_HAU_KY = /(photoshop|dung phim|xuong in|\bedit\b|retouch|in anh|in album)/;

/**
 * Việc này làm SAU ngày chụp phải không? — true thì không hiện lên lịch.
 *
 * Nhận cả tên viết hoa, viết thường và có dấu: `boDau` hạ hết về một dạng.
 * Tên rỗng coi như việc hiện trường, vì không có căn cứ nào để loại nó đi.
 */
export function laViecHauKy(ten: string | null | undefined): boolean {
  const s = boDau(ten ?? "");
  return s !== "" && DAU_HIEU_HAU_KY.test(s);
}

/** Ngược lại — việc cần có mặt hôm chụp, tức việc hiện trên lịch. */
export function laViecTaiBuoi(ten: string | null | undefined): boolean {
  return !laViecHauKy(ten);
}
