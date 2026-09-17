import { permanentRedirect } from "next/navigation";

/**
 * Trang phim trường cũ. Từ 17/09/2026 ảnh phim trường chọn ở /admin/gioi-thieu
 * (nhóm Hamita Garden) và xem ở /dich-vu/hamita-garden; đường này giữ lại để
 * link đã gửi và kết quả Google không chết.
 */
export default function PhimTruongCu() {
  permanentRedirect("/dich-vu/hamita-garden");
}
