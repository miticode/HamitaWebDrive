/**
 * TIỀN khi khách đã thanh toán xong prewedding rồi book tiếp ngày cưới GHI
 * CHUNG vào hợp đồng cũ — anh hỏi 27/11/2026.
 *
 *   npx tsx scripts/thu-tien-book-them.mts
 *
 * Tự dọn sạch, mọi thứ mang tiền tố `THU-TIEN-THEM-`.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
const { getPrisma } = await import("../src/lib/db");
const { tinhLaiTien } = await import("../src/lib/suaHopDong");
const p = getPrisma();

const DAU = "THU-TIEN-THEM-";
let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};
const tien = (n: number) => n.toLocaleString("vi-VN");

const donSach = async () => {
  const cu = await p.hopDong.findMany({ where: { maHD: { startsWith: DAU } }, select: { id: true } });
  const ids = cu.map((x) => x.id);
  if (ids.length) {
    await p.phieuThu.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.chiTietHopDong.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.hopDong.deleteMany({ where: { id: { in: ids } } });
  }
  return ids.length;
};
await donSach();

const hd = await p.hopDong.create({
  data: {
    maHD: `${DAU}${Date.now()}`,
    tenKhach: "Nhà thử tiền",
    loaiDV: "PreWedding",
    buoc: 9,
    ngayDat: "2026-09-01",
    chiTiet: { create: [{ maAppSheet: `${DAU}ct1`, tenDV: "Gói PreWedding", soLuong: 1, donGia: 8_000_000, thanhTien: 8_000_000 }] },
    phieuThu: { create: [{ maAppSheet: `${DAU}pt1`, noiDung: "Thanh toán đủ", soTien: 8_000_000, ngayThu: "2026-09-20", trangThai: "Đã duyệt" }] },
  },
  select: { id: true },
});
await p.$transaction(async (tx) => tinhLaiTien(tx, hd.id));

const doc = async () =>
  p.hopDong.findUnique({
    where: { id: hd.id },
    select: { thanhTien: true, tongTien: true, daThu: true, conLai: true, ngayDat: true, danhSachDV: true },
  });

try {
  const t1 = await doc();
  console.log(`Hợp đồng PreWedding: tổng ${tien(t1!.tongTien)} · đã thu ${tien(t1!.daThu)} · còn ${tien(t1!.conLai)}\n`);
  kiem("đã thanh toán xong", t1?.conLai, 0);

  console.log("— Khách book tiếp ngày cưới, GHI CHUNG vào hợp đồng này —");
  await p.chiTietHopDong.create({
    data: { hopDongId: hd.id, maAppSheet: `${DAU}ct2`, tenDV: "Gói tiệc cưới 2 ngày", soLuong: 1, donGia: 25_000_000, thanhTien: 25_000_000 },
  });
  await p.$transaction(async (tx) => tinhLaiTien(tx, hd.id));
  const t2 = await doc();
  console.log(`  sau khi thêm: tổng ${tien(t2!.tongTien)} · đã thu ${tien(t2!.daThu)} · còn ${tien(t2!.conLai)}`);
  kiem("tổng tiền cộng thêm gói cưới", t2?.tongTien, 33_000_000);
  kiem("đã thu GIỮ NGUYÊN, phiếu thu cũ không bị đụng", t2?.daThu, 8_000_000);
  kiem("còn nợ = phần cưới chưa thu", t2?.conLai, 25_000_000);
  kiem("ngày đặt KHÔNG bị kéo về hôm nay", t2?.ngayDat, "2026-09-01");
  kiem("danh sách DV gộp cả hai gói", t2?.danhSachDV, "Gói PreWedding , Gói tiệc cưới 2 ngày");

  console.log("\n— Khách đóng cọc cưới —");
  await p.phieuThu.create({
    data: { hopDongId: hd.id, maAppSheet: `${DAU}pt2`, noiDung: "Cọc tiệc cưới", soTien: 10_000_000, ngayThu: "2026-11-27", trangThai: "Đã duyệt" },
  });
  await p.$transaction(async (tx) => tinhLaiTien(tx, hd.id));
  const t3 = await doc();
  console.log(`  sau khi cọc: tổng ${tien(t3!.tongTien)} · đã thu ${tien(t3!.daThu)} · còn ${tien(t3!.conLai)}`);
  kiem("đã thu cộng dồn hai phiếu", t3?.daThu, 18_000_000);
  kiem("còn nợ trừ đúng", t3?.conLai, 15_000_000);

  console.log("\n— Doanh thu theo THÁNG THU, không theo tháng lập hợp đồng —");
  const thang9 = await p.phieuThu.aggregate({ where: { hopDongId: hd.id, ngayThu: { startsWith: "2026-09" } }, _sum: { soTien: true } });
  const thang11 = await p.phieuThu.aggregate({ where: { hopDongId: hd.id, ngayThu: { startsWith: "2026-11" } }, _sum: { soTien: true } });
  kiem("tháng 9 chỉ có tiền prewedding", thang9._sum.soTien, 8_000_000);
  kiem("tháng 11 chỉ có cọc cưới", thang11._sum.soTien, 10_000_000);

  console.log("\n— Chỗ dễ gây hiểu nhầm —");
  const pt = await p.phieuThu.findMany({ where: { hopDongId: hd.id }, select: { noiDung: true, soTien: true }, orderBy: { ngayThu: "asc" } });
  console.log("  Phiếu thu của hợp đồng này:");
  for (const x of pt) console.log(`    ${String(x.noiDung).padEnd(20)} ${tien(x.soTien)}đ`);
  console.log(`  ⚠ Phiếu đầu vẫn ghi "Thanh toán đủ" trong khi hợp đồng còn nợ ${tien(t3!.conLai)}đ`);
} finally {
  console.log("\n— Dọn —");
  const con = await donSach();
  kiem("đã xoá hợp đồng thử", con > 0, true);
  kiem("không còn hợp đồng thử", await p.hopDong.count({ where: { maHD: { startsWith: DAU } } }), 0);
  kiem("không còn phiếu thu thử", await p.phieuThu.count({ where: { maAppSheet: { startsWith: DAU } } }), 0);
  kiem("không còn dòng dịch vụ thử", await p.chiTietHopDong.count({ where: { maAppSheet: { startsWith: DAU } } }), 0);
}
console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
