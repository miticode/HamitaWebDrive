import type { CotBang } from "../_ui/Bang";

/*
  CỘT CỦA BẢNG NHÂN VIÊN.

  Hàng của bảng này chia làm HAI NƠI VẼ: bốn cột đầu do trang bảng lo (máy
  chủ), năm cột sau do `HangNhanVien` (phải `"use client"` để gọi action cấp
  mật khẩu). Một bảng tên dùng chung thì hai nơi không thể lệch nhãn nhau.

  TỆP RIÊNG, KHÔNG để chung trong HangNhanVien.tsx — đo 22/11/2026.

  Bản đầu em khai ngay trong tệp ấy rồi cho trang bảng import sang. Dựng thì
  qua, nhưng chạy là lỗi 500:

      TypeError: Cannot read properties of undefined (reading 'phai')

  Lý do: khi một server component import từ module mang `"use client"`, mọi
  export của module đó trở thành THAM CHIẾU tới component phía máy khách, kể
  cả một const thuần. Phía máy chủ đọc `COT_NV.ten` ra `undefined`.

  Tệp này không có `"use client"` nên cả hai phía đọc được giá trị thật.

  Năm cột sau CHỈ QUẢN LÝ thấy — nguyên tắc 55.
*/
export const COT_NV = {
  ten: { ten: "Tên", chinh: true },
  phongBan: { ten: "Phòng ban" },
  chucVu: { ten: "Chức vụ" },
  dienThoai: { ten: "Điện thoại" },
  tenDangNhap: { ten: "Tên đăng nhập" },
  taiKhoan: { ten: "Tài khoản" },
  vaoGanNhat: { ten: "Vào gần nhất" },
  trangGioiThieu: { ten: "Trang giới thiệu", rong: true },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;
