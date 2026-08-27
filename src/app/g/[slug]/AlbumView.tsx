import type { Album } from "@/lib/drive";
import { STUDIO_NAME } from "@/lib/constants";
import type { Gallery, SelectionList } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { GalleryHeader } from "./GalleryHeader";
import { LoiChuc } from "@/components/LoiChuc";
import { DemNguoc } from "./DemNguoc";
import { PhotoGrid } from "./PhotoGrid";
import { HuongDanChon } from "./HuongDanChon";
import { TuLamMoi } from "./TuLamMoi";
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
  mucXongLuc,
  daTungChon,
}: {
  slug: string;
  gallery: Gallery;
  lists: SelectionList[];
  album: Album;
  backHref: string | null;
  unlocked: boolean;
  /** Khách đã báo chọn xong THƯ MỤC NÀY lúc nào — null nếu chưa báo. */
  mucXongLuc: string | null;
  /** Khách đã chọn tấm nào trong album này chưa — quyết định hướng dẫn mở hay thu. */
  daTungChon: boolean;
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
      mucDangXem={{ id: album.id, ten: album.name }}
      mucXongLuc={mucXongLuc}
    >
      {/*
        Cũng cần ở đây, không chỉ trang bìa: thông báo "có ảnh mới" dẫn khách
        vào thẳng thư mục, nên đây mới là trang họ mở lại nhiều nhất.
      */}
      <TuLamMoi />

      <GalleryHeader
        title={backHref ? album.name : galleryTitle}
        backHref={backHref}
        backLabel={galleryTitle}
        total={photos.length}
      />

      <main className="mx-auto w-full max-w-[1700px] px-2 pb-24 sm:px-6">
        {!backHref && (
          <div className="pt-5">
            <DemNguoc
              expiresAt={gallery.expiresAt}
              allowDownload={gallery.allowDownload}
            />
          </div>
        )}

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
        </div>

        {/*
          Bốn bước hướng dẫn đặt ngay đây — trong thư mục con, sát trên lưới
          ảnh. Ban đầu để ở trang bìa với lý do "khách đọc trước rồi mới vào
          chọn", nhưng đây mới là nơi khách thật sự ngồi chọn: đọc xong là làm
          được ngay, không phải nhớ lại từ trang trước. Khách vào thẳng một thư
          mục qua link cũng thấy đủ hướng dẫn.

          Nó thay luôn dòng chữ nhỏ trước đây, vì hai bước đầu đã nói đúng
          những gì dòng đó nói.
        */}
        <HuongDanChon
          soAnhTrongGoi={gallery.soAnhTrongGoi}
          giaAnhThem={gallery.giaAnhThem}
          daTungChon={daTungChon}
        />

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
