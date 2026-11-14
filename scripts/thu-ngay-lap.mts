/**
 * Kiem: NGAY LAP HOP DONG co dung la dau thoi gian khong doi duoc khong.
 *
 * Bay nguy hiem nhat cua thay doi 14/11/2026: `kiemSuaHopDong` muon lai
 * `kiemHopDongMoi`. Neu ep ngay trong ham kiem do thi moi lan sua mot hop dong
 * cu lai keo ngay dat cua no ve hom nay — 2.402 hop dong chep tu AppSheet hong
 * dan theo tung lan mo ra sua. Script nay chung minh dieu do KHONG xay ra.
 *
 * Chay: npx tsx scripts/thu-ngay-lap.mts
 * Don:  npx tsx scripts/thu-don-dep.mts
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
const { suaHopDong } = await import("../src/lib/suaHopDong");
const { homNayStudio } = await import("../src/lib/constants");

const p = getPrisma();
const NGUOI = { id: "", ten: `${DAU.tienTo} quan ly`, maNV: DAU.maNV, tenDangNhap: "zz-thu-quan-tri" };
const NGAY_CU = "2024-03-05";

let dat = 0, truot = 0;
const kiem = (ten: string, ok: boolean, them = "") => {
  console.log(`  ${ok ? "OK " : "XX "} ${ten}${them ? ` — ${them}` : ""}`);
  ok ? dat++ : truot++;
};

const tao = await lapHopDongMoi(
  {
    khachHangId: null,
    khachMoi: { ten: `${DAU.ten} ngay lap`, soDienThoai: DAU.sdt, tinh: "", ghiChu: "" },
    tenKhach: `${DAU.ten} ngay lap`,
    loaiDV: "CƯỚI",
    ngayDat: NGAY_CU,
    diaChi: "",
    ghiChu: "",
    khuyenMai: 0,
    trangThai: "1. Chưa có ngày chụp",
    dong: [{ dichVuId: null, maDV: "", tenDV: ` goi`, loai: "dich-vu", donGia: 1_000_000, soLuong: 1, ngayChup: "", chiTiet: "", ghiChu: "" }] as never,
    thu: [],
    lich: [],
    viec: [],
  } as never,
  NGUOI as never,
);
if ("loi" in tao) { console.log(`Khong lap duoc hop dong thu: ${tao.loi}`); process.exit(1); }

console.log(`\nHop dong thu ${tao.maHD}, ngay dat dat tay = ${NGAY_CU} (gia lam hop dong cu tu AppSheet)\n`);

const truoc = await p.hopDong.findUnique({ where: { id: tao.id }, select: { ngayDat: true } });
kiem("hop dong cu giu dung ngay cu", truoc?.ngayDat === NGAY_CU, `${truoc?.ngayDat}`);

const sua = await suaHopDong(
  tao.id,
  {
    tenKhach: `${DAU.ten} ngay lap doi ten`,
    loaiDV: "CƯỚI",
    diaChi: "",
    ghiChu: "",
    khuyenMai: 0,
    trangThai: "2. Đã có ngày chụp",
    dong: [{ dichVuId: null, maDV: "", tenDV: ` goi`, loai: "dich-vu", donGia: 1_500_000, soLuong: 1, ngayChup: "", chiTiet: "", ghiChu: "" }],
  } as never,
  NGUOI as never,
);
kiem("sua hop dong khong bao loi", !("loi" in sua), "loi" in sua ? sua.loi : "");

const sauKhiSua = await p.hopDong.findUnique({
  where: { id: tao.id },
  select: { ngayDat: true, tenKhach: true, trangThai: true, tongTien: true },
});
kiem("NGAY DAT GIU NGUYEN sau khi sua", sauKhiSua?.ngayDat === NGAY_CU, `${sauKhiSua?.ngayDat}`);
kiem("khong bi keo ve hom nay", sauKhiSua?.ngayDat !== homNayStudio(), `hom nay la ${homNayStudio()}`);
kiem("phan con lai cua ban sua VAN AP DUNG", sauKhiSua?.tenKhach?.includes("doi ten") === true, sauKhiSua?.tenKhach ?? "");
kiem("trang thai doi duoc", sauKhiSua?.trangThai === "2. Đã có ngày chụp", sauKhiSua?.trangThai ?? "");
kiem("tien tinh lai dung", sauKhiSua?.tongTien === 1_500_000, `${sauKhiSua?.tongTien}`);

console.log(`\nDAT ${dat} · TRUOT ${truot}\nDon bang: npx tsx scripts/thu-don-dep.mts`);
