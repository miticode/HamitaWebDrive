import { getPrisma } from "@/lib/db";

/*
  MỘT ALBUM DÙNG CHUNG CHO NHIỀU HỢP ĐỒNG — anh chốt 27/11/2026.

  Anh muốn mọi ảnh của một khách nằm chung một album, kể cả ảnh chụp cách nhau
  mấy năm. Lý do không phải gọn gàng mà là CÁI APP: mỗi album sinh một
  manifest riêng với `start_url` trỏ đúng album đó, nên hai album là khách
  phải cài hai app. Anh nói: "nếu bắt khách cài app thêm lần nữa thì bất tiện…
  và có lí do để khách luôn nhớ tới Hamita vì lúc nào cũng còn app trên máy".

  Đo 27/11: 243/2.153 khách có từ 2 hợp đồng, một khách có 12 cái.

  CÁI KHÓ KHÔNG PHẢI GẮN, MÀ LÀ PHÂN BIỆT. Album chung chứa thư mục của nhiều
  hợp đồng; khách bấm "đã chọn xong" ở "file gốc baby" thì web phải biết đó là
  hợp đồng Baby chứ không phải hợp đồng CƯỚI nằm cùng album.

  BA PHÉP ĐOÁN ĐỀU KHÔNG DÙNG ĐƯỢC, đã đo:

    · "hợp đồng nào chưa xong" — 80 khách có TỪ HAI hợp đồng cùng đang chạy.
    · "hợp đồng mới nhất" — khách chụp bé xong lại đặt tiếp đám cưới thì cái
      mới nhất chưa chắc là cái đang nói tới.
    · suy theo tên thư mục — "file gốc" trơn chẳng nói lên hợp đồng nào, mà đo
      26/11 thì tên kiểu ấy có thật trong kho.

  Nên web KHÔNG ĐOÁN: thư mục nào thuộc hợp đồng nào được ghi thẳng vào bảng
  `AlbumHopDong.thuMuc` lúc tạo, và chỗ nào chưa ghi thì nói ra thay vì đoán.
*/

/** Một hợp đồng đang dùng album, kèm những thư mục thuộc về nó. */
export type PhanHopDong = {
  hopDongId: string;
  thuMuc: string[];
};

/**
 * Mọi hợp đồng đang dùng album này, kể cả hợp đồng đầu tiên.
 *
 * `Gallery.hopDongId` là hợp đồng ĐẦU TIÊN và vẫn giữ nguyên nghĩa cũ —
 * hàng chục chỗ trong mã nguồn đọc nó. Bảng nối chỉ bổ sung, nên hàm này gom
 * cả hai nguồn và bỏ trùng.
 */
export async function hopDongCuaAlbum(galleryId: string): Promise<PhanHopDong[]> {
  const prisma = getPrisma();
  const [album, noi] = await Promise.all([
    prisma.gallery.findUnique({ where: { id: galleryId }, select: { hopDongId: true } }),
    prisma.albumHopDong.findMany({
      where: { galleryId },
      select: { hopDongId: true, thuMuc: true },
      orderBy: { taoLuc: "asc" },
    }),
  ]);

  const ra: PhanHopDong[] = noi.map((n) => ({ hopDongId: n.hopDongId, thuMuc: n.thuMuc }));
  /* Hợp đồng đầu tiên: thêm vào nếu bảng nối chưa có dòng cho nó. */
  if (album?.hopDongId && !ra.some((x) => x.hopDongId === album.hopDongId)) {
    ra.unshift({ hopDongId: album.hopDongId, thuMuc: [] });
  }
  return ra;
}

/** Vì sao không tìm ra hợp đồng cho một thư mục — để nơi gọi nói đúng câu. */
export type LyDoKhongRo = "chua-gan" | "nhieu-hop-dong" | "khong-khop";

/**
 * Thư mục `tenMuc` của album này thuộc hợp đồng nào.
 *
 * Trả `{ hopDongId }` khi chắc chắn, hoặc `{ lyDo }` khi không — và nơi gọi
 * PHẢI xử lý nhánh `lyDo` bằng cách nói ra, không được đoán bừa: đoán sai là
 * đẩy nhầm tiến độ của một nhà khách khác.
 *
 * Ba cảnh trả về `lyDo`:
 *
 *   · "chua-gan"       album chưa gắn hợp đồng nào.
 *   · "nhieu-hop-dong" album có nhiều hợp đồng mà KHÔNG cái nào nhận thư mục
 *     này. Đây đúng là chỗ phải dừng lại: tên thư mục không đủ để chọn, và
 *     chọn sai thì một nhà khách khác nhảy bước oan.
 *   · "khong-khop"     chỉ một hợp đồng nhưng nó có khai thư mục riêng mà
 *     không có cái này. Hiếm, và vẫn đáng nói ra.
 *
 * ALBUM MỘT HỢP ĐỒNG THÌ KHÔNG HỎI GÌ: đó là 100% album hiện nay, và mọi thư
 * mục trong đó đương nhiên là của hợp đồng duy nhất ấy. Phép này chỉ bắt đầu
 * kén chọn khi album thật sự có từ hai hợp đồng.
 */
export function hopDongCuaMuc(
  ds: readonly PhanHopDong[],
  tenMuc: string,
): { hopDongId: string } | { lyDo: LyDoKhongRo } {
  if (ds.length === 0) return { lyDo: "chua-gan" };

  const nhan = ds.filter((x) => x.thuMuc.includes(tenMuc));
  if (nhan.length === 1) return { hopDongId: nhan[0].hopDongId };
  /*
    Hai hợp đồng cùng khai một thư mục là người gắn nhầm, không phải chuyện
    web giải quyết được — xếp vào "nhiều hợp đồng" để nó hiện ra và được sửa.
  */
  if (nhan.length > 1) return { lyDo: "nhieu-hop-dong" };

  /* Không ai nhận thư mục này. */
  if (ds.length === 1) {
    /* Hợp đồng duy nhất mà chưa khai thư mục nào: cứ là của nó. */
    if (ds[0].thuMuc.length === 0) return { hopDongId: ds[0].hopDongId };
    return { lyDo: "khong-khop" };
  }
  return { lyDo: "nhieu-hop-dong" };
}

/**
 * Ghi nhận một hợp đồng dùng chung album, kèm những thư mục của nó.
 *
 * Gọi lại với cùng cặp album–hợp đồng thì CỘNG THÊM thư mục chứ không ghi đè:
 * một hợp đồng cưới hai ngày sinh ra "file gốc nhà gái" rồi "file gốc nhà
 * trai" ở hai lần khác nhau, ghi đè là lần sau xoá mất lần trước.
 */
export async function themHopDongVaoAlbum(
  galleryId: string,
  hopDongId: string,
  thuMuc: readonly string[] = [],
): Promise<void> {
  const prisma = getPrisma();
  const cu = await prisma.albumHopDong.findUnique({
    where: { galleryId_hopDongId: { galleryId, hopDongId } },
    select: { thuMuc: true },
  });
  const gop = [...new Set([...(cu?.thuMuc ?? []), ...thuMuc.filter(Boolean)])];
  await prisma.albumHopDong.upsert({
    where: { galleryId_hopDongId: { galleryId, hopDongId } },
    create: { galleryId, hopDongId, thuMuc: gop },
    update: { thuMuc: gop },
  });
}

/** Album sẵn có của khách, hoặc lý do không dùng được. */
export type AlbumSanCo =
  | { album: { id: string; slug: string; title: string; driveFolderId: string } }
  | { khong: "khach-moi" | "chua-co-album" | "nhieu-album" };

/**
 * Khách của hợp đồng này đã có album chưa — để lần chụp sau dùng chung.
 *
 * Anh chốt 27/11/2026: mọi ảnh của một khách nằm chung một album, vì mỗi album
 * sinh một app riêng trên máy khách và "bắt khách cài app thêm lần nữa thì bất
 * tiện".
 *
 * CHỈ GỘP KHI KHÁCH CÓ ĐÚNG MỘT ALBUM. Nhiều hơn thì không đoán: chọn nhầm là
 * ảnh cưới của nhà này rơi vào app chứa ảnh bé của nhà khác, mà người lập hợp
 * đồng không thấy gì bất thường để mà sửa. Lúc ấy web tạo album mới như cũ —
 * dở hơn một chút, nhưng không sai.
 *
 * Hợp đồng chưa gắn khách (`khachHangId` trống) cũng không gộp: không có gì
 * nối hai lần chụp với nhau ngoài cái tên, mà tên khách trùng nhau là chuyện
 * có thật trong kho.
 */
export async function albumSanCoCuaKhach(hopDongId: string): Promise<AlbumSanCo> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: { khachHangId: true },
  });
  if (!hd?.khachHangId) return { khong: "khach-moi" };

  /*
    Mọi album của MỌI hợp đồng thuộc khách này, trừ chính hợp đồng đang xét.
    Đọc qua `Gallery.hopDongId` — cột ấy vẫn là hợp đồng đầu tiên của album,
    nên mỗi album xuất hiện đúng một lần.
  */
  const ds = await prisma.gallery.findMany({
    where: { hopDong: { khachHangId: hd.khachHangId, id: { not: hopDongId } } },
    select: { id: true, slug: true, title: true, driveFolderId: true },
    orderBy: { createdAt: "asc" },
  });
  if (ds.length === 0) return { khong: "chua-co-album" };
  if (ds.length > 1) return { khong: "nhieu-album" };
  return { album: ds[0] };
}

/**
 * Thao tác trên album này đang nói về HỢP ĐỒNG NÀO.
 *
 * Một cửa duy nhất cho mọi chỗ đổi bước từ phía album — khách báo chọn xong,
 * studio bấm đã gửi ảnh gốc, media dán link gửi in. Trước 27/11/2026 mọi chỗ
 * ấy đọc thẳng `Gallery.hopDongId`, đúng khi album chỉ có một hợp đồng và SAI
 * HOÀN TOÀN khi album dùng chung: khách bấm "đã chọn xong" ở mục ảnh bé sẽ
 * đẩy bước của hợp đồng cưới.
 *
 * `tenMuc` là thứ quyết định:
 *
 *   · CÓ tên thư mục (khách bấm ở một mục cụ thể) → tra bảng nối, biết chắc.
 *   · KHÔNG có (nút trên thẻ album nói về cả album) → chỉ trả lời được khi
 *     album có đúng một hợp đồng. Nhiều hơn thì nút ấy không đủ thông tin, và
 *     đoán là đẩy nhầm tiến độ của một nhà khác.
 *
 * Trả `{ lyDo }` thì nơi gọi PHẢI nói ra, không được bỏ qua im lặng: người
 * bấm cần biết vì sao bước không đổi.
 */
export async function hopDongChoThaoTac(
  galleryId: string,
  tenMuc?: string | null,
): Promise<{ hopDongId: string } | { lyDo: LyDoKhongRo }> {
  const ds = await hopDongCuaAlbum(galleryId);
  if (ds.length === 0) return { lyDo: "chua-gan" };
  if (ds.length === 1) return { hopDongId: ds[0].hopDongId };
  if (!tenMuc) return { lyDo: "nhieu-hop-dong" };
  return hopDongCuaMuc(ds, tenMuc);
}
