import { MUI_GIO } from "@/lib/constants";
import { docMoc } from "@/lib/moc";
import { NutDongBo } from "./NutDongBo";

const NGAY_GIO = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Dải báo ở đầu bảy trang chép từ AppSheet: dữ liệu cũ từ đâu ra, chép lần
 * cuối lúc nào, và nút chép lại.
 *
 * ━━ Viết lại 13/11/2026 (KE-HOACH-UX.md mục P0-1) ━━
 *
 * Bản cũ là năm dòng chữ, và câu cuối của nó NÓI SAI: "sửa trên web, đêm đó
 * bản bên kia chép sang là mất" — trong khi lịch chạy đêm đã bỏ hẳn cùng ngày.
 * Nhân viên đọc xong sẽ không dám sửa hợp đồng cũ trên web, đúng thứ vừa mở ra
 * cho họ làm.
 *
 * Hai thứ đã đổi:
 *
 * 1. Còn MỘT dòng — chép từ đâu, lần cuối lúc nào, nút chép lại. Dải này nằm
 *    trên bảy trang; năm dòng chữ lặp lại bảy chỗ thì sau hai ngày không ai
 *    đọc nữa, và lúc đó nó có nói đúng cũng vô ích.
 *
 * 2. Câu cảnh báo GHI ĐÈ dọn khỏi đây, chuyển vào form sửa hợp đồng — nơi
 *    người ta sắp sửa thật, và chỉ với hợp đồng mang dấu vân tay AppSheet.
 *    Cảnh báo đứng cạnh việc nguy hiểm thì người ta đọc; đứng ở đầu một danh
 *    sách chỉ để xem thì không.
 */
export async function BangDongBo({ quanTri }: { quanTri: boolean }) {
  const moc = await docMoc("dongBoAppSheet");
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-line bg-bg-soft px-4 py-2.5 text-sm text-fg-muted">
      <span className="leading-relaxed">
        Dữ liệu cũ chép từ AppSheet
        {moc ? (
          <>
            {" "}
            <span aria-hidden>·</span> lần cuối{" "}
            <span className="tabular-nums text-fg">{NGAY_GIO.format(moc)}</span>
          </>
        ) : (
          <> <span aria-hidden>·</span> chưa chép lần nào</>
        )}
      </span>
      {quanTri && <NutDongBo />}
    </div>
  );
}
