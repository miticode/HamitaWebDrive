import { ROOT_ALBUM, siteUrl } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { mapLimit } from "@/lib/drive";
import { getGalleryById, updateGalleryMeta } from "@/lib/store";
import { guiChoAlbum, tinCoAnhMoi, tinThemAnh } from "@/lib/push";
import { docMoc, ghiMoc } from "@/lib/moc";

/**
 * Dung san nhung tam anh khach nhin thay dau tien.
 *
 * Vi sao phai goi qua HTTP chinh minh thay vi goi ham noi bo: cai cache that su
 * cuu duoc khach nam o CDN cua Vercel, chu khong phai o dia cua may chay ham.
 * Chi mot request that di qua CDN moi khien CDN giu lai ban tra ve.
 *
 * Chay trong `after()` nen khach tao link khong phai ngoi cho.
 */

/** Bao nhieu anh dau moi album duoc dung san. */
const PER_ALBUM = 12;
/** Tran tong so anh, de mot gallery 1300 tam khong lam no han muc goi Drive. */
const MAX_PHOTOS = 36;
/** Ngung khi da chay qua nguong nay, tranh cham tran thoi gian cua ham. */
const BUDGET_MS = 45_000;

type Job = { fileId: string; size: number };

/**
 * Chup lai so lieu cua album vao database: anh bia, so anh, ten cac thu muc con.
 * Trang quan tri doc thang tu day nen khong phai goi Drive lan nao.
 */
/**
 * Bấm vào thông báo "có ảnh mới" thì mở tới đâu.
 *
 * Chỉ MỘT thư mục mới thì dẫn thẳng vào đó — khách bấm là thấy ảnh ngay, không
 * phải về trang bìa rồi tự dò xem cái nào mới.
 *
 * Nhiều thư mục cùng lúc thì đưa về trang bìa, vì không có cơ sở nào để chọn
 * giúp khách cái nào; ở trang bìa chúng đều mang chấm "Mới" nên vẫn nhận ra
 * ngay.
 *
 * Tách riêng khỏi syncAndWarm để kiểm chứng được mà không phải chạy cả một
 * lượt đọc Drive.
 */
export function duongDanBaoAnhMoi(
  slug: string,
  mucMoi: { id: string }[],
): string {
  if (mucMoi.length !== 1) return `/g/${slug}`;
  // id rỗng nghĩa là ảnh nằm ngay thư mục gốc, có mã riêng thay thế trên URL.
  return `/g/${slug}/${mucMoi[0].id || ROOT_ALBUM}`;
}

/** Khoá mốc "lần cuối báo khách album này có ảnh mới". */
export function khoaMocBao(galleryId: string): string {
  return `bao-anh-moi:${galleryId}`;
}

/**
 * Khoảng lặng tối thiểu giữa hai lần báo CÙNG một album.
 *
 * Không có nó thì tính năng này thành thứ gây phiền: media đang đổ ảnh dở,
 * studio bấm "Làm mới" ba bốn lần liên tiếp để xem đã lên chưa — mỗi lần là
 * một lần điện thoại khách rung. Sáu tiếng đủ để một buổi upload lắng xuống,
 * mà vẫn kịp báo trong ngày.
 */
export const IM_LANG_MS = 6 * 60 * 60 * 1000;

/** Vì sao đáng báo cho khách. null = lần này im lặng. */
export type LyDoBao =
  | { kieu: "mucMoi"; ten: string[] }
  | { kieu: "themAnh"; soThem: number }
  | null;

/**
 * Có nên báo khách lần này không, và báo vì lẽ gì.
 *
 * Tách thành hàm THUẦN để kiểm chứng được mọi nhánh mà không phải đọc Drive và
 * cũng không bắn tin thật vào điện thoại khách — cùng lý do đã tách
 * `duongDanBaoAnhMoi` ra khỏi `syncAndWarm`.
 *
 * Hai lẽ đáng báo, xếp theo thứ tự ưu tiên:
 *
 * - Có thư mục mới. Rõ ràng nhất, và dẫn khách vào thẳng được.
 * - Số ảnh tăng dù không có thư mục nào mới — media đổ thêm vào thư mục cũ.
 *   Bản đầu bỏ qua trường hợp này và đó là lỗi: đo ngày 03/09/2026 thấy nhà
 *   Thuý An có 1.353 tấm đổ vào thư mục "file gốc ab" đã có sẵn, nhà Như Ý
 *   1.154 tấm — cả hai đều có khách đang bật thông báo mà máy họ im lặng.
 *   Với khách thì "thư mục mới" hay "thêm ảnh vào thư mục cũ" là cùng một
 *   việc: có ảnh mới để xem.
 */
export function quyetDinhBao(input: {
  /** Thư mục vừa xuất hiện lần này. */
  mucMoi: { name: string }[];
  soAnhTruoc: number;
  soAnhSau: number;
  /** Lần cuối đã báo album này. null = chưa lần nào. */
  baoLanCuoi: Date | null;
  bayGio: number;
}): LyDoBao {
  const { mucMoi, soAnhTruoc, soAnhSau, baoLanCuoi, bayGio } = input;

  // Còn trong khoảng lặng thì im, dù có gì mới đi nữa.
  if (baoLanCuoi && bayGio - baoLanCuoi.getTime() < IM_LANG_MS) return null;

  if (mucMoi.length > 0)
    return { kieu: "mucMoi", ten: mucMoi.map((m) => m.name) };

  const soThem = soAnhSau - soAnhTruoc;
  if (soThem > 0) return { kieu: "themAnh", soThem };

  /*
    Ảnh bị BỚT đi thì không báo. Studio dọn bớt ảnh trong thư mục là việc nội
    bộ, nhắn cho khách "vừa có thay đổi" chỉ làm họ lo.
  */
  return null;
}

export async function syncAndWarm(
  galleryId: string,
  folderId: string,
): Promise<void> {
  const tree = await loadTree(folderId);
  const tenMuc = tree.albums.map((a) => a.name);

  /*
    Đọc số liệu CŨ trước khi ghi đè, để biết lần này có thư mục nào vừa xuất
    hiện. So sánh phải làm ở đây — sau khi ghi thì bản cũ mất, không còn gì để
    đối chiếu.
  */
  const truoc = await getGalleryById(galleryId);
  /*
    Giữ cả thư mục chứ không chỉ tên: thông báo cần MÃ thư mục để dẫn khách
    vào thẳng chỗ ảnh mới, chứ thả họ ở trang bìa rồi bắt tự dò xem cái nào
    mới thì mất hết ý nghĩa của việc báo.
  */
  const mucMoi = truoc
    ? tree.albums.filter((a) => !truoc.subfolders.includes(a.name))
    : [];

  /*
    Cong dung luong ngay tai day. Cay thu muc vua doc da mang san kich thuoc
    tung tep, nen phep cong nay khong ton them mot lan goi Drive nao — ma nho
    no trang quan ly moi cong duoc "don album nay giai phong bao nhieu" trong
    khi van khong duoc phep goi Drive (nguyen tac 9).
  */
  const tongByte = tree.albums.reduce(
    (tong, a) => tong + a.photos.reduce((s, p) => s + (p.size || 0), 0),
    0,
  );

  await updateGalleryMeta(galleryId, {
    coverFileId: tree.albums[0]?.photos[0]?.id ?? null,
    photoCount: tree.totalPhotos,
    albumCount: tree.albums.length,
    dungLuongMB: Math.round(tongByte / 1024 ** 2),
    subfolders: tenMuc,
  });

  /*
    Báo cho những khách đã đăng ký nhận tin.

    HAI lẽ đáng báo — có thư mục mới, HOẶC số ảnh tăng dù thư mục vẫn thế. Xem
    `quyetDinhBao()` để biết vì sao lẽ thứ hai là bắt buộc.

    Không cần tự chặn lúc vừa tạo album: `guiChoAlbum` tự thoát khi album chưa
    có phiếu đăng ký nào, mà lúc vừa tạo thì không thể có ai — link còn chưa
    gửi đi. Câu cần hỏi là "có ai muốn nhận tin không"; để chính nó trả lời,
    đừng đoán qua số thư mục cũ.

    Ghi mốc NGAY SAU khi gửi, và chỉ ghi khi thật sự có gửi: mốc là thứ giữ
    khoảng lặng sáu tiếng, ghi cả những lần im lặng thì khoảng lặng tự gia hạn
    mãi và khách không bao giờ nhận được tin nào nữa.

    Nuốt lỗi: gửi tin hỏng thì cũng không được làm hỏng việc đồng bộ số liệu.
  */
  if (truoc) {
    const lyDo = quyetDinhBao({
      mucMoi,
      soAnhTruoc: truoc.photoCount,
      soAnhSau: tree.totalPhotos,
      baoLanCuoi: await docMoc(khoaMocBao(galleryId)).catch(() => null),
      bayGio: Date.now(),
    });

    if (lyDo) {
      const duongDan =
        lyDo.kieu === "mucMoi"
          ? duongDanBaoAnhMoi(truoc.slug, mucMoi)
          : `/g/${truoc.slug}`;

      const kq = await guiChoAlbum(
        galleryId,
        lyDo.kieu === "mucMoi"
          ? tinCoAnhMoi(lyDo.ten, duongDan)
          : tinThemAnh(lyDo.soThem, duongDan),
      ).catch(() => ({ daGui: 0, daXoa: 0 }));

      if (kq.daGui > 0) {
        await ghiMoc(khoaMocBao(galleryId), new Date()).catch(() => {});
      }
    }
  }

  await warmGallery(folderId);
}

export async function warmGallery(folderId: string): Promise<number> {
  const started = Date.now();
  const base = siteUrl();

  const tree = await loadTree(folderId);
  const jobs: Job[] = [];

  tree.albums.forEach((album, albumIndex) => {
    // Anh bia cua album — thu khach nhin thay o trang dau.
    const cover = album.photos[0];
    if (cover) {
      jobs.push({ fileId: cover.id, size: 960 });
      if (albumIndex === 0) jobs.push({ fileId: cover.id, size: 2048 });
    }

    album.photos.slice(0, PER_ALBUM).forEach((photo, i) => {
      jobs.push({ fileId: photo.id, size: 640 });
      // Chi vai tam dau can san ca ban xem to; khach it khi mo den tam thu 7.
      if (i < 6) jobs.push({ fileId: photo.id, size: 1440 });
    });
  });

  const unique = new Map<string, Job>();
  for (const job of jobs.slice(0, MAX_PHOTOS * 2)) {
    unique.set(`${job.fileId}:${job.size}`, job);
  }

  let done = 0;
  await mapLimit([...unique.values()], 4, async (job) => {
    if (Date.now() - started > BUDGET_MS) return;
    try {
      const url = new URL(`/api/img/${job.fileId}`, base);
      url.searchParams.set("w", String(job.size));
      /*
        Khong duoc dat cache: "no-store" o day.
        No gui kem header bao "dung dung cache", khien CDN bo qua va KHONG luu
        lai ban tra ve — tuc la lam dung cai viec minh dang co gang lam.
      */
      const res = await fetch(url);
      if (res.ok) {
        // Phai doc het than phan hoi thi CDN moi luu lai ban day du.
        await res.arrayBuffer();
        done++;
      }
    } catch {
      // Mot tam loi khong anh huong nhung tam con lai.
    }
  });

  return done;
}
