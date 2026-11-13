import { getPrisma } from "@/lib/db";
import { chuanSoDienThoai } from "@/lib/nhanVienChung";

/**
 * THÊM VÀ SỬA KHÁCH HÀNG ĐỘC LẬP — thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 6).
 *
 * Vá đúng một lỗ: tới hôm nay khách chỉ sinh ra được KÈM MỘT HỢP ĐỒNG
 * (`src/lib/taoHopDong.ts`). Sale gõ nhầm một chữ số điện thoại là nhà đó mang
 * số sai vĩnh viễn, vì mã khách CHÍNH LÀ số điện thoại và không có đường sửa
 * nào trên web. Khách hỏi giá chưa chốt cũng không lưu được ở đâu.
 *
 * Mã khách giữ đúng nếp AppSheet: `maAppSheet` = số điện thoại. Nhờ vậy khách
 * lập trên web và khách chép từ AppSheet dùng chung một cách nhận dạng, không
 * sinh ra hai nhà cùng một người.
 *
 * ĐỔI SỐ ĐIỆN THOẠI LÀ ĐỔI MÃ KHÁCH. Đó là lý do hàm sửa phải kiểm trùng lần
 * nữa trong cùng một `$transaction`: hai người cùng sửa về một số thì người
 * sau phải bị chặn, chứ không phải để Postgres ném lỗi unique ra màn hình.
 */

export type DuLieuKhach = { ten: string; soDienThoai: string; tinh: string; ghiChu: string };
export type KhachSach = { ten: string; soDienThoai: string; tinh: string | null; ghiChu: string | null };

const gon = (s: unknown) => String(s ?? "").trim().replace(/[ \t]+/g, " ");

/**
 * Kiểm và chuẩn hoá — form lẫn server action đi chung hàm này.
 *
 * Số điện thoại chỉ giữ chữ số và dấu `+`, đúng cách `kiemHopDongMoi` làm, để
 * một nhà nhập qua hai đường vẫn ra cùng một mã. `chuanSoDienThoai` đưa được
 * số về dạng 0xxxxxxxxx thì dùng bản chuẩn đó; số nước ngoài hay số bàn không
 * khớp mẫu thì giữ nguyên bản đã lọc — thà lưu được còn hơn chặn một nhà thật.
 */
export function kiemKhach(du: DuLieuKhach): { loi: string } | KhachSach {
  const ten = gon(du.ten);
  if (!ten) return { loi: "Chưa có tên khách." };
  if (ten.length > 120) return { loi: "Tên khách dài quá, tối đa 120 ký tự." };

  const tho = gon(du.soDienThoai).replace(/[^\d+]/g, "");
  if (!tho) return { loi: "Khách phải có số điện thoại — mã khách chính là số này." };
  if (tho.length < 8 || tho.length > 15) return { loi: "Số điện thoại trông không đúng." };
  const soDienThoai = chuanSoDienThoai(tho) || tho;

  const tinh = gon(du.tinh);
  const ghiChu = gon(du.ghiChu);
  if (tinh.length > 80) return { loi: "Tỉnh dài quá, tối đa 80 ký tự." };
  if (ghiChu.length > 2000) return { loi: "Ghi chú dài quá, tối đa 2000 ký tự." };

  return { ten, soDienThoai, tinh: tinh || null, ghiChu: ghiChu || null };
}

export async function themKhach(
  du: DuLieuKhach,
  maNV: string | null,
): Promise<{ loi: string } | { id: string; ten: string }> {
  const sach = kiemKhach(du);
  if ("loi" in sach) return sach;

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const daCo = await tx.khachHang.findUnique({
      where: { maAppSheet: sach.soDienThoai },
      select: { id: true, ten: true, matBenAppSheet: true },
    });
    /*
      Số đã có thì KHÔNG tạo nhà thứ hai — hai hồ sơ cùng một người là chỗ công
      nợ bắt đầu sai (cùng lý do với `lapHopDongMoi`). Trả lỗi kèm tên nhà cũ
      để người nhập nhận ra ngay là mình đang gõ lại khách quen.
    */
    if (daCo) {
      return {
        loi: `Số này đã là khách “${daCo.ten}”${daCo.matBenAppSheet ? " (đã mất bên AppSheet)" : ""}. Mở hồ sơ đó ra sửa thay vì tạo nhà mới.`,
      };
    }
    const k = await tx.khachHang.create({
      data: {
        maAppSheet: sach.soDienThoai,
        ten: sach.ten,
        soDienThoai: sach.soDienThoai,
        tinh: sach.tinh,
        ghiChu: sach.ghiChu,
        nguoiTaoMaNV: maNV,
      },
      select: { id: true, ten: true },
    });
    return k;
  });
}

export async function suaKhach(
  id: string,
  du: DuLieuKhach,
): Promise<{ loi: string } | { ok: true; ten: string; doiSo: boolean }> {
  const sach = kiemKhach(du);
  if ("loi" in sach) return sach;

  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const cu = await tx.khachHang.findUnique({
      where: { id },
      select: { id: true, maAppSheet: true, soDienThoai: true },
    });
    if (!cu) return { loi: "Không tìm thấy khách này." };

    const doiSo = sach.soDienThoai !== cu.soDienThoai;
    if (doiSo) {
      const vuong = await tx.khachHang.findUnique({
        where: { maAppSheet: sach.soDienThoai },
        select: { id: true, ten: true },
      });
      if (vuong && vuong.id !== id) {
        return { loi: `Số mới đang là mã của khách “${vuong.ten}”. Hai nhà không dùng chung một số được.` };
      }
    }

    await tx.khachHang.update({
      where: { id },
      data: {
        ten: sach.ten,
        soDienThoai: sach.soDienThoai,
        tinh: sach.tinh,
        ghiChu: sach.ghiChu,
        /*
          Mã khách đi theo số điện thoại — nhưng CHỈ đổi khi nhà này vốn đã lấy
          số làm mã. 24/2.125 nhà bên AppSheet mang mã kiểu khác (đo 13/11/2026);
          đổi mã của họ là cắt đứt đường ghép với hợp đồng bên kia, nên để yên.
        */
        ...(doiSo && cu.maAppSheet === cu.soDienThoai ? { maAppSheet: sach.soDienThoai } : {}),
      },
    });
    return { ok: true as const, ten: sach.ten, doiSo };
  });
}
