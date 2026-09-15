import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { FormDoiMatKhau } from "../FormDoiMatKhau";

export const dynamic = "force-dynamic";

/**
 * Trang bắt buộc đổi mật khẩu, nằm NGOÀI khung có thanh bên: nhân viên vừa
 * đăng nhập bằng mật khẩu tạm thì chưa được đi đâu khác cho tới khi đổi xong.
 * Mật khẩu tạm đã đi qua Zalo, qua tay quản lý — coi như đã lộ.
 */
export default async function DoiMatKhauPage() {
  const nguoi = await layNguoiDung();
  if (!nguoi) redirect("/quan-ly/dang-nhap");
  if (!nguoi.id || !nguoi.doiMatKhau) redirect("/quan-ly/toi");

  return (
    <main className="mx-auto mt-20 w-full max-w-sm px-6">
      <Logo size="md" className="mx-auto" />
      <h1 className="mt-6 text-center font-display text-2xl font-light">
        Chào {nguoi.ten}
      </h1>
      <p className="mt-2 text-center text-sm leading-relaxed text-fg-muted">
        Anh chị đang dùng mật khẩu tạm quản lý gửi. Đặt mật khẩu riêng của mình
        trước khi vào nhé.
      </p>
      <div className="mt-8">
        <FormDoiMatKhau batBuoc />
      </div>
    </main>
  );
}
