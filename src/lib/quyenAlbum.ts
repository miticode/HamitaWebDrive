import { isAdmin } from "@/lib/auth";
import { laQuanTri, layNguoiDung } from "@/lib/phienNhanVien";

/**
 * Ai mở được trang quản lý album (/admin) và các đường API của nó.
 *
 * Từ 16/09/2026 hai cửa đăng nhập gộp làm MỘT màn hình (/quan-ly/dang-nhap):
 * - Tên "admin" + mật khẩu quản lý album — cách cũ, vẫn giữ.
 * - Hoặc tài khoản nhân viên có vai trò QUẢN LÝ. Trước đó sếp phải nhớ thêm
 *   mật khẩu chung mới vào được trang album, trong khi thanh bên đã mời họ bấm
 *   vào đúng trang đó rồi — hai cửa cho một người là chỗ dễ tưởng hệ thống hỏng.
 *
 * Nhân viên thường không mở được trang album; họ dùng phần quản lý studio.
 */
export async function quyenAlbum(): Promise<boolean> {
  return (await isAdmin()) || laQuanTri(await layNguoiDung());
}
