import { cache } from "react";
import { getPrisma } from "@/lib/db";
import { HINH_THUC_THU, LOAI_DV_HD, LY_DO_TRONG_NGAY, NOI_DUNG_THU } from "@/lib/hopDongChung";

/*
  DANH MỤC DÙNG CHUNG — anh yêu cầu 18/11/2026.

  Mỗi danh mục nhỏ của form lập hợp đồng là một `nhom` trong bảng `DanhMuc`.
  Bảng rỗng thì dùng lại bảng cứng trong mã nguồn, y như `LoaiBuoi` và
  `BuocHopDong`: ô chọn không bao giờ được phép trống, kể cả khi chưa ai nhập
  gì vào bảng mới.
*/

export const NHOM = {
  loaiHopDong: "loai-hop-dong",
  hinhThucThu: "hinh-thuc-thu",
  noiDungThu: "noi-dung-thu",
  lyDoTrongNgay: "ly-do-trong-ngay",
} as const;

export type TenNhom = (typeof NHOM)[keyof typeof NHOM];

/** Chữ hiện trên tab và tiêu đề, cùng câu giải thích ngắn. */
export const CHU_NHOM: Record<TenNhom, { ten: string; chu: string }> = {
  [NHOM.loaiHopDong]: {
    ten: "Loại hợp đồng",
    chu: "Hiện trong ô “Loại hợp đồng” lúc lập. Loại nào không giao ảnh thì web không tự tạo album.",
  },
  [NHOM.hinhThucThu]: {
    ten: "Hình thức thu",
    chu: "Hiện trong ô “Hình thức” của phiếu thu.",
  },
  [NHOM.noiDungThu]: {
    ten: "Nội dung thu",
    chu: "Chỉ là GỢI Ý — người lập vẫn gõ nội dung khác được. Đo 18/11: 605 phiếu đang mang nội dung gõ tay ngoài danh sách này.",
  },
  [NHOM.lyDoTrongNgay]: {
    ten: "Lý do chưa có ngày",
    chu: "Hiện khi một dòng lịch chưa điền ngày. Hai lý do khác nhau ở việc phải làm: “chưa chốt ngày” thì gọi nhắc, “đã hoãn” thì phải báo lại ekip đã xếp người.",
  },
};

/** Cột nào của bảng nào đang mang giá trị của nhóm này — dùng để đếm và đổi tên. */
export const COT_DUNG: Record<TenNhom, { bang: "hopDong" | "phieuThu" | "lichChup"; cot: string }> = {
  [NHOM.loaiHopDong]: { bang: "hopDong", cot: "loaiDV" },
  [NHOM.hinhThucThu]: { bang: "phieuThu", cot: "hinhThuc" },
  [NHOM.noiDungThu]: { bang: "phieuThu", cot: "noiDung" },
  [NHOM.lyDoTrongNgay]: { bang: "lichChup", cot: "lyDoTrong" },
};

const CUNG: Record<TenNhom, readonly string[]> = {
  [NHOM.loaiHopDong]: LOAI_DV_HD,
  [NHOM.hinhThucThu]: HINH_THUC_THU,
  [NHOM.noiDungThu]: NOI_DUNG_THU,
  [NHOM.lyDoTrongNgay]: LY_DO_TRONG_NGAY,
};

/** Bảng cứng của nhóm — để trang quản lý nói được "đang dùng mấy giá trị cứng". */
export function bangCung(nhom: TenNhom): readonly string[] {
  return CUNG[nhom];
}

/**
 * Danh sách cho ô chọn: chỉ giá trị đang dùng, bảng rỗng thì lấy bảng cứng.
 *
 * `cache` của React: một lượt dựng trang gọi bao nhiêu lần cũng chỉ hỏi
 * database một lần. Trang lập hợp đồng cần cả ba nhóm cùng lúc, mà nó còn đọc
 * dịch vụ, bước, giá hạng mục — mỗi truy vấn thừa là một lần Neon thức thêm
 * (nguyên tắc 53).
 */
export const docDanhMuc = cache(async (nhom: TenNhom): Promise<string[]> => {
  const ds = await getPrisma().danhMuc.findMany({
    where: { nhom, dangDung: true },
    select: { ten: true },
    orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
  });
  return ds.length > 0 ? ds.map((x) => x.ten) : [...CUNG[nhom]];
});

/** Bốn nhóm cùng một lượt — trang lập hợp đồng cần cả bốn. */
export const docBaDanhMuc = cache(async () => {
  const [loaiHopDong, hinhThucThu, noiDungThu, lyDoTrongNgay] = await Promise.all([
    docDanhMuc(NHOM.loaiHopDong),
    docDanhMuc(NHOM.hinhThucThu),
    docDanhMuc(NHOM.noiDungThu),
    docDanhMuc(NHOM.lyDoTrongNgay),
  ]);
  return { loaiHopDong, hinhThucThu, noiDungThu, lyDoTrongNgay };
});
