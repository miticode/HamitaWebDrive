import { NextRequest } from "next/server";
import sharp from "sharp";
import { downloadFile, fetchThumbnail } from "@/lib/drive";
import { readCache, writeCache } from "@/lib/imageCache";
import { TRAN_DIEM_ANH } from "@/lib/constants";

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

/**
 * Uu tien ban dung san cua Google o moi kich thuoc.
 * Ban goc o day co the nang 6MB; tai ve chi de thu nho lai vua cham vua ton
 * bang thong. Chi tai ban goc khi Drive chua sinh ban dung san.
 */
async function loadSource(fileId: string, size: number): Promise<Buffer> {
  const thumb = await fetchThumbnail(fileId, size);
  if (thumb) return thumb;
  return downloadFile(fileId);
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
  const blur = req.nextUrl.searchParams.get("blur") === "1";
  const cacheKey = `${fileId}:${size}:${blur ? "blur" : "sharp"}:webp:v2`;

  try {
    let output = await readCache(cacheKey);

    if (!output) {
      const source = await loadSource(fileId, size);
      // Noi tran diem anh: anh in kho lon vuot xa muc mac dinh cua sharp.
      // Xem giai thich day du o TRAN_DIEM_ANH trong constants.ts.
      let pipeline = sharp(source, { failOn: "none", limitInputPixels: TRAN_DIEM_ANH })
        .rotate() // tu xoay theo EXIF
        // fit "inside" = gioi han ca hai chieu, tuc la chan theo canh dai
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true });

      if (blur) pipeline = pipeline.blur(12);

      output = await pipeline.webp({ quality: blur ? 40 : 80 }).toBuffer();
      await writeCache(cacheKey, output);
    }

    return new Response(new Uint8Array(output), {
      headers: {
        "Content-Type": "image/webp",
        "Content-Length": String(output.length),
        // Noi dung cua mot fileId + size la bat bien -> cache that lau o CDN.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Loi khong xac dinh";
    return Response.json({ error: message }, { status: 502 });
  }
}
