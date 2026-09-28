import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { after } from "next/server";
import sharp from "sharp";
import { downloadFile, getFileMeta } from "@/lib/drive";
import { boMetadataJpeg } from "@/lib/jpeg";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug, ghiLuotTai } from "@/lib/store";
import { TRAN_DIEM_ANH } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Đường dẫn Worker sống bao lâu.
 *
 * Mười phút: đủ cho khách bấm "Tải tất cả" một album lớn (trình duyệt xếp hàng
 * từng tấm), mà ngắn đủ để một đường dẫn lọt ra ngoài cũng nhanh chết. Hết hạn
 * thì khách bấm tải lại là có đường mới.
 */
const HAN_DUONG_DAN_MS = 10 * 60_000;

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

  /*
    ĐẨY VIỆC GIAO ẢNH SANG CLOUDFLARE WORKER (anh chốt 28/09/2026).

    Đường cũ đi Drive → máy chủ này → khách. Chặng thứ hai tốn 168 GB một
    tháng, khoảng 45 đô — hơn nửa hoá đơn Vercel. Cloudflare không tính tiền
    băng thông ra khách.

    MỌI PHÉP KIỂM QUYỀN VẪN Ở ĐÂY, ngay phía trên: album có cho tải không, ảnh
    có đúng thuộc album đó không. Worker chỉ nhận một đường dẫn đã ký tên và
    hết hạn sau ít phút, không tự quyết được gì.

    ĐƯỜNG LUI: chưa khai hai biến môi trường thì đoạn này bị bỏ qua và ảnh vẫn
    đi đường cũ như trước. Worker trục trặc thì xoá biến trong Vercel là mọi
    thứ chạy lại ngay, khách không bao giờ mất đường tải ảnh.
  */
  const nenWorker = process.env.TAI_ANH_WORKER_URL?.trim();
  const kyChung = process.env.TAI_ANH_KY_CHUNG?.trim();
  if (nenWorker && kyChung) {
    try {
      const meta = await getFileMeta(fileId);
      const han = Date.now() + HAN_DUONG_DAN_MS;
      const ky = createHmac("sha256", kyChung).update(`${fileId}.${han}`).digest("hex");

      // Đếm ngay tại đây: từ lúc này ảnh chắc chắn được giao, và máy chủ sẽ
      // không thấy lượt tải đó nữa vì khách lấy thẳng từ Worker.
      after(() => ghiLuotTai(gallery.id, 1).catch(() => {}));

      const den = new URL(`/t/${encodeURIComponent(fileId)}`, nenWorker);
      den.searchParams.set("han", String(han));
      den.searchParams.set("ky", ky);
      den.searchParams.set("ten", meta.name);
      return Response.redirect(den.toString(), 302);
    } catch {
      // Drive không trả lời thì rơi xuống đường cũ bên dưới, đừng bắt khách chịu.
    }
  }

  try {
    const [meta, original] = await Promise.all([
      getFileMeta(fileId),
      downloadFile(fileId),
    ]);

    const cleaned = await donDep(original, meta.mimeType);

    /*
      Dem mot tam khach vua tai ve.

      Trong `after()` nen khach khong phai doi mot lan ghi database moi nhan
      duoc file; nuot loi vi cung ly do voi dem luot xem (nguyen tac 29) —
      khong dem duoc thi cung lam thieu mot con so thong ke, con lam hong viec
      tai anh thi khong chap nhan duoc.

      Dat SAU khi da don dep xong va truoc khi tra ve: den day la chac chan co
      file de giao, khong dem nham nhung lan Drive tra loi.
    */
    after(() => ghiLuotTai(gallery.id, 1).catch(() => {}));

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
