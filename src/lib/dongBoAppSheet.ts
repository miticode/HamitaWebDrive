import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/db";
import { chu, docAppSheet, giaTri } from "@/lib/appsheet";
import { chuanSoDienThoai } from "@/lib/nhanVienChung";
import { loaiTuAppSheet } from "@/lib/dichVuChung";
import { tachTrangThai } from "@/lib/hopDongChung";
import { ghiMoc } from "@/lib/moc";
import { ghiNhatKy } from "@/lib/nhatKy";

/**
 * Chép khách hàng, hợp đồng, chi tiết hợp đồng, phiếu thu từ AppSheet sang web.
 *
 * GIAI ĐOẠN SONG SONG (studio chốt 15/09/2026): nhân viên vẫn làm hợp đồng bên
 * AppSheet; web chỉ là bản chép để xem, tìm, xem công nợ. Chạy mỗi đêm 2 giờ
 * 30 (vercel.json → /api/cron/dong-bo), quản lý bấm "Đồng bộ ngay" cũng được.
 * Ngày chuyển hẳn sang web thì TẮT lịch chạy này — không thì đêm đó bản
 * AppSheet cũ đè lên những gì vừa sửa trên web.
 *
 * Cách chép: mỗi dòng tính một dấu vân tay (SHA-1 của dữ liệu đã chuẩn hoá).
 * Dòng mới thì thêm, dòng đổi vân tay thì ghi lại, không đổi thì bỏ qua — đêm
 * bình thường chỉ vài chục dòng đổi, không ghi lại cả 15.000 dòng.
 *
 * Dòng biến mất bên AppSheet KHÔNG bị xoá, chỉ đánh dấu `matBenAppSheet`. Lỡ
 * ai xoá nhầm bên đó thì web vẫn còn; xoá thật là việc của người, không phải
 * của một máy chạy lúc 2 giờ sáng. Chỉ dòng CHÉP TỪ AppSheet (có bamAppSheet)
 * mới bị đánh dấu — dòng tạo trên web sau này không bao giờ bị đụng.
 *
 * Mã dịch vụ mới bên AppSheet thì THÊM vào bảng Dịch vụ, không sửa mục đã có
 * (bảng đó sửa được trên web).
 */

export type SoDongBo = { them: number; sua: number; mat: number; boQua: number };
export type KetQuaDongBo = {
  dichVuThem: number;
  bang: { khachHang: SoDongBo; hopDong: SoDongBo; chiTiet: SoDongBo; phieuThu: SoDongBo };
  giay: number;
};

/* ── Chuyển ô AppSheet ─────────────────────────────────────────────────── */

/** Khoá: bỏ khoảng trắng thừa, để hai bảng ghi lệch một dấu cách vẫn ghép được. */
const ma = (v: unknown): string | null => chu(v)?.replace(/\s+/g, " ") ?? null;

/** Ngày không giờ → "YYYY-MM-DD". Ô ngày bên AppSheet đọc ra theo giờ UTC là đúng ngày đã gõ. */
function ngay(v: unknown): string | null {
  const g = giaTri(v);
  if (!(g instanceof Date) || isNaN(g.getTime())) return null;
  return `${g.getUTCFullYear()}-${String(g.getUTCMonth() + 1).padStart(2, "0")}-${String(g.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Thời điểm. Giờ bên AppSheet là giờ Việt Nam nhưng đọc ra như giờ UTC (xem
 * scripts/nhap-thong-tin-noi-quy.mts) — lùi 7 tiếng mới ra đúng lúc thật.
 */
function luc(v: unknown): Date | undefined {
  const g = giaTri(v);
  return g instanceof Date && !isNaN(g.getTime()) ? new Date(g.getTime() - 7 * 3600e3) : undefined;
}

function tien(v: unknown): number {
  const n = Number(giaTri(v));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function soThuc(v: unknown): number {
  const n = Number(giaTri(v));
  return Number.isFinite(n) ? n : 0;
}

const bam = (o: unknown) => createHash("sha1").update(JSON.stringify(o)).digest("hex");

/* ── Chép một bảng ─────────────────────────────────────────────────────── */

type Nguon<T> = { ma: string; data: T };
type DongCu = { id: string; ma: string | null; bamAppSheet: string | null; matBenAppSheet: Date | null };
/** Ba thao tác Prisma dùng tới — mỗi bảng một kiểu nên nhận lỏng ở đây. */
type UyQuyen = {
  createMany(a: unknown): Promise<unknown>;
  update(a: unknown): Promise<unknown>;
  updateMany(a: unknown): Promise<unknown>;
};

async function chepBang<T extends object>(
  uy: UyQuyen,
  khoa: "maAppSheet" | "maHD",
  nguon: Nguon<T>[],
  cu: DongCu[],
  bay: Date,
  boQua = 0,
): Promise<SoDongBo> {
  const cuTheoMa = new Map<string, DongCu>();
  for (const c of cu) if (c.ma) cuTheoMa.set(c.ma, c);

  const daThay = new Set<string>();
  const them: { ma: string; data: T; bam: string }[] = [];
  const sua: { id: string; data: T; bam: string }[] = [];
  for (const n of nguon) {
    if (daThay.has(n.ma)) {
      boQua++;
      continue;
    }
    daThay.add(n.ma);
    const b = bam(n.data);
    const c = cuTheoMa.get(n.ma);
    if (!c) them.push({ ma: n.ma, data: n.data, bam: b });
    else if (c.bamAppSheet !== b || c.matBenAppSheet) sua.push({ id: c.id, data: n.data, bam: b });
  }
  const mat = cu.filter((c) => c.ma && c.bamAppSheet && !c.matBenAppSheet && !daThay.has(c.ma)).map((c) => c.id);

  for (let i = 0; i < them.length; i += 1000) {
    await uy.createMany({
      data: them.slice(i, i + 1000).map((x) => ({ ...x.data, [khoa]: x.ma, bamAppSheet: x.bam })),
      // Hai lượt chạy chồng nhau (lịch đêm + nút bấm) thì lượt sau tự bỏ dòng đã có.
      skipDuplicates: true,
    });
  }
  for (let i = 0; i < sua.length; i += 10) {
    await Promise.all(
      sua.slice(i, i + 10).map((x) =>
        uy.update({ where: { id: x.id }, data: { ...x.data, bamAppSheet: x.bam, matBenAppSheet: null } }),
      ),
    );
  }
  for (let i = 0; i < mat.length; i += 1000) {
    await uy.updateMany({ where: { id: { in: mat.slice(i, i + 1000) } }, data: { matBenAppSheet: bay } });
  }
  return { them: them.length, sua: sua.length, mat: mat.length, boQua };
}

/* ── Chạy ──────────────────────────────────────────────────────────────── */

export async function dongBoAppSheet(nguoiTen = "Đồng bộ tự động"): Promise<KetQuaDongBo> {
  const batDau = Date.now();
  const bang = await docAppSheet();
  const prisma = getPrisma();
  const bay = new Date();

  /* 0. Mã dịch vụ mới — chỉ thêm. */
  const dvCo = new Set((await prisma.dichVu.findMany({ select: { maDV: true } })).map((d) => d.maDV));
  const dvMoi = [];
  for (const d of bang("Dịch vụ")) {
    const maDV = ma(d["Mã DV"]);
    const loai = loaiTuAppSheet(chu(d["Loại"]));
    if (!maDV || !loai || dvCo.has(maDV)) continue;
    dvCo.add(maDV);
    dvMoi.push({
      maDV,
      loai,
      ten: chu(d["Tên DV"]) ?? maDV,
      nhom: chu(d["Loại DV"]),
      chiTiet: chu(d["Chi tiết"]),
      donGia: Math.max(0, tien(d["Đơn giá"])),
      donVi: chu(d["Đơn vị"]),
      hinhAppSheet: chu(d["Hình ảnh"]),
    });
  }
  if (dvMoi.length) await prisma.dichVu.createMany({ data: dvMoi, skipDuplicates: true });
  const dvTheoMa = new Map((await prisma.dichVu.findMany({ select: { id: true, maDV: true } })).map((d) => [d.maDV, d.id]));

  /* 1. Khách hàng. */
  const nguonKH = bang("Khách hàng").flatMap((d) => {
    const m = ma(d["Mã KH"]);
    if (!m) return [];
    const sdt = chu(d["Số điện thoại"]);
    return [{
      ma: m,
      data: {
        ten: chu(d["Tên Khách hàng"]) ?? m,
        soDienThoai: chuanSoDienThoai(sdt) || sdt,
        tinh: chu(d["Tỉnh"]),
        ghiChu: chu(d["Ghi chú"]),
        nguoiTaoMaNV: chu(d["Người tạo"]),
        taoLuc: luc(d["Ngày tạo"]),
      },
    }];
  });
  const kh = await chepBang(
    prisma.khachHang as unknown as UyQuyen,
    "maAppSheet",
    nguonKH,
    (await prisma.khachHang.findMany({ select: { id: true, maAppSheet: true, bamAppSheet: true, matBenAppSheet: true } }))
      .map((c) => ({ ...c, ma: c.maAppSheet })),
    bay,
  );
  const khTheoMa = new Map(
    (await prisma.khachHang.findMany({ where: { maAppSheet: { not: null } }, select: { id: true, maAppSheet: true } }))
      .map((k) => [k.maAppSheet!, k.id]),
  );

  /* 2. Hợp đồng. */
  const nguonHD = bang("Hợp đồng").flatMap((d) => {
    const m = ma(d["Mã HĐ"]);
    if (!m) return [];
    const tt = chu(d["Trạng thái"]);
    return [{
      ma: m,
      data: {
        khachHangId: khTheoMa.get(ma(d["Khách hàng"]) ?? "") ?? null,
        tenKhach: chu(d["Tên khách hàng"]) ?? "",
        loaiDV: chu(d["Loại DV"]),
        danhSachDV: chu(d["Danh sách DV"]),
        ngayDat: ngay(d["Ngày đặt HĐ"]),
        thanhTien: tien(d["Thành tiền"]),
        khuyenMai: tien(d["Khuyến mãi DV"]),
        tongTien: tien(d["Tổng tiền"]),
        daThu: tien(d["Thanh toán"]),
        conLai: tien(d["Còn lại"]),
        trangThai: tt,
        buoc: tachTrangThai(tt).buoc,
        ngayHoanThanh: ngay(d["Ngày HT"]),
        diaChi: chu(d["Địa Chỉ"]),
        ghiChu: chu(d["Ghi chú"]),
        nguoiLapMaNV: chu(d["Người lập"]),
        taoLuc: luc(d["Thời gian tạo"]),
      },
    }];
  });
  const hd = await chepBang(
    prisma.hopDong as unknown as UyQuyen,
    "maHD",
    nguonHD,
    (await prisma.hopDong.findMany({ select: { id: true, maHD: true, bamAppSheet: true, matBenAppSheet: true } }))
      .map((c) => ({ ...c, ma: c.maHD })),
    bay,
  );
  const hdTheoMa = new Map((await prisma.hopDong.findMany({ select: { id: true, maHD: true } })).map((h) => [h.maHD, h.id]));

  /* 3. Chi tiết hợp đồng — dòng không ghép được hợp đồng thì bỏ (bên AppSheet có 2 dòng trống mã HĐ). */
  let ctBoQua = 0;
  const nguonCT = bang("Hợp đồng CT").flatMap((d) => {
    const m = ma(d["Mã chi tiết HĐ"]);
    const hopDongId = hdTheoMa.get(ma(d["Mã HĐ"]) ?? "");
    if (!m) return [];
    if (!hopDongId) {
      ctBoQua++;
      return [];
    }
    const maDV = ma(d["Mã DV"]);
    return [{
      ma: m,
      data: {
        hopDongId,
        loai: loaiTuAppSheet(chu(d["Loại"])),
        ngayChup: ngay(d["Ngày chụp"]),
        maDV,
        dichVuId: (maDV && dvTheoMa.get(maDV)) || null,
        tenDV: chu(d["Tên dịch vụ"]),
        chiTiet: chu(d["Chi tiết"]),
        donGia: tien(d["Đơn giá"]),
        soLuong: soThuc(d["Số lượng"]),
        thanhTien: tien(d["Thành tiền"]),
        ghiChu: chu(d["Ghi chú"]),
        nguoiLapMaNV: chu(d["Người lập"]),
        taoLuc: luc(d["Thời gian tạo"]),
      },
    }];
  });
  const ct = await chepBang(
    prisma.chiTietHopDong as unknown as UyQuyen,
    "maAppSheet",
    nguonCT,
    (await prisma.chiTietHopDong.findMany({ select: { id: true, maAppSheet: true, bamAppSheet: true, matBenAppSheet: true } }))
      .map((c) => ({ ...c, ma: c.maAppSheet })),
    bay,
    ctBoQua,
  );

  /* 4. Phiếu thu. */
  const nguonThu = bang("Thu").flatMap((d) => {
    const m = ma(d["Id"]);
    if (!m) return [];
    return [{
      ma: m,
      data: {
        hopDongId: hdTheoMa.get(ma(d["Hợp đồng"]) ?? "") ?? null,
        hinhThuc: chu(d["Loại thu"]),
        taiKhoan: chu(d["Tài khoản"]),
        noiDung: chu(d["Loại thanh toán"]),
        ngayThu: ngay(d["Ngày thu"]),
        soTien: tien(d["Số tiền thu"]),
        trangThai: chu(d["Trạng thái"]),
        ghiChu: chu(d["Ghi chú"]),
        nguoiTaoMaNV: chu(d["Người tạo"]),
        nguoiDuyetMaNV: chu(d["Người duyệt"]),
        anhAppSheet: chu(d["Hình ảnh đính kèm"]),
        taoLuc: luc(d["Ngày tạo"]),
      },
    }];
  });
  const thu = await chepBang(
    prisma.phieuThu as unknown as UyQuyen,
    "maAppSheet",
    nguonThu,
    (await prisma.phieuThu.findMany({ select: { id: true, maAppSheet: true, bamAppSheet: true, matBenAppSheet: true } }))
      .map((c) => ({ ...c, ma: c.maAppSheet })),
    bay,
  );

  const kq: KetQuaDongBo = {
    dichVuThem: dvMoi.length,
    bang: { khachHang: kh, hopDong: hd, chiTiet: ct, phieuThu: thu },
    giay: Math.round((Date.now() - batDau) / 1000),
  };

  await ghiMoc("dongBoAppSheet", new Date());

  // Nhật ký chỉ ghi khi CÓ đổi — đêm nào cũng một dòng "không đổi gì" thì nhật ký ngập.
  const so: Record<string, number> = {};
  if (kq.dichVuThem) so["dịch vụ mới"] = kq.dichVuThem;
  const CHU = { khachHang: "khách", hopDong: "hợp đồng", chiTiet: "dòng chi tiết", phieuThu: "phiếu thu" } as const;
  for (const [k, s] of Object.entries(kq.bang) as [keyof typeof CHU, SoDongBo][]) {
    if (s.them) so[`${CHU[k]} thêm`] = s.them;
    if (s.sua) so[`${CHU[k]} sửa`] = s.sua;
    if (s.mat) so[`${CHU[k]} mất bên AppSheet`] = s.mat;
  }
  if (Object.keys(so).length) {
    await ghiNhatKy({
      nguoi: { id: null, ten: nguoiTen },
      hanhDong: "dong-bo-appsheet",
      doiTuong: "HopDong",
      chiTiet: { so },
    });
  }
  return kq;
}
