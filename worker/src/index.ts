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

/**
 * Cho phép trang của studio ĐỌC nội dung trả về bằng `fetch`.
 *
 * VÌ SAO CẦN (lỗi thật, 29/09/2026): nút "Lưu ảnh" trên điện thoại không mở
 * link mà gọi `fetch` để lấy tệp rồi đưa vào khay chia sẻ của máy. Trước đây
 * `/api/download` cùng tên miền với trang nên không cần xin phép gì. Từ khi nó
 * chuyển hướng sang workers.dev thì lượt `fetch` đó thành khác tên miền, và
 * trình duyệt CHẶN nếu bên nhận không nói rõ là cho phép — khách bấm lưu ảnh
 * chỉ thấy "Chưa tải được".
 *
 * Trả đúng tên miền đang hỏi chứ không trả "*": chỉ trang của studio mới đọc
 * được, và dấu Vary để bộ nhớ đệm không đưa nhầm câu trả lời của tên miền này
 * cho tên miền kia.
 */
function themChoPhepDocs(h: Headers, req: Request, env: Env): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return;
  }
  const choPhep = (env.HOST_CHO_PHEP ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (!choPhep.includes(host)) return;
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Vary", "Origin");
}

/** Gắn lời cho phép ở trên vào một phản hồi đã dựng xong. */
function chepLaiKemChoPhep(res: Response, req: Request, env: Env): Response {
  const h = new Headers(res.headers);
  themChoPhepDocs(h, req, env);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
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

  const h = new Headers({
    "Content-Type": drive.headers.get("content-type") ?? "image/jpeg",
    "Content-Length": String(sach.length),
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(ten)}`,
    // Đường dẫn có chữ ký hết hạn nên KHÔNG cho ai giữ lại ngoài máy khách.
    "Cache-Control": "private, max-age=3600",
  });
  return new Response(req.method === "HEAD" ? null : sach, { headers: h });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return new Response("Chỉ nhận GET", { status: 405 });
    }

    const duong = new URL(req.url).pathname;
    /*
      Kèm lời cho phép đọc vào MỌI phản hồi của đường tải, kể cả báo lỗi: trang
      gọi bằng `fetch` nên thiếu nó thì ngay cả câu "đường dẫn hết hạn" trình
      duyệt cũng không đưa được tới nơi, khách chỉ thấy lỗi chung chung.
    */
    if (duong.startsWith("/t/")) return chepLaiKemChoPhep(await taiAnh(req, env), req, env);
    if (duong.startsWith("/i/")) return xemAnh(req, env, ctx);

    /*
      Không có trang chủ. Ai gõ thẳng tên miền này vào trình duyệt thì thấy
      dòng dưới — cố ý không nói đây là Worker của ai, không dẫn về web studio.
    */
    return new Response("Không có gì ở đây.", { status: 404 });
  },
};
