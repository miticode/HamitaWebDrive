/*
  MÀU BUỔI CHỤP TRONG LỊCH.

  Anh yêu cầu lần đầu 15/11/2026 ("làm giống bên Lark"), chia LẠI 20/11 theo
  việc của tiệm chứ không theo tên buổi:

    xanh lá  mọi buổi thuộc chuỗi NGÀY CƯỚI
    vàng     PREWEDDING — chụp trước ngày cưới
    tím      MAKEUP
    hồng     baby, gia đình, beauty, sinh nhật… — dịch vụ ngoài cưới
    đỏ       việc QUẢN LÝ TỰ TAY thêm vào lịch (không do hợp đồng sinh ra)
    xám      chưa gán màu

  Bản 15/11 chia tám nhóm theo tên buổi ("Ngày chụp", "Nhà gái", "Nhà trai"…).
  Hỏng ở chỗ: nhà gái và nhà trai là hai màu khác nhau trong khi cùng thuộc
  một ngày cưới, còn makeup thì lẫn vào nhóm "khác". Nhìn lịch không trả lời
  được câu "tuần này có mấy đám cưới".

  MÀU LẤY TỪ DATABASE, không viết cứng nữa — cột `mau` của bảng LoaiBuoi, anh
  tự gán trên trang Loại buổi. Bảng dưới chỉ là MẶC ĐỊNH cho loại chưa ai gán,
  để 17 loại có sẵn hiện đúng màu ngay mà không phải ghi một lượt vào database.

  Lớp màu thật nằm ở `globals.css`, khối "MÀU BUỔI CHỤP". Tệp này chỉ quyết
  buổi nào thuộc nhóm nào.
*/

export type NhomLich = "cuoi" | "pre" | "makeup" | "dichvu" | "tuthem" | "chua";

const CAC_NHOM: readonly string[] = ["cuoi", "pre", "makeup", "dichvu", "tuthem", "chua"];

/** Tên nhóm hiện ở hàng chú giải dưới lưới. */
export const TEN_NHOM: Record<NhomLich, string> = {
  cuoi: "Ngày cưới",
  pre: "Prewedding",
  makeup: "Makeup",
  dichvu: "Baby, gia đình, beauty…",
  tuthem: "Việc tự thêm",
  chua: "Chưa gán màu",
};

/**
 * Năm màu anh gán được cho một loại buổi.
 *
 * "tuthem" (đỏ) KHÔNG có ở đây: nó không phải màu của một loại buổi mà của
 * việc quản lý tự tay thêm vào lịch, xem `LichChup.tuThem`. Bày nó ra ô chọn
 * thì có ngày một loại buổi mang màu đỏ và lịch nói sai hẳn.
 */
export const MAU_CHON: readonly NhomLich[] = ["cuoi", "pre", "makeup", "dichvu", "chua"];

export function laNhomLich(x: string | null | undefined): x is NhomLich {
  return !!x && CAC_NHOM.includes(x);
}

/**
 * MẶC ĐỊNH cho loại buổi chưa ai gán màu — tra theo tên, hạ chữ thường.
 *
 * Hạ chữ thường vì bên AppSheet cùng một việc viết mỗi nơi một kiểu ("Đính
 * Hôn", "chup dạm ngõ", "chụp bé"), và người nhập sau còn viết kiểu khác nữa.
 *
 * "Ngày chụp" cố ý để XÁM dù nó nhiều nhất (461/1.454 buổi, đo 20/11): tên
 * chung chung, hợp đồng đi cùng có cả "GÓI TIỆC CƯỚI 2 NGÀY" lẫn "GÓI ẢNH
 * CỔNG BASIC2", nên đoán màu nào cũng sai một nửa. Anh chốt để xám, và từ nay
 * chọn loại cụ thể hơn lúc lập hợp đồng.
 */
const MAU_MAC_DINH: Record<string, NhomLich> = {
  /* Chuỗi ngày cưới — xanh lá. */
  "nhà gái": "cuoi",
  "nhà trai": "cuoi",
  "ngày cưới": "cuoi",
  "đính hôn": "cuoi",
  "ngày lễ gia tiên": "cuoi",
  "chup dạm ngõ": "cuoi",
  "chụp dạm ngõ": "cuoi",
  "chụp chịu lạy": "cuoi",

  /* Chụp TRƯỚC ngày cưới — vàng. */
  "chụp hình cổng": "pre",
  "chụp album": "pre",

  /* Dịch vụ ngoài cưới — hồng. Anh chốt xếp "Nhà Su" vào đây 20/11. */
  "hami baby": "dichvu",
  "chụp bé": "dichvu",
  "chụp thôi nôi": "dichvu",
  "chụp đầy tháng": "dichvu",
  "chụp sự kiện": "dichvu",
  "nhà su": "dichvu",

  /* Tím. */
  makeup: "makeup",
};

/** Màu mặc định của một loại buổi, tra theo tên. Tên lạ hoặc trống thì xám. */
export function mauMacDinh(loai: string | null | undefined): NhomLich {
  if (!loai) return "chua";
  return MAU_MAC_DINH[loai.trim().toLowerCase()] ?? "chua";
}

/**
 * Nhóm màu của một buổi trên lịch.
 *
 * Thứ tự quyết định: việc tự thêm đỏ trước đã — nó không mang loại buổi nào
 * cả. Rồi tới màu studio gán cho loại ấy, cuối cùng mới tới mặc định theo tên.
 */
export function nhomCuaBuoi(buoi: {
  loai: string | null;
  mau?: string | null;
  tuThem?: boolean;
}): NhomLich {
  if (buoi.tuThem) return "tuthem";
  if (laNhomLich(buoi.mau)) return buoi.mau;
  return mauMacDinh(buoi.loai);
}

/**
 * Lớp CSS của nhóm. Viết đủ tên từng lớp thay vì ghép chuỗi theo tên nhóm:
 * lớp ghép động thì công cụ tìm lớp chết không thấy, sau này dọn CSS là xoá
 * nhầm.
 */
export const LOP_NHOM: Record<NhomLich, string> = {
  cuoi: "l-cuoi",
  pre: "l-pre",
  makeup: "l-makeup",
  dichvu: "l-dichvu",
  tuthem: "l-tuthem",
  chua: "l-chua",
};

/** Thứ tự hiện ở hàng chú giải — việc hay gặp đứng trước. */
export const THU_TU_NHOM: readonly NhomLich[] = [
  "cuoi",
  "pre",
  "makeup",
  "dichvu",
  "tuthem",
  "chua",
];

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
  /**
   * Đơn giá × số lượng, tức tiền người làm việc này nhận.
   *
   * `null` = NGƯỜI ĐANG XEM KHÔNG ĐƯỢC BIẾT. Studio chốt 15/09/2026 chỉ quản
   * lý xem lương mỗi người, và trang Đầu việc không hiện con số này ở đâu cả.
   *
   * Cắt từ MÁY CHỦ chứ không ẩn ở trình duyệt (nguyên tắc 3): dữ liệu gửi
   * xuống nằm trong nguồn trang, ẩn bằng JSX thì xem nguồn vẫn đọc được.
   */
  tienCong: number | null;
  nguoiPhuTrachMaNV: string | null;
  trangThai: string | null;
};

export type BuoiLich = {
  id: string;
  ngay: string | null;
  gio: string | null;
  loai: string | null;
  /** Màu studio gán cho loại buổi này (`LoaiBuoi.mau`). null = theo mặc định. */
  mau: string | null;
  /** Việc quản lý tự tay thêm vào lịch, không do hợp đồng sinh ra — tô đỏ. */
  tuThem: boolean;
  /**
   * Chữ hiện thay cho tên khách — chỉ việc tự thêm mới có.
   *
   * Lấy từ cột `hienThi`, vốn là "dòng chữ vẽ lên lịch" của AppSheet. Buổi
   * của hợp đồng cũng có cột ấy nhưng nó chỉ chép lại tên khách và ngày, nên
   * không mang xuống: chip trên lưới đã hiện tên khách rồi.
   */
  tieuDe: string | null;
  trangThai: string | null;
  ghiChu: string | null;
  hopDongId: string | null;
  tenKhach: string | null;
  soDienThoai: string | null;
  /**
   * Đầu việc của buổi này.
   *
   * Hợp đồng lập từ 20/11/2026 gắn việc thẳng vào buổi (`CongViec.lichChupId`),
   * nên mở ngày nhà gái chỉ thấy người của nhà gái. Hợp đồng cũ chép từ
   * AppSheet không có cột ấy: việc của chúng vẫn theo hợp đồng, đã bỏ việc hậu
   * kỳ, nên hai ngày cùng hiện một danh sách. Xem chú thích trong lich/page.tsx.
   */
  viec: ViecBuoi[];
};
