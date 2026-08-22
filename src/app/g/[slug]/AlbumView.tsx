import type { Album } from "@/lib/drive";
import { STUDIO_NAME } from "@/lib/constants";
import type { Gallery, SelectionList } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { GalleryHeader } from "./GalleryHeader";
import { LoiChuc } from "@/components/LoiChuc";
import { PhotoGrid } from "./PhotoGrid";
import { CodeDialog } from "./CodeDialog";
import { SelectionProvider } from "./Selection";

/**
 * Luoi anh cua mot muc.
 * Dung chung cho ca truong hop gallery chi co mot muc (hien thang o trang goc,
 * khong bat khach bam qua mot tam bia thua) lan truong hop nhieu muc.
 */
export function AlbumView({
  slug,
  gallery,
  lists,
  album,
  backHref,
  unlocked,
}: {
  slug: string;
  gallery: Gallery;
  lists: SelectionList[];
  album: Album;
  backHref: string | null;
  unlocked: boolean;
}) {
  const photos = album.photos.map((p) => ({
    id: p.id,
    name: p.name,
    width: p.width,
    height: p.height,
  }));

  const galleryTitle = gallery.clientName ?? gallery.title;

  return (
    <SelectionProvider
      slug={slug}
      allowDownload={gallery.allowDownload}
      unlocked={unlocked}
      lists={lists.map((l) => ({ id: l.id, name: l.name, icon: l.icon }))}
      anhTrongMuc={photos}
    >
      <GalleryHeader
        title={backHref ? album.name : galleryTitle}
        backHref={backHref}
        backLabel={galleryTitle}
        total={photos.length}
      />

      <main className="mx-auto w-full max-w-[1700px] px-2 pb-24 sm:px-6">
        <div className="py-10 text-center sm:py-14">
          <Logo size="md" className="mx-auto" />
          <h1 className="rule mt-5 font-display text-3xl leading-tight font-light sm:text-5xl">
            {backHref ? album.name : galleryTitle}
          </h1>
          <p className="eyebrow mt-5">{photos.length} tấm ảnh</p>

          {/* Chi hien o trang goc cua album. Vao tung thu muc con roi ma van
              lap lai loi chuc thi thanh ra sao rong. */}
          {!backHref && (
            <div className="mt-9">
              <LoiChuc noiDung={gallery.message} />
            </div>
          )}
          <p className="mx-auto mt-6 max-w-md px-4 text-sm leading-relaxed text-fg-muted">
            Bấm vào ảnh để xem lớn. Dùng{" "}
            <span className="inline-block size-2 translate-y-px rounded-full bg-rose-500" />{" "}
            để chọn ảnh in và{" "}
            <span className="inline-block size-2 translate-y-px rounded-full bg-accent" />{" "}
            cho những ảnh anh chị muốn giữ riêng. Lựa chọn được lưu tự động.
          </p>
        </div>

        <PhotoGrid photos={photos} album={album.name} />
      </main>

      <CodeDialog />

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>
    </SelectionProvider>
  );
}
