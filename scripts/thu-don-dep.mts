/**
 * DỌN DẸP sau kịch bản thử — chạy độc lập được, bao nhiêu lần cũng được.
 *
 * Mọi thứ kịch bản tạo ra đều mang một trong ba dấu nhận biết dưới đây, nên
 * dọn không cần nhớ id nào. Viết TRƯỚC kịch bản chứ không phải sau: kịch bản
 * hỏng giữa chừng thì vẫn phải dọn sạch được.
 *
 *   npx tsx scripts/thu-don-dep.mts
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { DAU } from "./thu-dau";

const { getPrisma } = await import("../src/lib/db");
const p = getPrisma();

const xoa: [string, () => Promise<{ count: number }>][] = [
  ["congViec", () => p.congViec.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["lichChup", () => p.lichChup.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["phieuThu", () => p.phieuThu.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["chiTietHD", () => p.chiTietHopDong.deleteMany({ where: { hopDong: { tenKhach: { contains: DAU.ten } } } })],
  ["hopDong", () => p.hopDong.deleteMany({ where: { tenKhach: { contains: DAU.ten } } })],
  ["khachHang", () => p.khachHang.deleteMany({ where: { OR: [{ ten: { contains: DAU.ten } }, { soDienThoai: { in: [DAU.sdt, DAU.sdt2, DAU.sdt3] } }] } })],
  ["khachTiemNang", () => p.khachTiemNang.deleteMany({ where: { tenNguoi: { contains: DAU.ten } } })],
  ["chiTieu", () => p.chiTieu.deleteMany({ where: { dienGiai: { contains: DAU.ten } } })],
  ["chamCong", () => p.chamCong.deleteMany({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } })],
  ["donTu", () => p.donTu.deleteMany({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } })],
  ["suCo", () => p.suCo.deleteMany({ where: { vanDe: { contains: DAU.ten } } })],
  ["luongNhanVien", () => p.luongNhanVien.deleteMany({ where: { kyLuong: DAU.kyLuong } })],
  ["kyLuong", () => p.kyLuong.deleteMany({ where: { maAppSheet: DAU.kyLuong } })],
  ["nhatKy", () => p.nhatKy.deleteMany({ where: { nguoiTen: { contains: DAU.ten } } })],
];

let tong = 0;
for (const [ten, f] of xoa) {
  const { count } = await f();
  if (count) console.log(`  xoá ${String(count).padStart(3)} dòng ${ten}`);
  tong += count;
}
console.log(tong ? `Đã xoá ${tong} dòng.` : "Không còn gì để xoá.");

/* ── ĐO LẠI để xác nhận sạch, không chỉ tin là đã dọn ─────────────────── */
const con = {
  hopDong: await p.hopDong.count({ where: { tenKhach: { contains: DAU.ten } } }),
  khachHang: await p.khachHang.count({ where: { OR: [{ ten: { contains: DAU.ten } }, { soDienThoai: { in: [DAU.sdt, DAU.sdt2, DAU.sdt3] } }] } }),
  khachTiemNang: await p.khachTiemNang.count({ where: { tenNguoi: { contains: DAU.ten } } }),
  chiTieu: await p.chiTieu.count({ where: { dienGiai: { contains: DAU.ten } } }),
  chamCong: await p.chamCong.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } }),
  donTu: await p.donTu.count({ where: { maNV: { equals: DAU.maNV, mode: "insensitive" } } }),
  suCo: await p.suCo.count({ where: { vanDe: { contains: DAU.ten } } }),
  kyLuong: await p.kyLuong.count({ where: { maAppSheet: DAU.kyLuong } }),
  luongNV: await p.luongNhanVien.count({ where: { kyLuong: DAU.kyLuong } }),
  nhatKy: await p.nhatKy.count({ where: { nguoiTen: { contains: DAU.ten } } }),
};
const sot = Object.entries(con).filter(([, v]) => v > 0);
console.log(sot.length ? `CÒN SÓT: ${sot.map(([k, v]) => `${k}=${v}`).join(", ")}` : "ĐÃ SẠCH — đo lại 10 bảng, không còn dòng thử nào.");
