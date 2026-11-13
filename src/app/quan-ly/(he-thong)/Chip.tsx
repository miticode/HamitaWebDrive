/**
 * CHIP TRẠNG THÁI DÙNG CHUNG — thêm 13/11/2026 (`KE-HOACH-UX.md` mục P2-1).
 *
 * Trước đó chỉ trang Hợp đồng có chip thật (`ChipTrangThai`); năm bảng còn lại
 * — Đầu việc, Đơn từ, Sổ quỹ, Phiếu thu, Sự cố — hiện trạng thái bằng chữ trần
 * tô màu bằng tay, mỗi trang một kiểu. Cùng một chữ "Chờ duyệt" mà chỗ vàng
 * đậm, chỗ vàng nhạt, chỗ xám.
 *
 * Giờ màu có MỘT nghĩa trên cả web, học một lần đọc được mọi bảng:
 *
 * | Kiểu | Màu | Nghĩa |
 * |---|---|---|
 * | `cho`    | vàng  | đang chờ ai đó làm gì — việc chưa xong |
 * | `xong`   | xanh  | đã xong hẳn |
 * | `hong`   | đỏ    | bị từ chối, không duyệt |
 * | `thuong` | xám   | trạng thái trung tính, không đòi ai |
 *
 * MỖI TRANG TỰ QUYẾT trạng thái nào thuộc kiểu nào — component này không biết
 * gì về nghiệp vụ, nên đổi nó không bao giờ làm lệch nghĩa của một bảng nào.
 */

export type KieuChip = "cho" | "xong" | "hong" | "thuong";

const LOP: Record<KieuChip, string> = {
  cho: "border-amber-300 bg-amber-50 text-amber-900",
  xong: "border-emerald-300 bg-emerald-50 text-emerald-900",
  hong: "border-red-300 bg-red-50 text-red-900",
  thuong: "border-line bg-bg-soft text-fg-muted",
};

export function Chip({
  chu,
  kieu = "thuong",
  truoc,
}: {
  chu: string | null;
  kieu?: KieuChip;
  /** Chữ mờ đứng trước, ví dụ số bước của hợp đồng. */
  truoc?: string;
}) {
  if (!chu) return <span className="text-fg-faint">—</span>;
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap ${LOP[kieu]}`}
    >
      {truoc && <span className="tabular-nums opacity-70">{truoc}</span>}
      {chu}
    </span>
  );
}
