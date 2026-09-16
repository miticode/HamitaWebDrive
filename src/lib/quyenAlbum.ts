import { isAdmin } from "@/lib/auth";
import { laQuanTri, layNguoiDung } from "@/lib/phienNhanVien";

/**
 * Ai MỞ ĐƯỢC trang quản lý album (/admin) và các đường API của nó.
 *
 * Mật khẩu quản lý album, HOẶC bất kỳ tài khoản nhân viên nào đã đăng nhập —
 * studio chốt 16/09/2026: cả tiệm làm album chứ không riêng sếp. Người vừa
 * được cấp mật khẩu tạm thì chưa vào được, phải tự đổi mật khẩu trước đã.
 *
 * Trước đó chỉ mật khẩu chung mới vào được, nên nhân viên đứng ở màn hình đăng
 * nhập gõ tài khoản riêng mãi không vào nổi.
 */
export async function quyenAlbum(): Promise<boolean> {
  if (await isAdmin()) return true;
  const nguoi = await layNguoiDung();
  return nguoi !== null && !nguoi.doiMatKhau;
}

/**
 * Ba việc trên trang album CHỈ QUẢN LÝ làm được (studio chốt 16/09/2026):
 * xoá album, kết nối / ngắt Google Drive, và bản sao lưu.
 *
 * Vì sao riêng ba việc này: xoá nhầm một album là mất luôn mọi lựa chọn ảnh
 * của khách; ngắt Drive là cả tiệm không xem được ảnh nữa; bản sao lưu là một
 * tệp mang dữ liệu cả tiệm đi ra ngoài. Những việc còn lại — tạo album, đổi
 * tên, ảnh bìa, gói ảnh, mã xem ảnh, gửi thông báo, xem ảnh khách chọn, đơn
 * giao in, thống kê — nhân viên làm bình thường.
 *
 * Kiểm ở MÁY CHỦ, không chỉ giấu nút: giấu nút chỉ đỡ bấm nhầm, không chặn
 * được người gọi thẳng đường API.
 */
export async function quyenAlbumNguyHiem(): Promise<boolean> {
  return (await isAdmin()) || laQuanTri(await layNguoiDung());
}
