/*
  KHUNG XÁM LÚC CHỜ — anh duyệt 20/11/2026.

  Đo trước khi làm: 28/28 trang trong /quan-ly đặt `dynamic = "force-dynamic"`,
  và CẢ 28 không có `loading.tsx` lẫn `<Suspense>` nào. Nghĩa là từ lúc bấm
  tới lúc database trả lời, màn hình đứng trắng — trên 4G ở tiệm thì đó là
  một hai giây không có gì nói rằng máy đang làm việc.

  Khung xám KHÔNG làm trang nhanh hơn. Nó chỉ nói "đang tải, đúng chỗ này sắp
  có bảng" thay vì không nói gì. Thứ làm trang nhanh hơn là bớt truy vấn, và
  phần đó không nằm ở đây.

  `.skeleton` đã có sẵn trong globals.css (nền `--bg-soft`), nên bản tối tự
  theo. CỐ Ý KHÔNG nhấp nháy: một trang đầy ô xám chớp tắt còn mệt mắt hơn
  trang trắng, và máy nào bật "giảm chuyển động" thì cũng phải tắt nó đi.
*/

/**
 * Một vạch xám thay cho một dòng chữ.
 *
 * `minWidth: 0` KHÔNG thừa: một flex item có chiều rộng xác định thì
 * `min-width: auto` lấy đúng chiều rộng ấy làm mức sàn, nên hàng vạch không
 * co lại nổi và ép cả trang rộng ra. Đo 20/11 trên màn 375px: hàng xương năm
 * cột đòi 560px và kéo theo cả trang cuộn ngang.
 */
export function VachXuong({
  rong = "100%",
  cao = "1rem",
  dam,
}: {
  rong?: string;
  cao?: string;
  /**
   * Vạch đứng trên nền `bg-bg-soft` (hàng tiêu đề bảng) thì phải đậm hơn:
   * `.skeleton` dùng đúng màu `--bg-soft`, nên để nguyên là vạch tàng hình —
   * hàng tiêu đề nhìn thành một dải xám trống. Đo 20/11 trên route thử.
   */
  dam?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`block rounded-sm ${dam ? "bg-line" : "skeleton"}`}
      style={{ width: rong, height: cao, minWidth: 0 }}
    />
  );
}

/**
 * Khung xám hình một cái bảng.
 *
 * `role="status"` + `aria-label`: trình đọc màn hình nói "Đang tải" thay vì
 * đọc một loạt ô trống. `aria-live="polite"` để nó không cắt ngang câu đang đọc.
 */
export function XuongBang({ dong = 6, cot = 4 }: { dong?: number; cot?: number }) {
  /*
    LƯỚI THEO TỈ LỆ, không phải chiều rộng cố định.

    Bản đầu cho mỗi vạch một chiều rộng tính bằng rem rồi xếp bằng flex. Đo
    20/11 trên màn 375px: hàng năm cột đòi đúng 560px và kéo cả trang cuộn
    ngang — `min-width: 0` cũng không gỡ được, vì chiều rộng cố định vẫn là
    chiều rộng cố định.

    Lưới `2fr 1fr 1fr…` thì cột đầu luôn rộng gấp đôi (cột tên), còn tổng thì
    vừa đúng chỗ có bao nhiêu. Bớt một dòng suy nghĩ mỗi lần đổi số cột.
  */
  const luoi = {
    gridTemplateColumns: cot <= 1 ? "1fr" : `2fr repeat(${cot - 1}, 1fr)`,
  };
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải"
      className="overflow-hidden rounded-md border border-line bg-bg-raised"
    >
      <div className="grid gap-4 border-b border-line bg-bg-soft px-4 py-2.5" style={luoi}>
        {Array.from({ length: cot }).map((_, i) => (
          <VachXuong key={i} cao="0.75rem" dam />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: dong }).map((_, i) => (
          <div key={i} className="grid gap-4 px-4 py-3" style={luoi}>
            {Array.from({ length: cot }).map((_, j) => (
              <VachXuong key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Khung xám hình một hàng thẻ số liệu — dùng cho Tổng quan. */
export function XuongThe({ so = 3 }: { so?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Đang tải"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: so }).map((_, i) => (
        <div key={i} className="card grid gap-2.5 p-4">
          <VachXuong rong="6rem" cao="0.7rem" />
          <VachXuong rong="4rem" cao="1.75rem" />
        </div>
      ))}
    </div>
  );
}
