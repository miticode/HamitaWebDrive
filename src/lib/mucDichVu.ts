import { getPrisma } from "./db";
import { MUC_MAC_DINH, NHOM_GIOI_THIEU, keyTuTen, type MucGioiThieu, type NhomGioiThieu } from "./nhomGioiThieu";

/**
 * Các mục nhỏ của trang giới thiệu (Dạm ngõ, Đính hôn, Album…) — anh yêu cầu
 * 25/09/2026 được tự tạo thêm trên web, nên danh sách chuyển từ mã nguồn vào
 * database. Nhóm vẫn cố định trong `nhomGioiThieu.ts` vì mỗi nhóm là một thẻ
 * của lưới "Hamita chụp gì?" ở trang chủ.
 *
 * File này gọi Prisma nên CHỈ chạy ở máy chủ (nguyên tắc 43) — trang quản lý
 * nhận danh sách qua props.
 */

/** Ô nhập mã "DN, ĐH" → ["DN", "ĐH"]. Bỏ trùng, bỏ rỗng, giữ nguyên dấu. */
export function tachMa(chuoi: string): string[] {
  const ds = chuoi
    .split(/[,;\s]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
  return [...new Set(ds)];
}

/**
 * Bảng trống thì chép nguyên danh sách cũ vào — chạy đúng một lần trong đời
 * database (kể cả trên web thật, ngay lần mở trang đầu sau khi lên bản mới).
 * Làm ở đây thay vì script rời để không có khoảng thời gian trang giới thiệu
 * mất sạch mục. Hai lượt gọi cùng lúc cũng không nhân đôi: `key` là khoá không
 * trùng và `skipDuplicates` nuốt phần chồng nhau.
 */
async function napLanDau() {
  const prisma = getPrisma();
  if ((await prisma.mucDichVu.count()) > 0) return;
  await prisma.mucDichVu.createMany({
    data: MUC_MAC_DINH.map((m, i) => ({ nhom: m.nhom, key: m.key, ten: m.ten, ma: [...m.ma], thuTu: i })),
    skipDuplicates: true,
  });
}

/** Toàn bộ nhóm kèm mục, đúng thứ tự studio đã sắp. Một lượt hỏi database. */
export async function docNhomCoMuc(): Promise<NhomGioiThieu[]> {
  await napLanDau();
  const dong = await getPrisma().mucDichVu.findMany({
    orderBy: [{ thuTu: "asc" }, { taoLuc: "asc" }],
    select: { id: true, nhom: true, key: true, ten: true, ma: true },
  });
  return NHOM_GIOI_THIEU.map((n) => ({
    key: n.key,
    khu: n.khu,
    ten: n.ten,
    muc: dong.filter((d) => d.nhom === n.key).map(({ id, key, ten, ma }) => ({ id, key, ten, ma })),
  }));
}

/** Một nhóm kèm mục. Key lạ thì trả undefined để trang gọi `notFound()`. */
export async function docNhom(key: string): Promise<NhomGioiThieu | undefined> {
  return (await docNhomCoMuc()).find((n) => n.key === key);
}

/** Một mục trong một nhóm. */
export async function docMuc(nhom: string, muc: string): Promise<MucGioiThieu | undefined> {
  return (await docNhom(nhom))?.muc.find((m) => m.key === muc);
}

/** Mục này có thuộc nhóm này không — dùng để chặn dữ liệu gửi lên từ máy khách. */
export async function mucHopLe(nhom: string, muc: string): Promise<boolean> {
  return !!(await docMuc(nhom, muc));
}

/**
 * Tạo mục mới trong một nhóm. Key sinh từ tên và phải duy nhất TRÊN TOÀN BỘ
 * các nhóm (khoá không trùng của AnhGioiThieu chỉ theo `muc`), nên trùng thì
 * thêm số: "album", "album-2", "album-3"…
 */
export async function themMuc(nhom: string, ten: string, maChuoi: string): Promise<{ loi?: string; key?: string }> {
  const ten2 = ten.trim();
  if (!ten2) return { loi: "Chưa có tên mục." };
  if (ten2.length > 60) return { loi: "Tên mục dài quá, rút ngắn giúp em." };
  if (!NHOM_GIOI_THIEU.some((n) => n.key === nhom)) return { loi: "Nhóm không hợp lệ." };

  const goc = keyTuTen(ten2);
  // "anh" là đường dẫn trang ảnh của thư mục (/dich-vu/[nhom]/anh/[id]) — mục
  // mang key đó sẽ che mất trang kia.
  if (!goc || goc === "anh") return { loi: "Tên mục cần có chữ hoặc số để làm địa chỉ trang." };

  const prisma = getPrisma();
  const daCo = new Set((await prisma.mucDichVu.findMany({ select: { key: true } })).map((m) => m.key));
  let key = goc;
  for (let i = 2; daCo.has(key); i++) key = `${goc}-${i}`;

  const cuoi = await prisma.mucDichVu.findFirst({ where: { nhom }, orderBy: { thuTu: "desc" }, select: { thuTu: true } });
  await prisma.mucDichVu.create({
    data: { nhom, key, ten: ten2, ma: tachMa(maChuoi), thuTu: (cuoi?.thuTu ?? -1) + 1 },
  });
  return { key };
}

/**
 * Đổi tên và mã gợi ý. KEY GIỮ NGUYÊN: nó là địa chỉ trang đã gửi cho khách,
 * và cũng là thứ nối mục với các thư mục đã chọn.
 */
export async function suaMuc(id: string, ten: string, maChuoi: string): Promise<{ loi?: string }> {
  const ten2 = ten.trim();
  if (!ten2) return { loi: "Chưa có tên mục." };
  if (ten2.length > 60) return { loi: "Tên mục dài quá, rút ngắn giúp em." };
  const co = await getPrisma().mucDichVu.findUnique({ where: { id }, select: { id: true } });
  if (!co) return { loi: "Không tìm thấy mục này." };
  await getPrisma().mucDichVu.update({ where: { id }, data: { ten: ten2, ma: tachMa(maChuoi) } });
  return {};
}

/** Đổi chỗ với mục liền kề trong cùng nhóm, rồi đánh số lại cho gọn. */
export async function doiThuTuMuc(id: string, len: boolean): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const m = await prisma.mucDichVu.findUnique({ where: { id }, select: { id: true, nhom: true } });
  if (!m) return { loi: "Không tìm thấy mục này." };

  const ds = await prisma.mucDichVu.findMany({
    where: { nhom: m.nhom },
    orderBy: [{ thuTu: "asc" }, { taoLuc: "asc" }],
    select: { id: true },
  });
  const i = ds.findIndex((x) => x.id === id);
  const j = len ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ds.length) return {};
  [ds[i], ds[j]] = [ds[j], ds[i]];
  await prisma.$transaction(ds.map((x, k) => prisma.mucDichVu.update({ where: { id: x.id }, data: { thuTu: k } })));
  return {};
}

/**
 * Xoá mục. Còn thư mục nào bên trong thì KHÔNG xoá — xoá lặng lẽ là mất công
 * studio đã chọn ảnh, mà những dòng AnhGioiThieu đó cũng thành mồ côi.
 */
export async function xoaMuc(id: string): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const m = await prisma.mucDichVu.findUnique({ where: { id }, select: { key: true, ten: true } });
  if (!m) return { loi: "Không tìm thấy mục này." };

  const so = await prisma.anhGioiThieu.count({ where: { muc: m.key } });
  if (so > 0) {
    return { loi: `Mục “${m.ten}” còn ${so} thư mục. Gỡ hết khỏi trang rồi mới xoá được mục.` };
  }
  await prisma.mucDichVu.delete({ where: { id } });
  return {};
}
