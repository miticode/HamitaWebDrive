import { getPrisma } from "@/lib/db";
import { homNayStudio } from "@/lib/constants";
import { chuanSoDienThoai } from "@/lib/nhanVienChung";
import { kiemTiemNang, noiLichSu, type DuLieuTiemNang } from "@/lib/khachTiemNangChung";

/**
 * Thêm, sửa, chuyển khách tiềm năng thành khách thật — đợt 6 (13/11/2026).
 *
 * Số điện thoại ở bảng này KHÔNG phải mã khách (khác `KhachHang`), nên không
 * có phép kiểm trùng nào: hai sale cùng theo một người là chuyện có thật, và
 * chặn lại chỉ làm họ ghi ra giấy.
 */

/** Chuẩn số về 0xxxxxxxxx nếu khớp mẫu Việt Nam; không khớp thì giữ nguyên. */
const sdt = (s: string | null): string | null => (s ? chuanSoDienThoai(s) || s : null);

export async function themTiemNang(
  du: DuLieuTiemNang,
  maNV: string | null,
): Promise<{ loi: string } | { id: string; ten: string }> {
  const sach = kiemTiemNang(du);
  if ("loi" in sach) return sach;

  const k = await getPrisma().khachTiemNang.create({
    data: {
      ngay: homNayStudio(),
      tenNguoi: sach.tenNguoi,
      soDienThoai: sdt(sach.soDienThoai),
      nguon: sach.nguon,
      nhuCau: sach.nhuCau,
      diaChi: sach.diaChi,
      /* Không khai người phụ trách thì mặc định là người vừa ghi — khách không ai lo là khách mất. */
      phuTrachMaNV: sach.phuTrachMaNV ?? maNV,
      khaNang: sach.khaNang,
      tinhTrang: sach.tinhTrang,
      ghiChu: sach.ghiChu,
      loaiCskh: sach.loaiCskh,
      lichSuCskh: noiLichSu(null, sach.themLichSu, homNayStudio()),
      ngayLienHeLai: sach.ngayLienHeLai,
      nguoiTaoMaNV: maNV,
    },
    select: { id: true, tenNguoi: true },
  });
  return { id: k.id, ten: k.tenNguoi };
}

export async function suaTiemNang(
  id: string,
  du: DuLieuTiemNang,
): Promise<{ loi: string } | { ok: true; ten: string }> {
  const sach = kiemTiemNang(du);
  if ("loi" in sach) return sach;

  const prisma = getPrisma();
  const cu = await prisma.khachTiemNang.findUnique({ where: { id }, select: { lichSuCskh: true } });
  if (!cu) return { loi: "Không tìm thấy khách tiềm năng này." };

  await prisma.khachTiemNang.update({
    where: { id },
    data: {
      tenNguoi: sach.tenNguoi,
      soDienThoai: sdt(sach.soDienThoai),
      nguon: sach.nguon,
      nhuCau: sach.nhuCau,
      diaChi: sach.diaChi,
      phuTrachMaNV: sach.phuTrachMaNV,
      khaNang: sach.khaNang,
      tinhTrang: sach.tinhTrang,
      ghiChu: sach.ghiChu,
      loaiCskh: sach.loaiCskh,
      /* Nhật ký chăm sóc chỉ NỐI thêm, form không bao giờ gửi cả nhật ký lên. */
      lichSuCskh: noiLichSu(cu.lichSuCskh, sach.themLichSu, homNayStudio()),
      ngayLienHeLai: sach.ngayLienHeLai,
    },
  });
  return { ok: true as const, ten: sach.tenNguoi };
}
