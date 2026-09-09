import type { Album } from "@/lib/drive";
import { STUDIO_NAME, laMucHoanThien } from "@/lib/constants";
import type { Gallery, SelectionList } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { GalleryHeader } from "./GalleryHeader";
import { LoiChuc } from "@/components/LoiChuc";
import { DemNguoc } from "./DemNguoc";
import { PhotoGrid } from "./PhotoGrid";
import { HuongDanChon } from "./HuongDanChon";
import { TuLamMoi } from "./TuLamMoi";
import { CodeDialog } from "./CodeDialog";
import { ChonThuMuc } from "./ChonThuMuc";
import { XacNhanXong } from "./XacNhanXong";
import { SelectionProvider } from "./Selection";
import { HopHoiDap } from "./HopHoiDap";
import { ngayGon } from "@/lib/hoiDap";

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
  dsMuc,
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
  /** Mọi thư mục của album — để nhảy thẳng giữa chúng. Rỗng khi ở trang bìa. */
  dsMuc: { id: string; ten: string; soAnh: number }[];
}) {
  const photos = album.photos.map((p) => ({
    id: p.id,
    name: p.name,
    width: p.width,
    height: p.height,
  }));

  const galleryTitle = gallery.clientName ?? gallery.title;

  /*
    Thư mục ảnh ĐÃ CHỈNH XONG thì khách duyệt để in, không phải chọn — chữ ở
    thanh trên và khối cuối trang đổi theo (studio yêu cầu 09/09/2026). Tính
    MỘT LẦN ở đây rồi truyền xuống cả hai chỗ: hai nơi tự nhận dạng riêng là
    có ngày một nơi đổi luật mà nơi kia không.
  */
  const hoanThien = laMucHoanThien(album.name);

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
        hoanThien={hoanThien}
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
          Hàng thư mục đặt GIỮA tiêu đề và hướng dẫn, không lẫn vào hướng dẫn:
          đây là chuyện "tôi đang ở đâu, đi đâu tiếp", còn ba bước dưới là
          chuyện "chọn ảnh thế nào". Gộp hai thứ vào một khối thì khách phải
          đọc qua hướng dẫn mới thấy đường sang thư mục khác.
        */}
        <ChonThuMuc slug={slug} dsMuc={dsMuc} mucDangMo={album.id} />

        {/*
          Ba bước hướng dẫn đặt ngay đây — trong thư mục con, sát trên lưới
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

        {/*
          Loi moi bao xong dat o CUOI, sau khi khach da xem het anh.
          Thanh tren cung van giu dong "Báo cho Hamita" — hai cho phuc vu hai
          luc khac nhau: thanh tren cho nguoi dang o giua trang muon bao ngay,
          khoi nay cho nguoi vua cuon het thu muc va khong con viec gi khac.
        */}
        <XacNhanXong tenMuc={album.name} hoanThien={hoanThien} />
      </main>

      <CodeDialog />

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>

      {/*
        Khung hỏi đáp nổi ở góc trái dưới. Cần ở ĐÂY chứ không chỉ trang bìa:
        đây mới là trang khách ngồi lâu nhất và là lúc thắc mắc nảy ra —
        "tim với tick khác gì nhau", "chọn xong rồi làm gì".
      */}
      <HopHoiDap
        soAnhTrongGoi={gallery.soAnhTrongGoi}
        giaAnhThem={gallery.giaAnhThem}
        choTaiAnh={gallery.allowDownload}
        hanGiuAnh={ngayGon(gallery.expiresAt)}
      />
    </SelectionProvider>
  );
}
