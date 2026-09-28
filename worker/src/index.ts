import { boMetadataJpeg } from "./jpeg";

/**
 * Worker "bắn ảnh" — anh chốt 28/09/2026.
 *
 * VÌ SAO CÓ: đường tải ảnh cũ đi Drive → máy chủ Vercel → khách. Chặng thứ hai
 * tốn 168 GB một tháng, khoảng 45 đô — hơn nửa hoá đơn Vercel. Cloudflare
 * không tính tiền băng thông ra khách, và gói miễn phí cho 100.000 lượt mỗi
 * ngày trong khi studio chỉ dùng ~3.300.
 *
 * WORKER KHÔNG TỰ QUYẾT ĐƯỢC GÌ. Nó chỉ giao đúng tấm ảnh mà Vercel đã duyệt
 * và ký tên, chữ ký hết hạn sau ít phút. Không có đường nào để liệt kê thư
 * mục, dò mã ảnh, hay lấy ảnh của album khác — muốn lấy tấm nào cũng phải có
 * chữ ký của Vercel cho đúng tấm đó.
 *
 * Kiểm quyền (album có cho tải không, ảnh có thuộc album không) vẫn nằm nguyên
 * ở Vercel như cũ. Worker chỉ là cái ống dẫn.
 */

export interface Env {
  /** Chuỗi bí mật dùng chung với Vercel để ký và kiểm chữ ký. */
  KY_CHUNG: string;
  /** Ba thứ để xin vé vào Drive dưới danh nghĩa tài khoản studio. */
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
}

/*
  Vé vào Drive sống một tiếng. Giữ lại trong bộ nhớ của bản Worker đang chạy để
  khỏi xin lại mỗi lượt tải — khách tải cả album mấy trăm tấm mà lượt nào cũng
  xin vé thì vừa chậm vừa dễ chạm hạn mức của Google.

  Biến toàn cục sống theo vòng đời một bản Worker, không phải một request.
  Cloudflare dựng và bỏ các bản này tuỳ lúc, nên phải luôn có đường xin lại.
*/
let veDrive: { token: string; hetHan: number } | null = null;

async function xinVeDrive(env: Env): Promise<string> {
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

/** Chữ ký Vercel đặt lên đường dẫn: HMAC-SHA256 của "fileId.hạn", viết dạng hex. */
async function kyLai(env: Env, fileId: string, han: string): Promise<string> {
  const khoa = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.KY_CHUNG),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const chuKy = await crypto.subtle.sign("HMAC", khoa, new TextEncoder().encode(`${fileId}.${han}`));
  return [...new Uint8Array(chuKy)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * So hai chữ ký sao cho thời gian so luôn bằng nhau.
 *
 * So bằng `===` thì máy dừng ngay ở byte đầu khác nhau; đo thời gian trả lời đủ
 * nhiều lần là dò ra được chữ ký đúng từng byte một. Kiểu tấn công này có thật
 * và rẻ, nên chỗ nào so chữ ký cũng phải viết như dưới đây.
 */
function giongNhau(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let khac = 0;
  for (let i = 0; i < a.length; i++) khac |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return khac === 0;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Chỉ nhận GET", { status: 405 });
    }

    const url = new URL(req.url);
    const fileId = url.pathname.replace(/^\/t\//, "");
    const han = url.searchParams.get("han") ?? "";
    const chuKy = url.searchParams.get("ky") ?? "";
    const ten = url.searchParams.get("ten") ?? "anh.jpg";

    if (!fileId || !han || !chuKy) return new Response("Thiếu thông tin.", { status: 400 });

    // Hết hạn trước, ký sau: khỏi tốn phép tính mã hoá cho đường dẫn đã cũ.
    const hanMs = Number(han);
    if (!Number.isFinite(hanMs) || hanMs < Date.now()) {
      return new Response("Đường dẫn đã hết hạn, anh chị bấm tải lại giúp.", { status: 410 });
    }
    if (!giongNhau(chuKy, await kyLai(env, fileId, han))) {
      return new Response("Đường dẫn không hợp lệ.", { status: 403 });
    }

    let token: string;
    try {
      token = await xinVeDrive(env);
    } catch {
      return new Response("Không vào được Drive lúc này.", { status: 502 });
    }

    const drive = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!drive.ok) {
      return new Response("Không lấy được ảnh từ Drive.", { status: drive.status === 404 ? 404 : 502 });
    }

    const goc = new Uint8Array(await drive.arrayBuffer());
    /*
      Gỡ thông tin máy ảnh y như Vercel vẫn làm. Trả null nghĩa là file không
      đúng dạng mong đợi hoặc là ảnh cần xoay — lúc đó giao nguyên bản gốc, thà
      để lại thông tin máy ảnh còn hơn giao một tấm nằm ngang.
    */
    const sach = boMetadataJpeg(goc) ?? goc;

    return new Response(req.method === "HEAD" ? null : sach, {
      headers: {
        "Content-Type": drive.headers.get("content-type") ?? "image/jpeg",
        "Content-Length": String(sach.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(ten)}`,
        // Đường dẫn có chữ ký hết hạn nên KHÔNG cho ai giữ lại ngoài máy khách.
        "Cache-Control": "private, max-age=3600",
      },
    });
  },
};
