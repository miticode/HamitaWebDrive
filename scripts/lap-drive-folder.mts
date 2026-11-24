/**
 * Lấp cột `AnhGioiThieu.driveFolderId` cho những dòng tạo trước 24/11/2026.
 *
 *   npx tsx scripts/lap-drive-folder.mts
 *
 * Trước hôm đó mỗi dòng giới thiệu bắt buộc gắn một album khách, và thư mục
 * Drive đọc qua `gallery.driveFolderId`. Từ 24/11 studio dán thẳng được link
 * thư mục nên thư mục gốc thành một cột riêng — dòng cũ phải chép sang.
 *
 * Chạy lại bao nhiêu lần cũng được: chỉ đụng dòng còn trống cột ấy.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { getPrisma } = await import("../src/lib/db");
const prisma = getPrisma();

const con = await prisma.anhGioiThieu.findMany({
  where: { driveFolderId: null },
  select: { id: true, muc: true, tenMuc: true, gallery: { select: { driveFolderId: true } } },
});

console.log(`Dòng còn trống driveFolderId: ${con.length}`);
if (con.length === 0) process.exit(0);

let xong = 0;
const khong: string[] = [];
for (const d of con) {
  const goc = d.gallery?.driveFolderId;
  if (!goc) {
    khong.push(`${d.muc} · ${d.tenMuc}`);
    continue;
  }
  await prisma.anhGioiThieu.update({ where: { id: d.id }, data: { driveFolderId: goc } });
  xong++;
}

console.log(`Đã lấp: ${xong}`);
if (khong.length) {
  console.log(`KHÔNG lấp được ${khong.length} dòng (không có album lẫn thư mục):`);
  for (const k of khong) console.log(`   ${k}`);
}

const conLai = await prisma.anhGioiThieu.count({ where: { driveFolderId: null } });
console.log(`Còn trống sau khi chạy: ${conLai}`);
