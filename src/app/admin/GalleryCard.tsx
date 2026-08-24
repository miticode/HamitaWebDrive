"use client";

import Link from "next/link";
import { useState } from "react";
import type { Gallery, ListCount } from "@/lib/store";
import { deleteGalleryAction, refreshGalleryAction } from "./actions";
import { AccessControl } from "./AccessControl";
import { CopyLink } from "./CopyLink";
import { CoverPicker } from "./CoverPicker";
import { LoiNhan } from "./LoiNhan";
import { AnhTieuBieu } from "./AnhTieuBieu";
import { ThoiHan } from "./ThoiHan";

function Stat({
  icon,
  value,
  label,
}: {
  icon: "photo" | "folder" | "heart" | "check";
  value: number;
  label: string;
}) {
  const paths = {
    photo: "M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6",
    folder: "M3 7h6l2 2h10v10H3z",
    heart:
      "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",
    check: "M20 6.5 9.2 17.3 4 12.1",
  };
  const colors = {
    photo: "text-fg-faint",
    folder: "text-fg-faint",
    heart: "text-rose-500",
    check: "text-accent",
  };

  return (
    <span className="flex items-center gap-1.5" title={label}>
      <svg
        viewBox="0 0 24 24"
        className={`size-[15px] shrink-0 ${colors[icon]}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[icon]} />
      </svg>
      <span className="tabular-nums">{value}</span>
    </span>
  );
}

export function GalleryCard({
  gallery,
  counts,
}: {
  gallery: Gallery;
  counts: ListCount[];
}) {
  const title = gallery.clientName ?? gallery.title;
  const chuaDongBo = gallery.syncedAt === null;
  const [moChonBia, setMoChonBia] = useState(false);

  return (
    <article className="card group relative flex flex-col overflow-hidden">
      <Link
        href={`/g/${gallery.slug}`}
        className="relative block aspect-[4/3] overflow-hidden bg-bg-soft"
      >
        {gallery.coverFileId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/img/${gallery.coverFileId}?w=640`}
            alt={title}
            loading="lazy"
            className="size-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center px-4 text-center">
            <p className="text-xs text-fg-faint">
              {chuaDongBo
                ? "Đang dựng ảnh bìa… tải lại trang sau ít phút"
                : "Thư mục chưa có ảnh"}
            </p>
          </div>
        )}

        {!gallery.allowDownload && (
          <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] tracking-wider text-white uppercase backdrop-blur">
            Không cho tải
          </span>
        )}
      </Link>

      {/* Nam ngoai the Link o tren de bam khong bi nhay sang trang khach. */}
      <button
        type="button"
        onClick={() => setMoChonBia(true)}
        title="Đổi ảnh bìa"
        className="absolute top-2 right-2 flex min-h-8 items-center gap-1.5 rounded-full bg-black/55 px-3 text-xs text-white backdrop-blur transition hover:bg-black/75"
      >
        <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 5h18v14H3z M3 16l5-5 4 4 3-3 6 6" />
        </svg>
        Đổi bìa
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link
          href={`/g/${gallery.slug}`}
          className="font-display text-xl leading-snug transition group-hover:text-accent"
        >
          {title}
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
          <Stat icon="photo" value={gallery.photoCount} label="Số ảnh" />
          <Stat icon="folder" value={gallery.albumCount} label="Số thư mục con" />
          {counts.map((c) => (
            <Stat
              key={c.listId}
              icon={c.icon}
              value={c.count}
              label={`${c.name} khách đã chọn`}
            />
          ))}
        </div>

        {gallery.subfolders.length > 0 && (
          <p className="mt-2 line-clamp-2 text-xs text-fg-faint">
            {gallery.subfolders.join(" · ")}
          </p>
        )}

        <AccessControl galleryId={gallery.id} code={gallery.accessCode} />

        <LoiNhan galleryId={gallery.id} message={gallery.message} />

        <AnhTieuBieu
          galleryId={gallery.id}
          featured={gallery.featured}
          coTheHien={gallery.coverFileId !== null}
        />

        <ThoiHan
          galleryId={gallery.id}
          createdAt={gallery.createdAt}
          expiresAt={gallery.expiresAt}
        />

        <p className="mt-2 truncate text-xs text-fg-faint">
          /g/{gallery.slug} · {new Date(gallery.createdAt).toLocaleDateString("vi-VN")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <CopyLink path={`/g/${gallery.slug}`} />

          <Link href={`/admin/${gallery.slug}`} className="btn">
            Ảnh khách chọn
          </Link>

          <form action={refreshGalleryAction}>
            <input type="hidden" name="folderId" value={gallery.driveFolderId} />
            <input type="hidden" name="galleryId" value={gallery.id} />
            <button
              className="btn"
              title="Đọc lại thư mục trên Drive và dựng sẵn những tấm ảnh đầu tiên"
            >
              Làm mới
            </button>
          </form>

          <form action={deleteGalleryAction} className="ml-auto">
            <input type="hidden" name="id" value={gallery.id} />
            <button className="btn btn-danger">Xoá</button>
          </form>
        </div>
      </div>

      {moChonBia && (
        <CoverPicker
          galleryId={gallery.id}
          folderId={gallery.driveFolderId}
          title={title}
          coverFileId={gallery.coverFileId}
          coverPinned={gallery.coverPinned}
          onClose={() => setMoChonBia(false)}
        />
      )}
    </article>
  );
}
