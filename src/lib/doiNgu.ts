import { getPrisma } from "./db";
import { boDau } from "./constants";
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

/**
 * Thứ tự các phòng ban trên trang (anh chốt 25/09/2026). So không dấu, không
 * phân biệt hoa thường vì trong bảng nhân viên chữ mỗi nơi một kiểu ("BAN
 * LÃNH ĐẠO", "Tư Vấn"). Phòng nào không có trong đây thì xếp sau cùng, chứ
 * không rơi mất khỏi trang.
 */
const THU_TU_PHONG = ["ban lanh dao", "media", "makeup", "tu van", "phong vay"];

function hangPhong(phongBan: string): number {
  const i = THU_TU_PHONG.indexOf(boDau(phongBan).trim());
  return i < 0 ? THU_TU_PHONG.length : i;
}

/** Cỡ tối đa của ảnh đại diện sau khi trình duyệt nén (byte). */
export const ANH_TOI_DA = 400 * 1024;

export type ThanhVien = {
  id: string;
  ten: string;
  /**
   * Chữ hiện dưới tên: PHÒNG BAN (anh chốt 25/09/2026 — khách cần biết người
   * này làm mảng nào, chứ chức vụ là chuyện nội bộ). Chưa điền phòng ban thì
   * lấy tên vai trò để dòng này không trống trơn.
   */
  phongBan: string;
  /** Một dòng người đó tự viết. Rỗng thì thôi, không bịa câu thay họ. */
  gioiThieu: string | null;
  /**
   * Lúc ảnh được cập nhật, tính bằng mili giây. null = chưa có ảnh.
   *
   * Trang giới thiệu đính số này vào địa chỉ ảnh: route ảnh cho phép nhớ 5
   * phút, nên đổi ảnh xong mà địa chỉ y như cũ thì khách (và cả studio) còn
   * thấy ảnh cũ — anh báo đúng lỗi này 25/09/2026. Đổi ảnh là số đổi, địa chỉ
   * đổi theo, trình duyệt tải tấm mới ngay.
   */
  anhLuc: number | null;
};

/** Những người đang hiện ở khu Đội ngũ, đúng thứ tự quản lý đã sắp. */
export async function docDoiNgu(): Promise<ThanhVien[]> {
  const ds = await getPrisma().nhanVien.findMany({
    where: { hienTrenTrang: true, dangLam: true },
    orderBy: [{ thuTuHien: "asc" }, { ngayVaoLam: "asc" }, { taoLuc: "asc" }],
    select: {
      id: true,
      ten: true,
      phongBan: true,
      vaiTro: true,
      gioiThieu: true,
      anh: { select: { capNhatLuc: true } },
    },
  });
  /*
    Xếp theo PHÒNG BAN trước, trong mỗi phòng mới theo thứ tự quản lý đã sắp
    (orderBy ở trên đã lo phần đó). Nhờ vậy hai mũi tên ↑ ↓ chỉ xê dịch người
    trong cùng một phòng — đúng thứ studio cần, và cũng là thứ nhìn ra được.
  */
  ds.sort((a, b) => hangPhong(a.phongBan ?? "") - hangPhong(b.phongBan ?? ""));

  return ds.map((n) => ({
    id: n.id,
    ten: n.ten,
    phongBan: n.phongBan?.trim() || TEN_VAI_TRO[laVaiTro(n.vaiTro) ? n.vaiTro : "nhan-vien"],
    gioiThieu: n.gioiThieu?.trim() || null,
    anhLuc: n.anh ? n.anh.capNhatLuc.getTime() : null,
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

/** Một dòng tự giới thiệu. Người nào tự sửa của người đó. */
export async function luuGioiThieu(nhanVienId: string, chu: string): Promise<{ loi?: string }> {
  const gon = chu.trim().replace(/\s+/g, " ");
  if (gon.length > 120) return { loi: "Dòng giới thiệu dài quá (tối đa 120 chữ cái)." };
  const co = await getPrisma().nhanVien.findUnique({ where: { id: nhanVienId }, select: { id: true } });
  if (!co) return { loi: "Không tìm thấy nhân viên." };
  await getPrisma().nhanVien.update({ where: { id: nhanVienId }, data: { gioiThieu: gon || null } });
  return {};
}

/**
 * Đổi chỗ với người liền kề trong khu Đội ngũ rồi đánh số lại cả cụm.
 *
 * Đánh số lại chứ không cộng trừ một số: cộng trừ thì hai người dễ mang cùng
 * một số và thứ tự nhảy lung tung mỗi lần tải lại (bài học từ thứ tự thư mục
 * ở trang giới thiệu).
 */
export async function doiThuTuDoiNgu(nhanVienId: string, len: boolean): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const ds = await prisma.nhanVien.findMany({
    where: { hienTrenTrang: true, dangLam: true },
    orderBy: [{ thuTuHien: "asc" }, { ngayVaoLam: "asc" }, { taoLuc: "asc" }],
    select: { id: true, phongBan: true },
  });
  const i = ds.findIndex((x) => x.id === nhanVienId);
  if (i < 0) return { loi: "Người này chưa hiện trên trang giới thiệu." };
  const j = len ? i - 1 : i + 1;
  if (j < 0 || j >= ds.length) return {};
  /*
    Chỉ đổi chỗ trong CÙNG PHÒNG BAN: thứ tự phòng là cố định (Ban lãnh đạo →
    Media → Makeup → Tư vấn → Phòng váy), đẩy một người sang phòng khác thì
    ngoài trang không thấy gì đổi mà studio lại tưởng nút hỏng.
  */
  if (boDau(ds[i].phongBan ?? "") !== boDau(ds[j].phongBan ?? "")) return {};
  [ds[i], ds[j]] = [ds[j], ds[i]];
  await prisma.$transaction(ds.map((x, k) => prisma.nhanVien.update({ where: { id: x.id }, data: { thuTuHien: k } })));
  return {};
}
