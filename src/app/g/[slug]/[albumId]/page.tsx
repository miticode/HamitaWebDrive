import { notFound } from "next/navigation";
import { ROOT_ALBUM } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug, getLists } from "@/lib/store";
import { daMoKhoa } from "@/lib/access";
import { AlbumView } from "../AlbumView";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; albumId: string }> };

export default async function AlbumPage({ params }: Props) {
  const { slug, albumId } = await params;

  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const unlocked = await daMoKhoa(gallery.id, gallery.accessCode);

  const [tree, lists] = await Promise.all([
    loadTree(gallery.driveFolderId),
    getLists(gallery.id),
  ]);

  const wanted = albumId === ROOT_ALBUM ? "" : albumId;
  const album = tree.albums.find((a) => a.id === wanted);
  if (!album) notFound();

  return (
    <AlbumView
      slug={slug}
      gallery={gallery}
      lists={lists}
      album={album}
      backHref={`/g/${slug}`}
      unlocked={unlocked}
    />
  );
}
