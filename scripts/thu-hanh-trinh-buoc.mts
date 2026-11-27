/**
 * ĐI HẾT HÀNH TRÌNH 18 BƯỚC trên database thật — anh yêu cầu 27/11/2026.
 *
 *   npx tsx scripts/thu-hanh-trinh-buoc.mts
 *
 * Anh dặn: "đừng quan tâm những album cũ và hợp đồng cũ, a muốn em test với
 * những cái mới có hợp đồng gắn với album". Nên kịch bản này DỰNG MỚI một
 * hợp đồng cưới hai ngày tiệc KÈM ALBUM GẮN SẴN, rồi đẩy nó qua từng mối nối
 * đúng cách một nhà khách thật đi.
 *
 * Kiểm hai việc vừa làm:
 *   · 1 ↔ 2 — mối nối hai chiều duy nhất, trước nay không có đường nào đẩy
 *   · 7→8, 8→9, 16→17, 17→18 — bốn mối nối cuối, nay có nút
 *
 * TỰ DỌN SẠCH ở cuối và đo lại để xác nhận. Mọi thứ nó tạo mang tiền tố
 * `THU-HANH-TRINH-` nên nhận ra được cả khi kịch bản chết giữa chừng.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { capNhatBuocTheoNgay, capNhatBuocDaChup, capNhatBuocTuDauBuoi } = await import(
  "../src/lib/trangThaiBuoi"
);
const { buocSauKhiNhanHinhIn, buocSauKhiGiaoKhach } = await import("../src/lib/buocAnhGoc");
const p = getPrisma();

const DAU = "THU-HANH-TRINH-";
let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

/* Dọn trước, phòng lần chạy trước chết giữa chừng. */
const donSach = async () => {
  const cu = await p.hopDong.findMany({ where: { maHD: { startsWith: DAU } }, select: { id: true } });
  const ids = cu.map((x) => x.id);
  if (ids.length) {
    await p.gallery.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.lichChup.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.nhatKy.deleteMany({ where: { doiTuongId: { in: ids } } });
    await p.hopDong.deleteMany({ where: { id: { in: ids } } });
  }
  return ids.length;
};
await donSach();

const cacBuoc = await p.buocHopDong.findMany({ select: { ten: true } });
const tenBuoc = (so: number) => cacBuoc.find((b) => b.ten.trim().startsWith(`${so}.`))?.ten ?? null;

const hd = await p.hopDong.create({
  data: {
    maHD: `${DAU}${Date.now()}`,
    tenKhach: "Nhà thử hành trình",
    loaiDV: "CƯỚI",
    buoc: 1,
    trangThai: tenBuoc(1),
    lich: {
      create: [
        { loai: "Chụp hình cổng", ngay: null, lyDoTrong: "Khách chưa chốt ngày", trangThai: "Chưa làm" },
        { loai: "nhà gái", ngay: null, lyDoTrong: "Khách chưa chốt ngày", trangThai: "Chưa làm" },
        { loai: "nhà trai", ngay: null, lyDoTrong: "Khách chưa chốt ngày", trangThai: "Chưa làm" },
      ],
    },
  },
  select: { id: true, lich: { select: { id: true, loai: true } } },
});
/* ALBUM GẮN SẴN, đúng như anh dặn: test với cái mới có hợp đồng gắn album. */
await p.gallery.create({
  data: {
    title: "Nhà thử hành trình",
    slug: `thu-hanh-trinh-${Date.now()}`,
    driveFolderId: `${DAU}drive`,
    hopDongId: hd.id,
    subfolders: ["file gốc hình cổng", "file gốc nhà gái", "file gốc nhà trai"],
  },
});
const cong = hd.lich.find((l) => l.loai === "Chụp hình cổng")!;
const gai = hd.lich.find((l) => l.loai === "nhà gái")!;
const trai = hd.lich.find((l) => l.loai === "nhà trai")!;

const buoc = async () => (await p.hopDong.findUnique({ where: { id: hd.id }, select: { buoc: true } }))?.buoc;
const datBuoc = async (so: number) =>
  p.hopDong.update({ where: { id: hd.id }, data: { buoc: so, trangThai: tenBuoc(so) } });

try {
  console.log("Đã dựng hợp đồng cưới 3 buổi, album gắn sẵn, bước 1.\n");

  console.log("— VIỆC 1: mối nối 1 ↔ 2 —");
  kiem("chưa buổi nào có ngày → vẫn bước 1", await capNhatBuocTheoNgay(hd.id), null);
  kiem("bước 1", await buoc(), 1);

  await p.lichChup.update({ where: { id: cong.id }, data: { ngay: "2026-12-10", lyDoTrong: null } });
  kiem("điền ngày buổi đầu → lên bước 2", await capNhatBuocTheoNgay(hd.id), tenBuoc(2));
  kiem("bước 2", await buoc(), 2);

  await p.lichChup.update({ where: { id: cong.id }, data: { ngay: null, lyDoTrong: "Đã hoãn, chờ ngày mới" } });
  kiem("khách hoãn, xoá hết ngày → LÙI về bước 1", await capNhatBuocTheoNgay(hd.id), tenBuoc(1));
  kiem("bước 1", await buoc(), 1);

  await p.lichChup.update({ where: { id: cong.id }, data: { ngay: "2026-12-10", lyDoTrong: null } });
  await p.lichChup.update({ where: { id: gai.id }, data: { ngay: "2027-01-15", lyDoTrong: null } });
  await p.lichChup.update({ where: { id: trai.id }, data: { ngay: "2027-01-16", lyDoTrong: null } });
  await capNhatBuocTheoNgay(hd.id);
  kiem("điền đủ ba ngày → bước 2", await buoc(), 2);

  console.log("\n— Không chạm bước khác: ở bước 5 mà xoá hết ngày —");
  await datBuoc(5);
  await p.lichChup.updateMany({ where: { hopDongId: hd.id }, data: { ngay: null } });
  kiem("KHÔNG kéo bước 5 về 1", await capNhatBuocTheoNgay(hd.id), null);
  kiem("bước vẫn 5", await buoc(), 5);
  await p.lichChup.update({ where: { id: cong.id }, data: { ngay: "2026-12-10" } });
  await p.lichChup.update({ where: { id: gai.id }, data: { ngay: "2027-01-15" } });
  await p.lichChup.update({ where: { id: trai.id }, data: { ngay: "2027-01-16" } });

  console.log("\n— Ba phép chạy liền nhau trong MỘT lượt lưu lịch —");
  await datBuoc(1);
  await p.lichChup.updateMany({
    where: { hopDongId: hd.id, loai: "Chụp hình cổng" },
    data: { trangThai: "Hoàn thành", daGuiAnhGoc: new Date(), ngay: "2026-11-01" },
  });
  await capNhatBuocTheoNgay(hd.id);
  await capNhatBuocDaChup(hd.id);
  await capNhatBuocTuDauBuoi(hd.id);
  kiem("1 → 2 → (3) → 4 trong một lượt", await buoc(), 4);

  console.log("\n— VIỆC 2: bốn mối nối cuối —");
  kiem("bước 7 → 8", buocSauKhiNhanHinhIn(7), 8);
  kiem("bước 16 → 17", buocSauKhiNhanHinhIn(16), 17);
  kiem("bước 8 → 9", buocSauKhiGiaoKhach(8), 9);
  kiem("bước 17 → 18", buocSauKhiGiaoKhach(17), 18);
  kiem("bước 6 chưa tới lượt nhận hình", buocSauKhiNhanHinhIn(6), null);
  kiem("bước 9 đã xong, không đi tiếp", buocSauKhiGiaoKhach(9), null);
  kiem("bước 18 đã xong", buocSauKhiGiaoKhach(18), null);
  kiem("hai phép không chồng nhau ở bước 8", [buocSauKhiNhanHinhIn(8), buocSauKhiGiaoKhach(8)], [null, 9]);
  kiem("hai phép không chồng nhau ở bước 7", [buocSauKhiNhanHinhIn(7), buocSauKhiGiaoKhach(7)], [8, null]);

  console.log("\n— Đi nốt nhánh chụp: 7 → 8 → 9 —");
  await datBuoc(7);
  kiem("nút nhận hình: 7 → 8", buocSauKhiNhanHinhIn((await buoc()) ?? null), 8);
  await datBuoc(8);
  kiem("nút giao khách: 8 → 9", buocSauKhiGiaoKhach((await buoc()) ?? null), 9);

  console.log("\n— Và nhánh tiệc: 16 → 17 → 18 —");
  await datBuoc(16);
  kiem("nút nhận hình: 16 → 17", buocSauKhiNhanHinhIn((await buoc()) ?? null), 17);
  await datBuoc(17);
  kiem("nút giao khách: 17 → 18", buocSauKhiGiaoKhach((await buoc()) ?? null), 18);
} finally {
  console.log("\n— Dọn —");
  const con = await donSach();
  kiem("đã xoá hợp đồng thử", con > 0, true);
  kiem("không còn hợp đồng thử", await p.hopDong.count({ where: { maHD: { startsWith: DAU } } }), 0);
  kiem("không còn album thử", await p.gallery.count({ where: { driveFolderId: { startsWith: DAU } } }), 0);
  kiem("không còn buổi thử", await p.lichChup.count({ where: { hopDongId: hd.id } }), 0);
  kiem("không còn nhật ký thử", await p.nhatKy.count({ where: { doiTuongId: hd.id } }), 0);
}

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
