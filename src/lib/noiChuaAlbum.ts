import type { KetNoi } from "@/lib/googleAuth";

/*
  ALBUM CỦA LOẠI HỢP ĐỒNG NÀY NẰM Ở DRIVE NÀO — anh yêu cầu 15/11/2026.

  Tiệm có hai ổ Drive, và từ nay ảnh chia theo MẢNG chứ không dồn một chỗ:

    · Cưới hỏi            → Drive ảnh cưới (hamita.studio), cây "năm / T{tháng}"
    · Nhà Su              → Drive kho (hamitaweddinghouse), thư mục "Tiệm Ảnh Nhà Su"
    · Bé, gia đình, nàng thơ → Drive kho, thư mục "HAMI BABY"

  ━━ Vì sao phải chia ━━

  Không phải để cho gọn. Đo 15/11/2026: ổ hamita.studio đã dùng **1.892 / 2.048
  GB**, còn 155 GB; ổ hamitaweddinghouse mới dùng **488 / 5.120 GB**. Dồn tiếp
  ảnh vào ổ thứ nhất là sắp hết chỗ thật.

  Trên Drive, TỆP THUỘC VỀ NGƯỜI TẢI LÊN chứ không thuộc chủ thư mục — nên chia
  sẻ một thư mục của ổ 5 TB rồi ghi vào đó thì dung lượng vẫn trừ vào ổ đang
  ghi. Phải tạo bằng chính tài khoản kia, rồi chia sẻ ngược lại.

  ━━ Loại nào không có tên ở đây ━━

  Về Drive ảnh cưới, y như trước. Cố ý: thêm một loại hợp đồng mới mà quên khai
  ở đây thì album vẫn ra đúng chỗ cũ, chứ không rơi vào thư mục của mảng khác.
*/

/** Nơi chứa album của một hợp đồng. */
export type NoiChua = {
  ketNoi: KetNoi;
  /**
   * Thư mục gốc trên Drive đó. null = Drive ảnh cưới, xếp theo cây
   * "năm / T{tháng chụp}" như tiệm vẫn làm.
   */
  thuMucGoc: string | null;
};

export const NOI_CUOI: NoiChua = { ketNoi: "default", thuMucGoc: null };

/**
 * Loại hợp đồng → thư mục gốc trên Drive kho.
 *
 * Khớp sau khi hạ chữ thường, vì danh sách loại bên AppSheet viết hoa thường
 * lẫn lộn ("NHÀ SU", "Baby", "GIA ĐÌNH", "NÀNG THƠ").
 */
const THEO_LOAI: Record<string, string> = {
  "nhà su": "Tiệm Ảnh Nhà Su",
  baby: "HAMI BABY",
  "gia đình": "HAMI BABY",
  "nàng thơ": "HAMI BABY",
};

/**
 * Album của hợp đồng loại này nằm ở đâu.
 *
 * "kỉ yếu" cố ý KHÔNG có trong bảng: anh chọn ba loại cho Hami Baby và không
 * chọn nó, nên nó về Drive ảnh cưới như cũ. Đừng tự thêm vào — kỉ yếu là đồ
 * bán của mảng nào thì chỉ tiệm biết.
 */
export function noiChuaAlbum(loaiDV: string | null | undefined): NoiChua {
  const goc = THEO_LOAI[(loaiDV ?? "").trim().toLowerCase()];
  return goc ? { ketNoi: "kho", thuMucGoc: goc } : NOI_CUOI;
}

/**
 * Tài khoản phải được chia sẻ quyền sửa trên thư mục tạo ở Drive kho.
 *
 * Không chỉ để người ta mở được: album web ĐỌC ẢNH bằng kết nối "default"
 * (quyền `drive.readonly` của hamita.studio). Thư mục nằm ở ổ kia mà không
 * chia sẻ sang thì trang khách mở ra trắng trơn — web tạo được album nhưng
 * không bao giờ đọc nổi ảnh trong đó.
 *
 * Lấy từ biến môi trường, mặc định là tài khoản Drive ảnh cưới của tiệm.
 */
export function emailChiaSe(): string {
  return process.env.GOOGLE_EMAIL_CHINH?.trim() || "hamita.studio@gmail.com";
}
