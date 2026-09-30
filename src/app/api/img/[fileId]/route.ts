import { NextRequest } from "next/server";
import { fetchThumbnail } from "@/lib/drive";
import { readCache, writeCache } from "@/lib/imageCache";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Kich thuoc o day la CANH DAI, khong phai chieu rong.
 *
 * Anh cuoi phan lon la anh doc. Neu gioi han theo chieu rong thi anh doc
 * 2048px se cao toi 3072px — gap doi so diem anh man hinh dien thoai can,
 * tra ve mot tam anh nang gap doi ma khach khong nhin ra khac biet.
 */
const ALLOWED_SIZES = [320, 640, 960, 1440, 2048] as const;
const DEFAULT_SIZE = 960;

function pickSize(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_SIZE;
  return ALLOWED_SIZES.reduce((best, s) =>
    Math.abs(s - n) < Math.abs(best - n) ? s : best
  );
}

/**
 * Chan nhung, khong chan truy cap that.
 *
 * Chi tu choi khi CO bang chung ro rang request den tu mot trang KHAC —
 * moi truong hop con lai (khong co header, hoac cung nguon) deu cho qua. Ba
 * nguoi dung hop le khong duoc co header nay: he thong "dung anh san" cua
 * chinh minh goi tu may chu (warm.ts, khong gui Referer/Sec-Fetch-Site), bot
 * xem truoc lien ket cua Facebook/Zalo khi khach gui link cho nhau, va khach
 * mo thang URL anh (vd "Mo anh trong tab moi").
 */
function laNhungTuNoiKhac(req: NextRequest): boolean {
  // Trinh duyet hien dai tu gui header nay, dang tin hon Referer vi kho gia mao.
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite) return secFetchSite === "cross-site";

  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).host !== req.nextUrl.host;
  } catch {
    return false; // Referer sai dang thi khong du can cu de chan.
  }
}


export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> }
) {
  if (laNhungTuNoiKhac(req)) {
    return Response.json({ error: "Ảnh này không phục vụ nơi khác." }, { status: 403 });
  }

  const { fileId } = await ctx.params;
  const size = pickSize(req.nextUrl.searchParams.get("w"));
  const cacheKey = `${fileId}:${size}:google:v3`;

  try {
    const sanCo = await readCache(cacheKey);
    if (sanCo) {
      return traAnh(sanCo, "image/webp");
    }

    /*
      Lay THANG ban dung san cua Google, khong nen lai lan nao.

      Truoc 30/09/2026 cho nay tai anh ve roi cho sharp thu nho va doi sang
      WebP. Nay Google tra san WebP dung co (hau to "-rw" trong fetchThumbnail),
      nen bo han sharp: nhanh hon, khong ton CPU, va ban WebP cua Google do
      duoc la trung thuc ngang — o co 2048 con net hon.

      Anh KHONG co ban dung san thi tra 404 chu khong tu thu nho: khong con
      thu vien nao lam viec do. Da do 25/25 anh that deu co ban dung san, nen
      truong hop nay rat hiem; Worker ban anh gap thi tu quay ve day, va day
      tra 404 thi <img> chi hien o trong.
    */
    const thumb = await fetchThumbnail(fileId, size);
    if (!thumb) {
      return Response.json({ error: "Ảnh này chưa có bản dựng sẵn." }, { status: 404 });
    }

    await writeCache(cacheKey, thumb.du);
    return traAnh(thumb.du, thumb.kieu);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Loi khong xac dinh";
    return Response.json({ error: message }, { status: 502 });
  }
}

function traAnh(du: Buffer, kieu: string): Response {
  return new Response(new Uint8Array(du), {
    headers: {
      "Content-Type": kieu,
      "Content-Length": String(du.length),
      // Noi dung cua mot fileId + size la bat bien -> cache that lau o CDN.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
