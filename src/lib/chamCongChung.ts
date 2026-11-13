/**
 * Phép tính của CHẤM CÔNG — dùng chung cho cả máy chủ và trình duyệt.
 * Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 4).
 *
 * Để ở tệp riêng chứ không trong tệp `"use server"`: tệp server action chỉ
 * được xuất ra hàm async, xuất hằng số thì phía trình duyệt gọi vào sẽ nổ.
 */

export const TRANG_THAI_CONG = ["Đi làm", "Nghỉ làm"] as const;
export const VAO_DUNG_GIO = "Đúng giờ";
export const VAO_TRE = "Trễ giờ";

/** Trong vòng này tính là "ở tiệm". Rộng hơn sai số GPS của điện thoại. */
export const BAN_KINH_TIEM_MET = 200;

export type ToaDo = { viDo: number; kinhDo: number };

/**
 * Đọc chuỗi "10.437091, 106.476072" thành toạ độ.
 *
 * Trả null khi KHÔNG đọc được **và cả khi là "0, 0"**: bên AppSheet có 334
 * lượt mang đúng giá trị đó — đấy là lúc điện thoại không lấy được vị trí,
 * không phải ai đó đang đứng giữa Đại Tây Dương.
 */
export function docToaDo(s: string | null | undefined): ToaDo | null {
  if (!s) return null;
  const [a, b] = s.split(",").map((x) => Number(x.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (a === 0 && b === 0) return null;
  return { viDo: a, kinhDo: b };
}

/** Khoảng cách hai điểm trên mặt đất, làm tròn tới mét. */
export function khoangCachMet(a: ToaDo, b: ToaDo): number {
  const R = 6_371_000;
  const r = Math.PI / 180;
  const dVi = (b.viDo - a.viDo) * r;
  const dKinh = (b.kinhDo - a.kinhDo) * r;
  const x =
    Math.sin(dVi / 2) ** 2 +
    Math.cos(a.viDo * r) * Math.cos(b.viDo * r) * Math.sin(dKinh / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

export type NoiCham =
  | { kieu: "khong-ro" }
  | { kieu: "tai-tiem"; ten: string; met: number }
  | { kieu: "ngoai-tiem"; met: number };

/**
 * Gọi tên chỗ chấm công.
 *
 * KHÔNG dùng để từ chối ai cả — chỉ để quản lý nhìn bảng công là biết hôm đó
 * người ta ở đâu. Đo trên 6.114 lượt bên AppSheet: 39,6% cách tiệm hơn 500m,
 * có cụm xa 4–5 km. Đó là những buổi chụp ngoài, phim trường. Chặn theo toạ độ
 * là từ chối 4 trong 10 lần chấm thật.
 */
export function goiTenNoiCham(
  viTri: string | null | undefined,
  coSo: { ten: string; toaDo: string | null | undefined }[],
): NoiCham {
  const diem = docToaDo(viTri);
  if (!diem) return { kieu: "khong-ro" };

  let ganNhat: { ten: string; met: number } | null = null;
  for (const c of coSo) {
    const t = docToaDo(c.toaDo);
    if (!t) continue;
    const met = khoangCachMet(diem, t);
    if (!ganNhat || met < ganNhat.met) ganNhat = { ten: c.ten, met };
  }

  if (!ganNhat) return { kieu: "ngoai-tiem", met: 0 };
  return ganNhat.met <= BAN_KINH_TIEM_MET
    ? { kieu: "tai-tiem", ten: ganNhat.ten, met: ganNhat.met }
    : { kieu: "ngoai-tiem", met: ganNhat.met };
}

/** Câu ngắn hiện trên bảng công. */
export function chuNoiCham(n: NoiCham): string {
  if (n.kieu === "khong-ro") return "không lấy được vị trí";
  if (n.kieu === "tai-tiem") return `tại ${n.ten}`;
  return n.met >= 1000
    ? `ngoài tiệm, cách ${(n.met / 1000).toFixed(1)} km`
    : `ngoài tiệm, cách ${n.met} m`;
}

/** "08:30" → số phút từ nửa đêm. Sai định dạng thì trả null. */
export function phutTrongNgay(gio: string | null | undefined): number | null {
  if (!gio) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(gio.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const p = Number(m[2]);
  if (h > 23 || p > 59) return null;
  return h * 60 + p;
}

/**
 * Vào ca muộn hơn giờ bắt đầu thì là trễ.
 *
 * Chưa khai giờ bắt đầu thì KHÔNG đoán — trả null, bảng công để trống thay vì
 * gắn nhãn "trễ" cho người ta dựa trên một con số không ai đặt.
 */
export function xepGioVao(phutVao: number, gioBatDau: string | null): string | null {
  const moc = phutTrongNgay(gioBatDau);
  if (moc === null) return null;
  return phutVao > moc ? VAO_TRE : VAO_DUNG_GIO;
}

/**
 * Số giờ làm = (ra − vào) − nghỉ giữa buổi.
 *
 * Chỉ trừ nghỉ giữa buổi khi ca ĐỦ DÀI để có nghỉ giữa buổi thật. Ai vào lúc
 * 8h ra lúc 9h thì không nghỉ trưa, trừ 1,5 giờ là ra số âm.
 */
export function tinhSoGio(
  vao: Date,
  ra: Date,
  gioNghiGiuaBuoi: number | null,
): number {
  const gio = (ra.getTime() - vao.getTime()) / 3_600_000;
  if (gio <= 0) return 0;
  const nghi = gioNghiGiuaBuoi ?? 0;
  const tru = gio > nghi + 4 ? nghi : 0;
  return Math.round((gio - tru) * 100) / 100;
}

/**
 * Quy ra ngày công.
 *
 * Một ngày công đầy đủ = từ giờ bắt đầu tới giờ kết thúc, trừ nghỉ giữa buổi.
 * Làm quá thì vẫn tính 1 — chấm công không phải chỗ tính tăng ca, đó là việc
 * của bảng lương ở đợt 5.
 */
export function tinhNgayCong(
  soGio: number,
  gioBatDau: string | null,
  gioKetThuc: string | null,
  gioNghiGiuaBuoi: number | null,
): number {
  const dau = phutTrongNgay(gioBatDau);
  const cuoi = phutTrongNgay(gioKetThuc);
  if (dau === null || cuoi === null || cuoi <= dau) return 0;
  const chuan = (cuoi - dau) / 60 - (gioNghiGiuaBuoi ?? 0);
  if (chuan <= 0) return 0;
  return Math.min(1, Math.round((soGio / chuan) * 100) / 100);
}

/** "HH:MM" theo giờ studio. */
export function gioVN(d: Date | null | undefined, muiGio: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: muiGio,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
