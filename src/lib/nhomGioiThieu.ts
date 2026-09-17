import { boDau } from "./constants";

/**
 * Các nhóm dịch vụ trên trang giới thiệu và mục nhỏ của từng nhóm (anh chốt
 * 17/09/2026). Mỗi nhóm ứng với một thẻ trong lưới "Hamita chụp gì?" (`khu`
 * khớp `DICH_VU.muc[].khu` trong studio.ts).
 *
 * File này chạy cả ở máy khách (trang quản lý) nên KHÔNG được nhập gì dính tới
 * Prisma (nguyên tắc 43).
 *
 * - `key` của nhóm và mục là đường dẫn gửi khách (/dich-vu/anh-cuoi/nha-gai) —
 *   đừng đổi. Mục không được mang key "anh" (dành cho trang ảnh thư mục).
 * - KEY MỤC KHÔNG ĐƯỢC TRÙNG GIỮA CÁC NHÓM: bảng AnhGioiThieu khoá không trùng
 *   theo (muc, galleryId, albumId). Đổi khoá đó phải chạy lệnh Prisma có cờ mất
 *   dữ liệu trên database thật — tránh bằng cách giữ key mục riêng biệt.
 * - `ma`: mã đầu tên album (src/lib/maAlbum.ts) dùng để GỢI Ý album khi thêm.
 *   Mảng rỗng = chưa có mã riêng, ô chọn hiện mọi album.
 * - Nhóm chỉ có MỘT mục thì trang công khai không hiện hàng nút mục, bấm vào là
 *   thấy thư mục luôn. Hamita Garden và Váy cưới đang vậy vì anh sẽ gửi danh
 *   sách mục sau; khi chia mục, thư mục đã chọn ở mục chung phải chuyển tay.
 */
export const NHOM_GIOI_THIEU = [
  {
    key: "anh-cuoi",
    khu: "cuoi",
    ten: "Ảnh cưới",
    muc: [
      { key: "dam-ngo", ten: "Dạm ngõ", ma: ["DN"] },
      { key: "dinh-hon", ten: "Đính hôn", ma: ["ĐH"] },
      { key: "nha-gai", ten: "Ngày cưới – Nhà gái", ma: ["HER"] },
      { key: "nha-trai", ten: "Ngày cưới – Nhà trai", ma: ["HIS"] },
      { key: "phong-su", ten: "Phóng sự cưới", ma: [] },
    ],
  },
  {
    key: "album-hinh-cong",
    khu: "albumhc",
    ten: "Album & hình cổng",
    muc: [
      { key: "album", ten: "Album", ma: ["AB"] },
      { key: "hinh-cong", ten: "Hình cổng", ma: ["HC"] },
    ],
  },
  {
    key: "hamita-garden",
    khu: "phimtruong",
    ten: "Hamita Garden",
    muc: [{ key: "hamita-garden", ten: "Hamita Garden", ma: [] }],
  },
  {
    key: "be-gia-dinh",
    khu: "baby",
    ten: "Bé & gia đình",
    muc: [
      { key: "thoi-noi", ten: "Thôi nôi", ma: ["Baby"] },
      { key: "bau", ten: "Bầu", ma: ["Baby"] },
      { key: "so-sinh", ten: "Sơ sinh", ma: ["Baby"] },
      { key: "gia-dinh", ten: "Gia đình", ma: ["GD"] },
    ],
  },
  {
    key: "vay-cuoi",
    khu: "vay",
    ten: "Váy cưới & trang điểm",
    muc: [{ key: "vay-cuoi", ten: "Váy cưới & trang điểm", ma: [] }],
  },
  {
    key: "nha-su",
    khu: "nhasu",
    ten: "Tiệm ảnh nhà Su",
    muc: [{ key: "nha-su", ten: "Tiệm ảnh nhà Su", ma: ["NS"] }],
  },
] as const satisfies readonly {
  key: string;
  khu: string;
  ten: string;
  muc: readonly { key: string; ten: string; ma: readonly string[] }[];
}[];

export type NhomGioiThieu = (typeof NHOM_GIOI_THIEU)[number];
export type MucGioiThieu = NhomGioiThieu["muc"][number];

export function timNhom(key: string): NhomGioiThieu | undefined {
  return NHOM_GIOI_THIEU.find((n) => n.key === key);
}

export function timMuc(nhom: string, muc: string): MucGioiThieu | undefined {
  return (timNhom(nhom)?.muc as readonly MucGioiThieu[] | undefined)?.find((m) => m.key === muc);
}

/**
 * Tên album có mang mã này không. So theo TỪ ĐỨNG RIÊNG sau khi bỏ dấu:
 * "HIS - HER - Công Hiếu & Ngọc Hằng" khớp cả HIS lẫn HER, còn "Hershey" không
 * khớp HER.
 */
export function coMa(ten: string, ma: string): boolean {
  const key = boDau(ma);
  return boDau(ten)
    .split(/[^a-z0-9]+/)
    .some((t) => t === key);
}
