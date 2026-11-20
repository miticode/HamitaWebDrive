"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { layNguoiDung, laQuanTri } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";

/*
  VIỆC QUẢN LÝ TỰ TAY THÊM VÀO LỊCH CHỤP — anh yêu cầu 20/11/2026.

  "Màu đỏ là những hoạt động tự tay quản lý thêm vào lịch."

  Lịch chụp tới giờ chỉ vẽ được thứ do hợp đồng sinh ra. Mọi việc khác của
  tiệm — họp, giao hàng tận nhà, đi khảo sát địa điểm, nghỉ lễ — không có chỗ
  nào đứng, nên nhân viên mở lịch ra vẫn phải hỏi lại quản lý.

  CHỈ QUẢN LÝ. Lịch chụp là thứ cả tiệm nhìn vào để biết hôm nay làm gì; cho
  mọi người ghi thì nó loãng thành bảng tin, và không ai dám tin nó nữa.

  Mỗi việc là một dòng `LichChup` mang `tuThem = true`, KHÔNG gắn hợp đồng.
  Dùng lại bảng lịch thay vì dựng bảng mới vì nó đã có đủ: ngày, giờ, ghi chú,
  trạng thái — và nhờ vậy việc tự thêm hiện lên lưới, bảng danh sách, bộ lọc
  tháng mà không phải sửa chỗ nào trong mấy nơi vẽ lịch.
*/

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function quanLy() {
  const nguoi = await layNguoiDung();
  return nguoi && laQuanTri(nguoi) && !nguoi.doiMatKhau ? nguoi : null;
}

export type ViecLichNhap = {
  ngay: string;
  gio: string;
  tieuDe: string;
  ghiChu: string;
};

function kiem(du: ViecLichNhap): { loi: string } | { ngay: string; gio: string | null; tieuDe: string; ghiChu: string | null } {
  const ngay = du.ngay.trim();
  if (!NGAY_RE.test(ngay)) return { loi: "Chưa chọn ngày." };
  const gio = du.gio.trim();
  if (gio && !GIO_RE.test(gio)) return { loi: "Giờ chưa đúng." };
  const tieuDe = du.tieuDe.trim().replace(/[ \t]+/g, " ");
  if (!tieuDe) return { loi: "Chưa ghi việc gì." };
  if (tieuDe.length > 120) return { loi: "Tên việc dài quá, tối đa 120 ký tự." };
  const ghiChu = du.ghiChu.trim();
  if (ghiChu.length > 500) return { loi: "Ghi chú dài quá, tối đa 500 ký tự." };
  return { ngay, gio: gio || null, tieuDe, ghiChu: ghiChu || null };
}

function lamMoi() {
  revalidatePath("/quan-ly/lich");
  revalidatePath("/quan-ly");
}

export async function themViecLichAction(du: ViecLichNhap): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới thêm được việc vào lịch." };
  const kq = kiem(du);
  if ("loi" in kq) return kq;

  const x = await getPrisma().lichChup.create({
    data: {
      tuThem: true,
      ngay: kq.ngay,
      gio: kq.gio,
      /*
        `loai` để TRỐNG, không đặt một chữ như "Việc nội bộ": mọi chữ bỏ vào
        đây đều lọt vào ô chọn loại buổi và vào phép đếm "đang dùng bao nhiêu
        buổi" của trang Loại buổi, rồi có ngày ai đó gắn mã album cho nó.
      */
      loai: null,
      hienThi: kq.tieuDe,
      ghiChu: kq.ghiChu,
      trangThai: "Chưa làm",
      nguoiTaoMaNV: nguoi.maNV ?? null,
    },
    select: { id: true },
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "them-viec-lich",
    doiTuong: "LichChup",
    doiTuongId: x.id,
    chiTiet: { ten: `${kq.ngay}${kq.gio ? ` ${kq.gio}` : ""} — ${kq.tieuDe}` },
  });
  lamMoi();
  return { ok: true };
}

export async function suaViecLichAction(id: string, du: ViecLichNhap): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới sửa được việc trên lịch." };
  const kq = kiem(du);
  if ("loi" in kq) return kq;

  const prisma = getPrisma();
  const cu = await prisma.lichChup.findUnique({
    where: { id },
    select: { tuThem: true, ngay: true, gio: true, hienThi: true },
  });
  if (!cu) return { loi: "Việc này không còn." };
  /*
    CHẶN SỬA BUỔI CỦA HỢP ĐỒNG qua đường này. Buổi chụp của khách sửa ở trang
    hợp đồng, nơi còn kiểm loại buổi và mã album; lọt qua đây thì một dòng
    lịch của khách mất loại buổi mà không ai hay.
  */
  if (!cu.tuThem) return { loi: "Đây là buổi chụp của một hợp đồng, sửa ở trang hợp đồng." };

  await prisma.lichChup.update({
    where: { id },
    data: { ngay: kq.ngay, gio: kq.gio, hienThi: kq.tieuDe, ghiChu: kq.ghiChu },
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-viec-lich",
    doiTuong: "LichChup",
    doiTuongId: id,
    chiTiet: {
      ten: cu.hienThi ?? "",
      doi: {
        ...(cu.ngay !== kq.ngay ? { ngay: { cu: cu.ngay, moi: kq.ngay } } : {}),
        ...(cu.gio !== kq.gio ? { gio: { cu: cu.gio, moi: kq.gio } } : {}),
        ...(cu.hienThi !== kq.tieuDe ? { viec: { cu: cu.hienThi, moi: kq.tieuDe } } : {}),
      },
    },
  });
  lamMoi();
  return { ok: true };
}

export async function xoaViecLichAction(id: string): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await quanLy();
  if (!nguoi) return { loi: "Chỉ quản lý mới xoá được việc trên lịch." };

  const prisma = getPrisma();
  const cu = await prisma.lichChup.findUnique({
    where: { id },
    select: { tuThem: true, ngay: true, hienThi: true },
  });
  if (!cu) return { loi: "Việc này không còn." };
  /* Cùng lý do với phần sửa: buổi của hợp đồng không xoá qua đường này. */
  if (!cu.tuThem) return { loi: "Đây là buổi chụp của một hợp đồng, xoá ở trang hợp đồng." };

  await prisma.lichChup.delete({ where: { id } });
  await ghiNhatKy({
    nguoi,
    hanhDong: "xoa-viec-lich",
    doiTuong: "LichChup",
    doiTuongId: id,
    chiTiet: { ten: `${cu.ngay ?? ""} — ${cu.hienThi ?? ""}` },
  });
  lamMoi();
  return { ok: true };
}
