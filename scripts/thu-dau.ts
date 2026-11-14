/**
 * Dấu nhận biết của kịch bản thử — dùng chung cho `thu-toan-bo.mts` (tạo) và
 * `thu-don-dep.mts` (dọn). Để MỘT chỗ chứ không chép sang hai nơi: hai bản
 * lệch nhau một ký tự là dọn sót mà không ai biết.
 *
 * Mọi giá trị dưới đây cố ý không trùng với bất cứ dữ liệu thật nào của tiệm.
 */
export const DAU = {
  ten: "ZZ THU NGHIEM",
  /**
   * Tiền tố CHUNG cho mọi thứ do kịch bản thử sinh ra, kể cả tài khoản thử
   * trong `thu-tai-khoan.mts` (tên "ZZ THU quản lý", "ZZ THU học viên"…).
   *
   * Thiếu nó thì mỗi script dọn theo một dấu riêng: 14/11 hai dòng nhật ký
   * mang tên "ZZ THU quản lý" lọt lại, vì script dọn chỉ tìm "ZZ THU NGHIEM".
   */
  tienTo: "ZZ THU",
  sdt: "0900000001",
  sdt2: "0900000002",
  sdt3: "0900000003",
  maNV: "ZZTEST",
  kyLuong: "01/2020",
};
