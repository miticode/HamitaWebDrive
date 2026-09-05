import { notFound } from "next/navigation";
import { ROOT_ALBUM } from "@/lib/constants";
import { loadTree, loadTreeMoi } from "@/lib/gallery";
import {
  getGalleryBySlug,
  getLists,
  getMucXong,
  getSelections,
} from "@/lib/store";
import { daMoKhoa } from "@/lib/access";
import { DriveLoi } from "@/components/DriveLoi";
import { AlbumView } from "../AlbumView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; albumId: string }> };

export default async function AlbumPage({ params }: Props) {
  const { slug, albumId } = await params;

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const unlocked = await daMoKhoa(gallery.id, gallery.accessCode);

  /*
    Drive tro chung thi hien man hinh giai thich thay vi de trang nem loi —
    giong het trang danh sach muc, xem chu thich o DriveLoi.tsx.
  */
  let tree;
  let lists;
  try {
    [tree, lists] = await Promise.all([
      loadTree(gallery.driveFolderId),
      getLists(gallery.id),
    ]);
  } catch {
    return (
      <DriveLoi
        tenKhach={gallery.clientName ?? gallery.title}
        thuLaiHref={`/g/${slug}/${albumId}`}
      />
    );
  }

  const wanted = albumId === ROOT_ALBUM ? "" : albumId;
  let album = tree.albums.find((a) => a.id === wanted);

  /*
    Khong thay thi ĐỌC LẠI Drive một lần nữa rồi mới kết luận.

    Cache cây thư mục là một Map trong bộ nhớ của TỪNG máy chạy hàm, mà Vercel
    chạy nhiều máy song song. Studio bấm "Làm mới" thì chỉ máy nhận cú bấm đó
    xoá cache; máy khác vẫn giữ cây cũ thêm tới năm phút.

    Đã xảy ra thật (04/09/2026): studio thêm thư mục mới, khách bấm thông báo
    vào thẳng thư mục đó, request rơi vào một máy còn giữ cây cũ — trang trả về
    "không tìm thấy". Thử lại lần nữa thì được, vì rơi vào máy khác. Đúng lúc
    khách vừa được mời vào xem thì lại gặp trang lỗi.

    Chỉ đọc lại khi ĐÃ TÌM MÀ KHÔNG THẤY, nên lượt xem bình thường không tốn
    thêm lời gọi Drive nào. Thư mục thật sự không tồn tại (khách giữ link cũ
    của thư mục đã xoá) thì tốn một lần đọc rồi vẫn về notFound — chấp nhận
    được, vì đó là trường hợp hiếm còn cái trên thì đang xảy ra.
  */
  if (!album) {
    const moi = await loadTreeMoi(gallery.driveFolderId).catch(() => null);
    const timLai = moi?.albums.find((a) => a.id === wanted);
    if (!moi || !timLai) notFound();
    tree = moi;
    album = timLai;
  }

  /*
    Trạng thái "đã chọn xong" của RIÊNG thư mục này. Khách chọn xong thư mục
    đầu rồi sang thư mục thứ hai thì ở đây phải hiện lại lời mời chọn, chứ
    không phải "đã báo xong" của thư mục trước.
  */
  const dsXong = await getMucXong(gallery.id);
  const mucXongLuc = dsXong.find((m) => m.albumId === wanted)?.xongLuc ?? null;

  /*
    Khach da tung chon tam nao trong album nay chua — de quyet dinh bon buoc
    huong dan mo san hay thu lai.

    Doc o MAY CHU chu khong doi danh sach ve o may khach: phia khach bat dau
    voi danh sach rong roi moi tai ve, nen neu quyet dinh o do thi khach da
    chon roi se thay huong dan hien ra roi tu thu lai, keo theo ca trang giat
    mot cai. Doc san o day thi ngay dong HTML dau tien da dung.

    Tinh tren CA album chu khong rieng thu muc dang mo: khach doc huong dan o
    thu muc dau la da biet cach lam, sang thu muc thu hai khong phai doc lai.
  */
  const daTungChon = (await getSelections(gallery.id)).length > 0;

  return (
    <AlbumView
      slug={slug}
      gallery={gallery}
      lists={lists}
      album={album}
      backHref={`/g/${slug}`}
      unlocked={unlocked}
      mucXongLuc={mucXongLuc}
      daTungChon={daTungChon}
      dsMuc={tree.albums.map((a) => ({
        id: a.id,
        ten: a.name,
        soAnh: a.photos.length,
      }))}
    />
  );
}
