"use server";

import { revalidatePath } from "next/cache";
import { quyenAlbum } from "@/lib/quyenAlbum";
import {
  datTenThuMucGioiThieu,
  docLaiThuMucGioiThieu,
  doiBiaThuMucGioiThieu,
  doiThuTuThuMuc,
  themThuMucGioiThieu,
  xoaThuMucGioiThieu,
} from "@/lib/anhGioiThieu";
import { loadTree } from "@/lib/gallery";
import { getPrisma } from "@/lib/db";

/*
  Quyền: ai vào được trang quản lý album cũng làm được (quyenAlbum), cùng mức
  với ô tích "hiện lên trang giới thiệu" trên thẻ album. Việc này sửa được, xoá
  nhầm thì thêm lại — không nằm trong nhóm việc nguy hiểm.
*/

export type ThuMucChon = { id: string; ten: string; soAnh: number };

/** Danh sách thư mục con của một album, để chọn thư mục đưa lên. Đọc Drive. */
export async function docThuMucAlbumAction(
  galleryId: string,
): Promise<{ loi?: string; thuMuc?: ThuMucChon[] }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const g = await getPrisma().gallery.findUnique({
    where: { id: galleryId },
    select: { driveFolderId: true },
  });
  if (!g) return { loi: "Không tìm thấy album." };
  try {
    const tree = await loadTree(g.driveFolderId);
    return {
      thuMuc: tree.albums
        .filter((a) => a.photos.length > 0)
        .map((a) => ({ id: a.id, ten: a.id === "" ? "Ảnh ngoài thư mục gốc" : a.name, soAnh: a.photos.length })),
    };
  } catch {
    return { loi: "Không đọc được Drive lúc này, anh chị thử lại sau ít phút." };
  }
}

export async function themAnhGioiThieuAction(
  nhom: string,
  muc: string,
  galleryId: string,
  albumId: string,
): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const kq = await themThuMucGioiThieu(nhom, muc, galleryId, albumId);
    if (kq.loi) return kq;
  } catch {
    return { loi: "Không đọc được Drive lúc này, anh chị thử lại sau ít phút." };
  }
  lamMoi();
  return {};
}

export async function doiBiaGioiThieuAction(id: string, fileId: string): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const kq = await doiBiaThuMucGioiThieu(id, fileId);
    if (kq.loi) return kq;
  } catch {
    return { loi: "Không đọc được Drive lúc này, anh chị thử lại sau ít phút." };
  }
  lamMoi();
  return {};
}

export async function xoaAnhGioiThieuAction(id: string): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  await xoaThuMucGioiThieu(id);
  lamMoi();
  return {};
}

function lamMoi() {
  revalidatePath("/admin/gioi-thieu");
  revalidatePath("/");
  revalidatePath("/dich-vu", "layout");
}

/* ── Đặt tên cảnh, sắp thứ tự, đọc lại Drive (anh yêu cầu 23/09/2026) ──── */

/**
 * Ba việc để studio tự lo phần giới thiệu về sau mà không cần gọi tới em:
 * đặt tên và mô tả cho từng cảnh, kéo thứ tự, và đọc lại Drive khi vừa up
 * thêm ảnh.
 *
 * Cùng mức quyền với mấy việc còn lại của trang này (`quyenAlbum`): sửa được,
 * sai thì sửa lại, không nằm trong nhóm việc nguy hiểm.
 */
export async function datTenCanhAction(
  id: string,
  tenHien: string,
  moTa: string,
): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await datTenThuMucGioiThieu(id, tenHien, moTa);
  if (kq.loi) return kq;
  revalidatePath("/admin/gioi-thieu");
  revalidatePath("/dich-vu", "layout");
  revalidatePath("/");
  return {};
}

export async function doiThuTuCanhAction(id: string, len: boolean): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await doiThuTuThuMuc(id, len);
  if (kq.loi) return kq;
  revalidatePath("/admin/gioi-thieu");
  revalidatePath("/dich-vu", "layout");
  revalidatePath("/");
  return {};
}

export async function docLaiCanhAction(id: string): Promise<{ loi?: string; soAnh?: number }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const kq = await docLaiThuMucGioiThieu(id);
    if (kq.loi) return kq;
    revalidatePath("/admin/gioi-thieu");
    revalidatePath("/dich-vu", "layout");
    revalidatePath("/");
    return kq;
  } catch {
    return { loi: "Không đọc được Drive lúc này, anh chị thử lại sau ít phút." };
  }
}
