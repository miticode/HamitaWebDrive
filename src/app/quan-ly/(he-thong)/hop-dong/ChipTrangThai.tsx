import { BUOC_CHO_KHACH, BUOC_XONG, tachTrangThai } from "@/lib/hopDongChung";
import { Chip } from "../Chip";

/**
 * Trạng thái hợp đồng dạng chip: số bước mờ phía trước, tên bước phía sau.
 *
 * Màu lấy từ `Chip` dùng chung (mục P2-1) — ở đây chỉ quyết ĐÚNG MỘT việc:
 * bước nào thuộc kiểu nào. Xanh là xong hẳn (bước 9, 18), vàng là đang chờ
 * KHÁCH chọn hay duyệt ảnh — những hợp đồng sale cần nhắc.
 */
export function ChipTrangThai({ trangThai }: { trangThai: string | null }) {
  const { buoc, ten } = tachTrangThai(trangThai);
  const kieu =
    buoc !== null && BUOC_XONG.includes(buoc)
      ? "xong"
      : buoc !== null && BUOC_CHO_KHACH.includes(buoc)
        ? "cho"
        : "thuong";
  return <Chip chu={ten || null} kieu={kieu} truoc={buoc !== null ? `${buoc}.` : undefined} />;
}
