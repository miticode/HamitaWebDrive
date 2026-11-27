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

/** Bước 5 — nhánh chụp studio: "Đang Retouch". */
const SAU_CHON_NHANH_CHUP = 5;
/** Bước 14 — nhánh tiệc: "Đang chỉnh sửa hình , clip tiệc". */
const SAU_CHON_NHANH_TIEC = 14;

/**
 * Bước đích khi KHÁCH tự bấm "đã chọn xong" — anh yêu cầu 19/11/2026.
 *
 * Chỉ nhận đúng hai bước chờ khách, và chỉ tiến đúng một nhịp:
 *   4  "Đã gửi ảnh gốc, chờ Khách chọn"       → 5  "Đang Retouch"
 *   13 "Đã gửi ảnh gốc tiệc, chờ Khách chọn"  → 14 "Đang chỉnh sửa hình , clip tiệc"
 *
 * Hẹp hơn hẳn `buocSauKhiGuiAnhGoc`, và cố ý: ở đó người bấm là NHÂN VIÊN
 * studio, ở đây là KHÁCH. Khách bấm thì web không được suy diễn gì thêm —
 * họ chỉ nói "tôi chọn xong rồi", không nói hợp đồng đang ở đâu.
 *
 * Trang hợp đồng vẫn còn câu nhắc cũ cho những hợp đồng bị kẹt lại từ trước
 * 19/11 (khách đã báo xong mà bước vẫn đứng ở 4 hoặc 13).
 */
export function buocSauKhiKhachChonXong(buoc: number | null | undefined): number | null {
  if (buoc === 4) return SAU_CHON_NHANH_CHUP;
  if (buoc === 13) return SAU_CHON_NHANH_TIEC;
  return null;
}

/** Bước 6 — nhánh chụp studio: "Chờ Khách duyệt". */
const DUYET_NHANH_CHUP = 6;
/** Bước 15 — nhánh tiệc: "Chờ Khách duyệt". */
const DUYET_NHANH_TIEC = 15;

/**
 * Bước đích khi Media gửi ẢNH HOÀN THIỆN cho khách duyệt — anh báo 26/11/2026:
 * "thợ media đã làm xong file hoàn thiện và đã up lên drive nhưng không có
 * hành động nào trên album ảnh để thợ làm để đổi trạng thái hợp đồng sang số 6".
 *
 *   5  "Đang Retouch"                        → 6  "Chờ Khách duyệt"
 *   14 "Đang chỉnh sửa hình , clip tiệc"     → 15 "Chờ Khách duyệt"
 *
 * Đây là mắt xích thứ tư, và là mắt xích CÒN THIẾU của cả chuỗi. Đo 26/11:
 * 20 hợp đồng đang đứng ở bước 5 hoặc 14, còn nhật ký `gui-in` thì **bằng
 * không** — nút "Đã gửi in" chỉ hiện ở bước 6/15 (`GUI_IN_HIEN_O`), nên khâu
 * đứt ở đây làm chết luôn khâu phía sau. Không phải thợ quên bấm: không có gì
 * để bấm.
 *
 * Hẹp y như hai hàm trên — chỉ đúng hai bước, chỉ tiến một nhịp. Bước 4 hoặc
 * 13 (chờ khách chọn file gốc) KHÔNG nhảy thẳng sang duyệt: khách chưa chọn
 * thì chưa có gì để retouch, mà bỏ qua bước 5 là xoá dấu vết của cả khâu
 * retouch khỏi hợp đồng.
 */
export function buocSauKhiGuiAnhHoanThien(buoc: number | null | undefined): number | null {
  if (buoc === SAU_CHON_NHANH_CHUP) return DUYET_NHANH_CHUP;
  if (buoc === SAU_CHON_NHANH_TIEC) return DUYET_NHANH_TIEC;
  return null;
}

/**
 * Bước đích cho MỘT LƯỢT STUDIO GỬI ẢNH, bất kể gốc hay hoàn thiện.
 *
 * Thẻ album chỉ có MỘT nút cho việc này (gửi thông báo, hoặc đánh dấu đã gửi
 * khi khách chưa bật thông báo), nên nó cần một phép tính duy nhất. Gốc trước,
 * hoàn thiện sau — hai dải bước rời hẳn nhau (2,3,10,11,12 với 5,14) nên không
 * có bước nào rơi vào cả hai, thứ tự chỉ để đọc cho xuôi.
 *
 * Vì sao gộp chứ không bày hai nút: thẻ album rộng 325px, mà hai nút ấy loại
 * trừ nhau theo bước — ở bước 5 thì "đã gửi file gốc" vô nghĩa, ở bước 2 thì
 * "đã gửi ảnh hoàn thiện" vô nghĩa. Một nút đổi chữ theo bước nói đúng việc
 * đang làm mà không tốn thêm chỗ.
 */
export function buocSauKhiStudioGuiAnh(buoc: number | null | undefined): number | null {
  return buocSauKhiGuiAnhGoc(buoc) ?? buocSauKhiGuiAnhHoanThien(buoc);
}

/**
 * Lượt gửi này là ẢNH HOÀN THIỆN hay ảnh gốc — quyết chữ trên nút và tên hành
 * động ghi vào nhật ký.
 *
 * Hỏi chính hàm tính bước chứ không chép lại danh sách [5, 14]: đổi quy tắc ở
 * một chỗ là nút, nhật ký và máy chủ theo ngay.
 */
export function laLuotGuiHoanThien(buoc: number | null | undefined): boolean {
  return buocSauKhiGuiAnhHoanThien(buoc) !== null;
}

/** Bước 7 — nhánh chụp studio: "Gửi in". */
const SAU_GUI_IN_NHANH_CHUP = 7;
/** Bước 16 — nhánh tiệc: "Gửi in tiệc". */
const SAU_GUI_IN_NHANH_TIEC = 16;

/**
 * Bước đích khi Media đã gửi link ảnh hoàn thiện cho xưởng in — anh yêu cầu
 * 19/11/2026.
 *
 *   6  "Chờ Khách duyệt"  → 7  "Gửi in"
 *   15 "Chờ Khách duyệt"  → 16 "Gửi in tiệc"
 *
 * Hẹp y như `buocSauKhiKhachChonXong`: chỉ đúng hai bước, chỉ tiến một nhịp.
 * Anh nói rõ "trên album ở trạng thái số 6 và số 15 sẽ hiện một nút đã gửi
 * in", nên nút chỉ xuất hiện ở đúng hai bước đó — xem `GUI_IN_HIEN_O`.
 *
 * Vì sao cần một mối nối riêng chứ không gộp vào lúc khách duyệt: khách duyệt
 * xong KHÔNG có nghĩa đã gửi in. Media còn một việc nữa web không thấy — gửi
 * link Drive cho xưởng qua Zalo. Đo 19/11: 96 thư mục hoàn thiện khách đã
 * duyệt, mà không dòng nào ghi lại việc gửi in đó.
 */
export function buocSauKhiGuiIn(buoc: number | null | undefined): number | null {
  if (buoc === 6) return SAU_GUI_IN_NHANH_CHUP;
  if (buoc === 15) return SAU_GUI_IN_NHANH_TIEC;
  return null;
}

/**
 * Mấy bước có nút "Đã gửi in" trên thẻ album.
 *
 * Cùng một nguồn với `buocSauKhiGuiIn` để nút và việc không lệch nhau: nút
 * hiện ra mà bấm vào không đổi gì là tệ hơn không có nút.
 */
export const GUI_IN_HIEN_O = [6, 15] as const;

/* ── Hai khâu cuối: nhận hình in, giao khách (anh yêu cầu 27/11/2026) ─── */

/**
 * Bước đích khi HÌNH IN VỀ TỚI TIỆM — null nghĩa là đừng đổi.
 *
 *    7  "Gửi in"       →  8  "Đã nhận hình in"
 *   16  "Gửi in tiệc"  → 17  "Đã nhận hình in tiệc"
 */
export function buocSauKhiNhanHinhIn(buoc: number | null | undefined): number | null {
  if (buoc === 7) return 8;
  if (buoc === 16) return 17;
  return null;
}

/**
 * Bước đích khi ĐÃ GIAO HÌNH CHO KHÁCH — null nghĩa là đừng đổi.
 *
 *    8  "Đã nhận hình in"       →  9  "Hoàn thành"
 *   17  "Đã nhận hình in tiệc"  → 18  "Hoàn thành ngày tiệc"
 */
export function buocSauKhiGiaoKhach(buoc: number | null | undefined): number | null {
  if (buoc === 8) return 9;
  if (buoc === 17) return 18;
  return null;
}

/*
  BỐN MỐI NỐI CUỐI, và vì sao chúng phải BẤM TAY chứ không tự nhảy.

  Bản rà soát 27/11/2026 chỉ ra: trong mười bốn mối nối của hệ mười tám bước,
  năm cái không có đường nào đẩy — 1 → 2 (đã nối bằng `buocTheoNgayChup`) và
  bốn cái ở đây. Hậu quả đo được: 21 hợp đồng đứng ở bước 8 và 7 cái ở bước
  17, tức hình in đã về tiệm mà hệ thống không có cách nào nói là đã giao
  khách chưa.

  Khác mọi mối nối khác, bốn cái này KHÔNG suy ra được từ dữ liệu nào cả:

    · "hình in về tới tiệm" là một thùng hàng xưởng giao, web không thấy.
    · "đã giao hình cho khách" là lúc khách tới tiệm nhận, web cũng không thấy.

  Mọi mối nối tự động trước đây đều dựa trên một DẤU CÓ THẬT trong database —
  buổi đã tick, thư mục khách đã báo, link đã dán. Hai việc này không có dấu
  nào, nên tự động hoá chúng chỉ còn cách đoán theo thời gian ("gửi in mười
  ngày rồi thì chắc đã về"), mà đoán sai ở đây là báo hợp đồng đã hoàn thành
  trong khi khách còn chưa cầm hình.

  Nên web làm đúng một việc: BÀY SẴN NÚT ở trang hợp đồng, để người biết sự
  thật bấm một cái là xong, thay vì phải nhớ hợp đồng đang ở bước mấy rồi mở ô
  trạng thái tìm đúng dòng.
*/

/** Mấy bước có nút "Đã nhận hình in". */
export const NHAN_HINH_HIEN_O = [7, 16] as const;
/** Mấy bước có nút "Đã giao khách". */
export const GIAO_KHACH_HIEN_O = [8, 17] as const;
