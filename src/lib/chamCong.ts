import { getPrisma } from "@/lib/db";
import { homNayStudio, MUI_GIO } from "@/lib/constants";
import {
  tinhNgayCong,
  tinhSoGio,
  xepGioVao,
  type NoiCham,
  goiTenNoiCham,
} from "@/lib/chamCongChung";

/**
 * Chấm công — phần chạm database. Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 4).
 *
 * Phần ĐỌC từ AppSheet nằm ở `src/lib/dongBoAppSheet.ts` (mục 8).
 * Phép tính thuần nằm ở `src/lib/chamCongChung.ts`.
 */

export type CaiDatCham = {
  gioBatDau: string | null;
  gioKetThuc: string | null;
  gioNghiGiuaBuoi: number | null;
  coSo: { ten: string; toaDo: string | null }[];
};

/**
 * Giờ làm và toạ độ hai cơ sở.
 *
 * HAI cơ sở chứ không một: gom cụm 6.114 lượt chấm bên AppSheet ra một cụm
 * 1.248 lượt cách Wedding House 411m — đó là Hami Baby. Chỉ biết một toạ độ
 * thì mọi lượt chấm ở cơ sở kia đều bị gọi là "ngoài tiệm".
 */
export async function docCaiDatCham(): Promise<CaiDatCham> {
  const t = await getPrisma().thongTinStudio.findFirst({
    select: { gioBatDau: true, gioKetThuc: true, gioNghiGiuaBuoi: true, toaDo: true, toaDo2: true },
  });
  return {
    gioBatDau: t?.gioBatDau ?? null,
    gioKetThuc: t?.gioKetThuc ?? null,
    gioNghiGiuaBuoi: t?.gioNghiGiuaBuoi ?? null,
    coSo: [
      { ten: "Wedding House", toaDo: t?.toaDo ?? null },
      { ten: "Hami Baby", toaDo: t?.toaDo2 ?? null },
    ],
  };
}

/** Phút trong ngày theo giờ studio — dùng để xếp đúng giờ / trễ giờ. */
function phutTheoGioStudio(d: Date): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: MUI_GIO,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return Number(p.hour) * 60 + Number(p.minute);
}

export type LuotHomNay = {
  id: string;
  ngay: string | null;
  gioVao: Date | null;
  gioRa: Date | null;
  soGio: number | null;
  trangThaiVao: string | null;
  viTri: string | null;
  noiCham: NoiCham;
} | null;

/** Lượt chấm của chính người này trong NGÀY HÔM NAY theo giờ studio. */
export async function luotHomNay(maNV: string, caiDat: CaiDatCham): Promise<LuotHomNay> {
  const d = await getPrisma().chamCong.findFirst({
    where: { maNV, ngay: homNayStudio(), matBenAppSheet: null },
    orderBy: { taoLuc: "desc" },
  });
  if (!d) return null;
  return {
    id: d.id,
    ngay: d.ngay,
    gioVao: d.gioVao,
    gioRa: d.gioRa,
    soGio: d.soGio,
    trangThaiVao: d.trangThaiVao,
    viTri: d.viTri,
    noiCham: goiTenNoiCham(d.viTri, caiDat.coSo),
  };
}

/**
 * Bấm VÀO CA.
 *
 * Một người một ngày một dòng. Bấm lần hai trong cùng ngày thì KHÔNG tạo dòng
 * mới và cũng không ghi đè giờ vào — giờ vào đầu tiên mới là giờ thật, ghi đè
 * là xoá mất bằng chứng đi trễ.
 *
 * KHÔNG chặn theo vị trí (xem chú thích ở model ChamCong): 39,6% lượt chấm
 * thật cách tiệm hơn 500m vì đi chụp ngoài. Không có vị trí cũng cho chấm —
 * 334 lượt bên AppSheet mang toạ độ "0,0" là máy không lấy được.
 */
export async function vaoCa(
  maNV: string,
  phongBan: string | null,
  viTri: string | null,
  anhKho: string | null,
  caiDat: CaiDatCham,
): Promise<{ loi: string } | { ok: true; daCham: boolean }> {
  const prisma = getPrisma();
  const ngay = homNayStudio();

  const da = await prisma.chamCong.findFirst({
    where: { maNV, ngay, matBenAppSheet: null },
    select: { id: true, gioVao: true },
  });
  if (da?.gioVao) return { ok: true, daCham: true };

  const luc = new Date();
  const data = {
    maNV,
    phongBan,
    ngay,
    gioVao: luc,
    trangThai: "Đi làm",
    trangThaiVao: xepGioVao(phutTheoGioStudio(luc), caiDat.gioBatDau),
    viTri,
    anhKho,
  };

  if (da) await prisma.chamCong.update({ where: { id: da.id }, data });
  else await prisma.chamCong.create({ data });
  return { ok: true, daCham: false };
}

/**
 * Bấm RA CA.
 *
 * Ghi đè được giờ ra (bấm nhầm rồi làm tiếp thì bấm lại), khác hẳn giờ vào.
 * Số giờ và ngày công tính lại mỗi lần bấm.
 *
 * Chưa vào ca mà bấm ra ca thì từ chối — một dòng chỉ có giờ ra là dòng không
 * đọc được, mà bảng lương ở đợt 5 sẽ ăn đúng mấy con số này.
 */
export async function raCa(
  maNV: string,
  viTri: string | null,
  caiDat: CaiDatCham,
): Promise<{ loi: string } | { ok: true }> {
  const prisma = getPrisma();
  const ngay = homNayStudio();

  const d = await prisma.chamCong.findFirst({
    where: { maNV, ngay, matBenAppSheet: null },
    select: { id: true, gioVao: true },
  });
  if (!d?.gioVao) return { loi: "Chưa bấm vào ca hôm nay nên chưa ra ca được." };

  const luc = new Date();
  const soGio = tinhSoGio(d.gioVao, luc, caiDat.gioNghiGiuaBuoi);
  await prisma.chamCong.update({
    where: { id: d.id },
    data: {
      gioRa: luc,
      soGio,
      soNgayCong: tinhNgayCong(soGio, caiDat.gioBatDau, caiDat.gioKetThuc, caiDat.gioNghiGiuaBuoi),
      /* Vị trí lúc ra ca chỉ ghi đè khi lấy được — không xoá vị trí vào ca. */
      ...(viTri ? { viTri } : {}),
    },
  });
  return { ok: true };
}

export type DongBangCong = {
  maNV: string;
  soLuot: number;
  soNgayCong: number;
  soGio: number;
  soLanTre: number;
  soLanNgoaiTiem: number;
  soLanKhongRoViTri: number;
  thieuGioRa: number;
};

/**
 * Bảng công một tháng, gộp theo từng người.
 *
 * Gộp bằng JavaScript chứ không bằng SQL: một tháng chỉ vài trăm dòng, mà mấy
 * con số "ngoài tiệm" / "không rõ vị trí" phải tính khoảng cách từ chuỗi toạ
 * độ — SQL không làm được nếu không thêm cột, mà thêm cột thì bản chép từ
 * AppSheet lại khác bản gốc (xem chú thích ở model ChamCong).
 */
export async function bangCongThang(
  thang: string,
  caiDat: CaiDatCham,
): Promise<DongBangCong[]> {
  const ds = await getPrisma().chamCong.findMany({
    where: { ngay: { startsWith: thang }, matBenAppSheet: null },
    select: {
      maNV: true,
      soGio: true,
      soNgayCong: true,
      trangThaiVao: true,
      viTri: true,
      gioVao: true,
      gioRa: true,
    },
  });

  const theoNguoi = new Map<string, DongBangCong>();
  for (const d of ds) {
    const ma = d.maNV ?? "(không rõ)";
    let r = theoNguoi.get(ma);
    if (!r) {
      r = {
        maNV: ma,
        soLuot: 0,
        soNgayCong: 0,
        soGio: 0,
        soLanTre: 0,
        soLanNgoaiTiem: 0,
        soLanKhongRoViTri: 0,
        thieuGioRa: 0,
      };
      theoNguoi.set(ma, r);
    }
    r.soLuot++;
    r.soNgayCong += d.soNgayCong ?? 0;
    r.soGio += d.soGio ?? 0;
    if (d.trangThaiVao === "Trễ giờ") r.soLanTre++;
    if (d.gioVao && !d.gioRa) r.thieuGioRa++;
    const noi = goiTenNoiCham(d.viTri, caiDat.coSo);
    if (noi.kieu === "ngoai-tiem") r.soLanNgoaiTiem++;
    if (noi.kieu === "khong-ro") r.soLanKhongRoViTri++;
  }

  return [...theoNguoi.values()]
    .map((r) => ({
      ...r,
      soNgayCong: Math.round(r.soNgayCong * 100) / 100,
      soGio: Math.round(r.soGio * 100) / 100,
    }))
    .sort((a, b) => b.soNgayCong - a.soNgayCong);
}
