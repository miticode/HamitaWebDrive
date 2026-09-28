import { config } from "dotenv";
config({ path: ".env.local" });
const { getPrisma } = await import("../src/lib/db");
const { giaiMa, daMaHoa } = await import("../src/lib/maHoa");

/**
 * In ra mã làm mới của tài khoản Google studio, để khai cho Worker bắn ảnh.
 *
 * KHÔNG ghi ra tệp, không chép vào nhật ký — hiện một lần trên màn hình rồi
 * thôi. Đây là chìa khoá đọc Drive của studio, ai cầm được là đọc được ảnh.
 */
const acc = await getPrisma().googleAccount.findFirst({
  select: { email: true, refreshToken: true },
});
if (!acc?.refreshToken) {
  console.log("Chưa kết nối Drive bằng tài khoản studio — vào /admin bấm kết nối trước.");
  process.exit(1);
}
/*
  Database GIỮ BẢN ĐÃ MÃ HOÁ (tiền tố "enc:v1:"), phải giải ra mới dùng được.
  Đưa nguyên bản mã hoá cho Worker thì Google từ chối và khách tải nào cũng
  lỗi — đã vấp đúng chỗ này lúc dựng Worker ngày 28/09/2026.
*/
const thuc = daMaHoa(acc.refreshToken) ? giaiMa(acc.refreshToken) : acc.refreshToken;

console.log(`Tài khoản: ${acc.email}`);
console.log(`\nGOOGLE_REFRESH_TOKEN:\n${thuc}\n`);
console.log("Dán chuỗi trên vào lệnh: npx wrangler secret put GOOGLE_REFRESH_TOKEN");
console.log("Xong thì xoá màn hình (lệnh cls) cho chắc.");
process.exit(0);
