"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { duocSuaDichVu, kiemDichVu, TEN_LOAI, type DichVuSach, type DuLieuDichVu, type LoaiDichVu } from "@/lib/dichVuChung";
import { MA_ALBUM } from "@/lib/maAlbum";

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
  maAlbum: "mã album",
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

/**
 * Gắn hoặc gỡ mã album cho một mục, ngay trên bảng danh sách.
 *
 * Thêm 18/11/2026 sau khi anh mở bảng và không thấy mã đâu: lúc đó cả 95 dịch
 * vụ đều chưa gắn, mà muốn gắn thì phải mở từng form sửa. Bảng có 95 dịch vụ,
 * 888 trang phục và 37 sản phẩm — gắn kiểu đó là vài trăm lần mở trang.
 *
 * KHÔNG dùng `kiemDichVu` ở đây: hàm đó kiểm cả tên, đơn giá, mã trùng… của
 * một mục đang sửa toàn phần. Ở đây chỉ đổi đúng một ô, nên chỉ kiểm đúng ô
 * đó — nhưng vẫn kiểm ở MÁY CHỦ, vì server action là đường mạng công khai
 * (nguyên tắc 3).
 */
export async function ganMaAlbumAction(id: string, ma: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };

  const sach = String(ma ?? "").trim();
  if (sach && !MA_ALBUM.some((m) => m.ma === sach)) return { loi: "Mã album không có trong bộ mã." };

  const prisma = getPrisma();
  const cu = await prisma.dichVu.findUnique({ where: { id }, select: { maDV: true, ten: true, loai: true, maAlbum: true } });
  if (!cu) return { loi: "Mục này không còn." };
  if (!duocSuaDichVu(nguoi, cu.loai)) {
    return { loi: `Tài khoản này chưa được sửa ${TEN_LOAI[cu.loai as LoaiDichVu]?.toLowerCase() ?? "mục này"}.` };
  }
  if ((cu.maAlbum ?? "") === sach) return { ok: true };

  await prisma.dichVu.update({ where: { id }, data: { maAlbum: sach || null } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: id,
    chiTiet: { ten: `${cu.maDV} — ${cu.ten}`, doi: { maAlbum: { cu: cu.maAlbum, moi: sach || null } } },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath(`/quan-ly/dich-vu/${id}`);
  return { ok: true };
}

/**
 * Đặt danh sách buổi chụp mặc định cho một dịch vụ — anh yêu cầu 18/11/2026.
 *
 * Nhận MẢNG id loại buổi theo đúng thứ tự người bấm. Lặp lại một id là có
 * thật: gói hai ngày có thể là hai buổi cùng loại "Ngày chụp".
 *
 * Xoá hết rồi ghi lại thay vì so từng dòng: danh sách này nhiều lắm bốn năm
 * dòng, so sánh cho khéo chỉ tốn code mà không nhanh hơn. Nằm trong một
 * transaction để không có lúc nào dịch vụ còn nửa danh sách.
 */
export async function datBuoiDichVuAction(
  dichVuId: string,
  loaiBuoiIds: string[],
): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };

  const prisma = getPrisma();
  const dv = await prisma.dichVu.findUnique({ where: { id: dichVuId }, select: { maDV: true, ten: true, loai: true } });
  if (!dv) return { loi: "Mục này không còn." };
  if (!duocSuaDichVu(nguoi, dv.loai)) {
    return { loi: `Tài khoản này chưa được sửa ${TEN_LOAI[dv.loai as LoaiDichVu]?.toLowerCase() ?? "mục này"}.` };
  }

  /* Chỉ nhận id có thật — trình duyệt gửi gì cũng phải kiểm (nguyên tắc 3). */
  const co = await prisma.loaiBuoi.findMany({
    where: { id: { in: [...new Set(loaiBuoiIds)] } },
    select: { id: true, ten: true },
  });
  const ten = new Map(co.map((x) => [x.id, x.ten]));
  const sach = loaiBuoiIds.filter((x) => ten.has(x));
  if (sach.length !== loaiBuoiIds.length) return { loi: "Có loại buổi không còn trong danh mục." };
  if (sach.length > 10) return { loi: "Nhiều buổi quá, tối đa 10." };

  await prisma.$transaction(async (tx) => {
    await tx.dichVuBuoi.deleteMany({ where: { dichVuId } });
    for (const [i, id] of sach.entries()) {
      await tx.dichVuBuoi.create({ data: { dichVuId, loaiBuoiId: id, thuTu: i } });
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: dichVuId,
    chiTiet: {
      ten: `${dv.maDV} — ${dv.ten}`,
      doi: { buoiChup: sach.map((id) => ten.get(id)) },
    },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath(`/quan-ly/dich-vu/${dichVuId}`);
  return { ok: true };
}
