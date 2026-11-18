/**
 * Thử: hợp đồng có lịch nhà gái + nhà trai thì sinh ĐÚNG MỘT album, tên mang
 * CẢ HAI mã — "HIS - HER - …" (anh chốt 15/11/2026).
 *
 * Bản đầu em làm ra hai album riêng, anh bảo sai: ảnh của một nhà nằm một
 * chỗ, hai mã chỉ nói album đó có cả phần nhà trai lẫn nhà gái.
 *
 * Chạm vào Drive thật và database thật, nên DỌN SẠCH ngay cuối script và đếm
 * lại để xác nhận — không chỉ tin là đã dọn.
 *
 * Chạy: npx tsx scripts/thu-album-theo-lich.mts
 */
import { readFileSync } from "node:fs";
for (const t of [".env.local", ".env"]) {
  try {
    for (const d of readFileSync(t, "utf8").split("\n")) {
      const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const { DAU } = await import("./thu-dau.js");
const { getPrisma } = await import("../src/lib/db");
const { getUserAccessToken } = await import("../src/lib/googleAuth");
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");
const { taoThuMucVaAlbum } = await import("../src/lib/thuMucHopDong");

const p = getPrisma();
const NGUOI = { id: "", ten: `${DAU.tienTo} quan ly`, maNV: DAU.maNV, tenDangNhap: "zz-thu-quan-tri" };

let dat = 0,
  truot = 0;
const kiem = (ten: string, ok: boolean, them = "") => {
  console.log(`  ${ok ? "OK " : "XX "} ${ten}${them ? ` — ${them}` : ""}`);
  ok ? dat++ : truot++;
};

const docDrive = async (token: string, id: string) => {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,parents,trashed`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return r.ok ? ((await r.json()) as { name: string; parents?: string[]; trashed?: boolean }) : null;
};

const dongGoi = {
  dichVuId: null,
  maDV: "",
  tenDV: `${DAU.ten} goi 2 ngay`,
  loai: "dich-vu",
  donGia: 1_000_000,
  soLuong: 1,
  ngayChup: "",
  chiTiet: "",
  ghiChu: "",
};

const lapThu = async (ten: string, lich: { ngay: string; loai?: string }[]) => {
  const kq = await lapHopDongMoi(
    {
      khachHangId: null,
      khachMoi: { ten, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" },
      tenKhach: ten,
      loaiDV: "CƯỚI",
      ngayDat: "2026-11-15",
      diaChi: "",
      ghiChu: "",
      khuyenMai: 0,
      trangThai: "2. Đã có ngày chụp",
      dong: [dongGoi],
      thu: [],
      lich: lich.map((l) => ({ ngay: l.ngay, gio: "", loai: l.loai ?? "", diaDiem: "", noiDung: "", ghiChu: "" })),
      viec: [],
    } as never,
    NGUOI as never,
  );
  if ("loi" in kq) throw new Error(`Khong lap duoc hop dong: ${kq.loi}`);
  return kq;
};

const token = await getUserAccessToken();
if (!token) {
  console.log("Chua ket noi Google Drive — khong chay thu duoc.");
  process.exit(1);
}

/* ── 1. Gói hai ngày: nhà gái + nhà trai → HAI album ──────────────────── */
console.log("1. Hop dong co lich nha gai + nha trai:");
const hd2 = await lapThu(`${DAU.ten} hai ngay`, [
  { ngay: "2027-04-10", loai: "nhà gái" },
  { ngay: "2027-04-11", loai: "nhà trai" },
]);
const kq2 = await taoThuMucVaAlbum(hd2.id);
kiem("tao duoc", kq2.ok, kq2.ok ? "" : kq2.loi);
if (kq2.ok) {
  const g = await p.gallery.findMany({ where: { hopDongId: hd2.id }, select: { hopDongId: true, allowDownload: true, clientName: true } });
  kiem("ra DUNG MOT album, khong phai hai", g.length === 1, `${g.length}`);
  kiem("ALBUM mang CA HAI ma, HIS truoc HER", kq2.tenAlbum === `HIS - HER - ${DAU.ten} hai ngay`, kq2.tenAlbum);
  kiem("THU MUC Drive KHONG mang ma", kq2.tenThuMuc === `${DAU.ten} hai ngay`, kq2.tenThuMuc);
  kiem("album gan san hop dong", g[0]?.hopDongId === hd2.id);
  kiem("bat quyen tai", g[0]?.allowDownload === true);
  kiem("ten album web la ten CO MA", g[0]?.clientName === kq2.tenAlbum, g[0]?.clientName ?? "");
  /* Thư mục phải nằm đúng tháng CHỤP (T4/2027), không phải tháng lập (T11/2026). */
  const tm = await docDrive(token, kq2.thuMucDrive);
  kiem("ten THAT tren Drive cung khong co ma", tm?.name === `${DAU.ten} hai ngay`, tm?.name ?? "");
  const thang = tm?.parents?.[0] ? await docDrive(token, tm.parents[0]) : null;
  const nam = thang?.parents?.[0] ? await docDrive(token, thang.parents[0]) : null;
  /* Anh doi 18/11/2026: lay thang LAP hop dong, khong phai thang chup.
     Hop dong nay lap 15/11/2026 nhung chup 04/2027 — phai vao T11/2026. */
  kiem("dung thang LAP hop dong, khong phai thang chup", thang?.name === "T11" && nam?.name === "2026", `${nam?.name}/${thang?.name}`);
}

/* ── 2. Chỉ một buổi nhà gái → MỘT album HER ──────────────────────────── */
console.log("\n2. Hop dong chi co lich nha gai:");
const hd1 = await lapThu(`${DAU.ten} mot ben`, [{ ngay: "2027-04-12", loai: "nhà gái" }]);
const kq1 = await taoThuMucVaAlbum(hd1.id);
kiem("tao duoc", kq1.ok, kq1.ok ? "" : kq1.loi);
if (kq1.ok) {
  const g = await p.gallery.count({ where: { hopDongId: hd1.id } });
  kiem("ra DUNG MOT album", g === 1, `${g}`);
  kiem("album chi mang ma HER", kq1.tenAlbum === `HER - ${DAU.ten} mot ben`, kq1.tenAlbum);
  kiem("thu muc Drive van ten tron", kq1.tenThuMuc === `${DAU.ten} mot ben`, kq1.tenThuMuc);
}

/* ── 3. Lịch loại thường → MỘT album tên trơn, không mã bịa ───────────── */
console.log("\n3. Hop dong lich loai 'Ngay chup' (khong suy ra ma nao):");
const hd0 = await lapThu(`${DAU.ten} khong ma`, [{ ngay: "2027-04-13", loai: "Ngày chụp" }]);
const kq0 = await taoThuMucVaAlbum(hd0.id);
kiem("tao duoc", kq0.ok, kq0.ok ? "" : kq0.loi);
if (kq0.ok) {
  const g = await p.gallery.count({ where: { hopDongId: hd0.id } });
  kiem("ra DUNG MOT album", g === 1, `${g}`);
  kiem("album ten TRON, khong bia ma", kq0.tenAlbum === `${DAU.ten} khong ma`, kq0.tenAlbum);
  kiem("thu muc cung ten tron", kq0.tenThuMuc === `${DAU.ten} khong ma`, kq0.tenThuMuc);
}

/* ── 4. Người tự đặt tên thì KHÔNG gắn thêm mã ────────────────────────── */
console.log("\n4. Nguoi bam nut tu dat ten (hop dong van co lich gai+trai):");
const hdT = await lapThu(`${DAU.ten} dat tay`, [
  { ngay: "2027-04-14", loai: "nhà gái" },
  { ngay: "2027-04-15", loai: "nhà trai" },
]);
const TEN_TAY = `HC - ${DAU.ten} dat tay`;
const kqT = await taoThuMucVaAlbum(hdT.id, TEN_TAY);
kiem("tao duoc", kqT.ok, kqT.ok ? "" : kqT.loi);
if (kqT.ok) {
  const g = await p.gallery.count({ where: { hopDongId: hdT.id } });
  kiem("chi MOT album", g === 1, `${g}`);
  kiem("album giu nguyen ten nguoi go, khong chong them ma", kqT.tenAlbum === TEN_TAY, kqT.tenAlbum);
  kiem("thu muc Drive BOC ma nguoi go ra", kqT.tenThuMuc === `${DAU.ten} dat tay`, kqT.tenThuMuc);
}

/* ── Dọn sạch ─────────────────────────────────────────────────────────── */
console.log("\nDon dep:");
const moiThuMuc = [kq2, kq1, kq0, kqT].filter((k) => k.ok).map((k) => (k as { thuMucDrive: string }).thuMucDrive);
let xoaDrive = 0;
for (const id of moiThuMuc) {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (r.ok || r.status === 404) xoaDrive++;
}
console.log(`  Drive: xoa ${xoaDrive}/${moiThuMuc.length} thu muc`);

const hdIds = [hd2.id, hd1.id, hd0.id, hdT.id];
await p.gallery.deleteMany({ where: { hopDongId: { in: hdIds } } });
await p.congViec.deleteMany({ where: { hopDongId: { in: hdIds } } });
await p.lichChup.deleteMany({ where: { hopDongId: { in: hdIds } } });
await p.phieuThu.deleteMany({ where: { hopDongId: { in: hdIds } } });
await p.chiTietHopDong.deleteMany({ where: { hopDongId: { in: hdIds } } });
await p.hopDong.deleteMany({ where: { id: { in: hdIds } } });
await p.khachHang.deleteMany({ where: { ten: { contains: DAU.tienTo } } });
await p.nhatKy.deleteMany({ where: { doiTuongId: { in: hdIds } } });

/* Đếm lại — không tin là đã dọn, phải đo. */
const con = {
  gallery: await p.gallery.count({ where: { OR: [{ hopDongId: { in: hdIds } }, { clientName: { contains: DAU.tienTo } }] } }),
  hopDong: await p.hopDong.count({ where: { OR: [{ id: { in: hdIds } }, { tenKhach: { contains: DAU.tienTo } }] } }),
  lich: await p.lichChup.count({ where: { hopDongId: { in: hdIds } } }),
  khach: await p.khachHang.count({ where: { ten: { contains: DAU.tienTo } } }),
};
console.log(`  Con lai: ${JSON.stringify(con)}`);
const sach = Object.values(con).every((n) => n === 0) && xoaDrive === moiThuMuc.length;
kiem("DA SACH ca hai dau", sach);

console.log(`\nKET QUA: ${dat} dat / ${dat + truot} phep`);
await p.$disconnect();
process.exit(truot > 0 ? 1 : 0);
