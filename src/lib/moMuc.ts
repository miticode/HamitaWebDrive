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

/**
 * Việc ghi dưới HỢP ĐỒNG nhưng thật ra là việc của album — xem chú thích
 * trong `docViecStudio`.
 *
 * Cả sáu đều bắt nguồn từ trang album hoặc từ chính khách: bấm "Đã gửi file
 * gốc", bấm "Đã gửi ảnh hoàn thiện", khách báo chọn xong, thợ bấm xong đầu việc
 * cuối, dán link gửi in, và lúc album được dựng ra từ hợp đồng. Không có việc
 * nào dính tới tiền.
 */
const TU_HOP_DONG = [
  "doi-buoc-anh-goc",
  "doi-buoc-hoan-thien",
  "doi-buoc-khach-chon",
  "doi-buoc-da-chup",
  "gui-in",
  "tao-album-tu-hop-dong",
] as const;

export async function docViecStudio(
  galleryId: string,
  /** Hợp đồng của album — null thì bỏ qua nhóm thứ ba. */
  hopDongId?: string | null,
): Promise<ViecStudio[]> {
  if (!databaseIsConfigured()) return [];
  const ds = await getPrisma().nhatKy.findMany({
    /*
      Bỏ "Đọc lại album từ Drive" (anh yêu cầu 15/10/2026).
      refreshGalleryAction không ghi nữa, và 435 dòng cũ đã xoá khỏi bảng cùng
      ngày — nên lúc này bộ lọc KHÔNG bỏ dòng nào.

      Vẫn giữ vì `npm run db:restore` phục hồi một bản sao lưu trước 15/10 là
      435 dòng đó quay lại, mà khung này chỉ lấy 30 dòng gần nhất: có album
      từng có 47 dòng làm mới, đủ lấp kín không còn chỗ cho việc nào khác.
    */
    /*
      BA NGUỒN, KHÔNG PHẢI MỘT — anh báo 25/11/2026: "trong đây a không thấy
      log ghi lại nhân viên đã ấn gửi file gốc".

      Đúng vậy, và thiếu nhiều hơn thế. Cùng một album nhưng nhật ký ghi dưới
      ba dạng khác nhau, vì ba đợt làm khác nhau không ai gióng lại:

        doiTuong "album"    tạo, xoá, sửa album, gửi thông báo  — 804 dòng
        doiTuong "Gallery"  gắn hợp đồng, gửi in                —   9 dòng
        doiTuong "HopDong"  mọi lần ĐỔI BƯỚC bắt nguồn từ album

      Nhóm thứ ba là chỗ anh tìm: nút "Đã gửi file gốc" ghi dưới
      `doi-buoc-anh-goc` và gắn vào HỢP ĐỒNG, nên khung này không bao giờ thấy.
      Đo trên album Huỳnh Tiên: năm dòng liên quan, khung chỉ hiện một.

      Nhóm ba lọc theo DANH SÁCH TRẮNG chứ không lấy hết nhật ký hợp đồng. Hai
      lẽ: nhật ký hợp đồng còn có lập, xoá, sửa lịch — việc của hợp đồng chứ
      không phải của album này; và khung này mở với quyền `quyenAlbum`, tức cả
      phòng Media, nên không được kéo theo những gì họ không có quyền xem.
    */
    where: {
      hanhDong: { not: "lam-moi-album" },
      OR: [
        { doiTuong: { in: ["album", "Gallery"] }, doiTuongId: galleryId },
        ...(hopDongId
          ? [{ doiTuong: "HopDong", doiTuongId: hopDongId, hanhDong: { in: [...TU_HOP_DONG] } }]
          : []),
      ],
    },
    orderBy: { luc: "desc" },
    take: 30,
    select: { hanhDong: true, nguoiTen: true, luc: true, chiTiet: true },
  });
  return ds;
}
