import { getPrisma } from "./db";
import { loadTree } from "./gallery";
import { timMuc } from "./nhomGioiThieu";
import { tenKhongMa } from "./maAlbum";

/** Một thư mục đã đưa lên trang giới thiệu, đủ để trang quản lý hiện mà không gọi Drive. */
export type ThuMucGioiThieu = {
  id: string;
  nhom: string;
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

/** Mọi thư mục đã chọn (trang quản lý). */
export async function docThuMucGioiThieu(): Promise<ThuMucGioiThieu[]> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { title: true, clientName: true, slug: true, driveFolderId: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    nhom: d.nhom,
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

/** Những mục đang có ít nhất một thư mục, của một nhóm. */
export async function mucDangCo(nhom: string): Promise<Set<string>> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom },
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
  nhom: string,
  muc: string,
  galleryId: string,
  albumId: string,
): Promise<{ loi?: string }> {
  if (!timMuc(nhom, muc)) return { loi: "Mục không hợp lệ." };
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

  const data = { nhom, tenMuc: thuMuc.name, soAnh: thuMuc.photos.length };
  await prisma.anhGioiThieu.upsert({
    where: { muc_galleryId_albumId: { muc, galleryId, albumId } },
    create: { muc, galleryId, albumId, anhBia: thuMuc.photos[0].id, ...data },
    // Thêm lại thư mục đã có thì KHÔNG đè ảnh bìa studio đã tự chọn.
    update: data,
  });
  return {};
}

/**
 * Đổi ảnh bìa của một thư mục. Kiểm ở máy chủ rằng tấm ảnh nằm ĐÚNG trong thư
 * mục đó — không thì ai gọi thẳng action cũng gắn được một tấm bất kỳ trên
 * Drive của studio (kể cả ảnh riêng của nhà khác) lên trang công khai.
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
 * Các thư mục của một mục, cho trang /dich-vu/<nhóm>/<mục>. CHỈ đọc database —
 * tên và tấm bìa đã lưu lúc chọn — nên trang mở nhanh, không đợi Drive.
 */
export async function docThuMucCongKhai(nhom: string, muc: string) {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom, muc },
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
 * trang khách). null = không có thư mục này trong nhóm. Drive lỗi thì ném —
 * trang tự bắt (nguyên tắc 19).
 */
export async function docAnhThuMuc(nhom: string, id: string) {
  const d = await getPrisma().anhGioiThieu.findFirst({
    where: { id, nhom },
    include: { gallery: { select: { title: true, clientName: true, driveFolderId: true } } },
  });
  if (!d) return null;
  const tree = await loadTree(d.gallery.driveFolderId);
  const anh: AnhCongKhai[] = (tree.albums.find((a) => a.id === d.albumId)?.photos ?? []).map((p) => ({
    id: p.id,
    width: p.width,
    height: p.height,
  }));
  return { muc: d.muc, ten: tenKhongMa(d.gallery.clientName ?? d.gallery.title), anh };
}

/**
 * Ảnh thật của cả một nhóm, gom qua mọi thư mục đã chọn — cho khu phim trường
 * ở trang chủ (khoe nhiều góc chụp, không chỉ tấm bìa). Đọc Drive, cache 5 phút
 * chung với trang khách; thư mục nào Drive lỗi thì bỏ qua (nguyên tắc 19).
 */
export async function docAnhNhom(nhom: string) {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom },
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  const phan = await Promise.all(
    dong.map(async (d) => {
      try {
        const tree = await loadTree(d.gallery.driveFolderId);
        return tree.albums.find((a) => a.id === d.albumId)?.photos ?? [];
      } catch {
        return [];
      }
    }),
  );
  return phan.flat();
}
