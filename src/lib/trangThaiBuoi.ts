import { getPrisma } from "@/lib/db";

/*
  BUỔI CHỤP TỰ NHẢY TRẠNG THÁI THEO ĐẦU VIỆC — anh báo 25/11/2026:

  "khi tất cả thợ đều tích đã làm nhưng lịch chụp vẫn là chưa làm vì không có
  ai chuyển trạng thái trên buổi chụp hết".

  Đúng vậy: trạng thái buổi và trạng thái việc là hai ô rời nhau, mà người đi
  chụp chỉ đụng tới ô việc của mình. Buổi nằm lại "Chưa làm" mãi, rồi lịch
  tháng nhìn như cả tiệm chưa làm gì.

  ━━ CHỈ NÂNG, KHÔNG HẠ ━━

  Đo 25/11 trên hai buổi đang có đầu việc gắn vào:

    24/11 Chụp hình cổng  · đang "Chưa làm" · 4/4 việc Đã làm
    11/01/2027 Ngày chụp  · đang "Đang làm" · 4 việc chưa ai bắt đầu

  Dòng thứ hai là lý do không được hạ. Ai đó đã đặt "Đang làm" bằng tay —
  khách dời ngày, thợ đã đi tiền trạm, trăm thứ web không biết. Hạ nó về "Chưa
  làm" là xoá mất điều người ta biết mà máy không biết.

  Nâng thì ngược lại: bốn người đã bấm xong việc của mình rồi, buổi ấy chắc
  chắn không còn là "Chưa làm" nữa.

  ━━ KHÔNG ĐỤNG TRẠNG THÁI LẠ ━━

  Bên AppSheet buổi có thể mang chữ ngoài ba giá trị web biết ("Đã hủy", "Hoãn"
  …). Gặp chữ lạ thì để yên: chữ đó do người gõ, và nó mang nghĩa mà phép đếm
  đầu việc không nói được.
*/

/** Ba giá trị web hiểu, đúng thứ tự từ chưa tới xong. */
const BAC = ["Chưa làm", "Đang làm", "Hoàn thành"] as const;

/**
 * Trạng thái buổi SUY TỪ đầu việc, hoặc null khi không nên đụng.
 *
 * `null` trả về ở ba cảnh: buổi không có việc nào gắn vào, trạng thái đang có
 * là chữ lạ, hoặc phép suy ra thấp hơn chữ đang có (đó là phần "không hạ").
 */
export function trangThaiTuViec(
  viec: readonly { trangThai: string | null }[],
  dangCo: string | null,
): string | null {
  if (viec.length === 0) return null;

  const bacDangCo = BAC.indexOf((dangCo ?? "") as (typeof BAC)[number]);
  if (bacDangCo < 0) return null;

  const xongHet = viec.every((v) => v.trangThai === "Đã làm");
  const daDongVao = viec.some((v) => v.trangThai === "Đã làm" || v.trangThai === "Đang làm");
  const nen = xongHet ? "Hoàn thành" : daDongVao ? "Đang làm" : "Chưa làm";

  return BAC.indexOf(nen) > bacDangCo ? nen : null;
}

/**
 * Tính lại trạng thái một buổi sau khi đầu việc của nó đổi. Trả về trạng thái
 * mới nếu có ghi, null nếu để yên.
 *
 * CHỈ ĐẾM VIỆC GẮN THẲNG VÀO BUỔI. Việc hậu kỳ (Photoshop, Xưởng in…) không
 * gắn buổi nào — xem `buoiThu` trong bảng đầu việc của dịch vụ — nên buổi chụp
 * không phải chờ xưởng in xong mới được coi là chụp xong.
 */
export async function capNhatTrangThaiBuoi(lichChupId: string): Promise<string | null> {
  const prisma = getPrisma();
  const buoi = await prisma.lichChup.findUnique({
    where: { id: lichChupId },
    select: { trangThai: true, congViec: { select: { trangThai: true } } },
  });
  if (!buoi) return null;

  const moi = trangThaiTuViec(buoi.congViec, buoi.trangThai);
  if (!moi) return null;

  await prisma.lichChup.update({ where: { id: lichChupId }, data: { trangThai: moi } });
  return moi;
}
