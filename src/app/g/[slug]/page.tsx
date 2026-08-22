import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ROOT_ALBUM, STUDIO_NAME } from "@/lib/constants";
import { loadTree } from "@/lib/gallery";
import { getGalleryBySlug, getLists } from "@/lib/store";
import { Logo } from "@/components/Logo";
import { daMoKhoa } from "@/lib/access";
import { AlbumView } from "./AlbumView";
import { LoiChuc } from "@/components/LoiChuc";
import { NutTaiFolder } from "./NutTaiFolder";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

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
    cover = tree.albums[0]?.photos[0]?.id ?? null;
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

  const unlocked = await daMoKhoa(gallery.id, gallery.accessCode);
  const tree = await loadTree(gallery.driveFolderId);

  // Chi co mot muc thi hien thang luoi anh — bat khach bam qua mot tam bia
  // duy nhat chang de lam gi.
  if (tree.albums.length === 1) {
    const lists = await getLists(gallery.id);
    return (
      <AlbumView
        slug={slug}
        gallery={gallery}
        lists={lists}
        album={tree.albums[0]}
        backHref={null}
        unlocked={unlocked}
      />
    );
  }

  const cover = tree.albums[0]?.photos[0];

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

      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-24">
        <LoiChuc noiDung={gallery.message} />

        <div className="h-14 sm:h-20" />

        {tree.albums.length === 0 && (
          <p className="text-center text-sm text-fg-muted">Thư mục này chưa có ảnh nào.</p>
        )}

        <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>
    </main>
  );
}
