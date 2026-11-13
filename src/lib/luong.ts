import { getPrisma } from "@/lib/db";

/**
 * TÍNH LƯƠNG — thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 5).
 *
 * ── Công thức ─────────────────────────────────────────────────────────────
 * KHÔNG đoán. Đo ngược từ 341 dòng "Lương nhân viên" thật bên AppSheet:
 *
 *   Lương tháng = Lương cứng ÷ ngày công tháng × Số ngày làm việc  (lệch ≤ 10đ)
 *   Tổng lương  = Lương tháng + Lương SP + Thưởng − Phạt           341/341
 *   Thực lãnh   = Tổng lương − Tạm ứng                             341/341
 *   Còn lại     = Thực lãnh − Đã thanh toán                        341/341
 *
 * ── Từng con số lấy ở đâu ─────────────────────────────────────────────────
 * Cũng đo ngược, không đoán:
 *
 *   Số ngày làm việc ← tổng `soNgayCong` bảng ChamCong theo (maNV, tháng)  227/227
 *   Lương SP         ← tổng `thanhTien` bảng CongViec theo ngayHoanThanh   260/261
 *   Thưởng / Phạt    ← tổng bảng DanhGia theo (maNV, kỳ)                   231/231
 *
 * **Tạm ứng KHÔNG tự tính được.** Bên AppSheet 13/341 dòng có tạm ứng, mà
 * bảng "Yêu cầu" chỉ có 5 đơn xin ứng lương — hai con số không khớp, nên
 * không có đường nối nào đáng tin. Để quản lý tự điền.
 *
 * ── Quyền ─────────────────────────────────────────────────────────────────
 * Quản lý xem cả tiệm; người khác CHỈ xem của chính mình. Kiểm ở từng hàm
 * gọi, không tin việc trang đã giấu (nguyên tắc 3).
 */

/** "11/2026" — đúng dạng cột "Lương ID" bên AppSheet. */
export function maKy(nam: number, thang: number): string {
  return `${String(thang).padStart(2, "0")}/${nam}`;
}

/** "2026-11" — dạng dùng để lọc cột ngày kiểu chuỗi. */
function thangISO(nam: number, thang: number): string {
  return `${nam}-${String(thang).padStart(2, "0")}`;
}

export type DongLuongTinh = {
  maNV: string;
  phongBan: string | null;
  luongCung: number;
  soNgayLam: number;
  soGioLam: number;
  luongThang: number;
  luongSP: number;
  thuong: number;
  phat: number;
  tongLuong: number;
  tamUng: number;
  thucLanh: number;
  /** Chưa biết lương cứng của người này — con số tính ra không dùng được. */
  thieuLuongCung: boolean;
};

/**
 * Tính thử một kỳ lương từ dữ liệu đang có. KHÔNG ghi gì vào database.
 *
 * Gom theo mã nhân viên ĐÃ HẠ CHỮ THƯỜNG, cùng lý do với bảng công: bên
 * AppSheet một người có thể mang hai cách viết mã ("npk1211" và "Npk1211"),
 * gộp theo chuỗi nguyên văn là trả lương một người thành hai.
 */
export async function tinhThuKyLuong(nam: number, thang: number): Promise<DongLuongTinh[]> {
  const prisma = getPrisma();
  const ky = maKy(nam, thang);
  const thangChuoi = thangISO(nam, thang);

  const [tt, cham, viec, danhGia, nhanVien, luongCu] = await Promise.all([
    prisma.thongTinStudio.findFirst({ select: { ngayCongThang: true } }),
    prisma.chamCong.findMany({
      where: { ngay: { startsWith: thangChuoi }, matBenAppSheet: null },
      select: { maNV: true, phongBan: true, soNgayCong: true, soGio: true },
    }),
    prisma.congViec.findMany({
      where: { ngayHoanThanh: { startsWith: thangChuoi }, matBenAppSheet: null },
      select: { nguoiPhuTrachMaNV: true, thanhTien: true },
    }),
    prisma.danhGia.findMany({
      where: { kyLuong: ky, matBenAppSheet: null },
      select: { maNV: true, loai: true, soTien: true },
    }),
    prisma.nhanVien.findMany({ select: { maNV: true, luongCung: true, phongBan: true } }),
    /* Lương cứng của kỳ gần nhất — dùng khi bảng NhanVien chưa khai. */
    prisma.luongNhanVien.findMany({
      where: { matBenAppSheet: null },
      select: { maNV: true, luongCung: true, nam: true, thang: true, phongBan: true },
      orderBy: [{ nam: "desc" }, { thang: "desc" }],
    }),
  ]);

  const ngayCongThang = tt?.ngayCongThang ?? 30;

  const khoa = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

  const luongCungTheoMa = new Map<string, number>();
  const phongBanTheoMa = new Map<string, string | null>();
  /* Kỳ gần nhất đứng trước trong danh sách, nên chỉ nhận lần đầu gặp. */
  for (const l of luongCu) {
    const k = khoa(l.maNV);
    if (!k) continue;
    if (!luongCungTheoMa.has(k) && l.luongCung > 0) luongCungTheoMa.set(k, l.luongCung);
    if (!phongBanTheoMa.has(k)) phongBanTheoMa.set(k, l.phongBan);
  }
  /* Bảng NhanVien ĐÈ LÊN giá trị cũ: đó là con số quản lý chủ động khai. */
  for (const nv of nhanVien) {
    const k = khoa(nv.maNV);
    if (!k) continue;
    if (nv.luongCung != null) luongCungTheoMa.set(k, nv.luongCung);
    if (nv.phongBan) phongBanTheoMa.set(k, nv.phongBan);
  }

  type Gom = { ngay: number; gio: number; sp: number; thuong: number; phat: number; phongBan: string | null };
  const gom = new Map<string, Gom>();
  const lay = (k: string): Gom => {
    let g = gom.get(k);
    if (!g) {
      g = { ngay: 0, gio: 0, sp: 0, thuong: 0, phat: 0, phongBan: phongBanTheoMa.get(k) ?? null };
      gom.set(k, g);
    }
    return g;
  };

  for (const c of cham) {
    const k = khoa(c.maNV);
    if (!k) continue;
    const g = lay(k);
    g.ngay += c.soNgayCong ?? 0;
    g.gio += c.soGio ?? 0;
    if (!g.phongBan && c.phongBan) g.phongBan = c.phongBan;
  }
  for (const v of viec) {
    const k = khoa(v.nguoiPhuTrachMaNV);
    if (!k) continue;
    lay(k).sp += v.thanhTien ?? 0;
  }
  for (const d of danhGia) {
    const k = khoa(d.maNV);
    if (!k) continue;
    const g = lay(k);
    if (d.loai === "Phạt") g.phat += d.soTien;
    else g.thuong += d.soTien;
  }

  const ra: DongLuongTinh[] = [];
  for (const [k, g] of gom) {
    const luongCung = luongCungTheoMa.get(k) ?? 0;
    const soNgayLam = Math.round(g.ngay * 100) / 100;
    const luongThang = Math.round((luongCung / ngayCongThang) * soNgayLam);
    const tongLuong = luongThang + g.sp + g.thuong - g.phat;
    ra.push({
      maNV: k,
      phongBan: g.phongBan,
      luongCung,
      soNgayLam,
      soGioLam: Math.round(g.gio * 100) / 100,
      luongThang,
      luongSP: g.sp,
      thuong: g.thuong,
      phat: g.phat,
      tongLuong,
      /* Tạm ứng không tự tính được — xem chú thích đầu tệp. */
      tamUng: 0,
      thucLanh: tongLuong,
      thieuLuongCung: luongCung <= 0,
    });
  }

  return ra.sort((a, b) => b.tongLuong - a.tongLuong);
}

/**
 * Ghi kết quả tính vào bảng lương.
 *
 * TỪ CHỐI nếu kỳ đã chốt. Những kỳ chép từ AppSheet đều mang `daChot: true` —
 * đó là lương tiệm đã trả xong, tính lại rồi ghi đè lên con số thật là hỏng
 * sổ sách, không sửa lại được.
 *
 * Giữ nguyên `tamUng` và `daThanhToan` của dòng đã có: hai con số đó do người
 * nhập, máy không tính ra được, nên tính lại không được phép xoá chúng.
 */
export async function luuKyLuong(
  nam: number,
  thang: number,
  nguoiLapMaNV: string | null,
): Promise<{ loi: string } | { ok: true; soDong: number }> {
  const prisma = getPrisma();
  const ky = maKy(nam, thang);

  const daCo = await prisma.kyLuong.findFirst({ where: { maAppSheet: ky } });
  if (daCo?.daChot) {
    return { loi: `Kỳ ${ky} đã chốt rồi, không tính lại được. Mở lại kỳ trước nếu thật sự cần sửa.` };
  }

  const dong = await tinhThuKyLuong(nam, thang);
  if (!dong.length) return { loi: `Kỳ ${ky} chưa có dữ liệu chấm công nào để tính.` };

  const cu = await prisma.luongNhanVien.findMany({
    where: { kyLuong: ky },
    select: { id: true, maNV: true, tamUng: true, daThanhToan: true, ghiChu: true },
  });
  const cuTheoMa = new Map(cu.map((c) => [(c.maNV ?? "").toLowerCase(), c]));

  await prisma.$transaction(async (tx) => {
    for (const d of dong) {
      const giu = cuTheoMa.get(d.maNV);
      const tamUng = giu?.tamUng ?? 0;
      const daThanhToan = giu?.daThanhToan ?? 0;
      const thucLanh = d.tongLuong - tamUng;
      const data = {
        kyLuong: ky,
        nam,
        thang,
        maNV: d.maNV,
        phongBan: d.phongBan,
        luongCung: d.luongCung,
        soNgayLam: d.soNgayLam,
        soGioLam: d.soGioLam,
        luongThang: d.luongThang,
        luongSP: d.luongSP,
        thuong: d.thuong,
        phat: d.phat,
        tongLuong: d.tongLuong,
        tamUng,
        thucLanh,
        daThanhToan,
        conLai: thucLanh - daThanhToan,
      };
      if (giu) await tx.luongNhanVien.update({ where: { id: giu.id }, data });
      else await tx.luongNhanVien.create({ data: { ...data, maAppSheet: null } });
    }

    const tong = (f: (d: DongLuongTinh) => number) => dong.reduce((s, d) => s + f(d), 0);
    const kyData = {
      nam,
      thang,
      soNV: dong.length,
      luongCung: tong((d) => d.luongThang),
      luongSP: tong((d) => d.luongSP),
      thuong: tong((d) => d.thuong),
      phat: tong((d) => d.phat),
      tamUng: 0,
      tongLuong: tong((d) => d.tongLuong),
      nguoiLapMaNV,
    };
    if (daCo) await tx.kyLuong.update({ where: { id: daCo.id }, data: kyData });
    else await tx.kyLuong.create({ data: { ...kyData, maAppSheet: ky, daChot: false } });
  });

  return { ok: true, soDong: dong.length };
}

/** Chốt kỳ — từ đó không tính lại được nữa. */
export async function chotKyLuong(nam: number, thang: number): Promise<{ loi: string } | { ok: true }> {
  const ky = maKy(nam, thang);
  const prisma = getPrisma();
  const k = await prisma.kyLuong.findFirst({ where: { maAppSheet: ky } });
  if (!k) return { loi: `Chưa tính kỳ ${ky} nên chưa chốt được.` };
  if (k.daChot) return { loi: `Kỳ ${ky} đã chốt rồi.` };
  await prisma.kyLuong.update({ where: { id: k.id }, data: { daChot: true } });
  return { ok: true };
}

/** Mở lại một kỳ đã chốt — việc hiếm, nên để riêng một hàm cho dễ lần ra. */
export async function moLaiKyLuong(nam: number, thang: number): Promise<{ loi: string } | { ok: true }> {
  const ky = maKy(nam, thang);
  const prisma = getPrisma();
  const k = await prisma.kyLuong.findFirst({ where: { maAppSheet: ky } });
  if (!k?.daChot) return { loi: `Kỳ ${ky} đang mở sẵn.` };
  await prisma.kyLuong.update({ where: { id: k.id }, data: { daChot: false } });
  return { ok: true };
}

/** Sửa hai con số máy không tính được: tạm ứng và đã thanh toán. */
export async function suaTienTay(
  id: string,
  tamUng: number,
  daThanhToan: number,
): Promise<{ loi: string } | { ok: true }> {
  if (!Number.isFinite(tamUng) || tamUng < 0 || tamUng > 999_999_999) return { loi: "Tạm ứng chưa đúng." };
  if (!Number.isFinite(daThanhToan) || daThanhToan < 0 || daThanhToan > 999_999_999) {
    return { loi: "Số đã thanh toán chưa đúng." };
  }

  const prisma = getPrisma();
  const d = await prisma.luongNhanVien.findUnique({
    where: { id },
    select: { tongLuong: true, kyLuong: true },
  });
  if (!d) return { loi: "Dòng lương này không còn." };

  const k = await prisma.kyLuong.findFirst({ where: { maAppSheet: d.kyLuong ?? "" }, select: { daChot: true } });
  if (k?.daChot) return { loi: "Kỳ này đã chốt, phải mở lại kỳ mới sửa được." };

  const thucLanh = d.tongLuong - Math.round(tamUng);
  await prisma.luongNhanVien.update({
    where: { id },
    data: {
      tamUng: Math.round(tamUng),
      thucLanh,
      daThanhToan: Math.round(daThanhToan),
      conLai: thucLanh - Math.round(daThanhToan),
    },
  });
  return { ok: true };
}
