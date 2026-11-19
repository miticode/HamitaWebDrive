/*
  MÀU BUỔI CHỤP TRONG LỊCH — anh yêu cầu 15/11/2026 ("làm giống bên Lark").

  Lịch có 16 loại buổi, đo 15/11/2026 trên 1.454 buổi còn sống:

    Ngày chụp 461 · nhà gái 333 · nhà trai 300 · Nhà Su 84 · Hami Baby 80 ·
    Đính Hôn 80 · chụp bé 33 · Ngày cưới 25 · Ngày lễ gia tiên 13 ·
    chup dạm ngõ 11 · chụp thôi nôi 10 · makeup 9 · (trống) 7 ·
    Chụp sự kiện 4 · Chụp chịu lạy 3 · chụp đầy tháng 1

  MƯỜI SÁU MÀU LÀ KHÔNG ĐỌC ĐƯỢC. Mắt phân biệt được chừng bảy tám màu nền
  nhạt cạnh nhau; hơn nữa thì thành một mảng lốm đốm vô nghĩa. Nên gom thành
  tám nhóm, mỗi nhóm là một việc khác hẳn nhau trong ngày của tiệm.

  Gom THEO TÊN chứ không theo thứ tự tần suất: xếp theo tần suất thì tháng sau
  dữ liệu đổi là màu đổi theo, nhân viên vừa quen màu lại phải học lại.

  Lớp màu thật nằm ở `globals.css`, khối "MÀU BUỔI CHỤP". Tệp này chỉ quyết
  loại nào thuộc nhóm nào.
*/

export type NhomLich = "chup" | "gai" | "trai" | "cuoi" | "be" | "su" | "makeup" | "khac";

/** Tên nhóm hiện ở hàng chú giải dưới lưới. */
export const TEN_NHOM: Record<NhomLich, string> = {
  chup: "Ngày chụp",
  gai: "Nhà gái",
  trai: "Nhà trai",
  cuoi: "Cưới hỏi",
  be: "Bé & gia đình",
  su: "Nhà Su",
  makeup: "Makeup",
  khac: "Khác",
};

/**
 * Loại buổi → nhóm màu.
 *
 * So khớp SAU KHI hạ chữ thường: bên AppSheet cùng một việc viết mỗi nơi một
 * kiểu ("Đính Hôn", "chup dạm ngõ", "chụp bé"), và người nhập sau này sẽ còn
 * viết kiểu khác nữa.
 */
const NHOM_THEO_LOAI: Record<string, NhomLich> = {
  "ngày chụp": "chup",
  "chụp sự kiện": "chup",
  "nhà gái": "gai",
  "nhà trai": "trai",
  "ngày cưới": "cuoi",
  "đính hôn": "cuoi",
  "ngày lễ gia tiên": "cuoi",
  "chup dạm ngõ": "cuoi",
  "chụp dạm ngõ": "cuoi",
  "chụp chịu lạy": "cuoi",
  "hami baby": "be",
  "chụp bé": "be",
  "chụp thôi nôi": "be",
  "chụp đầy tháng": "be",
  "nhà su": "su",
  makeup: "makeup",
};

/** Nhóm màu của một loại buổi. Loại lạ hoặc để trống thì về "khác" (xám). */
export function nhomCuaLoai(loai: string | null | undefined): NhomLich {
  if (!loai) return "khac";
  return NHOM_THEO_LOAI[loai.trim().toLowerCase()] ?? "khac";
}

/**
 * Lớp CSS của nhóm. Viết đủ tên từng lớp thay vì ghép chuỗi `l-${nhom}`: lớp
 * ghép động thì công cụ tìm lớp chết không thấy, sau này dọn CSS là xoá nhầm.
 */
export const LOP_NHOM: Record<NhomLich, string> = {
  chup: "l-chup",
  gai: "l-gai",
  trai: "l-trai",
  cuoi: "l-cuoi",
  be: "l-be",
  su: "l-su",
  makeup: "l-makeup",
  khac: "l-khac",
};

/** Thứ tự hiện ở hàng chú giải — việc hay gặp đứng trước. */
export const THU_TU_NHOM: readonly NhomLich[] = [
  "chup",
  "gai",
  "trai",
  "cuoi",
  "be",
  "su",
  "makeup",
  "khac",
];

/**
 * Một buổi, đã rút gọn đúng những gì lưới cần.
 *
 * Khai ở đây chứ không ở component: trang (máy chủ) và lưới (trình duyệt) cùng
 * đọc kiểu này, lệch một trường là lỗi lúc dựng chứ không phải lúc chạy.
 */
/**
 * Một đầu việc hiện dưới buổi chụp trên lịch — anh yêu cầu 19/11/2026.
 *
 * Chỉ mang đúng thứ cần để chia người: làm việc gì, công bao nhiêu, ai đang
 * nhận. Không mang thời hạn hay ghi chú — những thứ đó ở trang Đầu việc, còn
 * trên lịch mà bày hết thì mỗi buổi thành một bảng con.
 */
export type ViecBuoi = {
  id: string;
  loai: string | null;
  /** Đơn giá × số lượng, tức tiền người làm việc này nhận. */
  tienCong: number;
  nguoiPhuTrachMaNV: string | null;
  trangThai: string | null;
};

export type BuoiLich = {
  id: string;
  ngay: string | null;
  gio: string | null;
  loai: string | null;
  trangThai: string | null;
  ghiChu: string | null;
  hopDongId: string | null;
  tenKhach: string | null;
  soDienThoai: string | null;
  /**
   * Đầu việc của HỢP ĐỒNG mà buổi này thuộc về, đã bỏ việc hậu kỳ.
   *
   * Theo hợp đồng chứ không theo buổi, vì `CongViec` không có cột trỏ tới
   * buổi nào. Hợp đồng hai ngày thì cả hai ngày cùng hiện một danh sách —
   * người đã giao thì hiện tên, nên vẫn biết cái nào xong rồi.
   */
  viec: ViecBuoi[];
};
