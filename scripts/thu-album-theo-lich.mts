/**
 * Thử: hợp đồng có lịch nhà gái + nhà trai thì sinh ĐÚNG HAI album, mang mã
 * HER và HIS (anh yêu cầu 15/11/2026).
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
  kiem("ra DUNG HAI album", kq2.tatCa.length === 2, `${kq2.tatCa.length}`);
  const ten = kq2.tatCa.map((a) => a.tenThuMuc).sort();
  kiem("mot cai mang ma HER", ten.some((t) => t.startsWith("HER - ")), ten.join(" | "));
  kiem("mot cai mang ma HIS", ten.some((t) => t.startsWith("HIS - ")));
  const g = await p.gallery.findMany({ where: { hopDongId: hd2.id }, select: { hopDongId: true, allowDownload: true } });
  kiem("ca hai album gan san hop dong", g.length === 2 && g.every((x) => x.hopDongId === hd2.id));
  kiem("ca hai bat quyen tai", g.every((x) => x.allowDownload));
  /* Hai thư mục phải nằm cùng một tháng, và là tháng CHỤP (T4/2027). */
  const tm = await Promise.all(kq2.tatCa.map((a) => docDrive(token, a.thuMucDrive)));
  const cha = [...new Set(tm.map((x) => x?.parents?.[0]))];
  kiem("hai thu muc cung nam mot thu muc thang", cha.length === 1);
  const thang = cha[0] ? await docDrive(token, cha[0]) : null;
  const nam = thang?.parents?.[0] ? await docDrive(token, thang.parents[0]) : null;
  kiem("dung thang CHUP, khong phai thang lap", thang?.name === "T4" && nam?.name === "2027", `${nam?.name}/${thang?.name}`);
}

/* ── 2. Chỉ một buổi nhà gái → MỘT album HER ──────────────────────────── */
console.log("\n2. Hop dong chi co lich nha gai:");
const hd1 = await lapThu(`${DAU.ten} mot ben`, [{ ngay: "2027-04-12", loai: "nhà gái" }]);
const kq1 = await taoThuMucVaAlbum(hd1.id);
kiem("tao duoc", kq1.ok, kq1.ok ? "" : kq1.loi);
if (kq1.ok) {
  kiem("ra DUNG MOT album", kq1.tatCa.length === 1, `${kq1.tatCa.length}`);
  kiem("mang ma HER", kq1.tenThuMuc.startsWith("HER - "), kq1.tenThuMuc);
}

/* ── 3. Lịch loại thường → MỘT album tên trơn, không mã bịa ───────────── */
console.log("\n3. Hop dong lich loai 'Ngay chup' (khong suy ra ma nao):");
const hd0 = await lapThu(`${DAU.ten} khong ma`, [{ ngay: "2027-04-13", loai: "Ngày chụp" }]);
const kq0 = await taoThuMucVaAlbum(hd0.id);
kiem("tao duoc", kq0.ok, kq0.ok ? "" : kq0.loi);
if (kq0.ok) {
  kiem("ra DUNG MOT album", kq0.tatCa.length === 1, `${kq0.tatCa.length}`);
  kiem("ten TRON, khong bia ma", kq0.tenThuMuc === `${DAU.ten} khong ma`, kq0.tenThuMuc);
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
  kiem("chi MOT album, khong tu nhan doi", kqT.tatCa.length === 1, `${kqT.tatCa.length}`);
  kiem("giu nguyen ten nguoi go, khong chong them ma", kqT.tenThuMuc === TEN_TAY, kqT.tenThuMuc);
}

/* ── Dọn sạch ─────────────────────────────────────────────────────────── */
console.log("\nDon dep:");
const moiKq = [kq2, kq1, kq0, kqT].filter((k): k is Extract<typeof k, { ok: true }> => k.ok);
const moiThuMuc = moiKq.flatMap((k) => k.tatCa.map((a) => a.thuMucDrive));
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
