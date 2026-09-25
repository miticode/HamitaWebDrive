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
    // Hợp đồng: quản lý + sale. Lịch và đầu việc thì cả tiệm, nhưng đầu việc
    // chỉ hiện việc của chính người đang xem (xem trang cong-viec).
    ...(xemHopDong(nguoi) ? [{ nhom: "Hợp đồng – Công việc", ten: "Hợp đồng", href: "/quan-ly/hop-dong" }] : []),
    { nhom: "Hợp đồng – Công việc", ten: "Lịch chụp", href: "/quan-ly/lich" },
    { nhom: "Hợp đồng – Công việc", ten: "Đầu việc", href: "/quan-ly/cong-viec" },
    ...(xemTienVaKhach(nguoi)
      ? [
          { nhom: "Tư vấn – CSKH", ten: "Khách hàng", href: "/quan-ly/khach-hang" },
          { nhom: "Kế toán", ten: "Phiếu thu", href: "/quan-ly/phieu-thu" },
        ]
      : []),
    // Danh sách nhân viên: quản lý + sale (anh chốt 25/09/2026).
    ...(xemNhanVien(nguoi) ? [{ nhom: "Thông tin studio", ten: "Nhân viên", href: "/quan-ly/nhan-vien" }] : []),
    { nhom: "Thông tin studio", ten: "Nội quy", href: "/quan-ly/noi-quy" },
    { nhom: "Thông tin studio", ten: "Dịch vụ & trang phục", href: "/quan-ly/dich-vu" },
    // Có số tài khoản ngân hàng — chỉ quản lý (AppSheet cũ cũng chỉ Admin xem).
    ...(quanTri ? [{ nhom: "Thông tin studio", ten: "Thông tin studio", href: "/quan-ly/thong-tin" }] : []),
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
