"use server";

import { revalidatePath } from "next/cache";
import { batBuocDangNhap } from "@/lib/phienNhanVien";
import { luuAnhDaiDien, xoaAnhDaiDien } from "@/lib/doiNgu";

/**
 * Ảnh đại diện: ai cũng chỉ sửa được của CHÍNH MÌNH.
 *
 * Không nhận `nhanVienId` từ máy khách — lấy từ phiên đăng nhập. Nhận id gửi
 * lên là mở đường cho người này thay ảnh người kia, mà một dòng thêm vào form
 * thì không ai nhìn ra.
 */
export async function luuAnhAction(base64: string): Promise<{ loi?: string }> {
  const nguoi = await batBuocDangNhap();
  if (!nguoi.id) return { loi: "Tài khoản quản lý chung không có hồ sơ nhân viên để gắn ảnh." };

  const kq = await luuAnhDaiDien(nguoi.id, base64);
  if (kq.loi) return kq;
  lamMoi();
  return {};
}

export async function xoaAnhAction(): Promise<{ loi?: string }> {
  const nguoi = await batBuocDangNhap();
  if (!nguoi.id) return { loi: "Tài khoản này không có hồ sơ nhân viên." };
  await xoaAnhDaiDien(nguoi.id);
  lamMoi();
  return {};
}

function lamMoi() {
  revalidatePath("/quan-ly/toi");
  revalidatePath("/quan-ly/nhan-vien");
  revalidatePath("/");
}
