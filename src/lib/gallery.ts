import { cached, invalidate } from "@/lib/cache";
import { getGalleryTree, type GalleryTree } from "@/lib/drive";

/**
 * Doc cay thu muc cua gallery, co cache ngan.
 * 5 phut la doi trong so giua "anh tha folder moi vao Drive thi khach thay ngay"
 * va "khong goi Drive moi lan co nguoi mo trang".
 */
const TTL_MS = 5 * 60 * 1000;

/**
 * `moc` là `Gallery.treeMoc` — lần cuối studio bấm "Làm mới" cho album này.
 *
 * Mọi nơi gọi hàm này đều đã có bản ghi album trong tay (trang khách đọc nó
 * theo slug trước khi đọc cây), nên truyền thêm mốc KHÔNG tốn truy vấn nào.
 * Xem chú thích ở cột `treeMoc` trong schema.
 *
 * Thiếu mốc thì hành vi y như trước: cache chỉ hết theo TTL năm phút.
 */
export function loadTree(folderId: string, moc?: Date | null): Promise<GalleryTree> {
  return cached(
    `tree:${folderId}`,
    TTL_MS,
    () => getGalleryTree(folderId),
    moc ? moc.getTime() : null,
  );
}

/**
 * Doc lai cay tu Drive, BO QUA cache dang co.
 *
 * Vi sao can: cache o tren la mot Map trong bo nho cua TUNG may chay ham, ma
 * Vercel chay nhieu may song song. Studio bam "Lam moi" thi chi may nhan cu bam
 * do moi xoa cache; nhung may khac van giu cay cu them toi nam phut nua.
 *
 * Hau qua da xay ra that (04/09/2026): studio them thu muc moi, khach bam thong
 * bao vao thang thu muc do, request roi vao mot may con giu cay cu — khong thay
 * thu muc nen tra ve "khong tim thay trang". Thu lai lan nua thi duoc, vi roi
 * vao may khac. Cung ban chat voi bay da ghi o rateLimit: dem trong bo nho tren
 * Vercel khong dang tin.
 *
 * TU 19/11/2026 cai goc da duoc chua bang cot `Gallery.treeMoc`: bam "Lam moi"
 * la ghi mot moc vao database, may nao giu cache cu hon moc do thi tu bo. Ham
 * nay VAN GIU, vi no giai mot canh khac — tim mot thu muc ma khong thay, luc do
 * khong ai bam gi ca nen khong co moc nao moi de dua vao.
 *
 * Chi goi khi da tim ma KHONG THAY, khong goi cho moi luot xem: mot lan doc
 * Drive dat hon nhieu so voi doc cache.
 */
export function loadTreeMoi(folderId: string): Promise<GalleryTree> {
  invalidate(`tree:${folderId}`);
  return loadTree(folderId);
}
