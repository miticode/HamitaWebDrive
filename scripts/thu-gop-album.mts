/**
 * KHÁCH BOOK LẦN HAI THÌ DÙNG CHUNG ALBUM — anh chốt 27/11/2026.
 *
 *   npx tsx scripts/thu-gop-album.mts
 *
 * Kiểm phần DATABASE của việc gộp: tìm album sẵn có của khách, ghi bảng nối,
 * rồi phân thư mục về đúng hợp đồng. Phần Drive (lối tắt) đã thử riêng bằng
 * `thu-loi-tat-drive.mts` trên kho thật.
 *
 * TỰ DỌN SẠCH, mọi thứ mang tiền tố `THU-GOP-`.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { albumSanCoCuaKhach, hopDongCuaAlbum, hopDongCuaMuc, themHopDongVaoAlbum } = await import(
  "../src/lib/albumChung"
);
const p = getPrisma();

const DAU = "THU-GOP-";
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
    await p.gallery.deleteMany({ where: { hopDongId: { in: ids } } });
    await p.hopDong.deleteMany({ where: { id: { in: ids } } });
  }
  await p.khachHang.deleteMany({ where: { maAppSheet: { startsWith: DAU } } });
  return ids.length;
};
await donSach();

const stamp = Date.now();
const khach = await p.khachHang.create({
  data: { maAppSheet: `${DAU}${stamp}`, ten: "Nhà thử gộp album" },
  select: { id: true },
});

/** Dựng một hợp đồng của khách ấy; `album` = có tạo album riêng không. */
async function hopDong(ten: string, loaiDV: string, coAlbum: boolean, thuMuc: string[] = []) {
  const hd = await p.hopDong.create({
    data: { maHD: `${DAU}${ten}-${stamp}`, tenKhach: ten, loaiDV, khachHangId: khach.id, buoc: 1 },
    select: { id: true },
  });
  if (coAlbum) {
    const g = await p.gallery.create({
      data: {
        title: ten,
        slug: `${DAU.toLowerCase()}${ten.toLowerCase().replace(/\s+/g, "-")}-${stamp}`,
        driveFolderId: `${DAU}drive-${ten}-${stamp}`,
        hopDongId: hd.id,
        subfolders: thuMuc,
      },
      select: { id: true },
    });
    await themHopDongVaoAlbum(g.id, hd.id, thuMuc);
    return { hopDongId: hd.id, galleryId: g.id };
  }
  return { hopDongId: hd.id, galleryId: null };
}

try {
  console.log("— Lần chụp đầu: hợp đồng CƯỚI, có album riêng —");
  const cuoi = await hopDong("Cuoi", "CƯỚI", true, ["file gốc nhà gái", "file gốc nhà trai"]);
  kiem(
    "bảng nối ghi ngay từ album đầu tiên",
    (await hopDongCuaAlbum(cuoi.galleryId!)).map((x) => x.hopDongId),
    [cuoi.hopDongId],
  );

  console.log("\n— Lần chụp sau: hợp đồng Baby, cùng khách —");
  const baby = await hopDong("Baby", "Baby", false);
  const sanCo = await albumSanCoCuaKhach(baby.hopDongId);
  kiem("tìm thấy album sẵn có của khách", "album" in sanCo, true);
  if ("album" in sanCo) kiem("và đúng album của hợp đồng cưới", sanCo.album.id, cuoi.galleryId);

  /* Đúng việc `taoThuMucVaAlbum` làm sau khi đặt lối tắt. */
  await themHopDongVaoAlbum(cuoi.galleryId!, baby.hopDongId, ["Baby - Nhà thử"]);
  const ds = await hopDongCuaAlbum(cuoi.galleryId!);
  kiem("album giờ mang HAI hợp đồng", ds.length, 2);
  kiem(
    "và đúng hai cái ấy",
    ds.map((x) => x.hopDongId).sort(),
    [cuoi.hopDongId, baby.hopDongId].sort(),
  );

  console.log("\n— Phân thư mục về đúng hợp đồng —");
  kiem("file gốc nhà gái → hợp đồng CƯỚI", hopDongCuaMuc(ds, "file gốc nhà gái"), { hopDongId: cuoi.hopDongId });
  kiem("file gốc nhà trai → hợp đồng CƯỚI", hopDongCuaMuc(ds, "file gốc nhà trai"), { hopDongId: cuoi.hopDongId });
  kiem("Baby - Nhà thử → hợp đồng BABY", hopDongCuaMuc(ds, "Baby - Nhà thử"), { hopDongId: baby.hopDongId });
  kiem("thư mục lạ → KHÔNG đoán", hopDongCuaMuc(ds, "ảnh thêm"), { lyDo: "nhieu-hop-dong" });

  console.log("\n— Gọi lại `themHopDongVaoAlbum` thì CỘNG THÊM, không ghi đè —");
  await themHopDongVaoAlbum(cuoi.galleryId!, cuoi.hopDongId, ["file hoàn thiện"]);
  const ds2 = await hopDongCuaAlbum(cuoi.galleryId!);
  const cuaCuoi = ds2.find((x) => x.hopDongId === cuoi.hopDongId)!;
  kiem("hợp đồng cưới giữ đủ ba thư mục", cuaCuoi.thuMuc.length, 3);
  kiem("thư mục cũ không mất", cuaCuoi.thuMuc.includes("file gốc nhà gái"), true);
  kiem("và có thêm cái mới", cuaCuoi.thuMuc.includes("file hoàn thiện"), true);

  console.log("\n— Lần chụp thứ ba —");
  const nhaSu = await hopDong("NhaSu", "NHÀ SU", false);
  const sanCo3 = await albumSanCoCuaKhach(nhaSu.hopDongId);
  kiem("vẫn tìm ra đúng MỘT album (bảng nối không làm nhân đôi)", "album" in sanCo3, true);

  console.log("\n— Khi KHÔNG được gộp —");
  const le = await p.hopDong.create({
    data: { maHD: `${DAU}le-${stamp}`, tenKhach: "Khách chưa gắn", loaiDV: "Khách lẻ", buoc: 1 },
    select: { id: true },
  });
  kiem("hợp đồng chưa gắn khách → không gộp", await albumSanCoCuaKhach(le.id), { khong: "khach-moi" });

  const khach2 = await p.khachHang.create({
    data: { maAppSheet: `${DAU}k2-${stamp}`, ten: "Khách chưa có album" },
    select: { id: true },
  });
  const moi = await p.hopDong.create({
    data: { maHD: `${DAU}moi-${stamp}`, tenKhach: "Chưa album", khachHangId: khach2.id, buoc: 1 },
    select: { id: true },
  });
  kiem("khách chưa có album nào → không gộp", await albumSanCoCuaKhach(moi.id), { khong: "chua-co-album" });

  /* Khách có HAI album: không đoán chọn cái nào. */
  await hopDong("Cuoi2", "CƯỚI", true, ["file gốc"]);
  const them = await hopDong("GiaDinh", "GIA ĐÌNH", false);
  kiem("khách có hai album → KHÔNG đoán", await albumSanCoCuaKhach(them.hopDongId), { khong: "nhieu-album" });
} finally {
  console.log("\n— Dọn —");
  const con = await donSach();
  kiem("đã xoá hợp đồng thử", con > 0, true);
  kiem("không còn hợp đồng thử", await p.hopDong.count({ where: { maHD: { startsWith: DAU } } }), 0);
  kiem("không còn album thử", await p.gallery.count({ where: { driveFolderId: { startsWith: DAU } } }), 0);
  kiem("không còn khách thử", await p.khachHang.count({ where: { maAppSheet: { startsWith: DAU } } }), 0);
  kiem(
    "không còn dòng bảng nối thử",
    await p.albumHopDong.count({ where: { gallery: { driveFolderId: { startsWith: DAU } } } }),
    0,
  );
}

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
