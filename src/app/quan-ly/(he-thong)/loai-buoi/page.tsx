import { redirect } from "next/navigation";

/**
 * Trang Loại buổi chụp cũ — nay là một tab của "Quản lý dịch vụ".
 *
 * Giữ lại để đường link đã gửi cho nhau không chết (anh gom mục 18/11/2026).
 */
export default function LoaiBuoiCu() {
  redirect("/quan-ly/dich-vu?dm=loai-buoi");
}
