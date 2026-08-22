"use server";

import { revalidatePath } from "next/cache";
import { ghiNhanMoKhoa, maKhop } from "@/lib/access";
import { getGalleryBySlug } from "@/lib/store";

export type KetQuaMoKhoa = { ok: boolean; error?: string };

/** Khach nhap ma xem album. */
export async function moKhoaAction(
  slug: string,
  ma: string
): Promise<KetQuaMoKhoa> {
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return { ok: false, error: "Không tìm thấy album này." };

  if (!maKhop(ma, gallery.accessCode)) {
    return { ok: false, error: "Mã chưa đúng. Anh chị kiểm tra lại giúp em." };
  }

  await ghiNhanMoKhoa(gallery.id, gallery.accessCode!);
  revalidatePath(`/g/${slug}`);
  return { ok: true };
}
