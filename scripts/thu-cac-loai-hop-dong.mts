/**
 * ĐI HẾT HÀNH TRÌNH với BỐN NHÓM HỢP ĐỒNG THẬT — anh yêu cầu 27/11/2026.
 *
 *   npx tsx scripts/thu-cac-loai-hop-dong.mts
 *
 * Anh liệt kê bốn nhóm cần kiểm:
 *   1. chỉ prewedding / bé / beauty / nhà su…  (không có buổi tiệc)
 *   2. có cả prewedding lẫn cưới (1 ngày, 2 ngày)
 *   3. chỉ cưới (1 ngày, 2 ngày)
 *   4. hợp đồng đã xong, khách quay lại book thêm gia đình / bé / bầu
 *
 * Mỗi ca dựng MỘT HỢP ĐỒNG MỚI KÈM ALBUM GẮN SẴN, rồi đẩy qua từng mối nối
 * đúng cách một nhà khách thật đi, và ghi lại bước nó dừng ở đâu.
 *
 * TỰ DỌN SẠCH ở cuối, mọi thứ mang tiền tố `THU-LOAI-HD-`.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { capNhatChuyenNhanh, capNhatBuocTheoNgay, capNhatBuocDaChup, capNhatBuocTuDauBuoi } =
  await import("../src/lib/trangThaiBuoi");
const { nhanhCuaBuoi } = await import("../src/lib/nhanhBuoi");
const p = getPrisma();

const DAU = "THU-LOAI-HD-";
let truot = 0;
const ket: string[] = [];
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

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

type Buoi = { loai: string; ngay: string | null };

/** Dựng một hợp đồng thử kèm album gắn sẵn, trả về id và map buổi. */
async function dung(ten: string, loaiDV: string, buocDau: number, buoi: Buoi[], thuMuc: string[]) {
  const hd = await p.hopDong.create({
    data: {
      maHD: `${DAU}${ten}-${Date.now()}`,
      tenKhach: ten,
      loaiDV,
      buoc: buocDau,
      trangThai: tenBuoc(buocDau),
      lich: {
        create: buoi.map((b) => ({
          loai: b.loai,
          ngay: b.ngay,
          lyDoTrong: b.ngay ? null : "Khách chưa chốt ngày",
          trangThai: "Chưa làm",
        })),
      },
    },
    select: { id: true, lich: { select: { id: true, loai: true, ngay: true } } },
  });
  await p.gallery.create({
    data: {
      title: ten,
      slug: `${DAU.toLowerCase()}${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      driveFolderId: `${DAU}drive-${Date.now()}`,
      hopDongId: hd.id,
      subfolders: thuMuc,
    },
  });
  return hd;
}

const docBuoc = async (id: string) =>
  (await p.hopDong.findUnique({ where: { id }, select: { buoc: true } }))?.buoc ?? null;

/** Chạy cả ba phép đổi bước, đúng thứ tự như `luuLichAction` làm. */
async function luuLich(id: string) {
  await capNhatChuyenNhanh(id);
  await capNhatBuocTheoNgay(id);
  await capNhatBuocDaChup(id);
  await capNhatBuocTuDauBuoi(id);
  return docBuoc(id);
}

/** Thợ chụp xong + gửi ảnh gốc cho những buổi khớp `loc`. */
async function xongVaGui(id: string, loc: (loai: string) => boolean) {
  const ls = await p.lichChup.findMany({ where: { hopDongId: id }, select: { id: true, loai: true } });
  for (const l of ls) {
    if (loc(l.loai ?? "")) {
      await p.lichChup.update({
        where: { id: l.id },
        data: { trangThai: "Hoàn thành", daGuiAnhGoc: new Date() },
      });
    }
  }
}

try {
  /* ══ NHÓM 1 — không có buổi tiệc ══════════════════════════════════════ */
  console.log("\n══ NHÓM 1: hợp đồng KHÔNG có buổi tiệc ══\n");
  for (const [ten, loaiDV, loaiBuoi] of [
    ["PreWedding một buổi", "PreWedding", "Ngày chụp"],
    ["Chụp bé", "Baby", "chụp bé"],
    ["Beauty", "Khách lẻ", "Chụp Beauty"],
    ["Nhà Su", "NHÀ SU", "Nhà Su"],
  ] as const) {
    const hd = await dung(ten, loaiDV, 1, [{ loai: loaiBuoi, ngay: null }], ["file gốc"]);
    kiem(`${ten}: buổi "${loaiBuoi}" thuộc nhánh chụp`, nhanhCuaBuoi(loaiBuoi), "chup");
    await p.lichChup.updateMany({ where: { hopDongId: hd.id }, data: { ngay: "2026-12-05", lyDoTrong: null } });
    kiem(`${ten}: điền ngày → bước 2`, await luuLich(hd.id), 2);
    await xongVaGui(hd.id, () => true);
    kiem(`${ten}: chụp xong + gửi gốc → bước 4`, await luuLich(hd.id), 4);
  }

  /* ══ NHÓM 3 — chỉ có cưới ═════════════════════════════════════════════ */
  console.log("\n══ NHÓM 3: hợp đồng CHỈ có cưới ══\n");

  /* 3a. Cưới MỘT ngày, người lập chọn bước 10 "Chờ ngày tiệc" — đúng nhánh. */
  const c1 = await dung("Cưới 1 ngày", "CƯỚI", 10, [{ loai: "Ngày cưới", ngay: "2027-02-10" }], [
    "file gốc tiệc",
  ]);
  kiem("Cưới 1 ngày: buổi thuộc nhánh tiệc", nhanhCuaBuoi("Ngày cưới"), "tiec");
  await xongVaGui(c1.id, () => true);
  kiem("Cưới 1 ngày: chụp xong + gửi gốc → bước 13", await luuLich(c1.id), 13);

  /* 3b. Cưới HAI ngày. */
  const c2 = await dung("Cưới 2 ngày", "CƯỚI", 10, [
    { loai: "nhà gái", ngay: "2027-02-10" },
    { loai: "nhà trai", ngay: "2027-02-11" },
  ], ["file gốc nhà gái", "file gốc nhà trai"]);
  await xongVaGui(c2.id, (l) => l === "nhà gái");
  /*
    Giữ nguyên 10 chứ không phải 12: `buocDaChup` đòi MỌI buổi hoàn thành mới
    cho "12. Đã xong tiệc", mà nhà trai còn chưa chụp. Bản đầu của kịch bản
    này mong 12 và báo trượt — kỳ vọng sai, không phải code sai.
  */
  kiem("Cưới 2 ngày: mới xong nhà gái → giữ bước 10", await luuLich(c2.id), 10);
  await xongVaGui(c2.id, (l) => l === "nhà trai");
  kiem("Cưới 2 ngày: xong cả hai → bước 13", await luuLich(c2.id), 13);

  /* 3c. Cưới mà người lập LỠ chọn bước 1 — bước của nhánh chụp. */
  const c3 = await dung("Cưới lỡ chọn bước 1", "CƯỚI", 1, [
    { loai: "nhà gái", ngay: "2027-03-01" },
    { loai: "nhà trai", ngay: "2027-03-02" },
  ], ["file gốc nhà gái", "file gốc nhà trai"]);
  kiem("Cưới lỡ chọn bước 1: chỉ có buổi tiệc → sang thẳng bước 10", await luuLich(c3.id), 10);
  await xongVaGui(c3.id, () => true);
  kiem("Cưới lỡ chọn bước 1: rồi xong cả hai buổi → bước 13", await luuLich(c3.id), 13);

  /* ══ NHÓM 2 — có cả prewedding lẫn cưới ═══════════════════════════════ */
  console.log("\n══ NHÓM 2: có CẢ prewedding lẫn cưới ══\n");

  /* 2a. PreWedding + cưới 1 ngày. */
  const m1 = await dung("PreWedding + cưới 1 ngày", "CƯỚI", 1, [
    { loai: "Chụp hình cổng", ngay: "2026-12-20" },
    { loai: "Ngày cưới", ngay: "2027-02-14" },
  ], ["file gốc hình cổng", "file gốc tiệc"]);
  kiem("PW+cưới 1 ngày: điền ngày → bước 2", await luuLich(m1.id), 2);
  await xongVaGui(m1.id, (l) => l === "Chụp hình cổng");
  kiem("PW+cưới 1 ngày: xong ảnh cổng → bước 4 (KHÔNG kẹt vì buổi tiệc)", await luuLich(m1.id), 4);
  /* Media đi hết nhánh chụp tới 9, rồi tới lượt tiệc. */
  await p.hopDong.update({ where: { id: m1.id }, data: { buoc: 9, trangThai: tenBuoc(9) } });
  await xongVaGui(m1.id, (l) => l === "Ngày cưới");
  kiem("PW+cưới 1 ngày: xong nhánh chụp (9) → đi tiếp tới 13 qua ngả 10", await luuLich(m1.id), 13);

  /* 2b. PreWedding + cưới 2 ngày. */
  const m2 = await dung("PreWedding + cưới 2 ngày", "CƯỚI", 2, [
    { loai: "Chụp hình cổng", ngay: "2026-12-20" },
    { loai: "nhà gái", ngay: "2027-02-14" },
    { loai: "nhà trai", ngay: "2027-02-15" },
  ], ["file gốc hình cổng", "file gốc nhà gái", "file gốc nhà trai"]);
  await xongVaGui(m2.id, (l) => l === "Chụp hình cổng");
  kiem("PW+cưới 2 ngày: xong ảnh cổng → bước 4", await luuLich(m2.id), 4);
  await p.hopDong.update({ where: { id: m2.id }, data: { buoc: 12, trangThai: tenBuoc(12) } });
  await xongVaGui(m2.id, (l) => l === "nhà gái");
  kiem("PW+cưới 2 ngày ở bước 12: mới xong nhà gái → giữ 12", await luuLich(m2.id), 12);
  await xongVaGui(m2.id, (l) => l === "nhà trai");
  kiem("PW+cưới 2 ngày: xong cả hai buổi tiệc → bước 13", await luuLich(m2.id), 13);

  /* ══ NHÓM 4 — khách quay lại book thêm ════════════════════════════════ */
  console.log("\n══ NHÓM 4: hợp đồng ĐÃ XONG, khách book thêm ══\n");

  /* 4a. Thêm buổi vào CHÍNH hợp đồng cũ đã hoàn thành. */
  const q1 = await dung("Đã xong rồi book thêm", "CƯỚI", 18, [
    { loai: "nhà gái", ngay: "2026-06-10" },
    { loai: "nhà trai", ngay: "2026-06-11" },
  ], ["file gốc nhà gái", "file gốc nhà trai"]);
  await xongVaGui(q1.id, () => true);
  await p.lichChup.create({
    data: { hopDongId: q1.id, loai: "chụp bé", ngay: "2027-01-20", trangThai: "Chưa làm" },
  });
  kiem("thêm buổi vào hợp đồng đã ở bước 18 → KHÔNG kéo lùi", await luuLich(q1.id), 18);
  ket.push(
    "LƯU Ý: thêm buổi mới vào hợp đồng đã hoàn thành thì bước đứng nguyên ở 18 — " +
      "buổi mới không có bước nào theo dõi. Đáng lập hợp đồng RIÊNG.",
  );

  /* 4b. Lập hợp đồng MỚI cho lần book thêm — cách đúng. */
  const q2 = await dung("Book thêm bằng hợp đồng mới", "Baby", 1, [{ loai: "chụp bé", ngay: "2027-01-20" }], [
    "file gốc",
  ]);
  kiem("hợp đồng mới cho lần book thêm: điền ngày → bước 2", await luuLich(q2.id), 2);
  await xongVaGui(q2.id, () => true);
  kiem("hợp đồng mới: chụp xong + gửi gốc → bước 4", await luuLich(q2.id), 4);
} finally {
  console.log("\n— Dọn —");
  const con = await donSach();
  kiem("đã xoá hợp đồng thử", con > 0, true);
  kiem("không còn hợp đồng thử", await p.hopDong.count({ where: { maHD: { startsWith: DAU } } }), 0);
  kiem("không còn album thử", await p.gallery.count({ where: { driveFolderId: { startsWith: DAU } } }), 0);
}

if (ket.length) {
  console.log("\n╔══ CHỖ KẸT TÌM ĐƯỢC ══");
  for (const k of ket) console.log("║ " + k);
  console.log("╚══");
}
console.log(truot === 0 ? "\nMọi phép kiểm đều đúng" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
