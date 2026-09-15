import { cache } from "react";
import { getPrisma } from "@/lib/db";

/**
 * Tên nhân viên theo mã bên AppSheet ("Người lập", "Người duyệt" chỉ ghi mã).
 * Mã so không phân biệt hoa thường — bên AppSheet cùng một người có lúc ghi
 * "TTT142", lúc "ttt142".
 *
 * Bọc `cache`: một trang hỏi nhiều lần vẫn chỉ đọc database một lần.
 */
export const tenTheoMaNV = cache(async (): Promise<Map<string, string>> => {
  const ds = await getPrisma().nhanVien.findMany({
    where: { maNV: { not: null } },
    select: { maNV: true, ten: true },
  });
  return new Map(ds.map((n) => [n.maNV!.toLowerCase(), n.ten]));
});

/** Mã không khớp ai (người đã xoá, mã cũ) thì hiện nguyên mã, còn hơn để trống. */
export function tenNV(bang: Map<string, string>, ma: string | null | undefined): string | null {
  if (!ma) return null;
  return bang.get(ma.toLowerCase()) ?? ma;
}
