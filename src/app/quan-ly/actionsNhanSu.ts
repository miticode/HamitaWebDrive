"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { homNayStudio } from "@/lib/constants";
import { ghiNhatKy } from "@/lib/nhatKy";
import { laQuanTri, layNguoiDung } from "@/lib/phienNhanVien";
import {
  DON_DA_DUYET,
  DON_DANG_TAO,
  DON_KHONG_DUYET,
  kiemDon,
  type DuLieuDon,
} from "@/lib/donTuChung";
import { chotKyLuong, luuKyLuong, moLaiKyLuong, suaTienTay } from "@/lib/luong";

/**
 * Đơn từ và lương — đợt 5 (`KE-HOACH-CRM.md`).
 *
 * AI LÀM GÌ:
 *   gửi đơn       mọi người có mã nhân viên
 *   huỷ đơn       chỉ người gửi, và chỉ khi đơn còn "Đang tạo"
 *   duyệt đơn     CHỈ quản lý
 *   tính / chốt lương, sửa tạm ứng   CHỈ quản lý
 *
 * Quyền kiểm ở ĐÂY mỗi lượt gọi — server action là một đường mạng công khai
 * (nguyên tắc 3).
 */

async function nguoiGui(): Promise<{ maNV: string; ten: string; id: string | null } | null> {
  const n = await layNguoiDung();
  if (!n?.maNV) return null;
  return { maNV: n.maNV, ten: n.ten, id: n.id };
}

async function quanLy(): Promise<{ maNV: string | null; ten: string; id: string | null } | null> {
  const n = await layNguoiDung();
  if (!laQuanTri(n)) return null;
  return { maNV: n!.maNV, ten: n!.ten, id: n!.id };
}

/* ── Đơn từ ──────────────────────────────────────────────────────────── */

export async function guiDonAction(du: DuLieuDon): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiGui();
  if (!nguoi) return { loi: "Tài khoản này không có mã nhân viên nên không gửi đơn được." };

  const kq = kiemDon(du);
  if ("loi" in kq) return kq;

  const d = await getPrisma().donTu.create({
    data: {
      maNV: nguoi.maNV,
      loaiDon: kq.loaiDon,
      loaiNghi: kq.loaiNghi,
      ngayYeuCau: kq.ngayYeuCau,
      lyDo: kq.lyDo,
      soTien: kq.soTien,
      trangThai: DON_DANG_TAO,
    },
    select: { id: true },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "gui-don-tu",
    doiTuong: "DonTu",
    doiTuongId: d.id,
    chiTiet: { loaiDon: kq.loaiDon, ngay: kq.ngayYeuCau },
  });
  revalidatePath("/quan-ly/don-tu");
  return { ok: true };
}

/**
 * Huỷ đơn của CHÍNH MÌNH khi còn đang chờ.
 *
 * Đơn đã duyệt thì không huỷ được ở đây: nó đã là căn cứ cho bảng công và
 * bảng lương rồi. Muốn bỏ thì quản lý chuyển sang "Không duyệt", để còn dấu
 * vết ai đổi ý lúc nào.
 */
export async function huyDonAction(id: string): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiGui();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết." };

  const prisma = getPrisma();
  const d = await prisma.donTu.findUnique({ where: { id }, select: { maNV: true, trangThai: true, bamAppSheet: true } });
  if (!d) return { loi: "Đơn này không còn." };
  if ((d.maNV ?? "").toLowerCase() !== nguoi.maNV.toLowerCase()) return { loi: "Đây không phải đơn của anh/chị." };
  if (d.trangThai !== DON_DANG_TAO) return { loi: "Đơn đã được xử lý rồi, không huỷ được." };
  if (d.bamAppSheet) return { loi: "Đơn này chép từ AppSheet, phải xử bên đó." };

  await prisma.donTu.delete({ where: { id } });
  revalidatePath("/quan-ly/don-tu");
  return { ok: true };
}

export async function duyetDonAction(
  id: string,
  dongY: boolean,
  ghiChu: string,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới duyệt được đơn." };

  const prisma = getPrisma();
  const d = await prisma.donTu.findUnique({ where: { id }, select: { trangThai: true } });
  if (!d) return { loi: "Đơn này không còn." };
  if (d.trangThai !== DON_DANG_TAO) return { loi: "Đơn này đã được xử lý rồi." };

  await prisma.donTu.update({
    where: { id },
    data: {
      trangThai: dongY ? DON_DA_DUYET : DON_KHONG_DUYET,
      nguoiDuyetMaNV: nguoi.maNV,
      ngayDuyet: homNayStudio(),
      ghiChu: ghiChu.trim() || null,
    },
  });

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: dongY ? "duyet-don-tu" : "tu-choi-don-tu",
    doiTuong: "DonTu",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/don-tu");
  return { ok: true };
}

/* ── Lương ───────────────────────────────────────────────────────────── */

export async function tinhLuongAction(
  nam: number,
  thang: number,
): Promise<{ loi: string } | { ok: true; soDong: number }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới tính được lương." };

  const kq = await luuKyLuong(nam, thang, nguoi.maNV);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "tinh-luong",
    doiTuong: "KyLuong",
    chiTiet: { ky: `${thang}/${nam}`, soDong: kq.soDong },
  });
  revalidatePath("/quan-ly/luong");
  return kq;
}

export async function chotLuongAction(nam: number, thang: number): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới chốt được kỳ lương." };

  const kq = await chotKyLuong(nam, thang);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "chot-ky-luong",
    doiTuong: "KyLuong",
    chiTiet: { ky: `${thang}/${nam}` },
  });
  revalidatePath("/quan-ly/luong");
  return { ok: true };
}

export async function moLaiLuongAction(nam: number, thang: number): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới mở lại được kỳ lương." };

  const kq = await moLaiKyLuong(nam, thang);
  if ("loi" in kq) return kq;

  /* Mở lại kỳ đã chốt là việc hiếm và nhạy cảm — ghi nhật ký cho bằng được. */
  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "mo-lai-ky-luong",
    doiTuong: "KyLuong",
    chiTiet: { ky: `${thang}/${nam}` },
  });
  revalidatePath("/quan-ly/luong");
  return { ok: true };
}

export async function suaTienLuongAction(
  id: string,
  tamUng: number,
  daThanhToan: number,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được." };

  const kq = await suaTienTay(id, tamUng, daThanhToan);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id, ten: nguoi.ten },
    hanhDong: "sua-tien-luong",
    doiTuong: "LuongNhanVien",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/luong");
  return { ok: true };
}
