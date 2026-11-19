"use server";

import { revalidatePath } from "next/cache";
import { quyenAlbum } from "@/lib/quyenAlbum";
import {
  datTenThuMucGioiThieu,
  docLaiCaMuc,
  docLaiThuMucGioiThieu,
  doiBiaThuMucGioiThieu,
  doiThuTuThuMuc,
  themThuMucGioiThieu,
  xoaThuMucGioiThieu,
} from "@/lib/anhGioiThieu";
import { loadTree, loadTreeMoi } from "@/lib/gallery";
import { getPrisma } from "@/lib/db";
import { doiThuTuMuc, suaMuc, themMuc, xoaMuc } from "@/lib/mucDichVu";

/*
  Quyền: ai vào được trang quản lý album cũng làm được (quyenAlbum), cùng mức
  với ô tích "hiện lên trang giới thiệu" trên thẻ album. Việc này sửa được, xoá
  nhầm thì thêm lại — không nằm trong nhóm việc nguy hiểm.
*/

export type ThuMucChon = { id: string; ten: string; soAnh: number };

/**
 * Danh sách thư mục con của một album, để chọn thư mục đưa lên. Đọc Drive.
 *
 * `docLai` bỏ qua cache 5 phút — nút "Đọc lại Drive" trong ô chọn (anh yêu cầu
 * 25/09/2026): vừa tạo thư mục trên Drive mà ô chọn còn đọc cache thì không
 * thấy, tưởng web hỏng.
 */
export async function docThuMucAlbumAction(
  galleryId: string,
  docLai = false,
): Promise<{ loi?: string; thuMuc?: ThuMucChon[] }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const g = await getPrisma().gallery.findUnique({
    where: { id: galleryId },
    select: { driveFolderId: true, treeMoc: true },
  });
  if (!g) return { loi: "Không tìm thấy album." };
  try {
    const tree = docLai
      ? await loadTreeMoi(g.driveFolderId)
      : await loadTree(g.driveFolderId, g.treeMoc);
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

/* ── Tự tạo mục mới trong một nhóm (anh yêu cầu 25/09/2026) ────────────── */

/**
 * Trước đây thêm một mục như "Dạm ngõ" phải sửa mã nguồn rồi đưa bản mới lên
 * mạng. Nay studio tự làm trên trang quản lý — danh sách mục nằm trong bảng
 * `MucDichVu` (src/lib/mucDichVu.ts).
 *
 * Cùng mức quyền với phần còn lại của trang (`quyenAlbum`). Việc nguy hiểm duy
 * nhất là xoá, mà xoá đã bị chặn khi mục còn thư mục bên trong.
 */
export async function themMucAction(nhom: string, ten: string, ma: string): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await themMuc(nhom, ten, ma);
  if (kq.loi) return { loi: kq.loi };
  lamMoi();
  return {};
}

export async function suaMucAction(id: string, ten: string, ma: string): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await suaMuc(id, ten, ma);
  if (kq.loi) return kq;
  lamMoi();
  return {};
}

export async function doiThuTuMucAction(id: string, len: boolean): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await doiThuTuMuc(id, len);
  if (kq.loi) return kq;
  lamMoi();
  return {};
}

export async function xoaMucAction(id: string): Promise<{ loi?: string }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  const kq = await xoaMuc(id);
  if (kq.loi) return kq;
  lamMoi();
  return {};
}

/**
 * Đọc lại Drive cho cả một mục (anh yêu cầu 25/09/2026) — biết ngay thư mục
 * vừa tạo trên Drive đã sang tới web chưa mà không phải bấm từng thẻ.
 */
export async function docLaiMucAction(
  nhom: string,
  muc: string,
): Promise<{ loi?: string; capNhat?: number; soMoi?: number }> {
  if (!(await quyenAlbum())) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp." };
  try {
    const kq = await docLaiCaMuc(nhom, muc);
    if (kq.loi) return kq;
    lamMoi();
    return kq;
  } catch {
    return { loi: "Không đọc được Drive lúc này, anh chị thử lại sau ít phút." };
  }
}
