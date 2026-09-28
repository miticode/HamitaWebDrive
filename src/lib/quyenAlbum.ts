import { isAdmin } from "@/lib/auth";
import { boDau } from "@/lib/constants";
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
 * Hai việc trên trang album CHỈ QUẢN LÝ làm được: kết nối / ngắt Google Drive
 * và bản sao lưu. (Trước 28/09/2026 có ba — xoá album nay mở cho phòng Media,
 * xem `quyenXoaAlbum` ngay dưới.)
 *
 * Vì sao riêng hai việc này: ngắt Drive là cả tiệm không xem được ảnh nữa;
 * bản sao lưu là một tệp mang dữ liệu cả tiệm đi ra ngoài. Những việc còn lại — tạo album, đổi
 * tên, ảnh bìa, gói ảnh, mã xem ảnh, gửi thông báo, xem ảnh khách chọn, đơn
 * giao in, thống kê — nhân viên làm bình thường.
 *
 * Kiểm ở MÁY CHỦ, không chỉ giấu nút: giấu nút chỉ đỡ bấm nhầm, không chặn
 * được người gọi thẳng đường API.
 */
export async function quyenAlbumNguyHiem(): Promise<boolean> {
  return (await isAdmin()) || laQuanTri(await layNguoiDung());
}

/**
 * XOÁ ALBUM: quản lý và người phòng **Media** (anh chốt 28/09/2026).
 *
 * Media là phòng dựng album — họ tạo link, up ảnh, và cũng là người biết album
 * nào tạo nhầm hay trùng, nên bắt họ đi nhờ quản lý xoá từng cái là tắc việc.
 *
 * Vẫn là việc KHÔNG LÙI ĐƯỢC: xoá album là mất luôn mọi lựa chọn ảnh khách đã
 * thả tim, mọi ghi chú "in cỡ 40x60", và link đã gửi khách chết theo. Ảnh trên
 * Drive thì còn nguyên — web chỉ là lớp hiển thị.
 *
 * So phòng ban sau khi bỏ dấu, không phân biệt hoa thường: trong bảng nhân
 * viên chữ mỗi nơi một kiểu ("Media", "MEDIA"). Cùng cách phòng Váy được sửa
 * trang phục (loaiDuocSua trong dichVuChung.ts).
 *
 * Người đang cầm mật khẩu tạm chưa đổi thì chưa làm được — cùng luật với
 * lapHopDong: mật khẩu tạm là thứ quản lý vừa đọc qua điện thoại, chưa phải
 * bằng chứng ai đang ngồi trước máy.
 */
export async function quyenXoaAlbum(): Promise<boolean> {
  if (await isAdmin()) return true;
  const nguoi = await layNguoiDung();
  if (laQuanTri(nguoi)) return true;
  if (!nguoi || nguoi.doiMatKhau) return false;
  return boDau(nguoi.phongBan ?? "") === "media";
}
