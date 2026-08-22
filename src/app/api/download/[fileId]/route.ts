import sharp from "sharp";
import { downloadFile, getFileMeta } from "@/lib/drive";
import { boMetadataJpeg } from "@/lib/jpeg";

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

    const cleaned = await donDep(original, meta.mimeType);

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

/**
 * Xoa thong tin may anh/GPS truoc khi giao cho khach.
 *
 * Duong chinh la cat bo cac doan metadata trong file JPEG, khong dung toi phan
 * anh — khach nhan dung tung byte anh goc. Chi khi file khong doc duoc theo
 * cach do moi phai giai nen lai bang sharp.
 */
async function donDep(goc: Buffer, mimeType: string): Promise<Buffer> {
  if (mimeType === "image/jpeg") {
    /*
      Chi cat bo duoc khi anh khong dua vao the huong de xoay. Anh co the huong
      khac 1 ma bi cat mat EXIF thi se hien ra nam ngang — luc do phai nho sharp
      xoay san vao pixel.
    */
    const { orientation } = await sharp(goc).metadata();
    if (!orientation || orientation === 1) {
      const sach = boMetadataJpeg(goc);
      if (sach) return sach;
    }

    // Duong lui cho JPEG: nen lai o muc cao nhat, khong giam mau, de phan chenh
    // lech so voi ban goc nho toi muc mat thuong khong thay.
    return sharp(goc, { failOn: "none" })
      .rotate()
      .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
      .toBuffer();
  }

  // PNG va cac dinh dang khong mat du lieu: nen lai khong lam giam chat luong.
  return sharp(goc, { failOn: "none" }).rotate().toBuffer();
}
