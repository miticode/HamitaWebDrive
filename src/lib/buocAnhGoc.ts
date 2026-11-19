import { tachTrangThai } from "@/lib/hopDongChung";

/*
  ĐỔI BƯỚC HỢP ĐỒNG KHI STUDIO GỬI ẢNH GỐC — anh yêu cầu 19/11/2026.

  Việc media làm thật: up ảnh gốc lên Drive rồi bấm "Gửi thông báo" ở trang
  quản lý album. Hai việc đó xong là hợp đồng đáng ra phải sang bước "đã gửi
  ảnh gốc, chờ khách chọn" — nhưng bước đổi bằng tay ở một trang khác, nên
  thường bị bỏ quên.

  Anh nói rõ cái bẫy: "đôi lúc chụp xong quên đổi từ số 2 sang số 3". Nên đích
  là bước 4 cho CẢ bước 2 lẫn bước 3, không bắt phải đi qua 3.

  CHỈ ĐỔI TIẾN LÊN, và chỉ từ đúng mấy bước ngay trước khâu gửi ảnh gốc. Hợp
  đồng đang ở bước 5 "Đang Retouch" mà media up ảnh đã chỉnh rồi bấm gửi tin
  thì KHÔNG được kéo về 4 — đó là lùi tiến độ, tệ hơn hẳn việc quên đổi.

  Đây KHÔNG trái với câu "web không tự chuyển bước" ở trang hợp đồng. Chỗ đó
  nói về việc web tự đổi khi KHÔNG ai bấm gì (khách báo chọn xong thì web chỉ
  nhắc, người vẫn quyết). Ở đây có một người thật bấm một nút thật — web chỉ
  gộp hai việc vốn đi liền nhau vào một cú bấm, chứ không tự quyết thay ai.
*/

/** Bước 4 — nhánh chụp studio: "Đã gửi ảnh gốc, chờ Khách chọn". */
const DICH_NHANH_CHUP = 4;
/** Bước 13 — nhánh tiệc: "Đã gửi ảnh gốc tiệc, chờ Khách chọn". */
const DICH_NHANH_TIEC = 13;

/**
 * Mấy bước được phép nhảy tới bước 4.
 *
 * 2 = "Đã có ngày chụp", 3 = "Đã chụp". Gồm cả 2 vì anh chốt vậy: chụp xong
 * mà quên đổi 2 → 3 thì bấm gửi ảnh gốc vẫn phải ra 4.
 */
const TU_NHANH_CHUP = [2, 3] as const;

/**
 * Mấy bước được phép nhảy tới bước 13 — anh chốt 19/11/2026.
 *
 * 10 = "Chờ ngày tiệc", 11 = "Đã giao váy tiệc", 12 = "Đã xong tiệc". Cùng
 * một lẽ với nhánh chụp: gồm cả mấy bước trước, vì bước nào cũng có thể bị
 * bỏ quên không đổi.
 */
const TU_NHANH_TIEC = [10, 11, 12] as const;

/**
 * Bước đích khi studio vừa gửi ảnh gốc cho khách — null nghĩa là ĐỪNG ĐỔI.
 *
 * null ở ba trường hợp, và cả ba đều đúng:
 *   - bước 1 "Chưa có ngày chụp": chưa chụp mà đã có ảnh gốc là bất thường,
 *     web không đoán hộ.
 *   - bước 4–9 và 13–18: đã qua khâu gửi ảnh gốc rồi, đổi nữa là lùi.
 *   - bước null: hợp đồng chưa gõ bước, không biết nó đang ở nhánh nào.
 */
export function buocSauKhiGuiAnhGoc(buoc: number | null | undefined): number | null {
  if (typeof buoc !== "number") return null;
  if ((TU_NHANH_CHUP as readonly number[]).includes(buoc)) return DICH_NHANH_CHUP;
  if ((TU_NHANH_TIEC as readonly number[]).includes(buoc)) return DICH_NHANH_TIEC;
  return null;
}

/**
 * Tên THẬT của bước mang số `so`, lấy từ danh sách bước đang dùng.
 *
 * Phải tra theo SỐ chứ không viết thẳng chuỗi "4. Đã gửi ảnh gốc, chờ Khách
 * chọn": từ đợt 6 bảng `BuocHopDong` nằm trong database và studio sửa chữ
 * được. Viết cứng thì ai đó đổi chữ một bước là web ghi vào hợp đồng một
 * trạng thái không có trong bảng, rồi mọi lần sửa hợp đồng sau đó đều bị từ
 * chối vì "Trạng thái không có trong bảng".
 *
 * Trả null khi bảng không có bước nào mang số đó — lúc đó nơi gọi phải bỏ
 * việc đổi bước, không được đoán.
 */
export function tenBuocTheoSo(cacBuoc: readonly string[], so: number): string | null {
  return cacBuoc.find((ten) => tachTrangThai(ten).buoc === so) ?? null;
}
