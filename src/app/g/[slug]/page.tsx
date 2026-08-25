import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROOT_ALBUM, STUDIO_NAME } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import type { GalleryTree } from "@/lib/drive";
import { getGalleryBySlug } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { DriveLoi } from "@/components/DriveLoi";
import { LoiChuc } from "@/components/LoiChuc";
import { DemNguoc } from "./DemNguoc";
import { HuongDanChon } from "./HuongDanChon";
import { NutTaiFolder } from "./NutTaiFolder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * Chọn tấm làm ảnh bìa cho trang khách xem.
 *
 * Ưu tiên tấm studio đã chọn ở trang quản lý (`coverFileId`). Trước đây trang
 * này lấy cứng tấm đầu tiên của thư mục đầu tiên, nên anh đổi bìa trong trang
 * quản lý thì thẻ album ở đó đổi mà trang khách mở ra vẫn y nguyên tấm cũ.
 *
 * Vẫn phải đối chiếu tấm đó có thật trong thư mục hay không rồi mới dùng:
 * ảnh nằm trên Drive, studio có thể đã xoá hoặc dời tấm đó đi mà số liệu lưu
 * trong database chưa kịp cập nhật — lúc đó lùi về tấm đầu tiên còn hơn để
 * khách mở ra thấy một ô ảnh vỡ ngay đầu trang.
 */
function chonAnhBia(coverFileId: string | null, tree: GalleryTree) {
  const tatCa = tree.albums.flatMap((a) => a.photos);
  const daChon = coverFileId ? tatCa.find((p) => p.id === coverFileId) : undefined;
  return daChon ?? tree.albums[0]?.photos[0];
}

/**
 * Thẻ xem trước khi gửi link qua Zalo/Facebook: lấy luôn tấm ảnh đầu tiên của
 * album làm ảnh bìa, thay vì để link hiện ra trơ trọi không có gì.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return { title: STUDIO_NAME };

  const title = gallery.clientName ?? gallery.title;

  let cover: string | null = null;
  let total = 0;
  try {
    const tree = await loadTree(gallery.driveFolderId);
    // Cùng tấm bìa với trang album, để thẻ xem trước lúc khách gửi link qua
    // Zalo/Facebook khớp với thứ họ thấy khi bấm vào.
    cover = chonAnhBia(gallery.coverFileId, tree)?.id ?? null;
    total = tree.totalPhotos;
  } catch {
    // Drive lỗi thì vẫn trả về thẻ xem trước dạng chữ, không để trang chết theo.
  }

  const description = total > 0 ? `${total} tấm ảnh · ${STUDIO_NAME}` : STUDIO_NAME;

  return {
    title: `${title} — ${STUDIO_NAME}`,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: cover ? [{ url: `/api/img/${cover}?w=1440`, width: 1440 }] : undefined,
    },
    // Khách hay gửi link cho nhau, không cần Google lập chỉ mục album riêng tư.
    robots: { index: false, follow: false },
  };
}

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const title = gallery.clientName ?? gallery.title;

  /*
    Drive tro chung thi hien man hinh giai thich, khong de trang nem loi.
    Truoc day mot nhip Drive khong phan hoi la khach thay trang "Trang gap truc
    trac" mau do — vua kho hieu vua de tuong studio da xoa mat anh cua ho.

    Chi bat loi cua rieng loadTree; cac buoc khac van de nem nhu cu.
  */
  let tree;
  try {
    tree = await loadTree(gallery.driveFolderId);
  } catch {
    return <DriveLoi tenKhach={title} thuLaiHref={`/g/${slug}`} />;
  }

  /*
    Album chi co MOT thu muc van hien trang bia nay, khong nhay thang vao luoi
    anh nua.

    Truoc day co nhay thang, voi ly do "bat khach bam qua mot tam bia duy nhat
    chang de lam gi". Nhung nhay thang la bo mat ca trang bia: anh bia lon
    studio da chon, ten khach dat giua, so bo anh va so tam. Do moi la thu
    khach nhin thay dau tien khi mo link — an tuong dau tien ve studio.
  */
  const cover = chonAnhBia(gallery.coverFileId, tree);

  return (
    <main>
      <header className="relative flex min-h-[70svh] items-center justify-center overflow-hidden">
        {cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${cover.id}?w=2048`}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/55" />
          </>
        )}

        <div className="relative w-full px-6 py-24 text-center">
          <Logo size="lg" on={cover ? "dark" : "page"} className="mx-auto" />
          <h1
            className="rule mt-6 font-display text-[2.5rem] leading-[1.08] font-light sm:text-6xl lg:text-7xl"
            style={cover ? { color: "#fff" } : undefined}
          >
            {title}
          </h1>
          <p
            className="mt-7 text-xs tracking-[0.22em] uppercase"
            style={{ color: cover ? "rgba(255,255,255,0.7)" : "var(--fg-muted)" }}
          >
            {tree.albums.length} bộ ảnh · {tree.totalPhotos} tấm
          </p>
        </div>

        {cover && (
          <span
            aria-hidden
            className="absolute bottom-7 left-1/2 -translate-x-1/2 text-2xl text-white/50"
          >
            ↓
          </span>
        )}
      </header>

      {/*
        space-y thay vi div rong co dinh lam khoang cach: DemNguoc va LoiChuc
        co the tu tra ve null (chua/khong dat han, chua tinh xong gio o phia
        khach) — div rong co dinh se de lai mot khoang trong vo nghia truoc
        khoi ke tiep. space-y chi ap margin giua NHUNG PHAN TU THAT SU CO MAT
        trong DOM, tu dong dung neu mot khoi phia truoc khong render gi.
      */}
      <div className="mx-auto max-w-6xl space-y-14 px-5 py-16 sm:space-y-20 sm:px-6 sm:py-24">
        <DemNguoc
          expiresAt={gallery.expiresAt}
          allowDownload={gallery.allowDownload}
        />

        <LoiChuc noiDung={gallery.message} />

        {/*
          Bốn bước hướng dẫn chọn ảnh. Đặt ở trang bìa vì khách luôn đi qua đây
          trước khi vào từng thư mục — đọc xong rồi mới bắt đầu chọn là đúng
          thứ tự, và không choán chỗ của lưới ảnh bên trong.
        */}
        <HuongDanChon
          soAnhTrongGoi={gallery.soAnhTrongGoi}
          giaAnhThem={gallery.giaAnhThem}
        />

        {/*
          Ít mục thì thu hẹp lưới lại và đặt giữa, thay vì để một thẻ đơn độc
          nằm dạt về góc trái với hai phần ba trang bỏ trống bên phải. Album một
          thư mục là chuyện thường gặp — phần lớn buổi chụp chỉ có một bộ.
        */}
        {tree.albums.length === 0 ? (
          <p className="text-center text-sm text-fg-muted">Thư mục này chưa có ảnh nào.</p>
        ) : (
          <div
            className={`grid gap-x-7 gap-y-12 ${
              tree.albums.length === 1
                ? "mx-auto max-w-sm grid-cols-1"
                : tree.albums.length === 2
                  ? "mx-auto max-w-3xl grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {tree.albums.map((album) => (
              <div key={album.id || ROOT_ALBUM} className="text-center">
                {/* Nút tải nằm NGOÀI thẻ Link: để bên trong thì bấm tải sẽ nhảy
                    luôn sang trang xem ảnh. */}
                <Link
                  href={`/g/${slug}/${album.id || ROOT_ALBUM}`}
                  className="group block"
                >
                  <div className="skeleton aspect-[3/4] overflow-hidden rounded-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/img/${album.photos[0].id}?w=960`}
                      alt={album.name}
                      loading="lazy"
                      className="size-full object-cover transition duration-[900ms] ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-normal transition group-hover:text-accent sm:text-3xl">
                    {album.name}
                  </h2>
                </Link>
                <p className="eyebrow mt-2">{album.photos.length} tấm</p>
                {gallery.allowDownload && (
                  <NutTaiFolder
                    slug={slug}
                    ten={album.name}
                    anh={album.photos.map((p) => ({
                      id: p.id,
                      name: p.name,
                      section: p.section,
                    }))}
                    tongByte={album.photos.reduce((tong, p) => tong + p.size, 0)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>
    </main>
  );
}
