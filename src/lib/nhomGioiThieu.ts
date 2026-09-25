import { boDau } from "./constants";

/**
 * Các nhóm dịch vụ trên trang giới thiệu. Mỗi nhóm ứng với một thẻ trong lưới
 * "Hamita chụp gì?" (`khu` khớp `DICH_VU.muc[].khu` trong studio.ts).
 *
 * NHÓM CỐ ĐỊNH, MỤC THÌ MỀM. Sáu nhóm bên dưới khớp sáu thẻ trang chủ nên nằm
 * trong mã nguồn. Còn các mục nhỏ (Dạm ngõ, Đính hôn…) từ 25/09/2026 nằm trong
 * database (bảng `MucDichVu`, đọc qua src/lib/mucDichVu.ts) vì anh muốn tự tạo
 * thêm trên web. Danh sách dưới đây chỉ còn là **bản nạp lần đầu**: bảng trống
 * thì máy chủ chép nguyên nó vào database rồi thôi, sửa sau này không ăn thua.
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
 *   thấy thư mục luôn.
 */
export type MucGioiThieu = { id: string; key: string; ten: string; ma: string[] };
export type NhomGioiThieu = { key: string; khu: string; ten: string; muc: MucGioiThieu[] };

/** Sáu nhóm, khớp sáu thẻ lưới "Hamita chụp gì?". Không đổi ở trang quản lý. */
export const NHOM_GIOI_THIEU = [
  { key: "anh-cuoi", khu: "cuoi", ten: "Ảnh cưới" },
  { key: "album-hinh-cong", khu: "albumhc", ten: "Album & hình cổng" },
  { key: "hamita-garden", khu: "phimtruong", ten: "Hamita Garden" },
  { key: "be-gia-dinh", khu: "baby", ten: "Bé & gia đình" },
  { key: "vay-cuoi", khu: "vay", ten: "Váy cưới & trang điểm" },
  { key: "nha-su", khu: "nhasu", ten: "Tiệm ảnh nhà Su" },
] as const satisfies readonly { key: string; khu: string; ten: string }[];

export type KhuNhom = (typeof NHOM_GIOI_THIEU)[number];

/**
 * Danh sách mục lúc chưa ai tạo gì — đúng những mục đã chạy từ 17/09/2026.
 * CHỈ dùng để nạp vào database lần đầu (mucDichVu.ts), đừng đọc trực tiếp.
 */
export const MUC_MAC_DINH: readonly { nhom: string; key: string; ten: string; ma: string[] }[] = [
  { nhom: "anh-cuoi", key: "dam-ngo", ten: "Dạm ngõ", ma: ["DN"] },
  { nhom: "anh-cuoi", key: "dinh-hon", ten: "Đính hôn", ma: ["ĐH"] },
  { nhom: "anh-cuoi", key: "nha-gai", ten: "Ngày cưới – Nhà gái", ma: ["HER"] },
  { nhom: "anh-cuoi", key: "nha-trai", ten: "Ngày cưới – Nhà trai", ma: ["HIS"] },
  { nhom: "anh-cuoi", key: "phong-su", ten: "Phóng sự cưới", ma: [] },
  { nhom: "album-hinh-cong", key: "album", ten: "Album", ma: ["AB"] },
  { nhom: "album-hinh-cong", key: "hinh-cong", ten: "Hình cổng", ma: ["HC"] },
  { nhom: "hamita-garden", key: "hamita-garden", ten: "Hamita Garden", ma: [] },
  { nhom: "be-gia-dinh", key: "thoi-noi", ten: "Thôi nôi", ma: ["Baby"] },
  { nhom: "be-gia-dinh", key: "bau", ten: "Bầu", ma: ["Baby"] },
  { nhom: "be-gia-dinh", key: "so-sinh", ten: "Sơ sinh", ma: ["Baby"] },
  { nhom: "be-gia-dinh", key: "gia-dinh", ten: "Gia đình", ma: ["GD"] },
  { nhom: "vay-cuoi", key: "vay-cuoi", ten: "Váy cưới & trang điểm", ma: [] },
  { nhom: "nha-su", key: "nha-su", ten: "Tiệm ảnh nhà Su", ma: ["NS"] },
];

export function timKhu(key: string): KhuNhom | undefined {
  return NHOM_GIOI_THIEU.find((n) => n.key === key);
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

/**
 * Tên mục → đoạn đường dẫn: "Ngày cưới – Nhà gái" thành "ngay-cuoi-nha-gai".
 * Dùng lúc tạo mục mới; key sinh ra rồi thì giữ nguyên dù sau này đổi tên.
 */
export function keyTuTen(ten: string): string {
  return boDau(ten)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
