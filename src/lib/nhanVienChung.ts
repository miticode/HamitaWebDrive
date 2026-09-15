/**
 * Quy tắc dùng chung cho dữ liệu nhân viên — cả trang quản lý lẫn script nhập
 * dữ liệu từ AppSheet đều đi qua đây, để hai nơi không mỗi nơi chuẩn hoá một
 * kiểu rồi ghép không khớp.
 *
 * Không nhập Prisma ở đây: file này chạy được ở mọi nơi, kể cả máy khách.
 */

/**
 * Độ dài tối thiểu của mật khẩu nhân viên tự đặt.
 *
 * Nằm ở đây chứ không ở matKhau.ts: ô đổi mật khẩu chạy trên máy nhân viên cũng
 * cần con số này để nhắc, mà matKhau.ts dùng node:crypto — nhập nó vào phía
 * khách là vỡ bản dựng.
 */
export const DO_DAI_TOI_THIEU = 8;

/**
 * "+84 912 345 678", "0912.345.678", "84912345678" → "0912345678".
 * Rỗng hoặc không giống số điện thoại thì trả về chuỗi rỗng.
 */
export function chuanSoDienThoai(s: string | null | undefined): string {
  let so = String(s ?? "").replace(/\D/g, "");
  if (so.startsWith("84") && so.length === 11) so = "0" + so.slice(2);
  return /^0\d{9}$/.test(so) ? so : "";
}

/** Tên đăng nhập viết thường, bỏ khoảng trắng hai đầu. */
export function chuanTenDangNhap(s: string | null | undefined): string {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * Tên đăng nhập hợp lệ: 3–40 ký tự, chỉ chữ thường không dấu, số, dấu chấm,
 * gạch dưới, gạch ngang. Trả về câu báo lỗi hoặc null.
 *
 * "admin" để dành cho sếp đăng nhập bằng mật khẩu quản lý album — cho nhân
 * viên đặt trùng thì không biết ai đang gõ.
 */
export function kiemTenDangNhap(ten: string): string | null {
  if (ten === "admin") return "Tên “admin” để dành cho quản lý, chọn tên khác giúp em.";
  if (!/^[a-z0-9._-]{3,40}$/.test(ten)) {
    return "Tên đăng nhập 3–40 ký tự, chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch.";
  }
  return null;
}

/**
 * Ba vai trò trong phần quản lý studio, và việc từng vai trò được làm.
 *
 * Studio chốt 15/09/2026:
 * - Sửa hợp đồng: QUẢN LÝ và SALE.
 * - Duyệt phiếu thu, phiếu chi: CHỈ QUẢN LÝ.
 * - Xem lương: quản lý xem của mọi người, sale và nhân viên chỉ xem của mình.
 *
 * Bên AppSheet cũ chỉ ghi Admin/User cho từng người; vai trò Sale mặc định
 * gán cho phòng Tư Vấn, quản lý đổi lại được ở mục Nhân viên.
 */
export const VAI_TRO = ["quan-tri", "sale", "nhan-vien"] as const;
export type VaiTro = (typeof VAI_TRO)[number];

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  "quan-tri": "Quản lý",
  sale: "Sale",
  "nhan-vien": "Nhân viên",
};

export function laVaiTro(s: string): s is VaiTro {
  return (VAI_TRO as readonly string[]).includes(s);
}
