import { siteUrl } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { mapLimit } from "@/lib/drive";
import { duongDanAnh } from "@/lib/anhXem";
import { updateGalleryMeta } from "@/lib/store";
import { guiChoAlbum, tinAnhMoiChung } from "@/lib/push";

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
/*
  Ở đây từng có `quyetDinhBao()` — hàm tự đoán xem lần đồng bộ này có đáng báo
  cho khách không (thư mục mới, hay số ảnh tăng), kèm khoảng lặng sáu tiếng
  chống bấm "Làm mới" liên tục.

  Bỏ hết ngày 04/09/2026 khi tách thành hai nút. Không phải vì nó sai, mà vì
  câu hỏi nó trả lời không còn ai hỏi nữa: studio tự quyết lúc nào gửi tin, nên
  máy không phải đoán. Giữ lại một cỗ máy đoán mà không ai dùng thì lần sau đọc
  code sẽ tưởng "Làm mới" vẫn gửi tin — đúng cái nhầm lẫn đang muốn dẹp.

  Lịch sử vẫn nằm trong git nếu cần dựng lại.
*/

/**
 * Đọc lại Drive, chụp lại số liệu, dựng sẵn ảnh đầu.
 *
 * KHÔNG gửi thông báo cho khách. Việc đó nay là một nút riêng ở trang quản lý
 * (`guiThongBaoAction`), tách ra theo yêu cầu ngày 04/09/2026: gộp chung thì
 * nhân viên bấm "Làm mới" để xem ảnh đã lên chưa mà không ngờ mỗi cú bấm là
 * một lần điện thoại khách rung. Hai việc khác hẳn nhau về hậu quả — một cái
 * chỉ đụng số liệu trong nhà, một cái chạm tới khách — nên phải là hai nút.
 */
/**
 * CHỈ chụp lại số liệu từ Drive vào database — KHÔNG dựng sẵn ảnh.
 *
 * Tách khỏi `syncAndWarm` ngày 19/11/2026, vì anh báo "bấm Làm mới 4-5 lần
 * mới thấy hình mới". Nguyên nhân là thứ tự chứ không phải Drive chậm:
 * `refreshGalleryAction` đẩy cả cụm vào `after()` rồi gọi `revalidatePath`
 * ngay, nên trang vẽ lại bằng số liệu CŨ trong database trong khi việc đồng
 * bộ mới bắt đầu chạy nền — và phần chạy nền đó có ngân sách tới 45 giây.
 *
 * Hai phần việc khác hẳn nhau về mức độ gấp:
 *   - ĐỌC DRIVE + GHI DATABASE quyết định con số studio nhìn thấy. Đo
 *     19/11 trên album lớn nhất của tiệm (5.170 ảnh, 10 thư mục): 5,1 giây.
 *     Album cỡ trung 490 ảnh: 1,4 giây. Chờ được, và phải chờ.
 *   - DỰNG SẴN ẢNH (`warmGallery`) chỉ làm trang khách mở nhanh hơn, không
 *     đổi con số nào. Để nó chạy nền.
 */
export async function syncGalleryMeta(
  galleryId: string,
  folderId: string,
): Promise<void> {
  const tree = await loadTree(folderId);
  const tenMuc = tree.albums.map((a) => a.name);

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

}

/**
 * Chụp số liệu RỒI dựng sẵn ảnh, cả hai trong một lượt.
 *
 * Chỉ còn dùng cho đường chạy nền hoàn toàn (cron đồng bộ), nơi không có ai
 * ngồi đợi nhìn con số. Nút "Làm mới" KHÔNG dùng hàm này nữa — xem chú thích
 * ở `syncGalleryMeta`.
 */
export async function syncAndWarm(
  galleryId: string,
  folderId: string,
): Promise<void> {
  await syncGalleryMeta(galleryId, folderId);
  await warmGallery(folderId);
}

/**
 * Gửi tin "có ảnh mới" cho những khách đã đăng ký của một album.
 *
 * Đứng riêng khỏi `syncAndWarm` — đây là nút thứ hai ở trang quản lý.
 *
 * Lời nhắn CỐ ĐỊNH và dẫn về TRANG BÌA album, không nêu tên thư mục nào. Bản
 * trước tự dò xem thư mục nào vừa xuất hiện rồi dẫn khách vào thẳng đó, nhưng
 * cách ấy chỉ chạy được khi việc gửi tin đi kèm việc đồng bộ. Tách hai nút ra
 * thì lúc studio bấm gửi, số liệu đã cập nhật xong từ đời nào — không còn gì
 * để so nữa. Dựng lại một kho trạng thái riêng chỉ để giữ "lần trước đã báo
 * tới đâu" là thêm một thứ có thể sai, đổi lấy một dòng chữ.
 *
 * Khách vẫn nhận ra thư mục mới: ở trang bìa, thư mục họ chưa từng mở mang sẵn
 * chấm "Mới" (xem `DauMoi.tsx`).
 *
 * Trả về số máy đã nhận để trang quản lý báo lại cho studio biết tin có đi
 * được hay không — gửi xong mà im lặng thì không ai dám tin là nó đã chạy.
 */
export async function guiThongBaoAnhMoi(
  galleryId: string,
  slug: string,
): Promise<{ daGui: number; daXoa: number }> {
  return guiChoAlbum(galleryId, tinAnhMoiChung(`/g/${slug}`)).catch(() => ({
    daGui: 0,
    daXoa: 0,
  }));
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
      /*
        Đi đúng con đường khách sẽ đi — qua Worker nếu đang bật, qua Vercel
        nếu không. Làm nóng nhầm chỗ thì công toi: dựng sẵn ở Vercel trong
        khi khách lấy ảnh từ Cloudflare là không giúp được ai (28/09/2026).
      */
      const duong = duongDanAnh(job.fileId, job.size);
      const url = duong.startsWith("http") ? new URL(duong) : new URL(duong, base);
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
