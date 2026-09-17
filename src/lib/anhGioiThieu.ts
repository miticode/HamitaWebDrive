import { getPrisma } from "./db";
import { loadTree } from "./gallery";
import type { MucAnhCuoi } from "./anhCuoi";

/** Một thư mục đã đưa lên trang Ảnh cưới, đủ để trang quản lý hiện mà không gọi Drive. */
export type ThuMucGioiThieu = {
  id: string;
  muc: string;
  galleryId: string;
  tenAlbum: string;
  slug: string;
  albumId: string;
  tenMuc: string;
  anhBia: string | null;
  soAnh: number;
};

export async function docThuMucGioiThieu(muc?: MucAnhCuoi): Promise<ThuMucGioiThieu[]> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: muc ? { muc } : undefined,
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { title: true, clientName: true, slug: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    muc: d.muc,
    galleryId: d.galleryId,
    tenAlbum: d.gallery.clientName ?? d.gallery.title,
    slug: d.gallery.slug,
    albumId: d.albumId,
    tenMuc: d.tenMuc,
    anhBia: d.anhBia,
    soAnh: d.soAnh,
  }));
}

/** Những mục đang có ít nhất một thư mục — trang công khai chỉ hiện nút cho mục này. */
export async function mucDangCo(): Promise<Set<string>> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    select: { muc: true },
    distinct: ["muc"],
  });
  return new Set(dong.map((d) => d.muc));
}

/**
 * Thêm một thư mục vào mục. Tên thư mục, tấm đầu và số ảnh đọc LẠI từ Drive ở
 * máy chủ, không tin số máy khách gửi lên — và đọc lại cũng là cách chắc chắn
 * thư mục đó còn tồn tại trong đúng album này.
 */
export async function themThuMucGioiThieu(
  muc: MucAnhCuoi,
  galleryId: string,
  albumId: string,
): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const g = await prisma.gallery.findUnique({
    where: { id: galleryId },
    select: { driveFolderId: true },
  });
  if (!g) return { loi: "Không tìm thấy album." };

  const tree = await loadTree(g.driveFolderId);
  const thuMuc = tree.albums.find((a) => a.id === albumId);
  if (!thuMuc) return { loi: "Không tìm thấy thư mục này trên Drive nữa." };
  if (thuMuc.photos.length === 0) return { loi: "Thư mục này chưa có ảnh nào." };

  const data = {
    tenMuc: thuMuc.name,
    anhBia: thuMuc.photos[0].id,
    soAnh: thuMuc.photos.length,
  };
  await prisma.anhGioiThieu.upsert({
    where: { muc_galleryId_albumId: { muc, galleryId, albumId } },
    create: { muc, galleryId, albumId, ...data },
    update: data,
  });
  return {};
}

export async function xoaThuMucGioiThieu(id: string): Promise<void> {
  await getPrisma().anhGioiThieu.deleteMany({ where: { id } });
}

/** Mỗi thư mục góp tối đa bấy nhiêu tấm lên trang công khai. */
export const TRAN_ANH_MOT_THU_MUC = 24;

export type AnhCongKhai = { id: string; width: number | null; height: number | null };

/**
 * Ảnh thật của một mục, đọc thẳng Drive (cache 5 phút dùng chung với trang
 * khách).
 *
 * Một thư mục "File gốc" có thể vài trăm tấm — đổ hết lên thì trang nặng và
 * khách lướt mãi không hết. Mỗi thư mục lấy tối đa TRAN_ANH_MOT_THU_MUC tấm
 * CÁCH ĐỀU nhau trong thư mục, không lấy 24 tấm đầu: tấm liền nhau trong một
 * buổi chụp thường cùng một dáng, lấy rải ra mới thấy đủ các cảnh.
 *
 * Album nào Drive lỗi hay thư mục đã bị xoá thì bỏ qua thư mục đó, không làm
 * chết cả trang (nguyên tắc 19).
 */
export async function docAnhCongKhai(muc: MucAnhCuoi): Promise<AnhCongKhai[]> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { muc },
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { driveFolderId: true } } },
  });

  const phan = await Promise.all(
    dong.map(async (d) => {
      try {
        const tree = await loadTree(d.gallery.driveFolderId);
        const anh = tree.albums.find((a) => a.id === d.albumId)?.photos ?? [];
        return rai(anh, TRAN_ANH_MOT_THU_MUC).map((p) => ({
          id: p.id,
          width: p.width,
          height: p.height,
        }));
      } catch {
        return [];
      }
    }),
  );
  return phan.flat();
}

/** Lấy `n` phần tử cách đều nhau trong danh sách (giữ nguyên thứ tự). */
function rai<T>(ds: T[], n: number): T[] {
  if (ds.length <= n) return ds;
  const buoc = ds.length / n;
  return Array.from({ length: n }, (_, i) => ds[Math.floor(i * buoc)]);
}
