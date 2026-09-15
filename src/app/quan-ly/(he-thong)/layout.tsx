import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
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
  const menu: MucMenu[] = [
    { nhom: null, ten: "Tổng quan", href: "/quan-ly" },
    { nhom: "Thông tin studio", ten: "Nhân viên", href: "/quan-ly/nhan-vien" },
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
