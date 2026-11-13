"use server";

import { revalidatePath } from "next/cache";
import { layNguoiDung, lapHopDong } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { suaKhach, themKhach, type DuLieuKhach } from "@/lib/khachHang";
import { suaTiemNang, themTiemNang } from "@/lib/khachTiemNang";
import type { DuLieuTiemNang } from "@/lib/khachTiemNangChung";

/**
 * Thêm và sửa khách hàng ĐỘC LẬP với hợp đồng (đợt 6, 13/11/2026).
 *
 * QUYỀN: đúng nhóm được lập hợp đồng (quản lý + sale). Không mở rộng thêm ai —
 * nhóm này vốn đã tạo được khách mới qua form hợp đồng, việc này chỉ cho họ
 * làm thẳng thay vì phải mượn một hợp đồng để tạo.
 *
 * Kiểm quyền Ở ĐÂY mỗi lượt gọi, không tin việc trang đã giấu nút — nguyên tắc 3.
 */

async function nguoiDuocSua() {
  const nguoi = await layNguoiDung();
  return lapHopDong(nguoi) && nguoi ? nguoi : null;
}

export async function themKhachAction(
  du: DuLieuKhach,
): Promise<{ loi: string } | { id: string }> {
  const nguoi = await nguoiDuocSua();
  if (!nguoi) return { loi: "Tài khoản này chưa được thêm khách, hoặc phiên đăng nhập đã hết." };

  const kq = await themKhach(du, nguoi.maNV ?? null);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: "them-khach",
    doiTuong: "KhachHang",
    doiTuongId: kq.id,
    // Nhật ký ghi TÊN khách, không bao giờ ghi số điện thoại — cùng nếp lập hợp đồng.
    chiTiet: { ten: kq.ten },
  });

  revalidatePath("/quan-ly/khach-hang");
  return { id: kq.id };
}

export async function suaKhachAction(
  id: string,
  du: DuLieuKhach,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocSua();
  if (!nguoi) return { loi: "Tài khoản này chưa được sửa khách, hoặc phiên đăng nhập đã hết." };

  const kq = await suaKhach(id, du);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: "sua-khach",
    doiTuong: "KhachHang",
    doiTuongId: id,
    /*
      Ghi lại việc ĐỔI SỐ ĐIỆN THOẠI (không ghi số), vì đó cũng là đổi mã khách
      — thứ mọi hợp đồng của nhà này bám vào. Có dấu vết thì sau này lần ra được.
    */
    chiTiet: { ten: kq.ten, ...(kq.doiSo ? { doiSoDienThoai: true } : {}) },
  });

  revalidatePath("/quan-ly/khach-hang");
  revalidatePath(`/quan-ly/khach-hang/${id}`);
  return { ok: true };
}

/* ── Khách tiềm năng (bảng "CRM" bên AppSheet) ─────────────────────────── */

export async function themTiemNangAction(
  du: DuLieuTiemNang,
): Promise<{ loi: string } | { id: string }> {
  const nguoi = await nguoiDuocSua();
  if (!nguoi) return { loi: "Tài khoản này chưa được thêm khách, hoặc phiên đăng nhập đã hết." };

  const kq = await themTiemNang(du, nguoi.maNV ?? null);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: "them-khach-tiem-nang",
    doiTuong: "KhachTiemNang",
    doiTuongId: kq.id,
    chiTiet: { ten: kq.ten },
  });

  revalidatePath("/quan-ly/khach-tiem-nang");
  return { id: kq.id };
}

export async function suaTiemNangAction(
  id: string,
  du: DuLieuTiemNang,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocSua();
  if (!nguoi) return { loi: "Tài khoản này chưa được sửa khách, hoặc phiên đăng nhập đã hết." };

  const kq = await suaTiemNang(id, du);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id ?? null, ten: nguoi.ten },
    hanhDong: "sua-khach-tiem-nang",
    doiTuong: "KhachTiemNang",
    doiTuongId: id,
    chiTiet: { ten: kq.ten },
  });

  revalidatePath("/quan-ly/khach-tiem-nang");
  return { ok: true };
}
