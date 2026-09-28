import { config } from "dotenv";
config({ path: ".env.local" });
const { getPrisma } = await import("../src/lib/db");

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
console.log(`Tài khoản: ${acc.email}`);
console.log(`\nGOOGLE_REFRESH_TOKEN:\n${acc.refreshToken}\n`);
console.log("Dán chuỗi trên vào lệnh: npx wrangler secret put GOOGLE_REFRESH_TOKEN");
console.log("Xong thì xoá màn hình (lệnh cls) cho chắc.");
process.exit(0);
