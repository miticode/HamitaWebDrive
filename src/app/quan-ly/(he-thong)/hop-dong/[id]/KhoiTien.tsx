import { tien } from "@/lib/constants";

/*
  KHỐI TIỀN CỦA MỘT HỢP ĐỒNG — tách khỏi `page.tsx` ngày 18/11/2026.

  Tách vì hai lẽ: trang chi tiết đã 420 dòng, và khối này có đủ ba nhánh
  (còn nợ / thu đủ / thu dư) nên phải soi được từng nhánh mà không cần dựng
  cả một hợp đồng thật cho mỗi nhánh.
*/
export function KhoiTien({
  thanhTien,
  khuyenMai,
  tongTien,
  daThu,
  conLai,
  /** Bao nhiêu phiếu thu đang chờ duyệt — "Đã thu" có tính cả chúng. */
  soPhieuChoDuyet,
}: {
  thanhTien: number;
  khuyenMai: number;
  tongTien: number;
  daThu: number;
  conLai: number;
  soPhieuChoDuyet: number;
}) {
  return (
        <section className="rounded-md border border-line bg-bg-raised p-4">
          <h2 className="eyebrow">Tiền</h2>
          {/*
            CHỮ GIỐNG HỆT FORM LẬP HỢP ĐỒNG — sửa 18/11/2026.

            Trước đó bốn nơi gọi cùng một con số bằng bốn chữ: trang này
            "Thành tiền", form lập "Tiền hàng", tờ in "Thành Tiền", danh sách
            "Tổng". Nhân viên lập hợp đồng thấy "Tiền hàng", mở ra xem thấy
            "Thành tiền" — không có gì nói hai cái là một.

            Chọn bộ của form lập vì ở đó "Thành tiền" ĐÃ LÀ TÊN CỘT của từng
            dòng dịch vụ; dùng lại chữ đó cho tổng hợp đồng là một chữ hai
            nghĩa ngay trong cùng một trang.

            Tờ in giữ chữ riêng, cố ý: nó chép mẫu AppSheet mà khách đã quen.
          */}
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-fg-muted">Tiền hàng</dt>
            <dd className="text-right">{tien(thanhTien)}đ</dd>
            {khuyenMai !== 0 && (
              <>
                <dt className="text-fg-muted">Khuyến mãi</dt>
                <dd className="text-right">−{tien(khuyenMai)}đ</dd>
              </>
            )}
            <dt className="font-medium">Tổng tiền</dt>
            <dd className="text-right font-medium">{tien(tongTien)}đ</dd>
            <dt className="text-fg-muted">Đã thu</dt>
            <dd className="text-right">{tien(daThu)}đ</dd>
          </dl>

          {/*
            CÒN LẠI TÁCH RA, CỠ CHỮ LỚN — anh yêu cầu 18/11/2026 ("phải đẹp và
            dễ nhìn", "thao tác đơn giản và hiệu quả").

            Đây là con số nhân viên mở hợp đồng ra để xem đầu tiên: khách còn
            nợ bao nhiêu. Trước đó nó là dòng thứ năm trong một danh sách năm
            dòng cùng cỡ chữ, phải đọc hết mới thấy.

            Ba trạng thái, không phải hai — thử trên giao diện 14/11/2026 mới
            thấy chỗ thiếu. Bản cũ chỉ phân biệt "còn nợ" và "không nợ", nên số
            ÂM (studio đã thu DƯ, đang nợ lại khách) rơi vào nhánh xám nhạt và
            trông như con số không đáng bận tâm. Đo trên dữ liệu thật: 2 hợp
            đồng đang thu dư, tổng 60.000đ.
          */}
          <div
            className={`mt-3 flex items-baseline justify-between gap-3 rounded-md px-3 py-2.5 ${
              conLai > 0
                ? "bg-amber-50 text-amber-900"
                : conLai < 0
                  /*
                    Chữ `text-fg` chứ không `text-accent`: đo 18/11 thì accent
                    trên nền accent-soft chỉ được 3,33 — dưới chuẩn đọc 4,5.
                    Riêng con số vẫn để accent, nó đủ to để không cần tương
                    phản của chữ thường.
                  */
                  ? "bg-accent-soft text-fg"
                  : "bg-bg-soft text-fg-muted"
            }`}
          >
            <span className="text-sm font-medium">
              {conLai > 0 ? "Khách còn nợ" : conLai < 0 ? "Studio nợ lại khách" : "Đã thu đủ"}
            </span>
            {/*
              Con số để cỡ 24px. Ở cỡ đó chuẩn đọc là 3,0 chứ không phải 4,5
              (WCAG tính chữ từ 24px là chữ lớn), nên accent trên nền
              accent-soft đạt 3,33 là đủ. Thu nhỏ chữ này mà quên đổi màu là
              rơi xuống dưới chuẩn.
            */}
            <span className={`font-display text-2xl font-light tabular-nums ${conLai < 0 ? "text-accent" : ""}`}>
              {conLai === 0 ? "✓" : `${tien(Math.abs(conLai))}đ`}
            </span>
          </div>
          {conLai < 0 && (
            <p className="mt-3 text-xs text-accent">
              Khách đã trả nhiều hơn tổng hợp đồng — studio còn phải trả lại {tien(-conLai)}đ.
            </p>
          )}
          {soPhieuChoDuyet > 0 && (
            <p className="mt-3 text-xs text-amber-800">
              Đã thu có tính {soPhieuChoDuyet} phiếu đang chờ duyệt — AppSheet cộng cả phiếu chờ duyệt.
            </p>
          )}
        </section>
  );
}
