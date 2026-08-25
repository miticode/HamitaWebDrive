import webpush from "web-push";
import { getPrisma, databaseIsConfigured } from "@/lib/db";
import { STUDIO_NAME } from "@/lib/constants";

/**
 * Đẩy thông báo về máy khách, hiện ngay trên màn hình khoá kể cả khi họ đã
 * đóng web.
 *
 * Chỉ tới được máy nào đã cài album ra màn hình chính VÀ bấm đồng ý nhận thông
 * báo. Riêng iPhone bắt buộc phải cài ra màn hình chính trước (từ iOS 16.4) —
 * Apple không cho web trong Safari thường gửi thông báo.
 *
 * Nội dung được mã hoá bằng hai khoá của chính máy khách, nên dịch vụ đẩy tin
 * của Apple/Google chỉ chuyển hộ chứ không đọc được studio nhắn gì.
 */

export function pushDaBat(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

function chuanBi(): boolean {
  if (!pushDaBat()) return false;
  webpush.setVapidDetails(
    // Địa chỉ liên hệ, để dịch vụ đẩy tin biết tìm ai khi có sự cố.
    `mailto:hamita.studio@gmail.com`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim()
  );
  return true;
}

/**
 * Phiếu này chết hẳn hay chỉ trục trặc nhất thời?
 *
 * Phân biệt cho đúng mới quan trọng: xoá nhầm phiếu còn sống thì khách im lặng
 * không nhận được tin nữa mà chẳng ai biết; giữ lại phiếu chết thì mỗi lần gửi
 * đều tốn công thử một địa chỉ không bao giờ tới, và database phình dần.
 *
 * Chết hẳn có hai kiểu:
 *
 * - Dịch vụ đẩy tin trả về 404/410: khách đã gỡ app, hoặc phiếu bị thu hồi.
 *
 * - Dữ liệu phiếu tự nó hỏng (khoá sai dạng). Kiểu này KHÔNG có mã trạng thái
 *   vì lỗi xảy ra lúc mã hoá, chưa kịp gửi đi đâu cả — đã đo thật và gặp đúng
 *   trường hợp này. Bỏ sót nó thì phiếu rác nằm lại vĩnh viễn.
 *
 * Mọi lỗi khác (mất mạng, dịch vụ quá tải, 429, 5xx) đều coi là nhất thời và
 * giữ phiếu lại để lần sau gửi tiếp.
 */
function phieuChet(err: unknown): boolean {
  const ma = (err as { statusCode?: number }).statusCode;
  if (ma === 404 || ma === 410) return true;

  // Không có mã mà lời lỗi nói về khoá thì là phiếu hỏng dữ liệu, không phải mạng.
  if (ma === undefined) {
    const loi = String((err as Error)?.message ?? "").toLowerCase();
    return (
      loi.includes("public key") ||
      loi.includes("curve") ||
      loi.includes("invalid") ||
      loi.includes("decrypt")
    );
  }

  return false;
}

export type NoiDung = {
  tieuDe: string;
  loi: string;
  /** Bấm vào thông báo thì mở đường nào. */
  duongDan: string;
  /** Ảnh nhỏ hiện kèm — thường là ảnh bìa album. */
  bieuTuong?: string;
};

/**
 * Gửi cho mọi máy đã đăng ký của một album.
 *
 * Trả về số máy nhận được. Máy nào báo phiếu hỏng (khách gỡ app, đổi máy) thì
 * xoá luôn khỏi database — giữ lại chỉ tổ gửi hụt mãi về sau.
 */
export async function guiChoAlbum(
  galleryId: string,
  noiDung: NoiDung
): Promise<{ daGui: number; daXoa: number }> {
  if (!databaseIsConfigured() || !chuanBi()) return { daGui: 0, daXoa: 0 };

  const prisma = getPrisma();
  const ds = await prisma.pushSub.findMany({ where: { galleryId } });
  if (ds.length === 0) return { daGui: 0, daXoa: 0 };

  const goi = JSON.stringify(noiDung);
  let daGui = 0;
  const hong: string[] = [];

  await Promise.all(
    ds.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          goi
        );
        daGui++;
      } catch (err) {
        if (phieuChet(err)) hong.push(s.endpoint);
      }
    })
  );

  if (hong.length > 0) {
    await prisma.pushSub.deleteMany({ where: { endpoint: { in: hong } } });
  }

  return { daGui, daXoa: hong.length };
}

/** Đếm xem album này có bao nhiêu máy đang chờ nhận tin. */
export async function demNguoiNhan(galleryId: string): Promise<number> {
  if (!databaseIsConfigured() || !pushDaBat()) return 0;
  return getPrisma().pushSub.count({ where: { galleryId } });
}

/** Lời mặc định khi studio thả thêm thư mục ảnh mới vào album. */
export function tinCoAnhMoi(tenThuMuc: string[], duongDan: string): NoiDung {
  const nhieu = tenThuMuc.length > 1;
  return {
    tieuDe: `${STUDIO_NAME} vừa thêm ảnh mới`,
    loi: nhieu
      ? `Có ${tenThuMuc.length} thư mục mới: ${tenThuMuc.slice(0, 2).join(", ")}${tenThuMuc.length > 2 ? "…" : ""}. Anh chị vào xem nhé ạ.`
      : `Thư mục "${tenThuMuc[0]}" vừa được thêm. Anh chị vào xem nhé ạ.`,
    duongDan,
  };
}
