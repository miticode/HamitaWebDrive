/**
 * KHÁCH TIỀM NĂNG — danh mục và phép kiểm. Đợt 6 (13/11/2026).
 *
 * Bốn danh mục dưới đo từ 35 dòng thật bên AppSheet, giữ NGUYÊN chữ hoa thường
 * như bên đó: dữ liệu cũ đang gom theo đúng chuỗi này.
 *
 * Tệp này KHÔNG import database để client component dùng được (cùng nếp
 * `hopDongChung.ts`, `donTuChung.ts`).
 */

export const NGUON_KHACH = ["Facebook", "Zalo", "Page Hamita", "Giới thiệu"] as const;

/** Khả năng chốt, xếp từ xa tới gần. Thứ tự này dùng luôn để xếp bảng. */
export const KHA_NANG = [
  "Dò giá",
  "Tiềm năng",
  "Tư vấn lần 1",
  "Tư vấn lần 2",
  "Chờ chốt",
  "Đã chốt",
] as const;

/** Việc đang làm với khách. */
export const TINH_TRANG = ["Chưa nhận việc", "Tư vấn", "Báo giá", "Tư vấn sau", "Chốt deal"] as const;

export const LOAI_CSKH = ["Zalo", "Phone"] as const;

/** Hai mốc cuối của một khách tiềm năng — không còn phải theo đuổi nữa. */
export const DA_CHOT = "Đã chốt";

export type DuLieuTiemNang = {
  tenNguoi: string;
  soDienThoai: string;
  nguon: string;
  nhuCau: string;
  diaChi: string;
  phuTrachMaNV: string;
  khaNang: string;
  tinhTrang: string;
  ghiChu: string;
  loaiCskh: string;
  ngayLienHeLai: string;
  /** Một dòng ghi thêm vào nhật ký chăm sóc, KHÔNG phải cả nhật ký. */
  themLichSu: string;
};

export type TiemNangSach = {
  tenNguoi: string;
  soDienThoai: string | null;
  nguon: string | null;
  nhuCau: string | null;
  diaChi: string | null;
  phuTrachMaNV: string | null;
  khaNang: string;
  tinhTrang: string | null;
  ghiChu: string | null;
  loaiCskh: string | null;
  ngayLienHeLai: string | null;
  themLichSu: string | null;
};

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const gon = (s: unknown) => String(s ?? "").trim().replace(/[ \t]+/g, " ");

/** Chọn trong danh mục, hoặc để trống. Gõ chuỗi lạ thì coi như để trống. */
function trongDanhMuc(v: string, dm: readonly string[]): string | null {
  const g = gon(v);
  return g && dm.includes(g) ? g : null;
}

export function kiemTiemNang(du: DuLieuTiemNang): { loi: string } | TiemNangSach {
  const tenNguoi = gon(du.tenNguoi);
  if (!tenNguoi) return { loi: "Chưa có tên người liên hệ." };
  if (tenNguoi.length > 120) return { loi: "Tên dài quá, tối đa 120 ký tự." };

  /*
    Số điện thoại KHÔNG bắt buộc — khác hẳn KhachHang, nơi số là mã khách.
    7/35 dòng bên AppSheet chưa có số (khách nhắn qua Facebook, chưa cho số).
    Bắt buộc ở đây là tự chặn đúng những người sale cần ghi lại nhất.
  */
  const tho = gon(du.soDienThoai).replace(/[^\d+]/g, "");
  if (tho && (tho.length < 8 || tho.length > 15)) return { loi: "Số điện thoại trông không đúng." };

  const khaNang = trongDanhMuc(du.khaNang, KHA_NANG);
  if (!khaNang) return { loi: "Chưa chọn khả năng chốt." };

  const ngayLienHeLai = gon(du.ngayLienHeLai);
  if (ngayLienHeLai && !NGAY_RE.test(ngayLienHeLai)) return { loi: "Ngày hẹn liên hệ lại chưa đúng." };

  const nhuCau = gon(du.nhuCau);
  const diaChi = gon(du.diaChi);
  const ghiChu = gon(du.ghiChu);
  const themLichSu = gon(du.themLichSu);
  if (nhuCau.length > 200) return { loi: "Nhu cầu dài quá, tối đa 200 ký tự." };
  if (diaChi.length > 120) return { loi: "Địa chỉ dài quá, tối đa 120 ký tự." };
  if (ghiChu.length > 2000) return { loi: "Ghi chú dài quá, tối đa 2000 ký tự." };
  if (themLichSu.length > 1000) return { loi: "Dòng chăm sóc dài quá, tối đa 1000 ký tự." };

  return {
    tenNguoi,
    soDienThoai: tho || null,
    nguon: trongDanhMuc(du.nguon, NGUON_KHACH),
    nhuCau: nhuCau || null,
    diaChi: diaChi || null,
    phuTrachMaNV: gon(du.phuTrachMaNV) || null,
    khaNang,
    tinhTrang: trongDanhMuc(du.tinhTrang, TINH_TRANG),
    ghiChu: ghiChu || null,
    loaiCskh: trongDanhMuc(du.loaiCskh, LOAI_CSKH),
    ngayLienHeLai: ngayLienHeLai || null,
    themLichSu: themLichSu || null,
  };
}

/**
 * Nối một dòng vào nhật ký chăm sóc, mới nhất lên đầu, kèm ngày.
 *
 * Nối CHỨ KHÔNG ghi đè: đó là lịch sử, mất một dòng là mất một lần gọi điện.
 * Bên AppSheet dòng dài nhất đã 407 ký tự nên cắt ở 8.000 cho chắc — giữ được
 * vài chục lần gọi, mà không để một ô phình vô hạn.
 */
export function noiLichSu(cu: string | null, them: string | null, homNay: string): string | null {
  if (!them) return cu;
  const moi = `${homNay} — ${them}`;
  const all = cu ? `${moi}\n${cu}` : moi;
  return all.length > 8000 ? all.slice(0, 8000) : all;
}
