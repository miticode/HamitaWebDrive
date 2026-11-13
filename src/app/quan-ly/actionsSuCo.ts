"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { kiemSuCo, SU_CO_DA_XONG, SU_CO_DANG_TAO, type DuLieuSuCo } from "@/lib/suCoChung";

/**
 * SỔ SỰ CỐ — ghi và đóng. Đợt 6 (13/11/2026).
 *
 * GHI thì CẢ TIỆM làm được: người thấy máy hỏng, thấy đèn cháy, thấy khách
 * phàn nàn là người đang đứng ở đó, không phải quản lý. Chặn họ lại là sổ này
 * trống rỗng y như bên AppSheet.
 *
 * ĐÓNG thì chỉ quản lý — nói "đã xong" là một lời kết, phải có người chịu.
 */

export async function ghiSuCoAction(du: DuLieuSuCo): Promise<{ loi: string } | { id: string }> {
  const nguoi = await layNguoiDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết." };

  const sach = kiemSuCo(du);
  if ("loi" in sach) return sach;

  const sc = await getPrisma().suCo.create({
    data: {
      vanDe: sach.vanDe,
      thongTin: sach.thongTin,
      trangThai: SU_CO_DANG_TAO,
      nguoiGhiMaNV: nguoi.maNV ?? null,
    },
    select: { id: true },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: "ghi-su-co",
    doiTuong: "SuCo",
    doiTuongId: sc.id,
    chiTiet: { ten: sach.vanDe },
  });

  revalidatePath("/quan-ly/su-co");
  return { id: sc.id };
}

/** Đóng, hoặc mở lại. Cả hai đều ghi nhật ký — đóng sai thì còn lần ra được. */
export async function dongSuCoAction(
  id: string,
  xuLy: string,
  moLai = false,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi) || !nguoi) return { loi: "Chỉ quản lý đóng được sự cố." };

  const prisma = getPrisma();
  const sc = await prisma.suCo.findUnique({ where: { id }, select: { id: true, vanDe: true } });
  if (!sc) return { loi: "Không tìm thấy sự cố này." };

  const chu = String(xuLy ?? "").trim().slice(0, 2000);
  await prisma.suCo.update({
    where: { id },
    data: moLai
      ? { trangThai: SU_CO_DANG_TAO, xongLuc: null }
      : {
          trangThai: SU_CO_DA_XONG,
          xongLuc: new Date(),
          /* Để trống thì giữ nguyên cách xử lý cũ, không xoá đi bằng chuỗi rỗng. */
          ...(chu ? { xuLy: chu } : {}),
        },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: moLai ? "ghi-su-co" : "dong-su-co",
    doiTuong: "SuCo",
    doiTuongId: id,
    chiTiet: { ten: sc.vanDe ?? "", ...(moLai ? { moLai: true } : {}) },
  });

  revalidatePath("/quan-ly/su-co");
  return { ok: true };
}
