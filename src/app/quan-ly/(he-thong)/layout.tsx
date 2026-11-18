import { batBuocDangNhap, laQuanTri, xemHopDong, xemNhanVien, xemTienVaKhach } from "@/lib/phienNhanVien";
import { TEN_VAI_TRO } from "@/lib/nhanVienChung";
import { ThanhBen, type MucMenu } from "./ThanhBen";

export const dynamic = "force-dynamic";

/**
 * Khung có thanh bên của phần quản lý studio.
 *
 * Layout này KHÔNG phải lớp chặn đăng nhập: mỗi trang tự gọi batBuocDangNhap()
 * — layout và trang dựng song song, xem lý do ở hàm đó. Ở đây gọi lại chỉ để
 * biết dựng thanh bên cho ai.
 *
 * Thanh bên chia nhóm theo đúng các nhóm của app AppSheet cũ (Hợp đồng – Công
 * việc, Kế toán, Tư vấn – Chăm sóc khách hàng…) để nhân viên đổi sang không
 * phải học lại chỗ nào nằm đâu. Mục nào chưa làm xong thì CHƯA hiện — một
 * menu đầy mục bấm vào không có gì chỉ làm người ta tưởng hệ thống hỏng.
 */
export default async function HeThongLayout({ children }: { children: React.ReactNode }) {
  const nguoi = await batBuocDangNhap();

  const quanTri = laQuanTri(nguoi);
  /*
    Menu chỉ hiện mục người đó VÀO ĐƯỢC (anh chốt 21/09/2026). Giấu ở menu chỉ
    để đỡ bấm nhầm; chặn thật nằm trong từng trang bằng batBuocQuyen — giấu nút
    mà không chặn máy chủ thì ai gõ thẳng đường dẫn vẫn đọc được.
  */
  const menu: MucMenu[] = [
    { nhom: null, ten: "Tổng quan", href: "/quan-ly" },
    // Chấm công: CẢ TIỆM, không lọc theo vai trò nào. Đây là trang nhiều người
    // dùng nhất — mỗi người bấm hai lần mỗi ngày — nên để ngay đầu danh sách.
    { nhom: null, ten: "Chấm công", href: "/quan-ly/cham-cong" },
    /*
      Lịch chụp và Đầu việc lên ĐẦU, cạnh Chấm công — mục P2-4.

      Trước đây hai mục này nằm trong nhóm "Hợp đồng – Công việc", cạnh mục
      Hợp đồng mà Photo và Hậu kỳ không mở được: ba thứ họ dùng mỗi ngày bị
      tách ra, phải cuộn qua tên nhóm kế toán mới thấy. Giờ ba mục dùng hàng
      ngày của MỌI vai trò nằm trong tầm mắt.

      Hai dòng cũ trong nhóm "Hợp đồng – Công việc" bỏ đi — để lại là một mục
      hiện hai lần trong cùng thanh bên. Nhóm đó giờ chỉ còn mục Hợp đồng nên
      đổi tên theo: một nhóm tên "… – Công việc" mà không chứa mục công việc
      nào là đúng loại lỗi cả đợt soát này đi sửa.
    */
    { nhom: null, ten: "Lịch chụp", href: "/quan-ly/lich" },
    { nhom: null, ten: "Đầu việc", href: "/quan-ly/cong-viec" },
    // Đơn từ và lương: AI CŨNG VÀO ĐƯỢC. Hai trang tự lọc theo người đang
    // đăng nhập — người thường chỉ thấy đơn và phiếu lương của chính mình,
    // quản lý thấy cả tiệm. Giấu khỏi thanh bên là nhân viên không biết đường
    // nào mà gửi đơn hay xem lương mình.
    { nhom: "Nhân sự", ten: "Đơn từ", href: "/quan-ly/don-tu" },
    { nhom: "Nhân sự", ten: "Lương", href: "/quan-ly/luong" },
    // Hợp đồng: quản lý + sale. Lịch và đầu việc thì cả tiệm, nhưng đầu việc
    // chỉ hiện việc của chính người đang xem (xem trang cong-viec).
    ...(xemHopDong(nguoi) ? [{ nhom: "Hợp đồng", ten: "Hợp đồng", href: "/quan-ly/hop-dong" }] : []),
    // Khách tiềm năng: quản lý + SALE. Đứng TRƯỚC Khách hàng vì đó là chỗ một
    // nhà bắt đầu — và vì sale không mở được mục Khách hàng (chỉ quản lý), nên
    // nếu để sau thì với sale nhóm này chỉ còn một mục nằm trơ.
    ...(xemHopDong(nguoi)
      ? [{ nhom: "Tư vấn – CSKH", ten: "Khách tiềm năng", href: "/quan-ly/khach-tiem-nang" }]
      : []),
    ...(xemTienVaKhach(nguoi)
      ? [
          { nhom: "Tư vấn – CSKH", ten: "Khách hàng", href: "/quan-ly/khach-hang" },
          { nhom: "Kế toán", ten: "Phiếu thu", href: "/quan-ly/phieu-thu" },
          // Sổ quỹ đứng SAU phiếu thu dù nó tổng quát hơn: thói quen cũ của
          // tiệm là mở phiếu thu, đảo chỗ là mỗi lần vào lại phải tìm.
          { nhom: "Kế toán", ten: "Sổ quỹ", href: "/quan-ly/so-quy" },
        ]
      : []),
    // Danh sách nhân viên: quản lý + sale (anh chốt 25/09/2026).
    ...(xemNhanVien(nguoi) ? [{ nhom: "Thông tin studio", ten: "Nhân viên", href: "/quan-ly/nhan-vien" }] : []),
    { nhom: "Thông tin studio", ten: "Nội quy", href: "/quan-ly/noi-quy" },
    { nhom: "Thông tin studio", ten: "Dịch vụ & trang phục", href: "/quan-ly/dich-vu" },
    // Loại buổi chụp (anh yêu cầu 18/11/2026): cả tiệm xem, chỉ quản lý sửa.
    { nhom: "Thông tin studio", ten: "Loại buổi chụp", href: "/quan-ly/loai-buoi" },
    // Có số tài khoản ngân hàng — chỉ quản lý (AppSheet cũ cũng chỉ Admin xem).
    ...(quanTri ? [{ nhom: "Thông tin studio", ten: "Thông tin studio", href: "/quan-ly/thong-tin" }] : []),
    // Sổ sự cố: CẢ TIỆM. Người thấy máy hỏng là người đang đứng ở đó, không
    // phải quản lý — giấu mục này là sổ trống rỗng y như bên AppSheet. Chỉ
    // việc ĐÓNG sự cố mới là của quản lý, chặn trong server action.
    { nhom: "Hệ thống", ten: "Sổ sự cố", href: "/quan-ly/su-co" },
    ...(quanTri
      ? [
          { nhom: "Hệ thống", ten: "Nhật ký thao tác", href: "/quan-ly/nhat-ky" },
          { nhom: "Hệ thống", ten: "Quản lý album ảnh", href: "/admin" },
        ]
      : []),
  ];

  return (
    <div className="md:flex">
      <ThanhBen
        menu={menu}
        ten={nguoi.ten}
        vaiTro={TEN_VAI_TRO[nguoi.vaiTro]}
        coTaiKhoanRieng={nguoi.id !== null}
      />
      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 md:py-10">{children}</main>
    </div>
  );
}
