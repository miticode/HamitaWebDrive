"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { duocSuaDichVu, kiemDichVu, TEN_LOAI, type DichVuSach, type DuLieuDichVu } from "@/lib/dichVuChung";

/**
 * Thêm, sửa mục trong bảng dịch vụ & trang phục.
 *
 * Quyền kiểm lại ở máy chủ mỗi lần (loaiDuocSua trong dichVuChung.ts), không
 * tin việc trang đã giấu nút. Không có thao tác xoá — xem chú thích model DichVu.
 */

const CHU: Record<Exclude<keyof DichVuSach, "maDV">, string> = {
  loai: "loại",
  ten: "tên",
  nhom: "nhóm",
  chiTiet: "chi tiết",
  donGia: "đơn giá",
  donVi: "đơn vị",
  dangDung: "đang dùng",
};

async function nguoiDangDung() {
  const nguoi = await layNguoiDung();
  // Người đang dùng mật khẩu tạm chưa được làm gì khác ngoài đổi mật khẩu.
  return nguoi && !nguoi.doiMatKhau ? nguoi : null;
}

export async function themDichVuAction(du: DuLieuDichVu): Promise<{ loi?: string; id?: string }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };
  const kq = kiemDichVu(du);
  if ("loi" in kq) return kq;
  if (!duocSuaDichVu(nguoi, kq.loai)) {
    return { loi: `Tài khoản này chưa được thêm ${TEN_LOAI[kq.loai].toLowerCase()}.` };
  }

  const prisma = getPrisma();
  // Trùng mã khác hoa thường cũng chặn: "adq01" và "ADQ01" nhìn là một, hợp đồng sẽ chọn nhầm.
  const trung = await prisma.dichVu.findFirst({
    where: { maDV: { equals: kq.maDV, mode: "insensitive" } },
    select: { maDV: true, ten: true },
  });
  if (trung) return { loi: `Mã ${trung.maDV} đã có (${trung.ten}).` };

  try {
    const dv = await prisma.dichVu.create({ data: kq });
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-dich-vu",
      doiTuong: "DichVu",
      doiTuongId: dv.id,
      chiTiet: { ten: `${dv.maDV} — ${dv.ten} — ${dv.donGia}đ` },
    });
    revalidatePath("/quan-ly/dich-vu");
    return { id: dv.id };
  } catch (loi) {
    // Hai người cùng thêm một mã trong cùng một giây.
    if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
      return { loi: `Mã ${kq.maDV} vừa có người thêm.` };
    }
    throw loi;
  }
}

export async function suaDichVuAction(id: string, du: DuLieuDichVu): Promise<{ loi?: string }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };

  const prisma = getPrisma();
  const cu = await prisma.dichVu.findUnique({ where: { id } });
  if (!cu) return { loi: "Không tìm thấy mục này." };

  // Mã không đổi được: luôn giữ mã cũ, bỏ qua ô mã gửi lên.
  const kq = kiemDichVu({ ...du, maDV: cu.maDV });
  if ("loi" in kq) return kq;
  // Phải được sửa CẢ loại cũ lẫn loại mới — phòng Váy không đổi được trang phục thành dịch vụ.
  if (!duocSuaDichVu(nguoi, cu.loai) || !duocSuaDichVu(nguoi, kq.loai)) {
    return { loi: "Tài khoản này chưa được sửa mục này." };
  }

  const doi: Record<string, { truoc: unknown; sau: unknown }> = {};
  for (const k of Object.keys(CHU) as (keyof typeof CHU)[]) {
    if (cu[k] !== kq[k]) doi[CHU[k]] = { truoc: cu[k], sau: kq[k] };
  }
  if (Object.keys(doi).length === 0) return {};

  await prisma.dichVu.update({ where: { id }, data: kq });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: id,
    chiTiet: { ten: `${cu.maDV} — ${cu.ten}`, doi },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath(`/quan-ly/dich-vu/${id}`);
  return {};
}
