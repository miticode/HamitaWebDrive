import { config } from "dotenv";
config({ path: ".env.local" });
import { randomBytes } from "node:crypto";
const { getPrisma } = await import("../src/lib/db");
const { giaiMa, daMaHoa } = await import("../src/lib/maHoa");

/**
 * In đủ BỐN thứ bí mật cần khai cho Worker bắn ảnh, kèm sẵn lệnh phải chạy.
 *
 * Vì sao cần: Vercel khoá không cho xem lại giá trị đã khai, nhưng hai chuỗi
 * của Google vốn nằm sẵn trong .env.local trên máy studio; còn mã làm mới thì
 * trong database ở dạng đã mã hoá, phải giải ra.
 *
 * KHÔNG ghi ra tệp, không vào nhật ký — hiện một lần trên màn hình rồi thôi.
 */
const acc = await getPrisma().googleAccount.findFirst({
  select: { email: true, refreshToken: true },
});
if (!acc?.refreshToken) {
  console.log("Chưa kết nối Drive bằng tài khoản studio — vào /admin bấm kết nối trước.");
  process.exit(1);
}

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
if (!clientId || !clientSecret) {
  console.log("Thiếu GOOGLE_OAUTH_CLIENT_ID hoặc GOOGLE_OAUTH_CLIENT_SECRET trong .env.local.");
  process.exit(1);
}

const refresh = daMaHoa(acc.refreshToken) ? giaiMa(acc.refreshToken) : acc.refreshToken;
/*
 * SINH MỚI MỖI LẦN CHẠY — cố ý, vì không chỗ nào giữ được chuỗi này: Vercel
 * khoá không cho xem lại, Cloudflare cũng vậy.
 *
 * Hệ quả phải nhớ: chạy lệnh này lần thứ hai ra chuỗi KHÁC chuỗi đang chạy.
 * Muốn xem lại ba thứ của Google thì cứ chạy, nhưng ĐỪNG khai lại KY_CHUNG
 * một mình — khai lệch một bên là khách bấm tải gặp lỗi 403 ngay. Đổi thì
 * phải đổi cả hai nơi cùng lúc.
 */
const kyChung = randomBytes(32).toString("hex");

console.log(`Tài khoản Google: ${acc.email}\n`);
console.log("═══ BỐN THỨ KHAI CHO WORKER ═══");
console.log("Chạy từng lệnh dưới đây trong thư mục worker, rồi dán đúng chuỗi kèm theo.\n");
console.log(`1) npx wrangler secret put KY_CHUNG\n   ${kyChung}\n`);
console.log(`2) npx wrangler secret put GOOGLE_CLIENT_ID\n   ${clientId}\n`);
console.log(`3) npx wrangler secret put GOOGLE_CLIENT_SECRET\n   ${clientSecret}\n`);
console.log(`4) npx wrangler secret put GOOGLE_REFRESH_TOKEN\n   ${refresh}\n`);
console.log("═══ HAI BIẾN KHAI Ở VERCEL (Production) ═══");
console.log(`TAI_ANH_KY_CHUNG   = ${kyChung}`);
console.log("TAI_ANH_WORKER_URL = địa chỉ workers.dev hiện ra sau khi chạy: npx wrangler deploy\n");
console.log("Lưu ý: KY_CHUNG ở Worker và TAI_ANH_KY_CHUNG ở Vercel phải GIỐNG HỆT nhau.");
console.log("CHUỖI KY_CHUNG TRÊN LÀ CHUỖI MỚI, khác chuỗi đang chạy. Nếu chỉ định");
console.log("xem lại ba thứ của Google thì bỏ qua nó, đừng khai lại một mình.");
console.log("Xong việc thì đóng cửa sổ này hoặc gõ cls cho khỏi để lại trên màn hình.");
process.exit(0);
