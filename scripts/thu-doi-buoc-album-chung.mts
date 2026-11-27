/**
 * ĐỔI BƯỚC TỪ ALBUM DÙNG CHUNG — anh chốt 27/11/2026, việc 2.
 *
 *   npx tsx scripts/thu-doi-buoc-album-chung.mts
 *
 * Đây là chỗ nguy hiểm nhất của cả tính năng album dùng chung: trước hôm nay
 * mọi phép đổi bước đọc thẳng `Gallery.hopDongId`, nên khách bấm "đã chọn
 * xong" ở mục ảnh bé sẽ đẩy bước của HỢP ĐỒNG CƯỚI nằm cùng album.
 *
 * Kịch bản dựng đúng cảnh ấy trên database thật rồi kiểm từng lối, và TỰ DỌN
 * SẠCH. Mọi thứ mang tiền tố `THU-DOIBUOC-`.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { doiBuocAlbum } = await import("../src/lib/doiBuocAlbum");
const { buocSauKhiKhachChonXong } = await import("../src/lib/buocAnhGoc");
const { themHopDongVaoAlbum, hopDongChoThaoTac } = await import("../src/lib/albumChung");
const p = getPrisma();

const DAU = "THU-DOIBUOC-";
let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

const donSach = async () => {
  const hd = await p.hopDong.findMany({ where: { maHD: { startsWith: DAU } }, select: { id: true } });
  const ids = hd.map((x) => x.id);
  if (ids.length) {
    await p.albumHopDong.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.nhatKy.deleteMany({ where: { doiTuongId: { in: ids } } });
    await p.gallery.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.hopDong.deleteMany({ where: { id: { in: ids } } });
  }
  await p.khachHang.deleteMany({ where: { maAppSheet: { startsWith: DAU } } });
  return ids.length;
};
await donSach();

const stamp = Date.now();
const cacBuoc = await p.buocHopDong.findMany({ select: { ten: true } });
const tenBuoc = (so: number) => cacBuoc.find((b) => b.ten.trim().startsWith(`${so}.`))?.ten ?? null;

const khach = await p.khachHang.create({
  data: { maAppSheet: `${DAU}${stamp}`, ten: "Nhà thử đổi bước" },
  select: { id: true },
});
const mk = async (ten: string, loaiDV: string, buoc: number) =>
  p.hopDong.create({
    data: {
      maHD: `${DAU}${ten}-${stamp}`,
      tenKhach: ten,
      loaiDV,
      khachHangId: khach.id,
      buoc,
      trangThai: tenBuoc(buoc),
    },
    select: { id: true },
  });

/* Hợp đồng cưới đang chờ khách chọn file gốc tiệc (bước 13). */
const cuoi = await mk("Cuoi", "CƯỚI", 13);
/* Hợp đồng chụp bé đang chờ khách chọn file gốc (bước 4). */
const baby = await mk("Baby", "Baby", 4);

const album = await p.gallery.create({
  data: {
    title: "Album chung của nhà thử",
    slug: `${DAU.toLowerCase()}${stamp}`,
    driveFolderId: `${DAU}drive-${stamp}`,
    hopDongId: cuoi.id,
    subfolders: ["file gốc nhà gái", "file gốc nhà trai", "Baby - Nhà thử"],
  },
  select: { id: true },
});
await themHopDongVaoAlbum(album.id, cuoi.id, ["file gốc nhà gái", "file gốc nhà trai"]);
await themHopDongVaoAlbum(album.id, baby.id, ["Baby - Nhà thử"]);

const buocCua = async (id: string) =>
  (await p.hopDong.findUnique({ where: { id }, select: { buoc: true } }))?.buoc;

try {
  console.log("Album chung: hợp đồng CƯỚI (bước 13) + hợp đồng BABY (bước 4)\n");

  console.log("— Khách bấm 'đã chọn xong' ở mục ẢNH BÉ —");
  const r1 = await doiBuocAlbum(
    album.id,
    buocSauKhiKhachChonXong,
    "doi-buoc-khach-chon",
    null,
    "Baby - Nhà thử",
  );
  kiem("đổi bước hợp đồng BABY", r1.doiBuoc?.tenKhach, "Baby");
  kiem("hợp đồng Baby 4 → 5", await buocCua(baby.id), 5);
  kiem("hợp đồng CƯỚI KHÔNG bị đụng, vẫn 13", await buocCua(cuoi.id), 13);

  console.log("\n— Khách bấm ở mục ẢNH NHÀ GÁI —");
  const r2 = await doiBuocAlbum(
    album.id,
    buocSauKhiKhachChonXong,
    "doi-buoc-khach-chon",
    null,
    "file gốc nhà gái",
  );
  kiem("đổi bước hợp đồng CƯỚI", r2.doiBuoc?.tenKhach, "Cuoi");
  kiem("hợp đồng Cưới 13 → 14", await buocCua(cuoi.id), 14);
  kiem("hợp đồng Baby giữ nguyên 5", await buocCua(baby.id), 5);

  console.log("\n— Thao tác KHÔNG kèm thư mục (nút trên thẻ album) —");
  const r3 = await doiBuocAlbum(album.id, buocSauKhiKhachChonXong, "doi-buoc-khach-chon", null);
  kiem("không đoán, trả lý do", r3.khongRoHopDong, "nhieu-hop-dong");
  kiem("không đổi bước ai", [await buocCua(cuoi.id), await buocCua(baby.id)], [14, 5]);

  console.log("\n— Thư mục lạ, không hợp đồng nào nhận —");
  const r4 = await doiBuocAlbum(
    album.id,
    buocSauKhiKhachChonXong,
    "doi-buoc-khach-chon",
    null,
    "ảnh ai đó bỏ vào",
  );
  kiem("không đoán", r4.khongRoHopDong, "nhieu-hop-dong");

  console.log("\n— Album CHỈ MỘT hợp đồng thì không hỏi thư mục —");
  const le = await mk("MotMinh", "Baby", 4);
  const albumLe = await p.gallery.create({
    data: {
      title: "Album một hợp đồng",
      slug: `${DAU.toLowerCase()}le-${stamp}`,
      driveFolderId: `${DAU}drive-le-${stamp}`,
      hopDongId: le.id,
      subfolders: ["file gốc"],
    },
    select: { id: true },
  });
  kiem("hỏi không kèm thư mục vẫn ra đúng", await hopDongChoThaoTac(albumLe.id), { hopDongId: le.id });
  const r5 = await doiBuocAlbum(albumLe.id, buocSauKhiKhachChonXong, "doi-buoc-khach-chon", null);
  kiem("và đổi bước được", await buocCua(le.id), 5);
  kiem("báo đúng tên khách", r5.doiBuoc?.tenKhach, "MotMinh");

  console.log("\n— Nhật ký ghi dưới ĐÚNG hợp đồng —");
  const nkBaby = await p.nhatKy.count({ where: { doiTuong: "HopDong", doiTuongId: baby.id } });
  const nkCuoi = await p.nhatKy.count({ where: { doiTuong: "HopDong", doiTuongId: cuoi.id } });
  kiem("hợp đồng Baby có 1 dòng", nkBaby, 1);
  kiem("hợp đồng Cưới có 1 dòng", nkCuoi, 1);
} finally {
  console.log("\n— Dọn —");
  const con = await donSach();
  kiem("đã xoá hợp đồng thử", con > 0, true);
  kiem("không còn hợp đồng thử", await p.hopDong.count({ where: { maHD: { startsWith: DAU } } }), 0);
  kiem("không còn album thử", await p.gallery.count({ where: { driveFolderId: { startsWith: DAU } } }), 0);
  kiem("không còn khách thử", await p.khachHang.count({ where: { maAppSheet: { startsWith: DAU } } }), 0);
}

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
