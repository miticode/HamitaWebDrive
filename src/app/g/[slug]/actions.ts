"use server";

import { revalidatePath } from "next/cache";
import { ghiNhanMoKhoa, maKhop } from "@/lib/access";
import { getGalleryBySlug } from "@/lib/store";
import { LOCK_MINUTES, clearFailures, clientIp, recordFailure, remainingAttempts } from "@/lib/rateLimit";

export type KetQuaMoKhoa = { ok: boolean; error?: string };

/**
 * Khach nhap ma xem album.
 *
 * Ma chi co 33.856 to hop (2 chu + 2 so) — khong khoa thi mot doan script don
 * gian do het trong vai phut. Dung chung khoa "code:" + IP voi trang dang nhap
 * admin (khac tien to de hai cho khong doi cham nhau).
 */
export async function moKhoaAction(
  slug: string,
  ma: string
): Promise<KetQuaMoKhoa> {
  const ip = await clientIp();
  const khoa = `code:${ip}`;

  const left = await remainingAttempts(khoa);
  if (left === 0) {
    return { ok: false, error: `Nhập sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút giúp em.` };
  }

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return { ok: false, error: "Không tìm thấy album này." };

  if (!maKhop(ma, gallery.accessCode)) {
    await recordFailure(khoa);
    const conLai = left - 1;
    return {
      ok: false,
      error:
        conLai > 0
          ? `Mã chưa đúng. Còn ${conLai} lần thử.`
          : `Nhập sai quá nhiều lần. Thử lại sau ${LOCK_MINUTES} phút giúp em.`,
    };
  }

  await clearFailures(khoa);
  await ghiNhanMoKhoa(gallery.id, gallery.accessCode!);
  revalidatePath(`/g/${slug}`);
  return { ok: true };
}
