import { getPrisma } from "./db";
import { loadTree, loadTreeMoi } from "./gallery";
import { mucHopLe } from "./mucDichVu";
import { tenKhongMa } from "./maAlbum";

/**
 * THƯ MỤC DRIVE GỐC của một dòng giới thiệu — nơi mọi lượt đọc ảnh bắt đầu.
 *
 * Cột `driveFolderId` là nguồn chính từ 24/11/2026, lúc anh cho dán thẳng link
 * thư mục. Ngả về thư mục của album chỉ để phòng một dòng cũ chưa kịp lấp
 * (xem `scripts/lap-drive-folder.mts`).
 *
 * Hết cả hai thì trả chuỗi rỗng, và `loadTree` tự từ chối vì id không hợp lệ —
 * thà hỏng đúng một thẻ còn hơn lặng lẽ đọc cây của album khác.
 */
function thuMucGoc(d: {
  driveFolderId: string | null;
  gallery?: { driveFolderId: string } | null;
}): string {
  return d.driveFolderId ?? d.gallery?.driveFolderId ?? "";
}

/** Một thư mục đã đưa lên trang giới thiệu, đủ để trang quản lý hiện mà không gọi Drive. */
export type ThuMucGioiThieu = {
  id: string;
  nhom: string;
  muc: string;
  /** null = studio dán thẳng link thư mục Drive, không qua album khách nào. */
  galleryId: string | null;
  /** Tên album khách — null với dòng dán thẳng link. */
  tenAlbum: string | null;
  slug: string | null;
  /** Thư mục gốc Drive để đọc cây — ô đổi bìa cần để liệt kê ảnh. */
  driveFolderId: string;
  albumId: string;
  tenMuc: string;
  /** Tên studio đặt để hiện cho khách. null = dùng `tenMuc` đọc từ Drive. */
  tenHien: string | null;
  /** Một dòng giới thiệu cảnh, hiện dưới tên trong lưới. */
  moTa: string | null;
  thuTu: number;
  anhBia: string | null;
  soAnh: number;
};

/** Mọi thư mục đã chọn (trang quản lý). */
export async function docThuMucGioiThieu(): Promise<ThuMucGioiThieu[]> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    // Thứ tự studio tự sắp trước, cùng số thì theo lúc thêm như cũ.
    orderBy: [{ thuTu: "asc" }, { taoLuc: "asc" }],
    include: { gallery: { select: { title: true, clientName: true, slug: true, driveFolderId: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    nhom: d.nhom,
    muc: d.muc,
    galleryId: d.galleryId,
    tenAlbum: d.gallery ? (d.gallery.clientName ?? d.gallery.title) : null,
    slug: d.gallery?.slug ?? null,
    driveFolderId: thuMucGoc(d),
    albumId: d.albumId,
    tenMuc: d.tenMuc,
    tenHien: d.tenHien,
    moTa: d.moTa,
    thuTu: d.thuTu,
    anhBia: d.anhBia,
    soAnh: d.soAnh,
  }));
}

/** Những mục đang có ít nhất một thư mục, của một nhóm. */
export async function mucDangCo(nhom: string): Promise<Set<string>> {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom },
    select: { muc: true },
    distinct: ["muc"],
  });
  return new Set(dong.map((d) => d.muc));
}

/**
 * Lõi chung của hai cách thêm. Tên thư mục, tấm đầu và số ảnh đọc LẠI từ Drive
 * ở máy chủ, không tin số máy khách gửi lên — và đọc lại cũng là cách chắc
 * chắn thư mục đó còn tồn tại thật trong cây này.
 */
async function them(
  nhom: string,
  muc: string,
  driveFolderId: string,
  albumId: string,
  galleryId: string | null,
): Promise<{ loi?: string }> {
  if (!(await mucHopLe(nhom, muc))) return { loi: "Mục không hợp lệ." };

  /*
    Không thấy thư mục trong bản chụp đang có thì đọc lại Drive một lần — studio
    hay vừa tạo thư mục trên Drive xong là vào web thêm ngay, lúc đó cache 5
    phút còn giữ bản chưa có thư mục ấy.
  */
  let tree = await loadTree(driveFolderId);
  let thuMuc = tree.albums.find((a) => a.id === albumId);
  if (!thuMuc) {
    tree = await loadTreeMoi(driveFolderId);
    thuMuc = tree.albums.find((a) => a.id === albumId);
  }
  if (!thuMuc) return { loi: "Không tìm thấy thư mục này trên Drive nữa." };
  if (thuMuc.photos.length === 0) return { loi: "Thư mục này chưa có ảnh nào." };

  const data = { nhom, galleryId, tenMuc: thuMuc.name, soAnh: thuMuc.photos.length };
  await getPrisma().anhGioiThieu.upsert({
    where: { muc_driveFolderId_albumId: { muc, driveFolderId, albumId } },
    create: { muc, driveFolderId, albumId, anhBia: thuMuc.photos[0].id, ...data },
    // Thêm lại thư mục đã có thì KHÔNG đè ảnh bìa studio đã tự chọn.
    update: data,
  });
  return {};
}

/** Thêm một thư mục con của ALBUM KHÁCH vào mục. */
export async function themThuMucGioiThieu(
  nhom: string,
  muc: string,
  galleryId: string,
  albumId: string,
): Promise<{ loi?: string }> {
  const g = await getPrisma().gallery.findUnique({
    where: { id: galleryId },
    select: { driveFolderId: true },
  });
  if (!g) return { loi: "Không tìm thấy album." };
  return them(nhom, muc, g.driveFolderId, albumId, galleryId);
}

/**
 * Thêm một thư mục DRIVE studio dán thẳng link — anh yêu cầu 24/11/2026.
 *
 * Không cần album nào cả. Trước đây muốn đưa thư mục tư liệu của tiệm lên
 * trang giới thiệu thì phải tạo một album giả trỏ tới thư mục cha, rồi album
 * ấy nằm lẫn trong lưới `/admin` cùng gần hai trăm album của khách.
 *
 * `albumId` rỗng nghĩa là lấy chính thư mục đã dán (ảnh nằm ngay trong nó);
 * khác rỗng là một thư mục con của nó.
 */
export async function themThuMucTuDrive(
  nhom: string,
  muc: string,
  driveFolderId: string,
  albumId: string,
): Promise<{ loi?: string }> {
  return them(nhom, muc, driveFolderId, albumId, null);
}

/**
 * Đổi ảnh bìa của một thư mục. Kiểm ở máy chủ rằng tấm ảnh nằm ĐÚNG trong thư
 * mục đó — không thì ai gọi thẳng action cũng gắn được một tấm bất kỳ trên
 * Drive của studio (kể cả ảnh riêng của nhà khác) lên trang công khai.
 */
export async function doiBiaThuMucGioiThieu(id: string, fileId: string): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const d = await prisma.anhGioiThieu.findUnique({
    where: { id },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  if (!d) return { loi: "Thư mục này đã bị gỡ khỏi trang." };
  const goc = thuMucGoc(d);

  const coAnh = async (docLai: boolean) => {
    const tree = docLai ? await loadTreeMoi(goc) : await loadTree(goc);
    return !!tree.albums.find((a) => a.id === d.albumId)?.photos.some((p) => p.id === fileId);
  };

  /*
    Không thấy thì ĐỌC LẠI Drive một lần rồi mới kết luận — anh vấp thật
    23/09/2026: vừa kéo ảnh vào thư mục "lâu đài" trên Drive xong, ô đổi bìa
    còn hiện ảnh của bản chụp cũ (cache 5 phút), bấm chọn thì máy chủ đọc bản
    mới và báo "Ảnh này không nằm trong thư mục" — nghe như web hỏng, thật ra
    chỉ là hai lượt đọc lệch nhau vài phút.

    Chỉ đọc lại khi KHÔNG THẤY, không đọc cho mọi lượt bấm: một lần gọi Drive
    đắt hơn nhiều so với đọc cache (cùng lý do đã ghi ở `loadTreeMoi`).
  */
  if (!(await coAnh(false)) && !(await coAnh(true))) {
    return {
      loi: "Ảnh này không còn trong thư mục — có thể vừa có thay đổi trên Drive. Đóng ô này, bấm “Đọc lại từ Drive” trên thẻ rồi mở lại.",
    };
  }

  await prisma.anhGioiThieu.update({ where: { id }, data: { anhBia: fileId } });
  return {};
}

export async function xoaThuMucGioiThieu(id: string): Promise<void> {
  await getPrisma().anhGioiThieu.deleteMany({ where: { id } });
}

export type AnhCongKhai = { id: string; width: number | null; height: number | null };

/**
 * Các thư mục của một mục, cho trang /dich-vu/<nhóm>/<mục>. CHỈ đọc database —
 * tên và tấm bìa đã lưu lúc chọn — nên trang mở nhanh, không đợi Drive.
 */
export async function docThuMucCongKhai(nhom: string, muc: string) {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom, muc },
    // Thứ tự studio tự sắp (anh yêu cầu 23/09/2026), cùng số thì theo lúc thêm.
    orderBy: [{ thuTu: "asc" }, { taoLuc: "asc" }],
    include: { gallery: { select: { title: true, clientName: true } } },
  });
  return dong.map((d) => ({
    id: d.id,
    /*
      Tên hiện cho khách, theo thứ tự ưu tiên:
      1. Tên studio tự đặt ở trang quản lý — thứ duy nhất được gõ CHO KHÁCH ĐỌC.
      2. TÊN THƯ MỤC TRÊN DRIVE (anh yêu cầu 25/09/2026). Hôm 23/09 chỗ này lấy
         tên album vì thư mục hay mang tên nội bộ kiểu "All View HamitaGarden";
         nhưng từ khi anh chia Hamita Garden theo cảnh thì tên thư mục CHÍNH LÀ
         tên cảnh ("Lâu Đài", "Tiệc Rượu Đài Phun"), mà lấy tên album thì mười
         cảnh đều ra "Hamita Garden" giống hệt nhau. Để trống ô tên cảnh là tên
         tự chạy theo Drive: đổi tên thư mục rồi bấm "Đọc lại từ Drive" là xong.
      3. Ảnh nằm ngay thư mục gốc (tenMuc rỗng) thì mới lấy tên album.
    */
    ten: d.tenHien?.trim() || d.tenMuc.trim() || tenKhongMa(d.gallery?.clientName ?? d.gallery?.title ?? ""),
    moTa: d.moTa?.trim() || null,
    anhBia: d.anhBia,
    soAnh: d.soAnh,
  }));
}

/**
 * Một thư mục và TOÀN BỘ ảnh trong đó, đọc thẳng Drive (cache 5 phút chung với
 * trang khách). null = không có thư mục này trong nhóm. Drive lỗi thì ném —
 * trang tự bắt (nguyên tắc 19).
 */
export async function docAnhThuMuc(nhom: string, id: string) {
  const d = await getPrisma().anhGioiThieu.findFirst({
    where: { id, nhom },
    include: { gallery: { select: { title: true, clientName: true, driveFolderId: true } } },
  });
  if (!d) return null;
  const tree = await loadTree(thuMucGoc(d));
  const anh: AnhCongKhai[] = (tree.albums.find((a) => a.id === d.albumId)?.photos ?? []).map((p) => ({
    id: p.id,
    width: p.width,
    height: p.height,
  }));
  return {
    muc: d.muc,
    // Cùng thứ tự ưu tiên với lưới ngoài: tên studio đặt → tên thư mục Drive →
    // tên album (xem chú thích ở `docThuMucCongKhai`).
    ten: d.tenHien?.trim() || d.tenMuc.trim() || tenKhongMa(d.gallery?.clientName ?? d.gallery?.title ?? ""),
    anh,
  };
}

/**
 * Ảnh thật của cả một nhóm, gom qua mọi thư mục đã chọn — cho khu phim trường
 * ở trang chủ (khoe nhiều góc chụp, không chỉ tấm bìa). Đọc Drive, cache 5 phút
 * chung với trang khách; thư mục nào Drive lỗi thì bỏ qua (nguyên tắc 19).
 */
export async function docAnhNhom(nhom: string) {
  const dong = await getPrisma().anhGioiThieu.findMany({
    where: { nhom },
    orderBy: { taoLuc: "asc" },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  const phan = await Promise.all(
    dong.map(async (d) => {
      try {
        const tree = await loadTree(thuMucGoc(d));
        return tree.albums.find((a) => a.id === d.albumId)?.photos ?? [];
      } catch {
        return [];
      }
    }),
  );
  return phan.flat();
}

/**
 * Đặt tên hiện và mô tả cho một thư mục đã đưa lên trang — anh yêu cầu
 * 23/09/2026 cho Hamita Garden, nơi mỗi thư mục là một cảnh chụp.
 *
 * Để trống thì lưu `null` chứ không lưu chuỗi rỗng: chỗ đọc chỉ cần hỏi "có
 * hay không", khỏi phải nhớ thêm một dạng rỗng thứ hai.
 */
export async function datTenThuMucGioiThieu(
  id: string,
  tenHien: string,
  moTa: string,
): Promise<{ loi?: string }> {
  const ten = tenHien.trim();
  const mo = moTa.trim();
  if (ten.length > 80) return { loi: "Tên cảnh dài quá, tối đa 80 ký tự." };
  if (mo.length > 200) return { loi: "Mô tả dài quá, tối đa 200 ký tự." };

  const co = await getPrisma().anhGioiThieu.updateMany({
    where: { id },
    data: { tenHien: ten || null, moTa: mo || null },
  });
  return co.count === 0 ? { loi: "Thư mục này đã bị gỡ khỏi trang." } : {};
}

/**
 * Đổi chỗ một thư mục với thư mục đứng liền kề trong cùng mục.
 *
 * Đổi CHỖ hai dòng chứ không phải cộng trừ một số: cộng trừ thì hai dòng dễ
 * mang cùng một số rồi thứ tự nhảy lung tung mỗi lần tải lại. Đổi chỗ thì sau
 * mỗi lần bấm, danh sách luôn là một dãy số rõ ràng.
 */
export async function doiThuTuThuMuc(id: string, len: boolean): Promise<{ loi?: string }> {
  const prisma = getPrisma();
  const d = await prisma.anhGioiThieu.findUnique({ where: { id } });
  if (!d) return { loi: "Thư mục này đã bị gỡ khỏi trang." };

  const ds = await prisma.anhGioiThieu.findMany({
    where: { nhom: d.nhom, muc: d.muc },
    orderBy: [{ thuTu: "asc" }, { taoLuc: "asc" }],
    select: { id: true },
  });
  const i = ds.findIndex((x) => x.id === id);
  const j = len ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ds.length) return {};

  // Đánh số lại cả cụm theo thứ tự mới — rẻ (vài dòng) mà luôn sạch.
  const moi = [...ds];
  [moi[i], moi[j]] = [moi[j], moi[i]];
  await prisma.$transaction(
    moi.map((x, k) => prisma.anhGioiThieu.update({ where: { id: x.id }, data: { thuTu: k } })),
  );
  return {};
}

/**
 * Đọc lại thư mục trên Drive: cập nhật số ảnh và tên thư mục.
 *
 * Studio up thêm ảnh vào thư mục thì con số trên trang vẫn là con số chụp lúc
 * thêm — anh cần một nút để không phải gỡ ra thêm lại. Ảnh bìa GIỮ NGUYÊN nếu
 * tấm đó còn trong thư mục: đó là tấm studio đã chọn tay.
 */
export async function docLaiThuMucGioiThieu(id: string): Promise<{ loi?: string; soAnh?: number }> {
  const prisma = getPrisma();
  const d = await prisma.anhGioiThieu.findUnique({
    where: { id },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  if (!d) return { loi: "Thư mục này đã bị gỡ khỏi trang." };

  /*
    Nút này SINH RA để đọc lại, nên bỏ qua cache — dùng `loadTree` thì studio
    vừa up ảnh xong bấm vào vẫn ra con số cũ suốt năm phút, đúng thứ nút này
    định chữa.
  */
  const tree = await loadTreeMoi(thuMucGoc(d));
  const thuMuc = tree.albums.find((a) => a.id === d.albumId);
  if (!thuMuc) return { loi: "Không tìm thấy thư mục này trên Drive nữa." };
  if (thuMuc.photos.length === 0) return { loi: "Thư mục này giờ không còn ảnh nào." };

  const biaConDo = d.anhBia && thuMuc.photos.some((p) => p.id === d.anhBia);
  await prisma.anhGioiThieu.update({
    where: { id },
    data: {
      tenMuc: thuMuc.name,
      soAnh: thuMuc.photos.length,
      anhBia: biaConDo ? d.anhBia : thuMuc.photos[0].id,
    },
  });
  return { soAnh: thuMuc.photos.length };
}

/**
 * Đọc lại Drive cho CẢ MỘT MỤC — anh yêu cầu 25/09/2026: chia cảnh trên Drive
 * xong muốn biết ngay thư mục mới đã sang tới web chưa, chứ không phải bấm
 * từng thẻ (mà thư mục mới thì chưa có thẻ nào để mà bấm).
 *
 * Mỗi album đọc Drive ĐÚNG MỘT LẦN dù mục có mười thẻ cùng album — một lượt
 * đọc Drive đắt hơn nhiều so với đọc cache, và đây là nút người ta bấm liên
 * tục lúc đang up ảnh.
 *
 * Trả về: `capNhat` là số thẻ có gì đó đổi (tên thư mục, số ảnh, bìa đã mất),
 * `soMoi` là số thư mục có ảnh trên Drive mà CHƯA đưa lên trang — con số anh
 * cần để biết bấm "Thêm vào trang giới thiệu" hay thôi.
 */
export async function docLaiCaMuc(
  nhom: string,
  muc: string,
): Promise<{ loi?: string; capNhat?: number; soMoi?: number }> {
  const prisma = getPrisma();
  const dong = await prisma.anhGioiThieu.findMany({
    where: { nhom, muc },
    include: { gallery: { select: { driveFolderId: true } } },
  });
  if (dong.length === 0) return { capNhat: 0, soMoi: 0 };

  /*
    Gom theo THƯ MỤC GỐC, không theo album nữa: từ 24/11/2026 một dòng có thể
    không thuộc album nào, mà hai dòng cùng thư mục gốc thì vẫn chỉ cần đọc
    Drive một lượt — đúng điều đoạn chú thích trên nói tới.
  */
  const goc = new Set(dong.map(thuMucGoc).filter(Boolean));
  let capNhat = 0;
  let soMoi = 0;

  for (const driveFolderId of goc) {
    const tree = await loadTreeMoi(driveFolderId);
    const cua = dong.filter((d) => thuMucGoc(d) === driveFolderId);
    const daCo = new Set(cua.map((d) => d.albumId));
    soMoi += tree.albums.filter((a) => a.photos.length > 0 && !daCo.has(a.id)).length;

    for (const d of cua) {
      const thuMuc = tree.albums.find((a) => a.id === d.albumId);
      // Thư mục biến mất khỏi Drive thì để yên: studio tự quyết gỡ hay không,
      // xoá giùm là mất luôn tên và mô tả đã gõ.
      if (!thuMuc || thuMuc.photos.length === 0) continue;
      const biaConDo = d.anhBia && thuMuc.photos.some((p) => p.id === d.anhBia);
      const anhBia = biaConDo ? d.anhBia : thuMuc.photos[0].id;
      if (d.tenMuc === thuMuc.name && d.soAnh === thuMuc.photos.length && d.anhBia === anhBia) continue;
      await prisma.anhGioiThieu.update({
        where: { id: d.id },
        data: { tenMuc: thuMuc.name, soAnh: thuMuc.photos.length, anhBia },
      });
      capNhat++;
    }
  }
  return { capNhat, soMoi };
}
