"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { timHopDong, type HopDongGon } from "@/lib/noiAlbum";
import { buocSauKhiGuiAnhGoc, tenBuocTheoSo } from "@/lib/buocAnhGoc";
import { docCacBuoc } from "@/lib/buocHopDong";

/**
 * Gắn album ảnh vào hợp đồng, và ô tìm hợp đồng của trang album.
 *
 * Tách khỏi actions.ts cho tệp đó khỏi phình. Ai mở được trang album thì gắn
 * được — đây là việc làm hằng ngày, không phải việc nguy hiểm: gắn nhầm thì
 * bấm "Bỏ gắn" là xong, không mất dữ liệu của ai.
 */

export async function timHopDongAction(q: string): Promise<HopDongGon[]> {
  if (!(await quyenAlbum())) return [];
  return timHopDong(q);
}

export async function ganHopDongAction(
  galleryId: string,
  hopDongId: string | null,
): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Chưa đăng nhập." };
  const nguoi = await layNguoiDung();
  const prisma = getPrisma();

  const album = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { id: true, slug: true, title: true, clientName: true, hopDong: { select: { maHD: true, tenKhach: true } } },
  });
  if (!album) return { loi: "Không tìm thấy album." };

  let ten: string | null = null;
  if (hopDongId) {
    const hd = await prisma.hopDong.findUnique({ where: { id: hopDongId }, select: { maHD: true, tenKhach: true } });
    if (!hd) return { loi: "Không tìm thấy hợp đồng." };
    ten = `${hd.tenKhach} (${hd.maHD})`;
  }

  await prisma.gallery.update({ where: { id: galleryId }, data: { hopDongId } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "gan-hop-dong",
    doiTuong: "Gallery",
    doiTuongId: galleryId,
    chiTiet: {
      ten: `${album.clientName ?? album.title}`,
      doi: {
        "hợp đồng": {
          truoc: album.hopDong ? `${album.hopDong.tenKhach} (${album.hopDong.maHD})` : null,
          sau: ten,
        },
      },
    },
  });

  revalidatePath(`/admin/${album.slug}`);
  revalidatePath("/quan-ly/hop-dong");
  if (hopDongId) revalidatePath(`/quan-ly/hop-dong/${hopDongId}`);
  return {};
}

/* ── Gửi ảnh gốc → đổi bước hợp đồng (anh yêu cầu 19/11/2026) ─────────── */

/** Album này đã gửi ảnh gốc xong — bước hợp đồng đổi được hay không, và thành gì. */
export type KetQuaAnhGoc = {
  /** Đã đổi bước: hiện ra cho người bấm biết việc thứ hai cũng xong. */
  doiBuoc?: { tenKhach: string; tu: string; den: string };
  /** Album chưa gắn hợp đồng — anh chốt 19/11: vẫn gửi tin, nhưng nói rõ. */
  chuaGan?: true;
  /** Có hợp đồng nhưng bước hiện tại không phải chỗ đáng đổi. */
  giuBuoc?: { tenKhach: string; buoc: string };
};

/**
 * Đổi bước hợp đồng của một album sang "đã gửi ảnh gốc".
 *
 * Dùng chung cho HAI đường vào:
 *   - nút "Gửi thông báo" (khách có bật thông báo) — gọi sau khi tin đã đi
 *   - nút "Đã gửi file gốc" (khách chưa bật) — gọi trực tiếp
 *
 * Hai đường cùng một kết quả nghiệp vụ, nên phải cùng một đoạn mã: hai bản
 * chép là sớm muộn lệch nhau một điều kiện.
 *
 * KHÔNG bao giờ ném lỗi. Đường thứ nhất gọi nó sau khi thông báo đã tới điện
 * thoại khách — lúc đó mà nổ thì nhân viên thấy báo lỗi và tưởng tin chưa gửi,
 * rồi bấm lại lần hai làm khách rung vô cớ.
 */
async function doiBuocGuiAnhGoc(galleryId: string): Promise<KetQuaAnhGoc> {
  try {
    const prisma = getPrisma();
    const album = await prisma.gallery.findUnique({
      where: { id: galleryId },
      select: {
        slug: true,
        hopDong: { select: { id: true, tenKhach: true, maHD: true, trangThai: true, buoc: true } },
      },
    });
    if (!album?.hopDong) return { chuaGan: true };

    const hd = album.hopDong;
    const so = buocSauKhiGuiAnhGoc(hd.buoc);
    if (so === null) {
      return { giuBuoc: { tenKhach: hd.tenKhach, buoc: hd.trangThai ?? "chưa gõ bước" } };
    }

    /* Tên bước lấy từ bảng đang dùng, không viết cứng — xem `tenBuocTheoSo`. */
    const ten = tenBuocTheoSo(await docCacBuoc(), so);
    if (!ten) return { giuBuoc: { tenKhach: hd.tenKhach, buoc: hd.trangThai ?? "chưa gõ bước" } };

    const cu = hd.trangThai ?? "chưa gõ bước";
    await prisma.hopDong.update({ where: { id: hd.id }, data: { trangThai: ten, buoc: so } });

    /*
      GHI NHẬT KÝ, khác hẳn nút "Làm mới" (nút đó cố ý không ghi).

      Đây là đổi tiến độ của cả một nhà khách, và từ nay nó xảy ra ở trang
      ALBUM chứ không phải trang hợp đồng. Người mở hợp đồng ra thấy bước đã
      nhảy mà không ai gõ thì phải tra được là ai, lúc nào, từ đâu.
    */
    await ghiNhatKy({
      nguoi: await layNguoiDung(),
      hanhDong: "doi-buoc-anh-goc",
      doiTuong: "HopDong",
      doiTuongId: hd.id,
      chiTiet: { ten: `${hd.tenKhach} (${hd.maHD})`, doi: { "trạng thái": { truoc: cu, sau: ten } } },
    });

    revalidatePath(`/admin/${album.slug}`);
    revalidatePath("/quan-ly/hop-dong");
    revalidatePath(`/quan-ly/hop-dong/${hd.id}`);
    return { doiBuoc: { tenKhach: hd.tenKhach, tu: cu, den: ten } };
  } catch {
    /* Nuốt lỗi có chủ ý — xem chú thích trên. */
    return {};
  }
}

/**
 * Nút "Đã gửi file gốc" — dành cho album khách CHƯA BẬT thông báo.
 *
 * Anh yêu cầu 19/11/2026. Đo cùng ngày: 59/182 album không ai bật thông báo,
 * nên nếu việc đổi bước chỉ đi kèm nút gửi tin thì một phần ba album không
 * bao giờ được đổi — đúng cái bệnh quên đổi bước mà anh muốn chữa.
 *
 * KHÔNG gửi gì cho khách, chỉ đánh dấu việc studio đã làm.
 */
export async function daGuiAnhGocAction(galleryId: string): Promise<{ loi?: string } & KetQuaAnhGoc> {
  if (!(await quyenAlbum())) return { loi: "Chưa đăng nhập." };
  return doiBuocGuiAnhGoc(galleryId);
}

/** Cho `guiThongBaoAction` ở actions.ts gọi lại — xem chú thích ở trên. */
export async function doiBuocSauKhiGuiTin(galleryId: string): Promise<KetQuaAnhGoc> {
  return doiBuocGuiAnhGoc(galleryId);
}
