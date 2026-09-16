import { redirect } from "next/navigation";
import { laQuanTri, layNguoiDung } from "@/lib/phienNhanVien";
import { FormDangNhap } from "./FormDangNhap";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ tiep?: string }> };

/**
 * MÀN HÌNH ĐĂNG NHẬP DUY NHẤT của cả hệ thống (gộp 16/09/2026).
 *
 * Trang quản lý album (/admin) trước đây có màn hình riêng chỉ hỏi mật khẩu.
 * Hai cửa cho cùng một người là chỗ dễ đứng nhầm rồi tưởng gõ sai mật khẩu —
 * nay /admin chuyển thẳng về đây kèm "tiep" là đường cần quay lại.
 */
export default async function DangNhapPage({ searchParams }: Props) {
  const nguoi = await layNguoiDung();
  const { tiep = "" } = await searchParams;
  const an = /^\/(?!\/)[\w\-./?=&%]*$/.test(tiep) ? tiep : "";

  if (nguoi) {
    if (nguoi.doiMatKhau) redirect("/quan-ly/doi-mat-khau");
    redirect(an && (!an.startsWith("/admin") || laQuanTri(nguoi)) ? an : "/quan-ly");
  }
  return <FormDangNhap tiep={an} />;
}
