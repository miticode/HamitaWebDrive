import { redirect } from "next/navigation";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { FormDangNhap } from "./FormDangNhap";

export const dynamic = "force-dynamic";

export default async function DangNhapPage() {
  const nguoi = await layNguoiDung();
  if (nguoi) redirect(nguoi.doiMatKhau ? "/quan-ly/doi-mat-khau" : "/quan-ly");
  return <FormDangNhap />;
}
