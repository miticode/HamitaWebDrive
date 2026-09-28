import type { Env } from "./index";
import { xinVeDrive } from "./drive";

/**
 * Giao ảnh cho khách XEM trên trang album (anh chốt 28/09/2026).
 *
 * Khác hẳn nhánh tải ở `/t/`: chỗ này không đụng tới bản gốc, mà lấy bản dựng
 * sẵn của Google — thêm hậu tố `-rw` vào `thumbnailLink` là Google trả thẳng
 * WebP, đúng thứ Vercel vẫn phải chạy `sharp` để tạo ra.
 *
 * ĐÃ ĐO trước khi làm (28/09/2026, 4 ảnh thật, so với ảnh mốc, thang 0-255):
 *
 *     cỡ      sharp      Google
 *     640     4,48       4,88
 *     960     3,16       3,39
 *     2048    2,72       2,30   <- Google nét hơn
 *
 * Chênh nhau dưới 0,5/255 ở mọi cỡ, mắt người không thấy. Riêng cỡ 2048 —
 * đúng cỡ khách bấm xem to — bản của Google trung thực hơn vì nặng hơn 27%
 * nên giữ được chi tiết.
 *
 * Bỏ được `sharp` nghĩa là bỏ luôn Fluid Active CPU và Provisioned Memory của
 * Vercel, chứ không chỉ tiền truyền dữ liệu.
 */

/**
 * Phải khớp ALLOWED_SIZES trong src/app/api/img/[fileId]/route.ts.
 *
 * Sửa một bên thì phải sửa bên kia: hai đường cùng phục vụ một trang, lệch
 * nhau thì bật/tắt Worker là ảnh đổi kích thước giữa chừng.
 */
const CO_ANH = [320, 640, 960, 1440, 2048] as const;
const CO_MAC_DINH = 960;

const MA_ANH = /^[a-zA-Z0-9_-]{10,}$/;

function chonCo(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return CO_MAC_DINH;
  return CO_ANH.reduce((tot, c) => (Math.abs(c - n) < Math.abs(tot - n) ? c : tot));
}

/**
 * Chặn nhúng, không chặn truy cập thật — giữ đúng việc `/api/img` vẫn làm.
 *
 * VÌ SAO KHÔNG CHÉP NGUYÊN CÁCH CỦA VERCEL: bên đó đọc `Sec-Fetch-Site` và
 * từ chối khi thấy `cross-site`. Sang đây vô dụng, vì ảnh nằm trên tên miền
 * workers.dev còn trang nằm trên hamitastudio.com — trình duyệt báo
 * `cross-site` kể cả khi chính trang của mình gọi.
 *
 * NHƯNG chỉ dựa vào Referer thì LỎNG HƠN bên Vercel: web khác chỉ cần viết
 * `<img referrerpolicy="no-referrer">` là không gửi Referer nữa, và lọt.
 * Nên phải bịt đúng chỗ đó bằng hai header còn lại.
 *
 * Ba người dùng hợp lệ không gửi Referer, phải để họ qua:
 *   - hệ thống dựng ảnh sẵn gọi từ máy chủ (warm.ts) — không có Sec-Fetch-*
 *   - bot xem trước liên kết của Facebook/Zalo khi khách gửi link cho nhau
 *   - khách bấm "Mở ảnh trong tab mới" — Sec-Fetch-Dest là `document`
 *
 * Kẻ nhúng trộm thì khác cả ba: Sec-Fetch-Dest là `image` và Sec-Fetch-Site
 * là `cross-site`, mà lại không có Referer. Đúng bộ ba đó thì chặn.
 */
function laNhungTuNoiKhac(req: Request, env: Env): boolean {
  const referer = req.headers.get("referer");

  if (!referer) {
    const dest = req.headers.get("sec-fetch-dest");
    const site = req.headers.get("sec-fetch-site");
    // Trình duyệt đang nhúng ảnh từ một trang khác mà giấu nguồn -> chặn.
    return dest === "image" && site === "cross-site";
  }

  let host: string;
  try {
    host = new URL(referer).host;
  } catch {
    return false; // Referer sai dạng thì không đủ căn cứ để chặn.
  }
  const choPhep = (env.HOST_CHO_PHEP ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (choPhep.length === 0) return false; // Chưa khai thì đừng chặn oan.
  return !choPhep.includes(host.toLowerCase());
}

/** Đường lui về Vercel khi Worker không lo được — nguyên tắc 19: Drive lỗi không giết trang. */
function veDuongCu(env: Env, fileId: string, co: number): Response {
  const den = new URL(`/api/img/${encodeURIComponent(fileId)}`, env.NEN_WEB);
  den.searchParams.set("w", String(co));
  /*
    302 chứ không phải 301: đây là sự cố tạm thời (Drive trục trặc, ảnh chưa
    có bản dựng sẵn). 301 thì trình duyệt nhớ mãi, hôm sau Drive khoẻ lại vẫn
    đi vòng qua Vercel.
  */
  return Response.redirect(den.toString(), 302);
}

export async function xemAnh(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const fileId = decodeURIComponent(url.pathname.replace(/^\/i\//, ""));

  if (!MA_ANH.test(fileId)) return new Response("Mã ảnh không hợp lệ.", { status: 400 });
  if (laNhungTuNoiKhac(req, env)) {
    return new Response("Ảnh này không phục vụ nơi khác.", { status: 403 });
  }

  const co = chonCo(url.searchParams.get("w"));

  /*
    Khoá cache dựng lại từ mã ảnh và cỡ ĐÃ LÀM TRÒN, không dùng thẳng request
    của khách. Hai lý do: `?w=760` và `?w=640` cùng ra một tấm nên phải chung
    một ô nhớ; và Referer của mỗi khách mỗi khác, để nguyên thì mỗi người một
    ô, cache coi như không có.
  */
  const khoa = new Request(`${url.origin}/i/${encodeURIComponent(fileId)}?w=${co}`, { method: "GET" });
  const cache = caches.default;
  const sanCo = await cache.match(khoa);
  if (sanCo) return sanCo;

  let token: string;
  try {
    token = await xinVeDrive(env);
  } catch {
    return veDuongCu(env, fileId, co);
  }

  /*
    Xin `thumbnailLink` — địa chỉ bản dựng sẵn của Google, đuôi dạng "=s220".
    Đổi đuôi thành "=s960-rw" là được đúng cỡ mình cần, ở dạng WebP.
  */
  let thumbnailLink: string | undefined;
  try {
    const meta = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
        `?fields=thumbnailLink&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!meta.ok) return veDuongCu(env, fileId, co);
    thumbnailLink = ((await meta.json()) as { thumbnailLink?: string }).thumbnailLink;
  } catch {
    return veDuongCu(env, fileId, co);
  }

  /*
    Ảnh không có bản dựng sẵn (file lạ, hoặc Google chưa kịp sinh) thì trả về
    đường cũ: Vercel còn `sharp` để tự thu nhỏ từ bản gốc. Worker không làm
    được việc đó nên đừng cố.
  */
  if (!thumbnailLink) return veDuongCu(env, fileId, co);

  const diaChi = thumbnailLink.replace(/=s\d+(-c)?$/, `=s${co}-rw`);
  let anh: Response;
  try {
    anh = await fetch(diaChi);
  } catch {
    return veDuongCu(env, fileId, co);
  }
  if (!anh.ok) return veDuongCu(env, fileId, co);

  const than = await anh.arrayBuffer();
  const kieu = anh.headers.get("content-type") ?? "image/webp";

  const ra = new Response(req.method === "HEAD" ? null : than, {
    headers: {
      "Content-Type": kieu,
      "Content-Length": String(than.byteLength),
      /*
        Một mã ảnh + một cỡ thì nội dung không bao giờ đổi, nên giữ thật lâu.
        Khác nhánh tải (private): ảnh xem KHÔNG có chữ ký hết hạn, nên để
        public cho Cloudflare giữ hộ — đó chính là chỗ tiết kiệm.
      */
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });

  /*
    Chỉ cất vào cache khi là GET. Lượt HEAD có thân rỗng, cất vào là lần sau
    khách nhận về một tấm ảnh không có nội dung.
  */
  if (req.method === "GET") ctx.waitUntil(cache.put(khoa, ra.clone()));
  return ra;
}
