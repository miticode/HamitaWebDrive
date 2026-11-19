/**
 * XOÁ dữ liệu mã album còn sót trên bảng DichVu — anh chốt 19/11/2026.
 *
 * Cột `DichVu.maAlbum` đã gỡ khỏi toàn bộ giao diện và luồng tạo album: mã
 * giờ chỉ suy từ LOẠI BUỔI CHỤP. Cột vẫn còn trong database (xoá cột là
 * không lùi được, và `db:push` không chạy ở phiên này), nhưng dữ liệu trong
 * nó không ai đọc nữa — để lại là dữ liệu chết, lần sau mở schema ra lại
 * tưởng còn dùng.
 *
 *   npx tsx scripts/xoa-ma-dich-vu.mts          # chỉ xem, không sửa
 *   npx tsx scripts/xoa-ma-dich-vu.mts --xoa    # xoá thật
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const p = getPrisma();

const con = await p.dichVu.findMany({
  where: { maAlbum: { not: null } },
  select: { id: true, ten: true, maAlbum: true },
  orderBy: { ten: "asc" },
});

console.log(`Còn ${con.length} dịch vụ mang mã:`);
for (const d of con) console.log(`  ${d.maAlbum}\t${d.ten}`);

if (!process.argv.includes("--xoa")) {
  console.log("\nChỉ xem. Thêm --xoa để xoá thật.");
  process.exit(0);
}

const kq = await p.dichVu.updateMany({ where: { maAlbum: { not: null } }, data: { maAlbum: null } });
console.log(`\nĐã xoá mã trên ${kq.count} dịch vụ.`);

const sot = await p.dichVu.count({ where: { maAlbum: { not: null } } });
console.log(sot === 0 ? "Đo lại: sạch, không còn dòng nào." : `LỖI: còn sót ${sot} dòng.`);
