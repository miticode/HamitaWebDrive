import { NextRequest } from "next/server";
import sharp from "sharp";
import { downloadFile, getFileMeta } from "@/lib/drive";
import { boMetadataJpeg } from "@/lib/jpeg";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug } from "@/lib/store";
import { TRAN_DIEM_ANH } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Tai anh ve may khach. Luon di qua day de khong lo link Drive goc.
 *
 * Truoc day route nay nhan bat ky ma anh nao va tra thang file goc, khong
 * kiem tra gi ca — ai xem duoc trang album cung ghep duoc link tai anh goc, ke
 * ca khi studio da tat "Cho khach tai anh ve". Gio bat buoc phai keo theo
 * ?slug=, va phai kiem tra CA HAI: album do co cho tai khong, VA anh do co
 * that su nam trong album do khong (khong thi mot nguoi co quyen tai o album A
 * se tai duoc anh cua album B da tat quyen tai, chi can biet ma anh).
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await ctx.params;
  const slug = req.nextUrl.searchParams.get("slug");

  if (!slug) {
    return Response.json({ error: "Thiếu thông tin album." }, { status: 400 });
  }

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) {
    return Response.json({ error: "Không tìm thấy album." }, { status: 404 });
  }
  if (!gallery.allowDownload) {
    return Response.json({ error: "Album này không cho tải ảnh." }, { status: 403 });
  }

  const tree = await loadTree(gallery.driveFolderId);
  const thuocAlbum = tree.albums.some((a) => a.photos.some((p) => p.id === fileId));
  if (!thuocAlbum) {
    return Response.json({ error: "Ảnh không thuộc album này." }, { status: 404 });
  }

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
  /*
    Noi tran diem anh o MOI lan goi sharp trong ham nay.

    Anh in kho lon (mica 60x120cm do duoc 18000x36000 = 648 trieu diem anh)
    vuot muc mac dinh 268 trieu cua sharp. Bo sot mot cho la khach bam tai
    dung tam do se nhan ve loi thay vi file. Xem TRAN_DIEM_ANH trong
    constants.ts.
  */
  const tuyChon = { failOn: "none" as const, limitInputPixels: TRAN_DIEM_ANH };

  if (mimeType === "image/jpeg") {
    /*
      Chi cat bo duoc khi anh khong dua vao the huong de xoay. Anh co the huong
      khac 1 ma bi cat mat EXIF thi se hien ra nam ngang — luc do phai nho sharp
      xoay san vao pixel.
    */
    const { orientation } = await sharp(goc, tuyChon).metadata();
    if (!orientation || orientation === 1) {
      const sach = boMetadataJpeg(goc);
      if (sach) return sach;
    }

    // Duong lui cho JPEG: nen lai o muc cao nhat, khong giam mau, de phan chenh
    // lech so voi ban goc nho toi muc mat thuong khong thay.
    return sharp(goc, tuyChon)
      .rotate()
      .jpeg({ quality: 100, chromaSubsampling: "4:4:4" })
      .toBuffer();
  }

  // PNG va cac dinh dang khong mat du lieu: nen lai khong lam giam chat luong.
  return sharp(goc, tuyChon).rotate().toBuffer();
}
