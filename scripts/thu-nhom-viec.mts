/**
 * Kiểm chip "Hậu kỳ" và ô tìm của trang Đầu việc — anh yêu cầu 26/11/2026.
 *
 *   npx tsx scripts/thu-nhom-viec.mts
 *
 * Hai điều phải đúng: lọc hậu kỳ ở DATABASE ra đúng danh sách tên việc đã
 * duyệt bằng tay, và phép ghép `AND` không làm hở phần giấu việc của người
 * khác (nguyên tắc 55).
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
import type { Prisma } from "../src/generated/prisma/client";
const { getPrisma } = await import("../src/lib/db");
const { locHauKy, TU_HAU_KY } = await import("../src/lib/nhomViec");
const p = getPrisma();

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

console.log("Từ khoá:", TU_HAU_KY.join(", "), "\n");

/* ── 1. Lọc hậu kỳ ra đúng những tên việc nào ───────────────────────── */
const g = await p.congViec.groupBy({
  by: ["loai"],
  where: { matBenAppSheet: null, ...locHauKy() },
  _count: { _all: true },
});
console.log(`Tên việc lọt vào nhóm hậu kỳ: ${g.length}`);
for (const d of g.sort((a, b) => b._count._all - a._count._all)) {
  console.log(`  ${String(d.loai).padEnd(28)} ${d._count._all}`);
}
const tongHauKy = g.reduce((s, d) => s + d._count._all, 0);
console.log(`  cộng: ${tongHauKy}\n`);

/* Không tên nào chứa "photo" mà KHÔNG phải photoshop được lọt vào. */
const lotNham = g.filter((d) => /photo/i.test(d.loai ?? "") && !/photoshop/i.test(d.loai ?? ""));
kiem('không có tên "Photo*" nào lọt vào hậu kỳ', lotNham.map((d) => d.loai), []);

/*
  Việc chụp vẫn nằm ngoài. Phải đếm RIÊNG dòng `loai` trống: SQL ba trị —
  `NOT (NULL LIKE '%photoshop%')` cho ra NULL chứ không phải TRUE, nên dòng
  không có tên việc rơi khỏi CẢ HAI phía của phép `NOT`.

  Đo 26/11: 83 dòng như vậy. Không có tên thì không xếp nhóm được, và đó là
  sự thật đáng để lộ ra chứ không phải chỗ cần vá.
*/
const ngoai = await p.congViec.count({ where: { matBenAppSheet: null, NOT: locHauKy() } });
const trongTen = await p.congViec.count({ where: { matBenAppSheet: null, loai: null } });
const tong = await p.congViec.count({ where: { matBenAppSheet: null } });
kiem("hậu kỳ + ngoài + không tên = tổng", tongHauKy + ngoai + trongTen, tong);
console.log(`  (dòng không có tên việc, không vào nhóm nào: ${trongTen})`);

const photoChup = await p.congViec.count({
  where: { matBenAppSheet: null, loai: { startsWith: "Photo", mode: "insensitive" }, NOT: locHauKy() },
});
console.log(`  (việc tên "Photo*" nằm NGOÀI hậu kỳ: ${photoChup} — đây là thợ chụp)\n`);

/* ── 2. Ghép AND không làm hở phép giấu việc ────────────────────────── */
const khoaToi = "ntmk2104";
const theoNguoi: Prisma.CongViecWhereInput = {
  OR: [{ nguoiPhuTrachMaNV: khoaToi }, { nguoiPhuTrachMaNV: null }, { nguoiPhuTrachMaNV: "" }],
};

const cachDung = await p.congViec.count({
  where: { matBenAppSheet: null, AND: [theoNguoi, locHauKy()] },
});
/* Cách SAI mà hai mảnh OR spread chung sẽ cho ra — phải lớn hơn hẳn. */
const cachSai = await p.congViec.count({
  where: { matBenAppSheet: null, ...theoNguoi, ...locHauKy() },
});
console.log(`Nhân viên "${khoaToi}" xem nhóm hậu kỳ:`);
console.log(`  ghép bằng AND (đang dùng) : ${cachDung}`);
console.log(`  spread chung (cách sai)   : ${cachSai}`);
kiem("AND cho ra ÍT hơn spread chung", cachDung < cachSai, true);

/* Mọi dòng AND trả về đều đúng người VÀ đúng nhóm. */
const mau = await p.congViec.findMany({
  where: { matBenAppSheet: null, AND: [theoNguoi, locHauKy()] },
  select: { loai: true, nguoiPhuTrachMaNV: true },
  take: 500,
});
const saiNguoi = mau.filter((v) => v.nguoiPhuTrachMaNV && v.nguoiPhuTrachMaNV !== khoaToi);
const saiNhom = mau.filter((v) => !TU_HAU_KY.some((t) => (v.loai ?? "").toLowerCase().includes(t.toLowerCase())));
kiem("không dòng nào của người khác", saiNguoi.length, 0);
kiem("không dòng nào ngoài nhóm hậu kỳ", saiNhom.length, 0);

/* ── 3. Ô tìm theo tên hợp đồng, gõ KHÔNG DẤU vẫn ra ────────────── */
const { boDau } = await import("../src/lib/dichVuChung");
const dsViec = await p.congViec.findMany({
  where: { matBenAppSheet: null, hopDongId: { not: null } },
  select: { hopDong: { select: { tenKhach: true } } },
  take: 4000,
});
const timThu = (q: string) =>
  dsViec.filter((v) => boDau(v.hopDong?.tenKhach ?? "").includes(boDau(q.trim()))).length;

/*
  Lấy một tên khách CÓ THẬT trong dữ liệu, và phải có DẤU — bản đầu
  gõ cứng "Huỳnh Tiên", ra 0 việc cho cả bốn cách gõ, nên bốn phép kiểm
  đều "đúng" mà không chứng minh được gì. 0 = 0 thì luôn đúng.
*/
const tenCoDau = dsViec
  .map((v) => v.hopDong?.tenKhach ?? "")
  .find((t) => t.length > 5 && boDau(t) !== t.toLowerCase());
if (!tenCoDau) throw new Error("Không tìm ra tên khách nào có dấu để kiểm.");
const khongDau = boDau(tenCoDau);

console.log(`\nÔ tìm (lọc ở máy chủ web bằng \`boDau\`), tên thật lấy từ dữ liệu:`);
for (const q of [tenCoDau, khongDau, khongDau.toUpperCase()]) {
  console.log(`  "${q}"`.padEnd(34), `→ ${timThu(q)} việc`);
}
kiem("tên có dấu ra NHIỀU HƠN 0", timThu(tenCoDau) > 0, true);
kiem("gõ không dấu ra CÙNG số với có dấu", timThu(khongDau), timThu(tenCoDau));
kiem("gõ HOA ra cùng số", timThu(khongDau.toUpperCase()), timThu(tenCoDau));
kiem("tìm chuỗi rỗng không lọc gì", timThu(""), dsViec.length);
kiem("tên không có thật ra 0", timThu("zzz khong co that"), 0);


console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
