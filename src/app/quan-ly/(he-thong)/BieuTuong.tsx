/*
  BIỂU TƯỢNG CHO THANH BÊN — anh yêu cầu 18/11/2026 ("nhìn vô là biết phần nào").

  Mười chín mục chữ thuần xếp dọc thì phải ĐỌC mới biết mục nào; có hình thì
  nhận ra bằng vị trí và dáng, nhanh hơn hẳn khi đã quen.

  VẼ TAY BẰNG SVG, không thêm thư viện icon. Một bộ icon như lucide kéo theo
  vài trăm KB và một phụ thuộc phải nhớ cập nhật, trong khi ở đây cần đúng
  mười chín hình. Mỗi hình chỉ vài đường.

  Quy ước để cả bộ trông cùng một nhà:
    · khung 24×24, nét 1.5, bo tròn đầu nét
    · chỉ nét, không tô đặc — hợp tông mảnh của giao diện quản lý
    · `currentColor` để mục đang mở đổi màu theo chữ, không phải vẽ hai bản
*/

/** Khoá là `href` của mục, vì đó là thứ duy nhất không bao giờ trùng. */
const HINH: Record<string, React.ReactNode> = {
  /* Tổng quan — bốn ô, kiểu bảng điều khiển. */
  "/quan-ly": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  /* Chấm công — đồng hồ. */
  "/quan-ly/cham-cong": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  /* Lịch chụp — tờ lịch. */
  "/quan-ly/lich": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  /* Đầu việc — danh sách có dấu tích. */
  "/quan-ly/cong-viec": (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17" />
    </>
  ),
  /* Đơn từ — tờ giấy gấp góc. */
  "/quan-ly/don-tu": (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  /* Lương — tờ tiền. */
  "/quan-ly/luong": (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 12h.01M18 12h.01" />
    </>
  ),
  /* Hợp đồng — tờ giấy có chữ ký. */
  "/quan-ly/hop-dong": (
    <>
      <path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M15 3v4h4M8 17c1.5-2.5 2.5-2.5 4 0s2.5 1 3-1" />
    </>
  ),
  /* Khách tiềm năng — người kèm dấu sao. */
  "/quan-ly/khach-tiem-nang": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M18 3.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L15 5.8l2.2-.3z" />
    </>
  ),
  /* Khách hàng — hai người. */
  "/quan-ly/khach-hang": (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 6.6M18 14.5c2 .8 3.5 2.8 3.5 5.5" />
    </>
  ),
  /* Phiếu thu — biên lai răng cưa. */
  "/quan-ly/phieu-thu": (
    <>
      <path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  /* Sổ quỹ — két sắt. */
  "/quan-ly/so-quy": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="11" cy="12" r="3.5" />
      <path d="M11 9.5v2.5M18 9v6" />
    </>
  ),
  /* Nhân viên — thẻ tên. */
  "/quan-ly/nhan-vien": (
    <>
      <rect x="3" y="5" width="18" height="15" rx="2" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M5.8 17c.5-1.6 1.8-2.6 3.2-2.6s2.7 1 3.2 2.6M15 10h3.5M15 13.5h3.5" />
    </>
  ),
  /* Nội quy — quyển sách. */
  "/quan-ly/noi-quy": (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19a2 2 0 0 1 2-2h13M8 7h7" />
    </>
  ),
  /* Quản lý dịch vụ — thẻ giá. */
  "/quan-ly/dich-vu": (
    <>
      <path d="M3 11.5V5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 1.4.6l7.5 7.5a2 2 0 0 1 0 2.8l-6.5 6.5a2 2 0 0 1-2.8 0L3.6 12.9A2 2 0 0 1 3 11.5z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </>
  ),
  /* Thông tin studio — mặt tiền cửa hàng. */
  "/quan-ly/thong-tin": (
    <>
      <path d="M3.5 9.5 5 4h14l1.5 5.5" />
      <path d="M4 9.5h16V20H4z" />
      <path d="M3.5 9.5a2.2 2.2 0 0 0 4.2 0 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.3 0 2.2 2.2 0 0 0 4.2 0" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  /* Sổ sự cố — tam giác cảnh báo. */
  "/quan-ly/su-co": (
    <>
      <path d="M10.3 4.3 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  /* Nhật ký thao tác — đồng hồ có mũi tên lùi. */
  "/quan-ly/nhat-ky": (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3 4v4h4M12 7.5V12l3 1.8" />
    </>
  ),
  /* Quản lý album ảnh — khung ảnh có núi. */
  "/admin": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M4 17l4.5-4.5 3 3L15 11l5 5" />
    </>
  ),
};

/** Hình mặc định cho mục chưa khai — một chấm tròn, không bao giờ để trống chỗ. */
const MAC_DINH = <circle cx="12" cy="12" r="3.5" />;

export function BieuTuong({ href }: { href: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-[18px] shrink-0"
    >
      {HINH[href] ?? MAC_DINH}
    </svg>
  );
}
