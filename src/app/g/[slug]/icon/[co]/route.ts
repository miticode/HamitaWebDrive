import { NextRequest } from "next/server";
import sharp from "sharp";
import { downloadFile, fetchThumbnail } from "@/lib/drive";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug } from "@/lib/store";
import { readCache, writeCache } from "@/lib/imageCache";
import { TRAN_DIEM_ANH } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Biểu tượng cho lối tắt khách đặt lên màn hình chính điện thoại.
 *
 * Lấy chính ảnh bìa album làm biểu tượng, không dùng logo studio: khách lưu
 * hai ba album thì ba biểu tượng logo giống hệt nhau, nhìn vào không biết cái
 * nào là nhà mình. Ảnh bìa thì nhận ra ngay.
 *
 * Cắt vuông theo tâm — hệ điều hành nào cũng bắt biểu tượng phải vuông, và ảnh
 * cưới thì chủ thể gần như luôn nằm giữa khung.
 */

/** Chỉ nhận đúng hai cỡ hệ điều hành cần, tránh sinh vô số bản. */
const CO_CHO_PHEP = [192, 512] as const;

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string; co: string }> }
) {
  const { slug, co } = await ctx.params;

  const canh = Number(co);
  if (!CO_CHO_PHEP.includes(canh as (typeof CO_CHO_PHEP)[number])) {
    return Response.json({ error: "Cỡ không hợp lệ." }, { status: 400 });
  }

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  try {
    const tree = await loadTree(gallery.driveFolderId);
    const tatCa = tree.albums.flatMap((a) => a.photos);
    // Cùng cách chọn với ảnh bìa ở trang album: ưu tiên tấm studio đã chọn.
    const bia =
      (gallery.coverFileId && tatCa.find((p) => p.id === gallery.coverFileId)) ||
      tatCa[0];
    if (!bia) return Response.json({ error: "Album chưa có ảnh" }, { status: 404 });

    const khoa = `icon:${bia.id}:${canh}:v1`;
    let ra = await readCache(khoa);

    if (!ra) {
      // Xin bản dựng sẵn hơi lớn hơn cỡ cần, để cắt vuông xong vẫn còn nét.
      const nguon =
        (await fetchThumbnail(bia.id, canh * 2)) ?? (await downloadFile(bia.id));

      ra = await sharp(nguon, { failOn: "none", limitInputPixels: TRAN_DIEM_ANH })
        .rotate()
        .resize(canh, canh, { fit: "cover", position: "attention" })
        .png()
        .toBuffer();
      await writeCache(khoa, ra);
    }

    return new Response(new Uint8Array(ra), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(ra.length),
        /*
          Cache ngắn hơn ảnh thường (1 ngày thay vì 1 năm): studio đổi ảnh bìa
          thì biểu tượng trên máy khách nên đổi theo trong ngày, chứ không phải
          đợi cả năm. Biểu tượng chỉ lấy một lần lúc cài nên không tốn gì.
        */
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi không xác định";
    return Response.json({ error: message }, { status: 502 });
  }
}
