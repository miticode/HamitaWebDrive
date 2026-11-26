/*
  NHÓM VIỆC HẬU KỲ — anh yêu cầu 26/11/2026: "hãy hiển thị những đầu việc
  hậu kì".

  Bảng `CongViec` không có cột nhóm, chỉ có `loai` là CHỮ TỰ DO chép từ
  AppSheet. Đo 26/11: 98 tên việc khác nhau trên 5.720 dòng, viết hoa thường
  lẫn lộn ("PHOTOSHOP", "Photoshop", "photoshop 1"), nên nhận ra nhóm phải
  bằng TỪ KHOÁ chứ không bằng danh sách tên.

  Vì sao không thêm cột nhóm vào database: tên việc vẫn do AppSheet đẻ ra và
  người gõ tay, nên cột ấy sẽ trống với mọi tên mới. Từ khoá thì tên mới nào
  chứa "photoshop" cũng tự vào nhóm.

  CÁI BẪY — "Photo" KHÔNG phải hậu kỳ. Trong tiệm, "Photo" là THỢ CHỤP:
  "Photo 1", "Photo 2", "PHOTO NGOẠI CẢNH", "Photo Lễ Tối". Bản đo đầu tiên
  gom cả "photo" vào hậu kỳ và kéo nhầm 116 việc chụp sang. Hai phép kiểm chỉ
  ra điều đó:

    - 66 hợp đồng có CẢ việc "Photo*" lẫn việc "PHOTOSHOP" — hai việc riêng,
      không phải một việc gọi hai tên.
    - 24/26 việc "Photo*" có thời hạn TRÙNG ĐÚNG ngày một buổi chụp của chính
      hợp đồng ấy.

  Nên từ khoá là "photoshop" đủ dài, không được rút ngắn thành "photo".

  CŨNG KHÔNG lấy "in" trần: nó nằm trong "chụp đính hôn", "stylist"… Việc của
  xưởng in gọi đủ là "Xưởng in".

  Đo 26/11 trên 5.720 đầu việc: 1.472 vào hậu kỳ (12 tên), 4.165 nằm ngoài,
  83 dòng KHÔNG CÓ TÊN VIỆC nên không vào nhóm nào. Tám mươi ba dòng ấy cứ để
  lộ ra chứ đừng vơ vào — không biết việc gì thì xếp nhóm là đoán.
*/

/**
 * Từ khoá nhận ra việc hậu kỳ. So KHÔNG phân biệt hoa thường, có dấu đầy đủ —
 * đây là danh sách CỐ ĐỊNH do web giữ, không phải chữ người dùng gõ, nên
 * không vướng chuyện tìm không dấu.
 */
export const TU_HAU_KY = [
  "photoshop",
  "edit",
  "dựng phim",
  "retouch",
  "blend",
  "thiết kế",
  "xưởng in",
] as const;

/**
 * Mảnh điều kiện Prisma cho nhóm hậu kỳ — dùng cho cả danh sách lẫn các phép
 * đếm trên chip, để con số và bảng không bao giờ lệch nhau.
 *
 * Trả về mảnh `{ OR: [...] }`, nên nơi gọi phải ghép bằng `AND` chứ đừng
 * spread chung với mảnh `OR` khác (lọc theo người cũng là một `OR`) — spread
 * hai `OR` vào một đối tượng thì cái sau đè cái trước, và ở đây cái bị đè
 * chính là phép giấu việc của người khác.
 */
export function locHauKy() {
  return {
    OR: TU_HAU_KY.map((tu) => ({ loai: { contains: tu, mode: "insensitive" as const } })),
  };
}
