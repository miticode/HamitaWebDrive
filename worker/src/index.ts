import { boMetadataJpeg } from "./jpeg";
import { xinVeDrive } from "./drive";
import { xemAnh } from "./anhXem";

/**
 * Worker "bắn ảnh" — anh chốt 28/09/2026.
 *
 * VÌ SAO CÓ: ảnh trước đây đi Drive → máy chủ Vercel → khách. Chặng thứ hai
 * tính tiền $0,27 mỗi GB, ngốn hơn nửa hoá đơn. Cloudflare không tính tiền
 * băng thông ra khách, và gói miễn phí cho 100.000 lượt mỗi ngày trong khi
 * studio chỉ dùng khoảng 3.300.
 *
 * HAI ĐƯỜNG, HAI CÁCH GIỮ AN TOÀN KHÁC NHAU:
 *
 *   /t/{mã}  — TẢI bản gốc về máy. Vercel kiểm quyền (album có cho tải không,
 *              ảnh có thuộc album không) rồi ký tên một đường dẫn sống 10
 *              phút. Worker chỉ giao đúng tấm đã ký.
 *
 *   /i/{mã}  — XEM trên trang album. Không ký, vì địa chỉ ảnh nằm trong mã
 *              HTML và trình duyệt phải gọi lại được sau khi trang đã tải —
 *              y như `/api/img` bên Vercel vẫn làm suốt. Lớp bảo vệ là chặn
 *              nhúng từ web khác, xem `anhXem.ts`.
 *
 * WORKER KHÔNG TỰ QUYẾT ĐƯỢC GÌ. Không có đường nào để liệt kê thư mục hay
 * dò ra album của nhà khác; muốn lấy tấm nào cũng phải biết sẵn mã của đúng
 * tấm đó.
 */

export interface Env {
  /** Chuỗi bí mật dùng chung với Vercel để ký và kiểm chữ ký đường tải. */
  KY_CHUNG: string;
  /** Ba thứ để xin vé vào Drive dưới danh nghĩa tài khoản studio. */
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  /** Địa chỉ web chính — dùng làm đường lui khi Worker không lo được. */
  NEN_WEB: string;
  /** Các tên miền được phép nhúng ảnh xem, ngăn cách bằng dấu phẩy. */
  HOST_CHO_PHEP: string;
}

/** Chữ ký Vercel đặt lên đường dẫn tải: HMAC-SHA256 của "mã.hạn", viết dạng hex. */
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

/** Giao bản gốc cho khách tải về — đường dẫn phải mang chữ ký còn hạn của Vercel. */
async function taiAnh(req: Request, env: Env): Promise<Response> {
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
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Chỉ nhận GET", { status: 405 });
    }

    const duong = new URL(req.url).pathname;
    if (duong.startsWith("/t/")) return taiAnh(req, env);
    if (duong.startsWith("/i/")) return xemAnh(req, env, ctx);

    /*
      Không có trang chủ. Ai gõ thẳng tên miền này vào trình duyệt thì thấy
      dòng dưới — cố ý không nói đây là Worker của ai, không dẫn về web studio.
    */
    return new Response("Không có gì ở đây.", { status: 404 });
  },
};
