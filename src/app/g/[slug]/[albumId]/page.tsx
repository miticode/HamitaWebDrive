import { notFound } from "next/navigation";
import { ROOT_ALBUM } from "@/lib/constants";
import { loadTree, loadTreeMoi } from "@/lib/gallery";
import {
  getGalleryBySlug,
  getGoiMuc,
  getLists,
  getMucXong,
  getSelections,
} from "@/lib/store";
import { daMoKhoa } from "@/lib/access";
import { ghiMoMuc } from "@/lib/moMuc";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { goiCuaMuc } from "@/lib/anhIn";
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
    Ghi lại LẦN ĐẦU khách mở thư mục này (anh yêu cầu 28/09/2026) — studio xem
    trong nút "Logs" trên thẻ album.

    Bỏ qua lượt của người trong tiệm: studio hay mở link kiểm tra, ghi cả vào
    thì thẻ nào cũng báo "khách đã xem" trong khi khách chưa hề mở.

    Không await kết quả cũng không bắt lỗi ở đây: hàm đó tự nuốt lỗi, và việc
    ghi chép bên lề không được phép làm chậm hay làm hỏng trang của khách.
  */
  if (!(await quyenAlbum())) {
    void ghiMoMuc(gallery.id, wanted, album.name || "Ảnh ngoài thư mục gốc");
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

  /*
    Goi anh cua RIENG thu muc nay.

    Mot nha khach co the chup lam nhieu dot — chup cong truoc, it lau sau moi
    chup cuoi — moi dot mot goi voi so tam in khac nhau (studio yeu cau
    10/09/2026). Thu muc khong dat rieng thi dung con so chung cua album, nen
    phan lon album khong doi gi.

    Doc o day roi truyen xuong, khong de AlbumView tu tra: khoi "Goi anh cua
    anh chi" va khung hoi dap deu can dung mot con so, ma hai cho tu tra rieng
    thi co ngay mot cho lech.
  */
  const soAnhTrongGoi = goiCuaMuc(
    await getGoiMuc(gallery.id),
    wanted,
    gallery.soAnhTrongGoi,
  );

  return (
    <AlbumView
      slug={slug}
      gallery={gallery}
      soAnhTrongGoi={soAnhTrongGoi}
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
