import { NextRequest } from "next/server";
import sharp from "sharp";
import { downloadFile, fetchThumbnail } from "@/lib/drive";
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
  const { fileId } = await ctx.params;
  const size = pickSize(req.nextUrl.searchParams.get("w"));
  const blur = req.nextUrl.searchParams.get("blur") === "1";
  const cacheKey = `${fileId}:${size}:${blur ? "blur" : "sharp"}:webp:v2`;

  try {
    let output = await readCache(cacheKey);

    if (!output) {
      const source = await loadSource(fileId, size);
      let pipeline = sharp(source, { failOn: "none" })
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
