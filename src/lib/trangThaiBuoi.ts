import { getPrisma } from "@/lib/db";
import { homNayStudio } from "@/lib/constants";
import { docCacBuoc } from "@/lib/buocHopDong";
import { tenBuocTheoSo } from "@/lib/buocAnhGoc";
import { ghiNhatKy } from "@/lib/nhatKy";
import type { NguoiDung } from "@/lib/phienNhanVien";

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

/** Chữ đánh dấu một buổi đã chụp xong, dùng ở ba nơi nên để một chỗ. */
const XONG = "Hoàn thành";

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
export async function capNhatTrangThaiBuoi(
  lichChupId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const buoi = await prisma.lichChup.findUnique({
    where: { id: lichChupId },
    select: { hopDongId: true, trangThai: true, congViec: { select: { trangThai: true } } },
  });
  if (!buoi) return null;

  const moi = trangThaiTuViec(buoi.congViec, buoi.trangThai);
  if (!moi) return null;

  await prisma.lichChup.update({ where: { id: lichChupId }, data: { trangThai: moi } });
  /* Buổi vừa xong thì hợp đồng có thể sang chặng Chụp — xem hàm dưới. */
  if (moi === XONG && buoi.hopDongId) await capNhatBuocDaChup(buoi.hopDongId, nguoi);
  return moi;
}

/**
 * Số bước đích khi hợp đồng vừa chụp xong, hoặc null khi chưa tới lúc.
 *
 * Tách khỏi phần ghi database để kiểm được từng điều kiện, vì ba điều kiện ở
 * đây đều là chỗ dễ sai:
 *
 * 1. MỌI BUỔI ĐỀU "Hoàn thành". Còn một buổi dở thì chưa chụp xong.
 *
 * 2. MỌI BUỔI ĐỀU ĐÃ QUA NGÀY. Bên AppSheet nhiều buổi mang sẵn chữ "Hoàn
 *    thành" từ lúc tạo — 1.275/1.488 buổi, đo 25/11/2026 — nên riêng chữ ấy
 *    không đủ. Buổi chưa có ngày cũng không đẩy: không biết ngày thì không
 *    biết đã chụp chưa, mà đoán sai ở đây là cả bảng tiến độ sai theo.
 *    So chuỗi "YYYY-MM-DD" là so đúng thứ tự ngày, khỏi dựng Date.
 *
 * 3. CHỈ TỪ CHẶNG CHUẨN BỊ SANG CHẶNG CHỤP. Hợp đồng đã đi quá bước 3 thì nó
 *    đang ở chặng sau — kéo ngược về "Đã chụp" là xoá mất tiến độ thật. Bước
 *    lạ hay chưa gõ bước nào cũng để yên.
 */
export function buocDaChup(
  buoc: number | null,
  lich: readonly { trangThai: string | null; ngay: string | null }[],
  homNay: string,
): number | null {
  if (lich.length === 0) return null;
  if (!lich.every((l) => l.trangThai === XONG)) return null;
  if (!lich.every((l) => l.ngay && l.ngay <= homNay)) return null;
  if (buoc === 1 || buoc === 2) return 3;
  if (buoc === 10 || buoc === 11) return 12;
  return null;
}

/**
 * BƯỚC HỢP ĐỒNG TỰ SANG "ĐÃ CHỤP" khi mọi buổi đều xong — anh báo 25/11/2026:
 * buổi đã Hoàn thành mà hợp đồng vẫn nằm ở "2. Đã có ngày chụp".
 *
 * Hai nhánh của bảng mười tám bước đi song song, nên đích cũng có hai:
 *
 *     nhánh chụp ở studio   1, 2   → 3   "Đã chụp"
 *     nhánh tiệc           10, 11  → 12  "Đã xong tiệc"
 *
 * Điều kiện nằm cả trong `buocDaChup` ngay trên. Tên bước đọc từ bảng
 * `BuocHopDong` chứ không viết cứng — studio sửa chữ trên
 * web được, mà viết cứng thì web ghi một chữ không có trong ô chọn.
 */
export async function capNhatBuocDaChup(
  hopDongId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: {
      maHD: true,
      tenKhach: true,
      buoc: true,
      trangThai: true,
      lich: { select: { trangThai: true, ngay: true } },
    },
  });
  if (!hd) return null;

  const dich = buocDaChup(hd.buoc, hd.lich, homNayStudio());
  if (dich === null) return null;

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return null;

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  /*
    Ghi nhật ký vì đây là đổi tiến độ của cả một nhà khách, và nó xảy ra ở
    NGOÀI trang hợp đồng — người mở ra thấy bước đã nhảy mà không ai gõ thì
    phải tra được là ai làm, lúc nào. Cùng lẽ với `doiBuocAlbum`.
  */
  await ghiNhatKy({
    nguoi,
    hanhDong: "doi-buoc-da-chup",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });
  return ten;
}
