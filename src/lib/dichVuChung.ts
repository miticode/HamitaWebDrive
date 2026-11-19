
import { docTien } from "@/lib/studioNoiBo";

/**
 * Quy tắc dùng chung cho bảng dịch vụ & trang phục — trang quản lý, server
 * action và script nhập AppSheet đều đi qua đây, để ba nơi không mỗi nơi kiểm
 * một kiểu.
 *
 * Không nhập Prisma: tệp này chạy được cả ở máy khách.
 */

export const LOAI_DICH_VU = ["dich-vu", "trang-phuc", "san-pham"] as const;
export type LoaiDichVu = (typeof LOAI_DICH_VU)[number];

export const TEN_LOAI: Record<LoaiDichVu, string> = {
  "dich-vu": "Dịch vụ",
  "trang-phuc": "Trang phục",
  "san-pham": "Sản phẩm",
};

export function laLoaiDichVu(s: string): s is LoaiDichVu {
  return (LOAI_DICH_VU as readonly string[]).includes(s);
}

/** Bỏ dấu, viết thường — để tìm "vay cuoi" ra "Váy cưới". */
export function boDau(s: string): string {
  return s.replace(/[đĐ]/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Chữ ở cột "Loại" bên AppSheet ("Trang phục") → mã loại. Chữ lạ thì null. */
export function loaiTuAppSheet(s: string | null): LoaiDichVu | null {
  const k = boDau(s ?? "");
  return LOAI_DICH_VU.find((l) => boDau(TEN_LOAI[l]) === k) ?? null;
}

/**
 * Những loại người này được thêm, sửa. Rỗng = chỉ xem.
 *
 * - Quản lý, Sale: mọi loại. Sale là người báo giá; giá sai là hợp đồng sai.
 * - Nhân viên phòng Váy: chỉ trang phục. Bên AppSheet, phòng Váy tự nhập trang
 *   phục (đo 15/09: 286/1.018 dòng do người phòng Váy tạo, phần lớn còn lại do
 *   phòng Tư Vấn). Không cho họ sửa bảng giá dịch vụ.
 *
 * Người dùng khác chỉ xem được — bảng giá là thứ cả tiệm cần tra.
 */
export function loaiDuocSua(nguoi: { vaiTro: string; phongBan: string | null }): LoaiDichVu[] {
  if (nguoi.vaiTro === "quan-tri" || nguoi.vaiTro === "sale") return [...LOAI_DICH_VU];
  if (boDau(nguoi.phongBan ?? "") === "phong vay") return ["trang-phuc"];
  return [];
}

export function duocSuaDichVu(nguoi: { vaiTro: string; phongBan: string | null }, loai: string): boolean {
  return (loaiDuocSua(nguoi) as string[]).includes(loai);
}

/** Dữ liệu ô nhập, đúng như người dùng gõ. */
export type DuLieuDichVu = {
  maDV: string;
  loai: LoaiDichVu;
  ten: string;
  nhom: string;
  chiTiet: string;
  donGia: string;
  donVi: string;
  dangDung: boolean;
};

export type DichVuSach = {
  maDV: string;
  loai: LoaiDichVu;
  ten: string;
  nhom: string | null;
  chiTiet: string | null;
  donGia: number;
  donVi: string | null;
  dangDung: boolean;
};

/** Kiểm và chuẩn hoá ô nhập. Trả về câu báo lỗi, hoặc dữ liệu sạch để ghi. */
export function kiemDichVu(du: DuLieuDichVu): { loi: string } | DichVuSach {
  const gon = (s: unknown) => String(s ?? "").trim().replace(/[ \t]+/g, " ");

  const maDV = gon(du.maDV);
  if (!maDV) return { loi: "Thiếu mã." };
  if (maDV.length > 40) return { loi: "Mã dài quá, tối đa 40 ký tự." };
  if (!laLoaiDichVu(String(du.loai))) return { loi: "Loại không đúng." };

  const ten = gon(du.ten);
  if (!ten) return { loi: "Thiếu tên." };
  if (ten.length > 200) return { loi: "Tên dài quá, viết gọn lại giúp em." };

  const nhom = gon(du.nhom);
  if (nhom.length > 60) return { loi: "Tên nhóm dài quá." };

  const donVi = gon(du.donVi);
  if (donVi.length > 30) return { loi: "Đơn vị dài quá." };

  // Chi tiết giữ nguyên xuống dòng: bên AppSheet mỗi dòng là một món trong gói.
  const chiTiet = String(du.chiTiet ?? "").trim();
  if (chiTiet.length > 4000) return { loi: "Phần chi tiết dài quá, tối đa 4.000 ký tự." };

  const donGia = gon(du.donGia) === "" ? 0 : docTien(gon(du.donGia));
  if (donGia === null) return { loi: "Đơn giá là số tiền, ví dụ 3500000 hoặc 3.500.000." };

  return {
    maDV,
    loai: du.loai,
    ten,
    nhom: nhom || null,
    chiTiet: chiTiet || null,
    donGia,
    donVi: donVi || null,
    dangDung: du.dangDung !== false,
  };
}

/**
 * Làm phẳng danh sách buổi chụp mặc định của dịch vụ: từ hình dạng Prisma
 * (`buoi: [{ loaiBuoi: { ten } }]`) thành mảng tên.
 *
 * Để ở đây vì BA nơi cùng đọc dịch vụ cho form hợp đồng — trang lập, trang
 * sửa, và server action của cửa sổ lập. Viết ba lần là ba lần có thể quên một
 * chỗ, đúng kiểu lỗi đã xảy ra hôm 18/11 với danh sách loại buổi.
 */
export function phangBuoi<T extends { buoi?: { loaiBuoi: { ten: string } }[] }>(
  ds: T[],
): (Omit<T, "buoi"> & { buoi: string[] })[] {
  return ds.map(({ buoi, ...con }) => ({
    ...(con as Omit<T, "buoi">),
    buoi: (buoi ?? []).map((b) => b.loaiBuoi.ten),
  }));
}
