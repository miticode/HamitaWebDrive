import { getPrisma } from "@/lib/db";

/**
 * SỐ LẦN MỖI MÃ ĐÃ ĐƯỢC DÙNG TRONG HỢP ĐỒNG — thêm 14/11/2026.
 *
 * ━━ Vì sao cần ━━
 *
 * Ô chọn dịch vụ ở form hợp đồng trước đây chỉ hiện gì đó khi đã gõ 2 ký tự.
 * Mở form ra là một ô trắng: người mới không biết tiệm có những gì, phải sang
 * trang Dịch vụ xem rồi quay lại gõ. Anh hỏi đúng chỗ đó ngày 14/11.
 *
 * Nhưng đổ cả 1.020 mục ra thì còn tệ hơn — nhất là trang phục, 888 mục mà
 * 850 cái nằm chung một nhóm "Thuê lẻ", chia nhóm không giúp được gì.
 *
 * ━━ Thứ tự nào thì có ích ━━
 *
 * Đếm trên 7.251 dòng chi tiết hợp đồng thật:
 *
 * | Loại | Mục | 20 mã hay nhất | 50 mã hay nhất |
 * |---|---|---|---|
 * | Dịch vụ | 95 | **69%** lượt | 94% |
 * | Sản phẩm | 37 | **92%** lượt | 100% |
 * | Trang phục | 888 | 37% | 55% |
 *
 * Nên danh sách xếp theo SỐ LẦN ĐÃ DÙNG: với dịch vụ và sản phẩm thì hai chục
 * dòng đầu đã trúng gần hết việc hằng ngày. Trang phục tản hơn — mỗi cô dâu
 * một váy, chuyện bình thường — nhưng 37% vẫn hơn hẳn con số 0 của ô trắng,
 * và ai cần đúng mẫu nào thì vẫn gõ tìm như cũ.
 *
 * ━━ Vì sao không lưu thành cột ━━
 *
 * Thêm cột `soLanDung` vào bảng Dịch vụ thì phải cập nhật cấu trúc database,
 * và còn phải nhớ cộng thêm mỗi lần lập hợp đồng — một con số sống sai chỗ.
 * Đếm lúc mở form rẻ hơn nhiều: một câu gộp trên 7.251 dòng, chỉ chạy khi có
 * người thật sự ngồi lập hợp đồng (nguyên tắc 53).
 */
export async function demLuotDung(): Promise<Record<string, number>> {
  const nhom = await getPrisma().chiTietHopDong.groupBy({
    by: ["maDV"],
    _count: { maDV: true },
  });

  const ra: Record<string, number> = {};
  for (const n of nhom) {
    const ma = n.maDV?.trim();
    if (ma) ra[ma] = n._count.maDV;
  }
  return ra;
}
