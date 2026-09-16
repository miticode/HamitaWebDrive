"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { timHopDong, type HopDongGon } from "@/lib/noiAlbum";

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
