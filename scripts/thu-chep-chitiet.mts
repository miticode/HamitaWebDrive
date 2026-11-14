/**
 * Kiểm: chi tiết gói chảy từ bảng Dịch vụ vào dòng hợp đồng có GIỮ NGUYÊN
 * xuống dòng khi lưu xuống database không.
 *
 * Vì sao phải đo chứ không tin: `kiemHopDongMoi` chạy mọi chuỗi qua `gon()`,
 * mà `gon` có gộp khoảng trắng. Nếu nó gộp cả `\n` thì mô tả mười dòng của
 * gói chụp phóng sự biến thành một dòng chữ dính liền, và hợp đồng in ra
 * không đọc nổi. (`gon` dùng `[ \t]+`, nên không — nhưng đọc code không bằng
 * đo thật.)
 *
 * Chạy: npx tsx scripts/thu-chep-chitiet.mts
 * Dọn:  npx tsx scripts/thu-don-dep.mts
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
const { lapHopDongMoi } = await import("../src/lib/taoHopDong");

const p = getPrisma();
const NGUOI = { id: "", ten: `${DAU.tienTo} quan ly`, maNV: DAU.maNV, tenDangNhap: "zz-thu-quan-tri" };

/* Lấy mục THẬT có mô tả nhiều dòng nhất trong bảng — không bịa dữ liệu. */
const cacMuc = await p.dichVu.findMany({
  where: { dangDung: true },
  select: { id: true, maDV: true, ten: true, loai: true, chiTiet: true },
});
const muc = cacMuc
  .filter((m) => (m.chiTiet ?? "").includes("\n"))
  .sort((a, b) => (b.chiTiet?.length ?? 0) - (a.chiTiet?.length ?? 0))[0];

if (!muc) {
  console.log("Khong co muc nao co mo ta nhieu dong — khong kiem duoc.");
  process.exit(1);
}

const goc = muc.chiTiet!;
console.log(`Muc thu: ${muc.maDV} "${muc.ten}"`);
console.log(`Mo ta goc: ${goc.length} ky tu, ${goc.split("\n").length} dong\n`);

let dat = 0, truot = 0;
const kiem = (ten: string, ok: boolean, them = "") => {
  console.log(`  ${ok ? "OK " : "XX "} ${ten}${them ? ` — ${them}` : ""}`);
  ok ? dat++ : truot++;
};

const tao = await lapHopDongMoi(
  {
    khachHangId: null,
    khachMoi: { ten: `${DAU.ten} chi tiet`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" },
    tenKhach: `${DAU.ten} chi tiet`,
    loaiDV: "CƯỚI",
    ngayDat: "2026-11-14",
    diaChi: "",
    ghiChu: "",
    khuyenMai: 0,
    trangThai: "1. Chưa có ngày chụp",
    dong: [
      {
        dichVuId: muc.id,
        maDV: muc.maDV,
        tenDV: muc.ten,
        loai: muc.loai,
        donGia: 1_000_000,
        soLuong: 1,
        ngayChup: "",
        chiTiet: goc,
        ghiChu: "",
      },
    ],
    thu: [],
    lich: [],
    viec: [],
  } as never,
  NGUOI as never,
);
if ("loi" in tao) {
  console.log(`Khong lap duoc: ${tao.loi}`);
  process.exit(1);
}

const luu = await p.chiTietHopDong.findFirst({
  where: { hopDongId: tao.id },
  select: { chiTiet: true, tenDV: true },
});
const sau = luu?.chiTiet ?? "";

kiem("dong chi tiet duoc ghi", !!luu, luu?.tenDV ?? "");
kiem("GIU NGUYEN so dong", sau.split("\n").length === goc.split("\n").length,
  `${goc.split("\n").length} -> ${sau.split("\n").length}`);
kiem("khong bi bep thanh mot dong", sau.includes("\n"));
kiem("giu dung tung dong mot", sau.split("\n").map((d) => d.trim()).join("|") === goc.split("\n").map((d) => d.trim()).join("|"));
kiem("do dai sai lech khong qua 5%", Math.abs(sau.length - goc.length) <= goc.length * 0.05,
  `${goc.length} -> ${sau.length} ky tu`);

console.log(`\nDAT ${dat} · TRUOT ${truot}\nDon bang: npx tsx scripts/thu-don-dep.mts`);
await p.$disconnect();
