import { getPrisma } from "@/lib/db";
import { homNayStudio, MUI_GIO } from "@/lib/constants";
import {
  gioChuanMotNgay,
  goiTenNoiCham,
  RA_SOM,
  thieuGio,
  tinhNgayCong,
  tinhSoGio,
  xepGioRa,
  xepGioVao,
  type NoiCham,
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
  /** Số giờ của MỘT ngày công đầy đủ, suy từ giờ làm. Hiện là 8. */
  gioChuan: number | null;
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
    gioChuan: gioChuanMotNgay(t?.gioBatDau ?? null, t?.gioKetThuc ?? null, t?.gioNghiGiuaBuoi ?? null),
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
  /** Tính lúc đọc, không lưu — xem chú thích `xepGioRa`. */
  trangThaiRa: string | null;
  /** Số giờ còn thiếu so với một ngày đầy đủ. Làm dư thì 0. */
  conThieu: number;
  viTri: string | null;
  noiCham: NoiCham;
} | null;

/** Lượt chấm của chính người này trong NGÀY HÔM NAY theo giờ studio. */
export async function luotHomNay(maNV: string, caiDat: CaiDatCham): Promise<LuotHomNay> {
  const d = await getPrisma().chamCong.findFirst({
    /*
      CHỈ dòng lập trên web (`bamAppSheet: null`).

      Trong lúc chạy song song, cùng một ngày có thể có hai dòng: một chép từ
      AppSheet, một người bấm trên web. Màn của nhân viên phải hiện ĐÚNG lượt
      họ vừa bấm trên web, không phải bản chép về lúc 2 giờ sáng.
    */
    where: {
      maNV: { equals: maNV, mode: "insensitive" },
      ngay: homNayStudio(),
      matBenAppSheet: null,
      bamAppSheet: null,
    },
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
    trangThaiRa: d.gioRa ? xepGioRa(phutTheoGioStudio(d.gioRa), caiDat.gioKetThuc) : null,
    conThieu: d.gioRa ? thieuGio(d.soGio, caiDat.gioChuan) : 0,
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
    /* Chỉ dòng web — không bao giờ sửa vào bản chép từ AppSheet. */
    where: { maNV: { equals: maNV, mode: "insensitive" }, ngay, matBenAppSheet: null, bamAppSheet: null },
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
    where: { maNV: { equals: maNV, mode: "insensitive" }, ngay, matBenAppSheet: null, bamAppSheet: null },
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

/**
 * MỘT NGƯỜI MỘT NGÀY CHỈ ĐẾM MỘT LẦN.
 *
 * Trong lúc chạy song song (anh cho tiệm dùng thử 13/11/2026), ai chấm cả bên
 * AppSheet lẫn trên web trong cùng một ngày sẽ sinh RA HAI DÒNG cho cùng một
 * buổi — một chép về lúc 2 giờ sáng, một do họ bấm. Cộng cả hai là **ngày công
 * nhân đôi, và lương trả dư**.
 *
 * Giữ dòng nào: ưu tiên bản CHÉP TỪ APPSHEET, vì tới ngày chuyển hẳn AppSheet
 * vẫn là bản gốc — con số bảng lương xưa nay vẫn lấy từ đó. Hết giai đoạn
 * song song thì không còn dòng AppSheet mới nào nữa nên luật này tự hết tác
 * dụng, không phải gỡ.
 *
 * Đo lúc viết: 6.114 dòng ứng với đúng 6.114 cặp (người, ngày) — chưa trùng
 * dòng nào, vì chưa ai chấm trên web. Đây là hàng rào dựng trước.
 */
export function motDongMoiNgay<T extends { maNV: string | null; ngay: string | null; bamAppSheet?: string | null }>(
  ds: T[],
): T[] {
  const giu = new Map<string, T>();
  for (const d of ds) {
    const k = `${(d.maNV ?? "").toLowerCase()}|${d.ngay ?? ""}`;
    const da = giu.get(k);
    if (!da) giu.set(k, d);
    else if (!da.bamAppSheet && d.bamAppSheet) giu.set(k, d);
  }
  return [...giu.values()];
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
  /** Số buổi ra ca trước giờ kết thúc (anh yêu cầu 13/11/2026). */
  soLanVeSom: number;
  /** Tổng số giờ còn thiếu so với chuẩn, cộng cả tháng. */
  tongThieuGio: number;
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
  const ds = motDongMoiNgay(
    await getPrisma().chamCong.findMany({
      where: { ngay: { startsWith: thang }, matBenAppSheet: null },
      select: {
        maNV: true,
        ngay: true,
        bamAppSheet: true,
        soGio: true,
        soNgayCong: true,
        trangThaiVao: true,
        viTri: true,
        gioVao: true,
        gioRa: true,
      },
    }),
  );

  /*
    GỘP THEO MÃ ĐÃ HẠ CHỮ THƯỜNG.

    Bên AppSheet cùng một người có thể mang hai cách viết mã: tháng 10/2026 có
    "npk1211" 18 lượt và "Npk1211" 13 lượt — cùng một người. Gộp theo chuỗi
    nguyên văn là tách họ làm hai dòng, mỗi dòng nửa số ngày công, và tới đợt 5
    là tính lương sai.

    Cả hệ thống đã tra mã nhân viên theo cách này rồi (`tenTheoMaNV` trong
    hopDongMayChu.ts cũng hạ chữ thường) — đây chỉ là theo cho đúng.

    Cách viết hiện ra bảng là cách viết XUẤT HIỆN NHIỀU NHẤT, để nhìn giống
    những gì người ta quen thấy bên AppSheet.
  */
  const theoNguoi = new Map<string, DongBangCong>();
  const demCachViet = new Map<string, Map<string, number>>();

  for (const d of ds) {
    const nguyenVan = d.maNV ?? "(không rõ)";
    const ma = nguyenVan.toLowerCase();

    const cv = demCachViet.get(ma) ?? new Map<string, number>();
    cv.set(nguyenVan, (cv.get(nguyenVan) ?? 0) + 1);
    demCachViet.set(ma, cv);

    let r = theoNguoi.get(ma);
    if (!r) {
      r = {
        maNV: nguyenVan,
        soLuot: 0,
        soNgayCong: 0,
        soGio: 0,
        soLanTre: 0,
        soLanNgoaiTiem: 0,
        soLanKhongRoViTri: 0,
        thieuGioRa: 0,
        soLanVeSom: 0,
        tongThieuGio: 0,
      };
      theoNguoi.set(ma, r);
    }
    r.soLuot++;
    r.soNgayCong += d.soNgayCong ?? 0;
    r.soGio += d.soGio ?? 0;
    if (d.trangThaiVao === "Trễ giờ") r.soLanTre++;
    if (d.gioVao && !d.gioRa) r.thieuGioRa++;
    /*
      Chỉ xét về sớm / thiếu giờ khi ĐÃ CÓ giờ ra. Buổi chưa bấm ra ca thì số
      giờ bằng 0, cộng vào "thiếu giờ" là biến một lần quên bấm thành 8 tiếng
      nợ công — cột "thiếu giờ ra" bên cạnh đã nói đúng chuyện đó rồi.
    */
    if (d.gioRa) {
      if (xepGioRa(phutTheoGioStudio(d.gioRa), caiDat.gioKetThuc) === RA_SOM) r.soLanVeSom++;
      r.tongThieuGio += thieuGio(d.soGio, caiDat.gioChuan);
    }
    const noi = goiTenNoiCham(d.viTri, caiDat.coSo);
    if (noi.kieu === "ngoai-tiem") r.soLanNgoaiTiem++;
    if (noi.kieu === "khong-ro") r.soLanKhongRoViTri++;
  }

  return [...theoNguoi.entries()]
    .map(([ma, r]) => {
      const cachViet = [...(demCachViet.get(ma) ?? new Map())].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        ...r,
        maNV: cachViet ?? r.maNV,
        soNgayCong: Math.round(r.soNgayCong * 100) / 100,
        soGio: Math.round(r.soGio * 100) / 100,
        tongThieuGio: Math.round(r.tongThieuGio * 10) / 10,
      };
    })
    .sort((a, b) => b.soNgayCong - a.soNgayCong);
}
