import { ROOT_ALBUM, siteUrl } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { mapLimit } from "@/lib/drive";
import { getGalleryById, updateGalleryMeta } from "@/lib/store";
import { guiChoAlbum, tinCoAnhMoi } from "@/lib/push";

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
  mucMoi: { id: string }[]
): string {
  if (mucMoi.length !== 1) return `/g/${slug}`;
  // id rỗng nghĩa là ảnh nằm ngay thư mục gốc, có mã riêng thay thế trên URL.
  return `/g/${slug}/${mucMoi[0].id || ROOT_ALBUM}`;
}

export async function syncAndWarm(
  galleryId: string,
  folderId: string
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
    0
  );

  await updateGalleryMeta(galleryId, {
    coverFileId: tree.albums[0]?.photos[0]?.id ?? null,
    photoCount: tree.totalPhotos,
    albumCount: tree.albums.length,
    dungLuongMB: Math.round(tongByte / 1024 ** 2),
    subfolders: tenMuc,
  });

  /*
    Có thư mục mới thì báo cho những khách đã đăng ký nhận tin. Chỉ báo khi
    THẬT SỰ có cái mới: studio bấm "Làm mới" mà không thêm gì thì im lặng, chứ
    không làm phiền khách mỗi lần studio kiểm tra lại.

    Lần đồng bộ đầu tiên (truoc.subfolders rỗng vì album vừa tạo) cũng không
    báo — lúc đó chưa ai kịp đăng ký, và cả album đều là mới.

    Nuốt lỗi: gửi tin hỏng thì cũng không được làm hỏng việc đồng bộ số liệu.
  */
  if (mucMoi.length > 0 && truoc && truoc.subfolders.length > 0) {
    const duongDan = duongDanBaoAnhMoi(truoc.slug, mucMoi);

    await guiChoAlbum(
      galleryId,
      tinCoAnhMoi(
        mucMoi.map((a) => a.name),
        duongDan
      )
    ).catch(() => ({ daGui: 0, daXoa: 0 }));
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
