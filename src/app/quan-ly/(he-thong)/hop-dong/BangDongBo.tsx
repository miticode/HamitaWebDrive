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

/** Quá 36 giờ chưa chép là lịch chạy đêm đã hỏng ít nhất một lần. */
const CU_MS = 36 * 60 * 60 * 1000;

/**
 * Để NGOÀI thân component, cùng lý do với `xepTheoHan()` ở admin/page.tsx:
 * `Date.now()` là hàm bất thuần, viết thẳng trong thân component thì luật
 * react-hooks/purity chặn.
 */
function daCu(moc: Date | null): boolean {
  return !moc || Date.now() - moc.getTime() > CU_MS;
}

/**
 * Dải báo ở đầu ba trang Hợp đồng, Khách hàng, Phiếu thu: dữ liệu ở đây là
 * bản CHÉP từ AppSheet, chép lúc nào, và sửa ở đâu.
 *
 * Nói rõ "sửa bên AppSheet" vì trong giai đoạn song song, nhân viên thấy sai
 * trên web mà không biết sửa ở đâu thì sẽ đi tìm nút sửa không có.
 */
export async function BangDongBo({ quanTri }: { quanTri: boolean }) {
  const moc = await docMoc("dongBoAppSheet");
  const cu = daCu(moc);
  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border px-4 py-3 text-sm ${
        cu ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line bg-bg-soft text-fg-muted"
      }`}
    >
      <span className="max-w-2xl leading-relaxed">
        Bản chép từ AppSheet, tự cập nhật mỗi đêm —{" "}
        {moc ? `lần cuối ${NGAY_GIO.format(moc)}` : "chưa chép lần nào"}. Tiệm vẫn làm hợp đồng, phiếu thu bên
        AppSheet; thấy sai thì sửa bên đó, đêm sau web tự theo.
      </span>
      {quanTri && <NutDongBo />}
    </div>
  );
}
