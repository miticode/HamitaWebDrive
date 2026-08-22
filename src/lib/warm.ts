import { siteUrl } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { mapLimit } from "@/lib/drive";
import { updateGalleryMeta } from "@/lib/store";

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
export async function syncAndWarm(
  galleryId: string,
  folderId: string
): Promise<void> {
  const tree = await loadTree(folderId);
  await updateGalleryMeta(galleryId, {
    coverFileId: tree.albums[0]?.photos[0]?.id ?? null,
    photoCount: tree.totalPhotos,
    albumCount: tree.albums.length,
    subfolders: tree.albums.map((a) => a.name),
  });
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
