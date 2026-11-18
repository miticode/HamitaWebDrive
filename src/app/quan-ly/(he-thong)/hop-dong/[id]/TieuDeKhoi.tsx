/**
 * Tiêu đề một khối trên trang hợp đồng — anh yêu cầu 18/11/2026.
 *
 * Trước đó dùng `eyebrow`: chữ 11px, viết hoa, màu xám nhạt. Nhã, nhưng
 * trang này có năm khối nối nhau và người ta cuộn để TÌM khối — tiêu đề mờ
 * ngang với chữ phụ thì mắt không bắt được ranh giới.
 *
 * Số đếm tách ra thành chip riêng: "Phiếu thu (1)" trong ngoặc đọc như chú
 * thích, còn một con số đứng riêng thì nhìn là thấy ngay có mấy cái.
 */
export function TieuDeKhoi({ ten, so }: { ten: string; so: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <h2 className="font-display text-lg font-light whitespace-nowrap">{ten}</h2>
      <span className="rounded-full bg-bg-soft px-2 py-0.5 text-xs text-fg-muted tabular-nums">{so}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}
