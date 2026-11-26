/**
 * Kiểm ĐẦU–CUỐI phép tính bước từ dấu buổi, trên DATABASE THẬT.
 *
 *   npx tsx scripts/thu-tien-trinh-buoi.mts
 *
 * `thu-dau-buoi.mts` đã kiểm phép tính thuần; kịch bản này kiểm phần còn lại:
 * ghi xuống database, đọc lại, và `capNhatBuocTuDauBuoi` có thật sự đổi bước
 * hợp đồng không.
 *
 * TỰ DỌN SẠCH ở cuối và đo lại để xác nhận — mọi thứ nó tạo đều mang tiền tố
 * `THU-DAU-BUOI-` nên nhận ra được cả khi kịch bản chết giữa chừng.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const { capNhatBuocTuDauBuoi } = await import("../src/lib/trangThaiBuoi");
const p = getPrisma();

const DAU = "THU-DAU-BUOI-";
let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

/* Dọn trước, phòng khi lần chạy trước chết giữa chừng. */
await p.lichChup.deleteMany({ where: { hopDong: { maHD: { startsWith: DAU } } } });
await p.hopDong.deleteMany({ where: { maHD: { startsWith: DAU } } });

/* Tên bước phải lấy từ bảng thật, vì `capNhatBuocTuDauBuoi` tra theo số. */
const cacBuoc = await p.buocHopDong.findMany({ select: { ten: true } });
const tenBuoc = (so: number) => cacBuoc.find((b) => b.ten.trim().startsWith(`${so}.`))?.ten ?? null;
console.log(`Bảng bước có ${cacBuoc.length} dòng · bước 12 = ${tenBuoc(12)} · bước 13 = ${tenBuoc(13)}\n`);

const hd = await p.hopDong.create({
  data: {
    maHD: `${DAU}${Date.now()}`,
    tenKhach: "Nhà thử hai ngày cưới",
    loaiDV: "CƯỚI",
    buoc: 12,
    trangThai: tenBuoc(12),
    lich: {
      create: [
        { loai: "nhà gái", ngay: "2026-12-01", trangThai: "Hoàn thành" },
        { loai: "nhà trai", ngay: "2026-12-02", trangThai: "Hoàn thành" },
      ],
    },
  },
  select: { id: true, buoc: true, lich: { select: { id: true, loai: true } } },
});
const gai = hd.lich.find((l) => l.loai === "nhà gái")!;
const trai = hd.lich.find((l) => l.loai === "nhà trai")!;
console.log(`Đã tạo hợp đồng thử ở bước ${hd.buoc}, hai buổi tiệc.\n`);

const docBuoc = async () => (await p.hopDong.findUnique({ where: { id: hd.id }, select: { buoc: true } }))?.buoc;

try {
  console.log("— Tick nhà gái trước —");
  await p.lichChup.update({ where: { id: gai.id }, data: { daGuiAnhGoc: new Date() } });
  kiem("capNhat trả null (chưa đủ)", await capNhatBuocTuDauBuoi(hd.id), null);
  kiem("bước vẫn là 12", await docBuoc(), 12);

  console.log("\n— Tick nốt nhà trai —");
  await p.lichChup.update({ where: { id: trai.id }, data: { daGuiAnhGoc: new Date() } });
  kiem("capNhat trả tên bước 13", await capNhatBuocTuDauBuoi(hd.id), tenBuoc(13));
  kiem("bước đã thành 13", await docBuoc(), 13);

  console.log("\n— Gọi lại lần nữa: không đổi gì thêm —");
  kiem("capNhat trả null", await capNhatBuocTuDauBuoi(hd.id), null);
  kiem("bước vẫn 13", await docBuoc(), 13);

  console.log("\n— Gỡ một dấu tick: KHÔNG kéo bước lùi —");
  await p.lichChup.update({ where: { id: trai.id }, data: { daGuiAnhGoc: null } });
  kiem("capNhat trả null", await capNhatBuocTuDauBuoi(hd.id), null);
  kiem("bước vẫn 13, không về 12", await docBuoc(), 13);

  console.log("\n— Nhật ký có ghi lại lượt đổi bước —");
  const nk = await p.nhatKy.count({ where: { doiTuong: "HopDong", doiTuongId: hd.id } });
  kiem("có đúng 1 dòng nhật ký", nk, 1);
} finally {
  console.log("\n— Dọn —");
  await p.lichChup.deleteMany({ where: { hopDongId: hd.id } });
  await p.nhatKy.deleteMany({ where: { doiTuong: "HopDong", doiTuongId: hd.id } });
  await p.hopDong.deleteMany({ where: { maHD: { startsWith: DAU } } });
  /* Đo lại chứ không tin là đã dọn. */
  const conHD = await p.hopDong.count({ where: { maHD: { startsWith: DAU } } });
  const conLich = await p.lichChup.count({ where: { hopDongId: hd.id } });
  const conNK = await p.nhatKy.count({ where: { doiTuongId: hd.id } });
  kiem("không còn hợp đồng thử", conHD, 0);
  kiem("không còn buổi thử", conLich, 0);
  kiem("không còn dòng nhật ký thử", conNK, 0);
}

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
await p.$disconnect();
process.exit(truot === 0 ? 0 : 1);
