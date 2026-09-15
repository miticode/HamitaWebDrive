/**
 * Nhập bảng Dịch vụ & trang phục (trang "Dịch vụ") và chi phí từng hạng mục
 * (trang "Dịch vụ CT") từ AppSheet cũ.
 *
 *   npx tsx scripts/nhap-dich-vu.mts            # chỉ thêm mục chưa có (ghép theo Mã DV)
 *   npx tsx scripts/nhap-dich-vu.mts --cap-nhat # ghi đè tên, giá, chi tiết… bằng bản AppSheet
 *
 * Chạy lại bao nhiêu lần cũng được: trong lúc tiệm còn dùng AppSheet song song,
 * mục mới thêm bên đó chạy lại lệnh này là sang. CẨN THẬN --cap-nhat: nó đè cả
 * những gì đã sửa trên web.
 *
 * Không bao giờ xoá, không đổi "đang dùng" của mục đã có. Chi phí hạng mục chỉ
 * thêm dòng chưa có (ghép theo cột ID), không ghi đè.
 *
 * Chỉ in số đếm và danh mục — chi phí hạng mục là tiền công thợ.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { docAppSheet, chu, giaTri } = await import("../src/lib/appsheet");
const { getPrisma } = await import("../src/lib/db");
const { loaiTuAppSheet, TEN_LOAI } = await import("../src/lib/dichVuChung");
const { ghiNhatKy } = await import("../src/lib/nhatKy");

const capNhat = process.argv.includes("--cap-nhat");
const bang = await docAppSheet();
const prisma = getPrisma();

const soTien = (v: unknown): number => {
  const n = Number(giaTri(v));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};
const ma = (v: unknown): string | null => chu(v)?.replace(/\s+/g, " ") ?? null;

/* ── Dịch vụ ────────────────────────────────────────────────────────────── */

const idTheoMa = new Map(
  (await prisma.dichVu.findMany({ select: { id: true, maDV: true } })).map((d) => [d.maDV, d.id]),
);
const daGap = new Set<string>();
const dsMoi: {
  maDV: string;
  loai: string;
  ten: string;
  nhom: string | null;
  chiTiet: string | null;
  donGia: number;
  donVi: string | null;
  hinhAppSheet: string | null;
}[] = [];
let daCapNhat = 0;
let boQua = 0;
let trungTrongFile = 0;
const loaiLa = new Map<string, number>();

const dsDichVu = bang("Dịch vụ");
for (const d of dsDichVu) {
  const maDV = ma(d["Mã DV"]);
  if (!maDV) continue;
  if (daGap.has(maDV)) {
    trungTrongFile++;
    continue;
  }
  daGap.add(maDV);

  const loai = loaiTuAppSheet(chu(d["Loại"]));
  if (!loai) {
    const k = chu(d["Loại"]) ?? "(trống)";
    loaiLa.set(k, (loaiLa.get(k) ?? 0) + 1);
    continue;
  }
  const du = {
    loai,
    // 2 mục bên AppSheet không có tên — lấy mã làm tên, còn hơn bỏ mất mục.
    ten: chu(d["Tên DV"]) ?? maDV,
    nhom: chu(d["Loại DV"]),
    chiTiet: chu(d["Chi tiết"]),
    donGia: soTien(d["Đơn giá"]),
    donVi: chu(d["Đơn vị"]),
    hinhAppSheet: chu(d["Hình ảnh"]),
  };

  const id = idTheoMa.get(maDV);
  if (id) {
    if (capNhat) {
      await prisma.dichVu.update({ where: { id }, data: du });
      daCapNhat++;
    } else boQua++;
    continue;
  }
  dsMoi.push({ maDV, ...du });
}

for (let i = 0; i < dsMoi.length; i += 500) {
  await prisma.dichVu.createMany({ data: dsMoi.slice(i, i + 500) });
}

console.log(`Dịch vụ: đọc ${dsDichVu.length} dòng · thêm ${dsMoi.length} · ${capNhat ? `cập nhật ${daCapNhat}` : `bỏ qua vì đã có ${boQua}`}`);
if (trungTrongFile) console.log(`  trùng mã ngay trong file AppSheet (lấy dòng đầu): ${trungTrongFile}`);
if (loaiLa.size) console.log(`  bỏ qua vì cột Loại lạ: ${[...loaiLa].map(([k, c]) => `${k}×${c}`).join(", ")}`);

const tatCa = await prisma.dichVu.findMany({ select: { id: true, maDV: true, loai: true, nhom: true, hinhAppSheet: true } });
for (const l of Object.keys(TEN_LOAI) as (keyof typeof TEN_LOAI)[]) {
  const cua = tatCa.filter((d) => d.loai === l);
  const nhom = new Map<string, number>();
  for (const d of cua) nhom.set(d.nhom ?? "(không nhóm)", (nhom.get(d.nhom ?? "(không nhóm)") ?? 0) + 1);
  console.log(
    `  ${TEN_LOAI[l]}: ${cua.length} mục, ${cua.filter((d) => d.hinhAppSheet).length} có đường dẫn ảnh · ` +
      [...nhom].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k}×${c}`).join(", "),
  );
}

/* ── Chi phí từng hạng mục ──────────────────────────────────────────────── */

const idMoi = new Map(tatCa.map((d) => [d.maDV, d.id]));
const daCoCP = new Set(
  (await prisma.giaHangMuc.findMany({ select: { maAppSheet: true } })).map((g) => g.maAppSheet),
);
const cpMoi: { maAppSheet: string; dichVuId: string; hangMuc: string | null; donGia: number }[] = [];
let cpBoQua = 0;
const khongThayMa = new Map<string, number>();

const dsCT = bang("Dịch vụ CT");
for (const d of dsCT) {
  const maCT = chu(d["ID"]);
  const maDV = ma(d["Mã DV"]);
  if (!maCT || !maDV) continue;
  if (daCoCP.has(maCT)) {
    cpBoQua++;
    continue;
  }
  const dichVuId = idMoi.get(maDV);
  if (!dichVuId) {
    khongThayMa.set(maDV, (khongThayMa.get(maDV) ?? 0) + 1);
    continue;
  }
  cpMoi.push({ maAppSheet: maCT, dichVuId, hangMuc: chu(d["Loại"]), donGia: soTien(d["Đơn giá"]) });
  daCoCP.add(maCT);
}
if (cpMoi.length) await prisma.giaHangMuc.createMany({ data: cpMoi });

console.log(`Chi phí hạng mục: đọc ${dsCT.length} dòng · thêm ${cpMoi.length} · bỏ qua vì đã có ${cpBoQua}`);
if (khongThayMa.size) {
  console.log(
    `  bỏ qua vì mã dịch vụ không có trong bảng Dịch vụ: ${[...khongThayMa].map(([k, c]) => `${k}×${c}`).join(", ")}`,
  );
}

await ghiNhatKy({
  nguoi: { id: null, ten: "Script nhập dữ liệu" },
  hanhDong: "nhap-du-lieu",
  doiTuong: "DichVu",
  chiTiet: {
    ten: "Dịch vụ & trang phục",
    so: {
      "dịch vụ thêm": dsMoi.length,
      [capNhat ? "dịch vụ cập nhật" : "dịch vụ bỏ qua"]: capNhat ? daCapNhat : boQua,
      "chi phí hạng mục thêm": cpMoi.length,
    },
  },
});
