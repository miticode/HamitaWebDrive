import sharp from "sharp";
import { downloadFile, getFileMeta } from "@/lib/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Tai anh ve may khach. Luon di qua day de khong lo link Drive goc. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await ctx.params;

  try {
    const [meta, original] = await Promise.all([
      getFileMeta(fileId),
      downloadFile(fileId),
    ]);

    // Xoa metadata GPS/thiet bi truoc khi giao cho khach, giu nguyen chat luong.
    const cleaned = await sharp(original, { failOn: "none" }).rotate().toBuffer();

    return new Response(new Uint8Array(cleaned), {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Content-Length": String(cleaned.length),
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(meta.name)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Loi khong xac dinh";
    return Response.json({ error: message }, { status: 502 });
  }
}
