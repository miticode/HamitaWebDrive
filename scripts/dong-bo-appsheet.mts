/**
 * Chép hợp đồng, khách, chi tiết, phiếu thu từ AppSheet sang web — đúng việc
 * lịch chạy đêm làm (src/lib/dongBoAppSheet.ts), chạy tay từ máy.
 *
 *   npx tsx scripts/dong-bo-appsheet.mts
 *
 * Chạy lại bao nhiêu lần cũng được: dòng không đổi thì bỏ qua. Chỉ in số đếm.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { dongBoAppSheet } = await import("../src/lib/dongBoAppSheet");
const kq = await dongBoAppSheet("Script đồng bộ");

console.log(`Xong trong ${kq.giay} giây. Dịch vụ mới: ${kq.dichVuThem}`);
for (const [ten, s] of Object.entries(kq.bang)) {
  console.log(`  ${ten.padEnd(10)} thêm ${s.them} · sửa ${s.sua} · mất bên AppSheet ${s.mat} · bỏ qua ${s.boQua}`);
}
