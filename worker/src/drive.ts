import type { Env } from "./index";

/*
  Vé vào Drive sống một tiếng. Giữ lại trong bộ nhớ của bản Worker đang chạy để
  khỏi xin lại mỗi lượt — khách mở một album mấy trăm tấm mà lượt nào cũng xin
  vé thì vừa chậm vừa dễ chạm hạn mức của Google.

  Biến toàn cục sống theo vòng đời một bản Worker, không phải một request.
  Cloudflare dựng và bỏ các bản này tuỳ lúc, nên phải luôn có đường xin lại.
*/
let veDrive: { token: string; hetHan: number } | null = null;

export async function xinVeDrive(env: Env): Promise<string> {
  const con = veDrive;
  // Xin sớm 5 phút cho chắc, khỏi dùng đúng cái vé vừa hết hạn giữa chừng.
  if (con && con.hetHan > Date.now() + 5 * 60_000) return con.token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Không xin được vé vào Drive (${res.status})`);

  const data = (await res.json()) as { access_token: string; expires_in: number };
  veDrive = { token: data.access_token, hetHan: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}
