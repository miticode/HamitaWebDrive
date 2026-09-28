import { config } from "dotenv";
config({ path: ".env.local" });
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const { getPrisma } = await import("../src/lib/db");
const { giaiMa, daMaHoa } = await import("../src/lib/maHoa");

/**
 * Khai ba bí mật Google cho Worker bắn ảnh — bơm thẳng, không dán tay.
 *
 * Vì sao cần: mã làm mới dài 103 ký tự, có cả "/" và "-". Dán tay vào cửa sổ
 * lệnh đứt mất một ký tự là Worker xin vé Drive hỏng, khách bấm tải gặp 502
 * "Không vào được Drive lúc này" — đúng cái đã xảy ra 28/09/2026. Lỗi đó
 * không nhìn ra được vì Cloudflare khoá không cho xem lại giá trị đã khai.
 *
 * KHÔNG khai KY_CHUNG ở đây: chuỗi đó phải khớp với TAI_ANH_KY_CHUNG bên
 * Vercel, mà Vercel thì người khai bằng tay. Đổi một bên là gãy cả đường tải.
 *
 * Không in giá trị ra màn hình, chỉ in độ dài để đối chiếu.
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

/* Thử xin vé trước khi khai: khai xong mới biết sai thì mất công lần nữa. */
const thu = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refresh,
    grant_type: "refresh_token",
  }),
});
if (!thu.ok) {
  console.log(`Ba chuỗi này KHÔNG xin được vé vào Drive (Google trả ${thu.status}).`);
  console.log("Nhiều khả năng mã làm mới đã chết — vào /admin ngắt kết nối Drive rồi nối lại.");
  process.exit(1);
}
console.log(`Tài khoản Google: ${acc.email} — xin vé thử: OK\n`);

async function khai(ten: string, giaTri: string): Promise<void> {
  console.log(`→ ${ten} (${giaTri.length} ký tự)`);
  await new Promise<void>((xong, hong) => {
    /* shell: true vì Windows chặn spawn thẳng tệp .cmd (EINVAL). Tên bí mật
       là hằng viết trong tệp này, không phải thứ người dùng gõ vào. */
    const con = spawn("npx", ["wrangler", "secret", "put", ten], {
      cwd: fileURLToPath(new URL("../worker", import.meta.url)),
      stdio: ["pipe", "inherit", "inherit"],
      shell: true,
    });
    con.on("error", hong);
    con.on("close", (ma) => (ma === 0 ? xong() : hong(new Error(`wrangler trả mã ${ma}`))));
    con.stdin.end(giaTri);
  });
}

try {
  await khai("GOOGLE_CLIENT_ID", clientId);
  await khai("GOOGLE_CLIENT_SECRET", clientSecret);
  await khai("GOOGLE_REFRESH_TOKEN", refresh);
  console.log("\nXong ba bí mật. KY_CHUNG giữ nguyên, không đụng tới.");
} catch (loi) {
  console.log(`\nHỏng: ${loi instanceof Error ? loi.message : loi}`);
  console.log("Nếu báo chưa đăng nhập thì chạy: cd worker && npx wrangler login");
  process.exit(1);
}
process.exit(0);
