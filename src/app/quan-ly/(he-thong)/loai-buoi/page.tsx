import { getPrisma } from "@/lib/db";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { LOAI_LICH } from "@/lib/hopDongChung";
import { BangLoaiBuoi, type DongLoai } from "./BangLoaiBuoi";

export const dynamic = "force-dynamic";

/**
 * LOẠI BUỔI CHỤP — anh yêu cầu 18/11/2026.
 *
 * Trước đó 12 loại nằm cứng trong mã nguồn, muốn thêm một loại phải sửa code
 * rồi đẩy lên. Mà đo 18/11 thì ba loại CÓ THẬT trong dữ liệu lại không có
 * trong bảng cứng ("Chụp sự kiện" 4 buổi, "Chụp chịu lạy" 3, "chụp đầy
 * tháng" 1) — lịch cũ mang chúng nhưng người lập không chọn lại được.
 *
 * Trang này ai cũng xem được, chỉ quản lý mới sửa: danh mục dùng chung cho
 * cả tiệm, và mỗi dòng còn kéo theo mã album.
 */
export default async function LoaiBuoiPage() {
  const nguoi = await batBuocDangNhap();
  const quanLy = laQuanTri(nguoi);
  const prisma = getPrisma();

  const [ds, nhom] = await Promise.all([
    prisma.loaiBuoi.findMany({
      select: { id: true, ten: true, maAlbum: true, dangDung: true },
      orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
    }),
    prisma.lichChup.groupBy({ by: ["loai"], _count: { _all: true } }),
  ]);

  /* Đếm theo CHỮ, vì `LichChup.loai` lưu chữ chứ không lưu id. */
  const dem = new Map(nhom.map((n) => [(n.loai ?? "").toLowerCase(), n._count._all]));
  const dong: DongLoai[] = ds.map((d) => ({
    ...d,
    soBuoi: dem.get(d.ten.toLowerCase()) ?? 0,
  }));

  /* Loại có trong lịch mà không có trong bảng — chính là lỗ hổng cần thấy. */
  const lac = nhom
    .map((n) => ({ ten: n.loai ?? "", so: n._count._all }))
    .filter((x) => x.ten.trim() && !ds.some((d) => d.ten.toLowerCase() === x.ten.toLowerCase()))
    .sort((a, b) => b.so - a.so);

  return (
    <div className="max-w-4xl">
      <p className="eyebrow">Thông tin studio</p>
      <h1 className="mt-2 font-display text-3xl font-light">
        Loại buổi chụp <span className="text-fg-faint tabular-nums">{ds.length}</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-fg-muted">
        Danh sách hiện trong ô “Loại” của phần Lịch chụp. Mã album gắn ở đây quyết định album của
        hợp đồng mang mã gì — “nhà gái” ra HER, “Đính Hôn” ra ĐH.
      </p>

      {ds.length === 0 && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bảng còn rỗng nên web đang dùng {LOAI_LICH.length} loại cứng sẵn có. Chép vào đây thì mới
          sửa được.
        </p>
      )}

      {lac.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {lac.length} loại đang có trong lịch nhưng không có trong danh sách này:
          </p>
          <p className="mt-1">
            {lac.map((x) => `${x.ten} (${x.so} buổi)`).join(" · ")}
          </p>
          <p className="mt-1 text-xs">
            Lịch cũ vẫn đọc được, nhưng người lập không chọn lại được. Thêm vào danh sách nếu còn
            dùng.
          </p>
        </div>
      )}

      <BangLoaiBuoi ds={dong} laQuanLy={quanLy} />
    </div>
  );
}
