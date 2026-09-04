import Link from "next/link";
import type { ThongBao as Tin } from "@/lib/thongBao";

/**
 * Khung thông báo trên trang quản lý — những việc studio phải tự làm.
 *
 * Đặt ở cột phải, ngay dưới ô "Tạo link mới": chỗ đó vốn để trống, mà đây lại
 * là thứ nên đập vào mắt ngay khi mở trang chứ không phải cuộn mới thấy.
 *
 * KHÔNG tự ẩn khi không có việc gì. Một khung lặng lẽ biến mất thì studio
 * không phân biệt được "hôm nay không có việc" với "cái khung đó hỏng rồi" —
 * đúng cái bẫy đã ghi ở nguyên tắc 27 với khung kho ảnh. Trống thì nói rõ là
 * đã kiểm và không có gì.
 *
 * Cũng KHÔNG nhắc lại những gì chỗ khác đã báo: Drive sắp đầy và album quá hạn
 * đã có khung kho ảnh ở đầu trang, lần sao lưu gần nhất đã nằm ngay cạnh nút
 * "Sao lưu ngay", còn việc nhắc khách thì thuộc trang thống kê. Gom hết vào
 * đây chỉ làm cùng một tin hiện hai chỗ.
 */
export function ThongBao({ tin }: { tin: Tin[] }) {
  const soGap = tin.filter((t) => t.mucDo === "gap").length;

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`size-[18px] shrink-0 ${soGap > 0 ? "text-accent" : "text-fg-faint"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
          <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
        </svg>
        <h2 className="font-display text-xl font-light">Thông báo</h2>
        {tin.length > 0 && (
          <span
            className={`ml-auto grid min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-medium ${
              soGap > 0 ? "bg-accent text-white" : "bg-bg-soft text-fg-muted"
            }`}
          >
            {tin.length}
          </span>
        )}
      </div>

      {tin.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-fg-muted">Không có việc nào cần để ý.</p>
          {/*
            Nói rõ khung này canh những gì. Không có nó thì studio nhìn dòng
            trống ở trên và không biết nó đang canh cái gì để mà tin.
          */}
          <p className="mt-2 text-xs leading-relaxed text-fg-faint">
            Đang canh: album chưa đặt gói ảnh, khách chọn thêm sau khi đã báo
            xong, album mất mã bảo vệ.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {tin.map((t) => (
            <li key={t.id}>
              {/*
                Cả dòng là một liên kết tới album đó. Đọc xong thông báo thì
                việc tiếp theo luôn là mở album ra sửa — bắt đi tìm lại tên
                trong danh sách mười sáu thẻ là thừa một bước.
              */}
              <Link
                href={t.slug ? `/admin/${t.slug}` : "/admin"}
                className={`block rounded-md border px-3.5 py-3 transition hover:border-accent ${
                  t.mucDo === "gap"
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-bg-soft"
                }`}
              >
                <div className="flex items-baseline gap-2">
                  {/* Chấm màu thay cho chữ "gấp/nên": đọc nhanh hơn, và không
                      chiếm mất chỗ của tên khách trên cột hẹp 340px. */}
                  <span
                    aria-hidden
                    className={`mt-1 size-1.5 shrink-0 rounded-full ${
                      t.mucDo === "gap" ? "bg-accent" : "bg-fg-faint"
                    }`}
                  />
                  <p className="min-w-0 flex-1 text-sm font-medium">{t.tieuDe}</p>
                </div>
                {t.tenAlbum && (
                  <p className="mt-1 ml-3.5 truncate text-xs text-fg-muted">
                    {t.tenAlbum}
                  </p>
                )}
                <p className="mt-1.5 ml-3.5 text-xs leading-relaxed text-fg-muted">
                  {t.chiTiet}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
