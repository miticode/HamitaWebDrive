import { getPrisma } from "./db";
import { TEN_VAI_TRO, laVaiTro } from "./nhanVienChung";

/**
 * Khu "Đội ngũ" trên trang giới thiệu và ảnh đại diện nhân viên — anh yêu cầu
 * 25/09/2026, lấy thẳng từ mục Nhân viên của CRM thay vì gõ lại một danh sách
 * thứ hai.
 *
 * Hai điều phải giữ:
 * - **Mặc định KHÔNG ai lên trang.** Bảng nhân viên là dữ liệu nội bộ (có số
 *   điện thoại, ngày vào làm); đưa ai ra công khai là quyết định của quản lý,
 *   bật từng người một.
 * - **Người đã nghỉ tự rơi khỏi trang** dù cờ còn bật — `dangLam` false là
 *   khách không thấy nữa, khỏi phải nhớ tắt tay.
 */

/** Cỡ tối đa của ảnh đại diện sau khi trình duyệt nén (byte). */
export const ANH_TOI_DA = 400 * 1024;

export type ThanhVien = {
  id: string;
  ten: string;
  /** Chữ hiện dưới tên: chức vụ studio đặt, không có thì lấy tên vai trò. */
  vaiTro: string;
  coAnh: boolean;
};

/** Những người đang hiện ở khu Đội ngũ, đúng thứ tự quản lý đã sắp. */
export async function docDoiNgu(): Promise<ThanhVien[]> {
  const ds = await getPrisma().nhanVien.findMany({
    where: { hienTrenTrang: true, dangLam: true },
    orderBy: [{ thuTuHien: "asc" }, { ngayVaoLam: "asc" }, { taoLuc: "asc" }],
    select: {
      id: true,
      ten: true,
      chucVu: true,
      vaiTro: true,
      anh: { select: { nhanVienId: true } },
    },
  });
  return ds.map((n) => ({
    id: n.id,
    ten: n.ten,
    vaiTro: n.chucVu?.trim() || TEN_VAI_TRO[laVaiTro(n.vaiTro) ? n.vaiTro : "nhan-vien"],
    coAnh: !!n.anh,
  }));
}

/**
 * Lưu ảnh đại diện. `base64` là phần sau "data:image/jpeg;base64," mà trang
 * gửi lên — máy chủ tự giải và tự kiểm cỡ, không tin con số máy khách khai.
 */
export async function luuAnhDaiDien(nhanVienId: string, base64: string): Promise<{ loi?: string }> {
  /*
    Uint8Array<ArrayBuffer> chứ không phải Buffer: Prisma 7 nhận đúng kiểu đó
    cho cột Bytes, còn Buffer của Node khai ArrayBufferLike nên TypeScript từ
    chối. Chép sang mảng mới là có ArrayBuffer thật.
  */
  let duLieu: Uint8Array<ArrayBuffer>;
  try {
    const b = Buffer.from(base64, "base64");
    duLieu = new Uint8Array(new ArrayBuffer(b.length));
    duLieu.set(b);
  } catch {
    return { loi: "Ảnh gửi lên không đọc được." };
  }
  if (duLieu.length === 0) return { loi: "Ảnh gửi lên trống." };
  if (duLieu.length > ANH_TOI_DA) return { loi: "Ảnh nặng quá, anh chị chọn tấm nhỏ hơn giúp em." };
  // Hai byte đầu của mọi tệp JPEG. Chặn ở đây để không ai nhét tệp khác vào.
  if (duLieu[0] !== 0xff || duLieu[1] !== 0xd8) return { loi: "Chỉ nhận ảnh JPEG." };

  const prisma = getPrisma();
  const co = await prisma.nhanVien.findUnique({ where: { id: nhanVienId }, select: { id: true } });
  if (!co) return { loi: "Không tìm thấy nhân viên." };

  await prisma.anhNhanVien.upsert({
    where: { nhanVienId },
    create: { nhanVienId, duLieu },
    update: { duLieu },
  });
  return {};
}

export async function xoaAnhDaiDien(nhanVienId: string): Promise<void> {
  await getPrisma().anhNhanVien.deleteMany({ where: { nhanVienId } });
}

/**
 * Ảnh của một người, kèm việc người đó có đang hiện công khai không — route
 * ảnh cần cả hai để quyết định có trả cho khách lạ hay không.
 */
export async function docAnhNhanVien(nhanVienId: string) {
  const d = await getPrisma().anhNhanVien.findUnique({
    where: { nhanVienId },
    select: { duLieu: true, capNhatLuc: true, nhanVien: { select: { hienTrenTrang: true, dangLam: true } } },
  });
  if (!d) return null;
  return {
    duLieu: Buffer.from(d.duLieu),
    capNhatLuc: d.capNhatLuc,
    congKhai: d.nhanVien.hienTrenTrang && d.nhanVien.dangLam,
  };
}

/** Bật/tắt hiện một người trên trang giới thiệu (chỉ quản lý gọi). */
export async function doiHienTrenTrang(nhanVienId: string, hien: boolean): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const nv = await prisma.nhanVien.findUnique({ where: { id: nhanVienId }, select: { dangLam: true } });
  if (!nv) return { loi: "Không tìm thấy nhân viên." };
  if (hien && !nv.dangLam) return { loi: "Người này đã nghỉ làm, không đưa lên trang được." };
  await prisma.nhanVien.update({ where: { id: nhanVienId }, data: { hienTrenTrang: hien } });
  return {};
}
