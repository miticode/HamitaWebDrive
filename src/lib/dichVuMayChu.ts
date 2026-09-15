import { getPrisma } from "@/lib/db";
import { laLoaiDichVu, type LoaiDichVu } from "@/lib/dichVuChung";

/**
 * Các nhóm đang có của từng loại, xếp theo chữ — gợi ý cho ô "Nhóm" để khỏi
 * mỗi người gõ một kiểu ("Cưới", "cưới", "Cuoi") rồi lọc không ra.
 */
export async function nhomTheoLoai(): Promise<Partial<Record<LoaiDichVu, string[]>>> {
  const ds = await getPrisma().dichVu.findMany({
    where: { nhom: { not: null } },
    distinct: ["loai", "nhom"],
    select: { loai: true, nhom: true },
  });
  const ra: Partial<Record<LoaiDichVu, string[]>> = {};
  for (const d of ds) {
    if (!laLoaiDichVu(d.loai) || !d.nhom) continue;
    (ra[d.loai] ??= []).push(d.nhom);
  }
  for (const k of Object.keys(ra) as LoaiDichVu[]) ra[k]!.sort((a, b) => a.localeCompare(b, "vi"));
  return ra;
}
