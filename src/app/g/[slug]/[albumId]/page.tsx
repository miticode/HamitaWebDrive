import { notFound } from "next/navigation";
import { ROOT_ALBUM } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug, getLists, getMucXong } from "@/lib/store";
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
  const album = tree.albums.find((a) => a.id === wanted);
  if (!album) notFound();

  /*
    Trạng thái "đã chọn xong" của RIÊNG thư mục này. Khách chọn xong thư mục
    đầu rồi sang thư mục thứ hai thì ở đây phải hiện lại lời mời chọn, chứ
    không phải "đã báo xong" của thư mục trước.
  */
  const dsXong = await getMucXong(gallery.id);
  const mucXongLuc = dsXong.find((m) => m.albumId === wanted)?.xongLuc ?? null;

  return (
    <AlbumView
      slug={slug}
      gallery={gallery}
      lists={lists}
      album={album}
      backHref={`/g/${slug}`}
      unlocked={unlocked}
      mucXongLuc={mucXongLuc}
    />
  );
}
