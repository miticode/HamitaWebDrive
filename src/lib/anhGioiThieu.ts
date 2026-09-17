import { getPrisma } from "./db";
import { loadTree } from "./gallery";
import type { MucAnhCuoi } from "./anhCuoi";
import { tenKhongMa } from "./maAlbum";

/** Một thư mục đã đưa lên trang Ảnh cưới, đủ để trang quản lý hiện mà không gọi Drive. */
export type ThuMucGioiThieu = {
  id: string;
  muc: string;
  galleryId: string;
  tenAlbum: string;
  slug: string;
  /** Thư mục gốc Drive của album — ô đổi bìa cần để liệt kê ảnh. */
  driveFolderId: string;
  albumId: string;
  tenMuc: string;
  anhBia: string | null;
  soAnh: number;
};

export async function docThuMucGioiThieu(muc?: MucAnhCuoi): Promise<ThuMucGioiThieu[]> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: muc ? { muc } : undefined,
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { title: true, clientName: true, slug: true, driveFolderId: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    muc: d.muc,
    galleryId: d.galleryId,
    tenAlbum: d.gallery.clientName ?? d.gallery.title,
    slug: d.gallery.slug,
    driveFolderId: d.gallery.driveFolderId,
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

  const data = { tenMuc: thuMuc.name, soAnh: thuMuc.photos.length };
  await prisma.anhGioiThieu.upsert({
    where: { muc_galleryId_albumId: { muc, galleryId, albumId } },
    create: { muc, galleryId, albumId, anhBia: thuMuc.photos[0].id, ...data },
    // Thêm lại thư mục đã có thì KHÔNG đè ảnh bìa studio đã tự chọn.
    update: data,
  });
  return {};
}

/**
 * Đổi ảnh bìa của một thư mục trên trang Ảnh cưới. Kiểm ở máy chủ rằng tấm ảnh
 * nằm ĐÚNG trong thư mục đó — không thì ai gọi thẳng action cũng gắn được một
 * tấm bất kỳ trên Drive của studio (kể cả ảnh riêng của nhà khác) lên trang
 * công khai.
 */
export async function doiBiaThuMucGioiThieu(id: string, fileId: string): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const d = await prisma.anhGioiThieu.findUnique({
    where: { id },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  if (!d) return { loi: "Thư mục này đã bị gỡ khỏi trang." };
  const tree = await loadTree(d.gallery.driveFolderId);
  const thuMuc = tree.albums.find((a) => a.id === d.albumId);
  if (!thuMuc?.photos.some((p) => p.id === fileId)) return { loi: "Ảnh này không nằm trong thư mục." };
  await prisma.anhGioiThieu.update({ where: { id }, data: { anhBia: fileId } });
  return {};
}

export async function xoaThuMucGioiThieu(id: string): Promise<void> {
  await getPrisma().anhGioiThieu.deleteMany({ where: { id } });
}

export type AnhCongKhai = { id: string; width: number | null; height: number | null };

/**
 * Các thư mục của một mục, cho trang /anh-cuoi/<mục>. CHỈ đọc database — tên
 * và tấm bìa đã lưu lúc chọn — nên trang danh sách thư mục mở nhanh, không đợi
 * Drive. Ảnh bên trong chỉ đọc khi khách bấm vào một thư mục.
 */
export async function docThuMucCongKhai(muc: MucAnhCuoi) {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { muc },
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { title: true, clientName: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    ten: tenKhongMa(d.gallery.clientName ?? d.gallery.title),
    anhBia: d.anhBia,
    soAnh: d.soAnh,
  }));
}

/**
 * Một thư mục và TOÀN BỘ ảnh trong đó, đọc thẳng Drive (cache 5 phút chung với
 * trang khách). null = không có thư mục này trong mục. Drive lỗi thì ném —
 * trang tự bắt (nguyên tắc 19).
 */
export async function docAnhThuMuc(muc: MucAnhCuoi, id: string) {
  const d = await getPrisma().anhGioiThieu.findFirst({
    where: { id, muc },
    include: { gallery: { select: { title: true, clientName: true, driveFolderId: true } } },
  });
  if (!d) return null;
  const tree = await loadTree(d.gallery.driveFolderId);
  const anh: AnhCongKhai[] = (tree.albums.find((a) => a.id === d.albumId)?.photos ?? []).map((p) => ({
    id: p.id,
    width: p.width,
    height: p.height,
  }));
  return { ten: tenKhongMa(d.gallery.clientName ?? d.gallery.title), anh };
}
