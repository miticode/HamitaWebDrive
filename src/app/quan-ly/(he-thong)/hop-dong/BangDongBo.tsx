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
 *
 * Viết lại lần nữa 13/11/2026: anh cho BẬT LẠI lịch chép đêm cho tới ngày
 * chuyển hẳn sang web (xem KE-HOACH-CRM.md). Lời cũ ghi "lịch chép đã tắt" —
 * để nguyên là dải báo nói sai với cả tiệm.
 *
 * Câu quan trọng nhất trong dải này giờ là câu CẢNH BÁO GHI ĐÈ. Lịch chép chỉ
 * đụng vào dòng mang dấu vân tay AppSheet (`bamAppSheet`), nên hợp đồng lập
 * trên web KHÔNG bao giờ bị đụng. Nhưng hợp đồng CŨ chép từ AppSheet mà sửa
 * trên web thì đêm nào bên AppSheet cũng đổi dòng đó là bị đè mất — người sửa
 * không hề biết. Phải nói thẳng ra chứ đừng để họ tự phát hiện.
 */
export async function BangDongBo({ quanTri }: { quanTri: boolean }) {
  const moc = await docMoc("dongBoAppSheet");
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-line bg-bg-soft px-4 py-3 text-sm text-fg-muted">
      <span className="max-w-2xl leading-relaxed">
        Hợp đồng, phiếu thu, lịch và đầu việc cũ là bản chép của AppSheet —{" "}
        {moc ? `chép lần cuối ${NGAY_GIO.format(moc)}` : "chưa chép lần nào"}. Web đang chép lại mỗi đêm
        cho tới ngày chuyển hẳn. Hợp đồng mới cứ lập thẳng trên web bằng nút{" "}
        <b className="text-fg">Lập hợp đồng</b> — những hợp đồng đó không bao giờ bị lịch chép đụng vào.{" "}
        <b className="text-fg">Nhưng hợp đồng cũ thì sửa bên AppSheet</b>: sửa trên web, đêm đó bản bên kia
        chép sang là mất.
      </span>
      {quanTri && <NutDongBo />}
    </div>
  );
}
