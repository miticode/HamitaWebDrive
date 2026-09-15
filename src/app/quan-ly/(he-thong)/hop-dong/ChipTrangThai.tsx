import { BUOC_CHO_KHACH, BUOC_XONG, tachTrangThai } from "@/lib/hopDongChung";

/**
 * Trạng thái hợp đồng dạng chip: số bước mờ phía trước, tên bước phía sau.
 *
 * Màu mang nghĩa: xanh là xong hẳn (bước 9, 18), vàng là đang chờ KHÁCH chọn
 * hay duyệt ảnh — những hợp đồng sale cần nhắc. Còn lại màu trung tính.
 */
export function ChipTrangThai({ trangThai }: { trangThai: string | null }) {
  const { buoc, ten } = tachTrangThai(trangThai);
  if (!ten) return <span className="text-fg-faint">—</span>;
  const lop =
    buoc !== null && BUOC_XONG.includes(buoc)
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : buoc !== null && BUOC_CHO_KHACH.includes(buoc)
        ? "border-amber-300 bg-amber-50 text-amber-900"
        : "border-line bg-bg-soft text-fg-muted";
  return (
    <span className={`inline-flex items-baseline gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${lop}`}>
      {buoc !== null && <span className="tabular-nums opacity-70">{buoc}.</span>}
      {ten}
    </span>
  );
}
