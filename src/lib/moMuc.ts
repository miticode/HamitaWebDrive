import { getPrisma } from "./db";
import { databaseIsConfigured } from "./db";

/**
 * Ghi lại LẦN ĐẦU khách mở mỗi thư mục con — anh yêu cầu 28/09/2026.
 *
 * Studio up ảnh xong bấm "gửi thông báo" rồi ngồi đợi, không biết khách đã mở
 * ra xem chưa. Trước đây web chỉ biết khách đã vào KHI họ bật thông báo hoặc
 * thả tim — cả hai đều đến muộn hơn nhiều, còn người xem rồi để đó thì không
 * để lại dấu vết nào.
 */

export type DongLog = { albumId: string; tenMuc: string; luc: Date };

/**
 * Ghi một lượt mở. Gọi được thoải mái: lần thứ hai trở đi không đổi gì, nên
 * `luc` luôn là lần đầu thật.
 *
 * KHÔNG ném lỗi ra ngoài. Đây là việc ghi chép bên lề — Drive trục trặc hay
 * database bận thì khách vẫn phải xem được ảnh (nguyên tắc 19).
 */
export async function ghiMoMuc(galleryId: string, albumId: string, tenMuc: string): Promise<void> {
  if (!databaseIsConfigured()) return;
  try {
    await getPrisma().moMuc.createMany({
      data: [{ galleryId, albumId, tenMuc }],
      skipDuplicates: true,
    });
  } catch {
    // Nuốt lỗi có chủ ý: xem chú thích trên.
  }
}

/** Log của một album, mới nhất lên đầu. */
export async function docLog(galleryId: string): Promise<DongLog[]> {
  const ds = await getPrisma().moMuc.findMany({
    where: { galleryId },
    orderBy: { luc: "desc" },
    select: { albumId: true, tenMuc: true, luc: true },
  });
  return ds;
}

/** Số thư mục khách đã mở, cho mọi album — trang quản lý đọc một lượt. */
export async function demMoMucMoiAlbum(): Promise<Record<string, number>> {
  if (!databaseIsConfigured()) return {};
  const ds = await getPrisma().moMuc.groupBy({ by: ["galleryId"], _count: true });
  return Object.fromEntries(ds.map((d) => [d.galleryId, d._count]));
}

/**
 * Dấu "người trong tiệm đang xem thử" — đặt ở /xem-thu/[slug], đọc ở trang
 * khách để bỏ qua việc ghi log (anh yêu cầu 28/09/2026).
 *
 * Studio mở link khách trên điện thoại không đăng nhập thì web không biết đó
 * là người nhà; đi qua cửa /xem-thu thì biết.
 */
export const COOKIE_XEM_THU = "xem_thu";
/** Bốn tiếng: kiểm tra xong là thôi, để lâu hơn thì hôm sau mở thật cũng mất log. */
export const HAN_XEM_THU_GIAY = 4 * 60 * 60;

/**
 * Việc studio đã làm với một album — đọc từ Nhật ký thao tác (anh yêu cầu
 * 28/09/2026: "ghi trong logs trên album là ai đã ấn nút gửi thông báo vào
 * lúc mấy giờ").
 *
 * Đọc ngược từ bảng nhật ký chứ không chép sang bảng khác: một việc ghi hai
 * nơi là sớm muộn hai nơi lệch nhau, mà nhật ký thì đã có sẵn người và giờ.
 */
export type ViecStudio = { hanhDong: string; nguoiTen: string; luc: Date; chiTiet: unknown };

export async function docViecStudio(galleryId: string): Promise<ViecStudio[]> {
  if (!databaseIsConfigured()) return [];
  const ds = await getPrisma().nhatKy.findMany({
    /*
      Bỏ "Đọc lại album từ Drive" (anh yêu cầu 15/10/2026). Từ nay
      refreshGalleryAction không ghi nữa, nhưng những lần bấm TRƯỚC đó đã nằm
      sẵn trong bảng — mà khung này chỉ lấy 30 dòng, nên không lọc thì các album
      cũ vẫn kín một màn toàn câu đó. Lọc ở đây chứ không xoá dữ liệu: nhật ký
      là sổ truy vết, xoá là không lùi được.
    */
    where: { doiTuong: "album", doiTuongId: galleryId, hanhDong: { not: "lam-moi-album" } },
    orderBy: { luc: "desc" },
    take: 30,
    select: { hanhDong: true, nguoiTen: true, luc: true, chiTiet: true },
  });
  return ds;
}
