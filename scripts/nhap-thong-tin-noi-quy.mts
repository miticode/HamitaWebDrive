/**
 * Nhập Thông tin studio (phần nội bộ) và Nội quy từ AppSheet cũ.
 *
 *   npx tsx scripts/nhap-thong-tin-noi-quy.mts            # chỉ thêm cái chưa có
 *   npx tsx scripts/nhap-thong-tin-noi-quy.mts --cap-nhat # ghi đè thông tin studio bằng bản AppSheet
 *
 * KHÔNG nhập địa chỉ, hotline, Zalo, Facebook, bản đồ nhúng: những thứ đó nằm ở
 * src/lib/studio.ts, nơi trang giới thiệu và khung Hỏi Hamita đọc — giữ một nơi
 * duy nhất. Bên AppSheet ghi địa chỉ "377" lẫn "337", web ghi "337".
 *
 * Nội quy không bao giờ bị ghi đè hay xoá: đã có (theo mã) thì bỏ qua.
 *
 * Chỉ in số đếm và giờ làm việc; số tài khoản chỉ báo có hay không.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { docAppSheet, chu, giaTri } = await import("../src/lib/appsheet");
const { getPrisma } = await import("../src/lib/db");
const { chuanGio, chuanToaDo } = await import("../src/lib/studioNoiBo");
const { ghiNhatKy } = await import("../src/lib/nhatKy");

const capNhat = process.argv.includes("--cap-nhat");
const bang = await docAppSheet();
const prisma = getPrisma();

/* ── Thông tin studio ───────────────────────────────────────────────────── */

/*
  Ô giờ bên AppSheet là giờ Excel: một ngày 30/12/1899 kèm giờ, đọc ra kiểu
  Date theo UTC. Lấy giờ UTC là đúng giờ đã gõ — lấy giờ địa phương sẽ lệch 7
  tiếng (08:30 thành 15:30).
*/
const gio = (v: unknown): string | null => {
  const g = giaTri(v);
  if (g instanceof Date) {
    return `${String(g.getUTCHours()).padStart(2, "0")}:${String(g.getUTCMinutes()).padStart(2, "0")}`;
  }
  return g === null ? null : chuanGio(String(g));
};
const so = (v: unknown): number | null => {
  const n = Number(giaTri(v));
  return Number.isFinite(n) && String(giaTri(v) ?? "").trim() !== "" ? n : null;
};

const tt = bang("Thông tin")[0];
let thongTin = "không có dòng nào bên AppSheet";
if (tt) {
  const du = {
    nguoiDaiDien: chu(tt["Người đại diện"]),
    soTaiKhoan1: chu(tt["Số tài khoản 1"]),
    soTaiKhoan2: chu(tt["Số tài khoản 2"]),
    gioBatDau: gio(tt["Thời gian làm"]),
    gioKetThuc: gio(tt["Thời gian kết thúc"]),
    gioNghiGiuaBuoi: so(tt["Giờ nghỉ giữa buổi"]),
    ngayCongThang: so(tt["Ngày công tháng"]),
    toaDo: chuanToaDo(String(chu(tt["Bản đồ"]) ?? "")),
  };
  const daCo = await prisma.thongTinStudio.findUnique({ where: { id: "studio" } });
  if (daCo && !capNhat) {
    thongTin = "đã có trên web, bỏ qua (thêm --cap-nhat để ghi đè)";
  } else {
    await prisma.thongTinStudio.upsert({
      where: { id: "studio" },
      create: { id: "studio", ...du },
      update: du,
    });
    thongTin = daCo ? "đã ghi đè bằng bản AppSheet" : "đã thêm";
  }
  console.log("Thông tin studio:", thongTin);
  console.log(
    `  giờ làm ${du.gioBatDau}–${du.gioKetThuc} · nghỉ giữa buổi ${du.gioNghiGiuaBuoi} giờ · ` +
      `${du.ngayCongThang} ngày công/tháng · toạ độ ${du.toaDo ?? "(không đọc được)"}`,
  );
  console.log(
    `  người đại diện: ${du.nguoiDaiDien ? "có" : "không"} · số tài khoản 1: ${du.soTaiKhoan1 ? "có" : "không"} · số tài khoản 2: ${du.soTaiKhoan2 ? "có" : "không"}`,
  );
}

/* ── Nội quy ────────────────────────────────────────────────────────────── */

let them = 0;
let boQua = 0;
const dsNoiQuy = bang("Nội quy");
for (const [i, d] of dsNoiQuy.entries()) {
  const maNQ = chu(d["Mã NQ"]);
  // Bỏ mã dính trong nội dung ("P013- Ko chuyển trạng thái" → "Ko chuyển trạng thái").
  const noiDung = (chu(d["Nội quy"]) ?? "").replace(/^P\d+\s*-\s*/i, "").trim();
  if (!noiDung) continue;
  if (maNQ && (await prisma.noiQuy.findUnique({ where: { maNQ } }))) {
    boQua++;
    continue;
  }
  await prisma.noiQuy.create({
    data: { maNQ, noiDung, mucPhat: Math.round(so(d["Mức tiền"]) ?? 0), thuTu: i },
  });
  them++;
}
console.log(`Nội quy: đọc ${dsNoiQuy.length} · thêm ${them} · bỏ qua vì đã có ${boQua}`);

await ghiNhatKy({
  nguoi: { id: null, ten: "Script nhập dữ liệu" },
  hanhDong: "nhap-du-lieu",
  doiTuong: "ThongTinStudio",
  chiTiet: { ten: "Thông tin studio & nội quy", so: { "nội quy thêm": them, "nội quy bỏ qua": boQua } },
});
