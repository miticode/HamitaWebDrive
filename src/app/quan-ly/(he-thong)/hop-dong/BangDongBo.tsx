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
 * Dải báo ở đầu ba trang Hợp đồng, Khách hàng, Phiếu thu: dữ liệu cũ từ đâu
 * ra, và hợp đồng mới lập ở đâu.
 *
 * Viết lại 21/09/2026 khi anh chuyển việc lập hợp đồng về web. Lời cũ ghi
 * "tiệm vẫn làm hợp đồng bên AppSheet, thấy sai thì sửa bên đó" — để nguyên
 * thì nay thành một câu chỉ sai đường.
 *
 * Bỏ luôn vạch cảnh báo "quá 36 giờ chưa chép": lịch chép tự động đã tắt hẳn
 * nên vạch đó sẽ vàng mãi mãi, mà vàng mãi thì không ai đọc nữa — đúng kiểu
 * cảnh báo tự làm hỏng chính mình.
 */
export async function BangDongBo({ quanTri }: { quanTri: boolean }) {
  const moc = await docMoc("dongBoAppSheet");
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-line bg-bg-soft px-4 py-3 text-sm text-fg-muted">
      <span className="max-w-2xl leading-relaxed">
        Hợp đồng mới lập thẳng trên web bằng nút <b className="text-fg">Lập hợp đồng</b>. Hợp đồng, phiếu
        thu, lịch và đầu việc từ trước là bản chép của AppSheet —{" "}
        {moc ? `chép lần cuối ${NGAY_GIO.format(moc)}` : "chưa chép lần nào"}. Lịch chép tự động đã tắt để
        bản cũ bên đó không đè lên những gì vừa lập trên web.
      </span>
      {quanTri && <NutDongBo />}
    </div>
  );
}
