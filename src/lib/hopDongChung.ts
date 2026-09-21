/**
 * Quy tắc dùng chung cho hợp đồng — trang quản lý lẫn bộ đồng bộ AppSheet.
 *
 * Không nhập Prisma: tệp này chạy được cả ở máy khách.
 */

/**
 * "12. Đã xong tiệc" → { buoc: 12, ten: "Đã xong tiệc" }.
 * Chịu được cả kiểu gõ thiếu cách bên AppSheet ("11.Đã giao váy tiệc").
 */
export function tachTrangThai(s: string | null | undefined): { buoc: number | null; ten: string } {
  const t = String(s ?? "").trim();
  const m = t.match(/^(\d{1,2})\s*\.\s*(.*)$/);
  return m ? { buoc: Number(m[1]), ten: m[2].trim() } : { buoc: null, ten: t };
}

/**
 * Bước cuối của hai nhánh trong bảng "Trạng thái" bên AppSheet: 9 là xong
 * nhánh chụp ở studio, 18 là xong nhánh tiệc.
 */
export const BUOC_XONG = [9, 18];

/**
 * Bước đang chờ KHÁCH làm gì đó — chọn ảnh gốc (4, 13) hay duyệt ảnh chỉnh (6,
 * 15). Tô màu riêng: đây là những hợp đồng sale cần nhắc khách.
 */
export const BUOC_CHO_KHACH = [4, 6, 13, 15];

/** "2026-09-15" → "15/09/2026". */
export function ngayVN(s: string | null | undefined): string {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : s;
}

/* ── Lập hợp đồng trên web (anh chốt 21/09/2026) ───────────────────────── */

/**
 * Chín kiểu hợp đồng bên AppSheet, xếp theo số lần dùng (đo 21/09/2026 trên
 * 2.240 hợp đồng). Giữ NGUYÊN chữ hoa thường như bên kia: dữ liệu cũ đang gom
 * theo đúng chuỗi này, gõ "Cưới" thay vì "CƯỚI" là lòi ra một nhóm thứ mười.
 */
export const LOAI_DV_HD = [
  "Khách lẻ",
  "CƯỚI",
  "HỎI",
  "Baby",
  "NHÀ SU",
  "kỉ yếu",
  "PreWedding",
  "Mâm quả",
  "GIA ĐÌNH",
] as const;

/**
 * Mười tám bước của hợp đồng, đúng chữ bên AppSheet (đo 21/09/2026). Hai
 * nhánh: 1–9 là nhánh chụp ở studio, 10–18 là nhánh tiệc.
 *
 * Bước 11 bên AppSheet gõ thiếu dấu cách ("11.Đã giao váy tiệc") — chép y
 * nguyên, vì 11 hợp đồng đang mang đúng chuỗi đó; sửa cho đẹp ở đây là tự tay
 * tách chúng thành hai nhóm khác nhau.
 */
export const CAC_BUOC = [
  "1. Chưa có ngày chụp",
  "2. Đã có ngày chụp",
  "3. Đã chụp",
  "4. Đã gửi ảnh gốc, chờ Khách chọn",
  "5. Đang Retouch",
  "6. Chờ Khách duyệt",
  "7. Gửi in",
  "8. Đã nhận hình in",
  "9. Hoàn thành",
  "10. Chờ ngày tiệc",
  "11.Đã giao váy tiệc",
  "12. Đã xong tiệc",
  "13. Đã gửi ảnh gốc tiệc, chờ Khách chọn",
  "14. Đang chỉnh sửa hình , clip tiệc",
  "15. Chờ Khách duyệt",
  "16. Gửi in tiệc",
  "17. Đã nhận hình in tiệc",
  "18. Hoàn thành ngày tiệc",
] as const;

/** Ba bước hợp đồng mới lập thường đứng — xem thống kê trong BAN-GIAO.md. */
export const BUOC_MOI_LAP = [
  "1. Chưa có ngày chụp",
  "2. Đã có ngày chụp",
  "10. Chờ ngày tiệc",
] as const;

/** Loại lịch chụp đang dùng, xếp theo số lần (đo 21/09/2026 trên 1.331 dòng). */
export const LOAI_LICH = [
  "Ngày chụp",
  "nhà gái",
  "nhà trai",
  "Nhà Su",
  "Hami Baby",
  "Đính Hôn",
  "chụp bé",
  "Ngày cưới",
  "Ngày lễ gia tiên",
  "chup dạm ngõ",
  "chụp thôi nôi",
  "makeup",
] as const;

export const HINH_THUC_THU = ["Tiền mặt", "Chuyển khoản"] as const;

/** Nội dung phiếu thu hay gõ nhất bên AppSheet (gộp các cách viết hoa thường). */
export const NOI_DUNG_THU = ["Cọc", "Cọc lần 1", "Cọc lần 2", "Thanh toán đủ", "Đủ"] as const;

/**
 * Trạng thái phiếu thu theo hình thức. Bên AppSheet phiếu do nhân viên tạo
 * mang "Chờ duyệt" cho tới khi quản lý duyệt — web giữ đúng nếp đó: chỉ quản
 * lý mới ghi thẳng thành đã thu.
 */
export function trangThaiThu(hinhThuc: string, laQuanLy: boolean): string {
  if (!laQuanLy) return "Chờ duyệt";
  return hinhThuc === "Tiền mặt" ? "Đã thu tiền mặt" : "Đã thu chuyển khoản";
}

export type DongDichVuMoi = {
  /** Mục trong bảng Dịch vụ. null = gõ tay một dòng không có trong bảng. */
  dichVuId: string | null;
  maDV: string;
  tenDV: string;
  /** "dich-vu" | "trang-phuc" | "san-pham" — để trống được. */
  loai: string;
  donGia: number;
  soLuong: number;
  /** "" hoặc "YYYY-MM-DD". */
  ngayChup: string;
  chiTiet: string;
  ghiChu: string;
};

export type DongThuMoi = {
  soTien: number;
  hinhThuc: string;
  noiDung: string;
  ngayThu: string;
  ghiChu: string;
};

export type DongLichMoi = {
  ngay: string;
  loai: string;
  ghiChu: string;
  /** Dòng chữ vẽ lên lịch; để trống thì máy chủ tự ghép từ tên khách và ngày. */
  hienThi: string;
};

export type DongViecMoi = {
  /** Dòng dịch vụ thứ mấy trong `dong` sinh ra đầu việc này. */
  dong: number;
  loai: string;
  donGia: number;
  soLuong: number;
  thoiHan: string;
};

export type KhachMoi = { ten: string; soDienThoai: string; tinh: string; ghiChu: string };

export type DuLieuHopDongMoi = {
  /** Khách đã có trong bảng. null = khách mới, lúc đó phải có `khachMoi`. */
  khachHangId: string | null;
  khachMoi: KhachMoi | null;
  tenKhach: string;
  loaiDV: string;
  ngayDat: string;
  diaChi: string;
  ghiChu: string;
  khuyenMai: number;
  trangThai: string;
  dong: DongDichVuMoi[];
  thu: DongThuMoi[];
  lich: DongLichMoi[];
  viec: DongViecMoi[];
};

export type HopDongSach = {
  khachHangId: string | null;
  khachMoi: KhachMoi | null;
  tenKhach: string;
  loaiDV: string;
  ngayDat: string;
  diaChi: string | null;
  ghiChu: string | null;
  trangThai: string;
  buoc: number | null;
  thanhTien: number;
  khuyenMai: number;
  tongTien: number;
  daThu: number;
  conLai: number;
  danhSachDV: string;
  dong: (DongDichVuMoi & { thanhTien: number })[];
  thu: DongThuMoi[];
  lich: DongLichMoi[];
  viec: (DongViecMoi & { thanhTien: number })[];
};

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const gon = (s: unknown) => String(s ?? "").trim().replace(/[ \t]+/g, " ");
const soNguyen = (n: unknown, max: number) => {
  const x = Math.round(Number(n));
  return Number.isFinite(x) && x >= 0 && x <= max ? x : null;
};

/**
 * Kiểm và chuẩn hoá cả một hợp đồng sắp lập — form và server action đi chung
 * hàm này, để hai nơi không mỗi nơi kiểm một kiểu (cùng nếp với `kiemDichVu`).
 *
 * TIỀN TÍNH Ở ĐÂY, không nhận con số form gửi lên: thành tiền = cộng các dòng,
 * tổng tiền = thành tiền − khuyến mãi, đã thu = cộng MỌI phiếu thu kể cả phiếu
 * chờ duyệt (đúng cách AppSheet tính — kiểm 300 hợp đồng mới nhất không lệch
 * dòng nào), còn lại = tổng − đã thu. Form hiện số nào thì hiện, con số ghi vào
 * database vẫn là con số máy chủ tự cộng.
 */
export function kiemHopDongMoi(du: DuLieuHopDongMoi): { loi: string } | HopDongSach {
  const tenKhach = gon(du.tenKhach);
  if (!tenKhach) return { loi: "Thiếu tên khách ghi trên hợp đồng." };
  if (tenKhach.length > 120) return { loi: "Tên khách dài quá, tối đa 120 ký tự." };

  let khachMoi: KhachMoi | null = null;
  if (!du.khachHangId) {
    const ten = gon(du.khachMoi?.ten) || tenKhach;
    const soDienThoai = gon(du.khachMoi?.soDienThoai).replace(/[^\d+]/g, "");
    if (!soDienThoai) return { loi: "Khách mới phải có số điện thoại — mã khách chính là số này." };
    if (soDienThoai.length < 8 || soDienThoai.length > 15) return { loi: "Số điện thoại trông không đúng." };
    khachMoi = { ten, soDienThoai, tinh: gon(du.khachMoi?.tinh), ghiChu: gon(du.khachMoi?.ghiChu) };
  }

  const loaiDV = gon(du.loaiDV);
  if (!loaiDV) return { loi: "Chưa chọn loại hợp đồng." };

  const ngayDat = gon(du.ngayDat);
  if (!NGAY_RE.test(ngayDat)) return { loi: "Ngày đặt chưa đúng." };

  const trangThai = gon(du.trangThai);
  if (!(CAC_BUOC as readonly string[]).includes(trangThai)) return { loi: "Trạng thái không có trong bảng." };

  const khuyenMai = soNguyen(du.khuyenMai, 999_999_999);
  if (khuyenMai === null) return { loi: "Khuyến mãi chưa đúng." };

  if (!Array.isArray(du.dong) || du.dong.length === 0) return { loi: "Hợp đồng chưa có dòng dịch vụ nào." };
  if (du.dong.length > 60) return { loi: "Nhiều dòng quá, tối đa 60 dòng một hợp đồng." };

  const dong: (DongDichVuMoi & { thanhTien: number })[] = [];
  for (const [i, d] of du.dong.entries()) {
    const tenDV = gon(d.tenDV);
    if (!tenDV) return { loi: `Dòng ${i + 1} chưa có tên dịch vụ.` };
    const donGia = soNguyen(d.donGia, 999_999_999);
    if (donGia === null) return { loi: `Đơn giá dòng ${i + 1} chưa đúng.` };
    const soLuong = Number(d.soLuong);
    if (!Number.isFinite(soLuong) || soLuong <= 0 || soLuong > 1000) {
      return { loi: `Số lượng dòng ${i + 1} chưa đúng.` };
    }
    const ngayChup = gon(d.ngayChup);
    if (ngayChup && !NGAY_RE.test(ngayChup)) return { loi: `Ngày chụp dòng ${i + 1} chưa đúng.` };
    dong.push({
      dichVuId: d.dichVuId || null,
      maDV: gon(d.maDV),
      tenDV,
      loai: gon(d.loai),
      donGia,
      soLuong,
      ngayChup,
      chiTiet: gon(d.chiTiet),
      ghiChu: gon(d.ghiChu),
      // Số lượng có thể lẻ (nửa ngày công bên AppSheet) nên làm tròn về đồng.
      thanhTien: Math.round(donGia * soLuong),
    });
  }

  const thu: DongThuMoi[] = [];
  for (const [i, t] of (du.thu ?? []).entries()) {
    const soTien = soNguyen(t.soTien, 999_999_999);
    if (soTien === null) return { loi: `Số tiền phiếu thu ${i + 1} chưa đúng.` };
    // Ô cọc để trống thì bỏ qua, không tạo phiếu 0đ.
    if (soTien === 0) continue;
    const hinhThuc = gon(t.hinhThuc) || "Tiền mặt";
    if (!(HINH_THUC_THU as readonly string[]).includes(hinhThuc)) return { loi: "Hình thức thu chưa đúng." };
    const ngayThu = gon(t.ngayThu);
    if (ngayThu && !NGAY_RE.test(ngayThu)) return { loi: `Ngày thu phiếu ${i + 1} chưa đúng.` };
    thu.push({
      soTien,
      hinhThuc,
      noiDung: gon(t.noiDung) || "Cọc",
      ngayThu: ngayThu || ngayDat,
      ghiChu: gon(t.ghiChu),
    });
  }

  const lich: DongLichMoi[] = [];
  for (const [i, l] of (du.lich ?? []).entries()) {
    const ngay = gon(l.ngay);
    // Dòng lịch bỏ trống ngày thì coi như không thêm.
    if (!ngay) continue;
    if (!NGAY_RE.test(ngay)) return { loi: `Ngày của dòng lịch ${i + 1} chưa đúng.` };
    lich.push({ ngay, loai: gon(l.loai) || "Ngày chụp", ghiChu: gon(l.ghiChu), hienThi: gon(l.hienThi) });
  }

  const viec: (DongViecMoi & { thanhTien: number })[] = [];
  for (const [i, v] of (du.viec ?? []).entries()) {
    const loai = gon(v.loai);
    if (!loai) continue;
    const chiSo = Math.round(Number(v.dong));
    if (!Number.isInteger(chiSo) || chiSo < 0 || chiSo >= dong.length) {
      return { loi: `Đầu việc ${i + 1} không thuộc dòng dịch vụ nào.` };
    }
    const donGia = soNguyen(v.donGia, 999_999_999);
    if (donGia === null) return { loi: `Đơn giá đầu việc ${i + 1} chưa đúng.` };
    const soLuong = Number(v.soLuong);
    if (!Number.isFinite(soLuong) || soLuong <= 0 || soLuong > 1000) {
      return { loi: `Số lượng đầu việc ${i + 1} chưa đúng.` };
    }
    const thoiHan = gon(v.thoiHan);
    if (thoiHan && !NGAY_RE.test(thoiHan)) return { loi: `Thời hạn đầu việc ${i + 1} chưa đúng.` };
    viec.push({ dong: chiSo, loai, donGia, soLuong, thoiHan, thanhTien: Math.round(donGia * soLuong) });
  }

  const thanhTien = dong.reduce((s, d) => s + d.thanhTien, 0);
  if (khuyenMai > thanhTien) return { loi: "Khuyến mãi lớn hơn tiền hàng." };
  const tongTien = thanhTien - khuyenMai;
  const daThu = thu.reduce((s, t) => s + t.soTien, 0);

  return {
    khachHangId: du.khachHangId || null,
    khachMoi,
    tenKhach,
    loaiDV,
    ngayDat,
    diaChi: gon(du.diaChi) || null,
    ghiChu: gon(du.ghiChu) || null,
    trangThai,
    buoc: tachTrangThai(trangThai).buoc,
    thanhTien,
    khuyenMai,
    tongTien,
    daThu,
    conLai: tongTien - daThu,
    // Đúng kiểu cột "Danh sách DV" bên AppSheet: tên các dòng nối bằng " , ".
    danhSachDV: dong.map((d) => d.tenDV).join(" , "),
    dong,
    thu,
    lich,
    viec,
  };
}
