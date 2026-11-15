import { tien } from "@/lib/constants";
import { BEN_STUDIO, LUU_Y_HOP_DONG, O_KY, type ToHopDong } from "@/lib/toHopDong";
import { ThanhNutIn } from "./NutIn";

/**
 * Tờ hợp đồng khổ A4, chép mẫu PDF bên AppSheet (anh yêu cầu 15/11/2026).
 *
 * Tách khỏi `page.tsx` để phần KIỂM QUYỀN và phần VẼ TỜ GIẤY không dính nhau:
 * trang kia lo "ai được xem", tệp này lo "tờ giấy trông thế nào". Nhờ vậy dựng
 * được route thử tạm vẽ đúng tờ này với dữ liệu thật mà không phải gỡ lớp đăng
 * nhập — cách kiểm chứng đã ghi trong CLAUDE.md.
 *
 * CSS nằm ở cuối `globals.css`, khối "TỜ HỢP ĐỒNG IN RA GIẤY".
 */
export function ToGiay({ to, quayVe }: { to: ToHopDong; quayVe: string }) {
  return (
    <div className="to-hd-nen">
      <ThanhNutIn quayVe={quayVe} />

      <article className="to-hd">
        <header className="to-hd-dau">
          {/* eslint-disable-next-line @next/next/no-img-element -- nguyên tắc 7: không dùng next/image. */}
          <img src="/logo.png" alt="" className="to-hd-logo" />
          <div>
            <p className="to-hd-ten-ben">{BEN_STUDIO.ten}</p>
            {BEN_STUDIO.diaChi.map((d, i) => (
              <p key={d} className="to-hd-dong-dau">
                {i === 0 ? "Địa chỉ: " : ""}
                {d}
              </p>
            ))}
            <p className="to-hd-dong-dau">Điện thoại: {BEN_STUDIO.dienThoai.join(" - ")}</p>
          </div>
        </header>

        <h1 className="to-hd-tieu-de">HỢP ĐỒNG DỊCH VỤ - {to.maHD}</h1>

        <p className="to-hd-mo-dau">
          <b>{BEN_STUDIO.ten}</b> gửi tới quý khách hàng hoá đơn dịch vụ chụp ảnh của studio như sau:
        </p>

        <table className="to-hd-bang to-hd-bang-khach">
          <tbody>
            <tr>
              <td>Khách hàng: {to.tenKhach}</td>
              <td>Nhân viên: {to.nhanVien}</td>
            </tr>
            <tr>
              <td>Điện thoại: {to.soDienThoai}</td>
              <td>Ngày đặt dịch vụ: {to.ngayDat}</td>
            </tr>
            <tr>
              <td>Địa chỉ: {to.diaChi}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <table className="to-hd-bang to-hd-bang-dong">
          <thead>
            <tr>
              <th className="c-stt">STT</th>
              <th>Chi tiết</th>
              <th className="c-sl">SL</th>
              <th className="c-tien">Giá</th>
              <th className="c-tien">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {to.dong.map((d) => (
              <tr key={d.stt}>
                <td className="c-stt">{d.stt}</td>
                <td>
                  <span className={d.chiTiet.length > 0 ? "to-hd-ten-dv" : undefined}>{d.ten}</span>
                  {d.chiTiet.map((c) => (
                    <span key={c} className="to-hd-chi-tiet">
                      {c}
                    </span>
                  ))}
                </td>
                {/*
                  Số lượng in gọn khi là số nguyên (1 chứ không phải "1,0"), vì
                  cột `soLuong` là Float — hợp đồng cũ có dòng 0,5 ngày công.
                */}
                <td className="c-sl">{Number.isInteger(d.soLuong) ? d.soLuong : d.soLuong.toLocaleString("vi-VN")}</td>
                <td className="c-tien">{tien(d.donGia)}</td>
                <td className="c-tien">{tien(d.thanhTien)}</td>
              </tr>
            ))}
            {to.dong.length === 0 && (
              <tr>
                <td colSpan={5} className="to-hd-trong">
                  Hợp đồng chưa có dòng dịch vụ nào.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} />
              <td className="c-nhan">Thành Tiền</td>
              <td className="c-tien">{tien(to.thanhTien)}</td>
            </tr>
            {/*
              Khuyến mãi chỉ hiện khi có thật. Mẫu AppSheet in cả dòng 0 đồng;
              bỏ đi vì một dòng "Khuyến mãi 0" trên giấy hay bị khách hỏi lại.
            */}
            {to.khuyenMai > 0 && (
              <tr>
                <td colSpan={3} />
                <td className="c-nhan">Khuyến mãi</td>
                <td className="c-tien">{tien(to.khuyenMai)}</td>
              </tr>
            )}
            <tr className="to-hd-dam">
              <td colSpan={3} />
              <td className="c-nhan">Tổng Tiền</td>
              <td className="c-tien">{tien(to.tongTien)}</td>
            </tr>
            <tr>
              <td colSpan={3} />
              <td className="c-nhan">Đã thanh toán</td>
              <td className="c-tien">{tien(to.daThu)}</td>
            </tr>
            <tr className="to-hd-dam">
              <td colSpan={3} />
              <td className="c-nhan">Còn lại</td>
              <td className="c-tien">{tien(to.conLai)}</td>
            </tr>
          </tfoot>
        </table>

        <section className="to-hd-luu-y">
          <p className="to-hd-luu-y-nhan">Lưu ý:</p>
          <ul>
            {LUU_Y_HOP_DONG.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>

        <section className="to-hd-ky">
          {O_KY.map((o) => (
            <div key={o}>
              <p className="to-hd-ky-ten">{o}</p>
              <p className="to-hd-ky-chu">(Ký, họ tên)</p>
            </div>
          ))}
        </section>
      </article>
    </div>
  );
}
