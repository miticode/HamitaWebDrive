"use client";

import Link from "next/link";
import { useState } from "react";
import type { BiaMuc, Gallery, ListCount, MucXong } from "@/lib/store";
import { refreshGalleryAction } from "./actions";
import { AccessControl } from "./AccessControl";
import { CopyLink } from "./CopyLink";
import { CoverPicker } from "./CoverPicker";
import { LoiNhan } from "./LoiNhan";
import { TenAlbum } from "./TenAlbum";
import { GoiAnh } from "./GoiAnh";
import { NutLamMoi } from "./NutLamMoi";
import { AnhTieuBieu } from "./AnhTieuBieu";
import { ThoiHan } from "./ThoiHan";
import { XoaAlbumDialog } from "./XoaAlbumDialog";

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
  mucXong,
  biaMuc,
}: {
  gallery: Gallery;
  counts: ListCount[];
  /** Các thư mục khách đã báo chọn xong của album này. */
  mucXong: MucXong[];
  /** Ảnh bìa riêng từng thư mục của album này. */
  biaMuc: BiaMuc[];
}) {
  const title = gallery.clientName ?? gallery.title;
  const chuaDongBo = gallery.syncedAt === null;
  const [moChonBia, setMoChonBia] = useState(false);
  const [moXoa, setMoXoa] = useState(false);

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
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <TenAlbum
            galleryId={gallery.id}
            slug={gallery.slug}
            ten={title}
            tenThuMuc={gallery.title}
          />

          {/*
            Mỗi thư mục khách báo xong là một nhãn riêng. Trước đây chỉ có một
            nhãn "Đã chọn xong" cho cả album, nên album năm sáu thư mục thì
            studio không biết khách mới xong cái nào — mà đó lại chính là thứ
            cần biết để bắt tay làm.
          */}
          {mucXong.length > 0 && (
            <div className="flex shrink-0 flex-wrap items-center gap-1.5">
              {mucXong.map((m) => (
                <span
                  key={m.albumId}
                  title={`Khách báo xong thư mục "${m.tenMuc}" lúc ${new Date(
                    m.xongLuc
                  ).toLocaleString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "2-digit",
                  })}`}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700"
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
                  {/*
                    Nhan PHAI mang chu "Da chon xong", khong chi ten thu muc.

                    Truoc day nhan chi ghi "file gốc" — y nghia nam trong
                    tooltip, phai RE CHUOT moi thay. Tren dien thoai khong re
                    duoc, ma day lai la thu studio can liec mot cai la biet:
                    nha nao xong roi, san sang giao in.

                    Album mot thu muc thi bo ten di: da biet la album nao roi,
                    them ten thu muc chi lam nhan dai ra ma khong noi them gi.
                    Album nhieu thu muc thi ten la phan quan trong nhat — no
                    tra loi "xong CAI NAO trong tam cai".
                  */}
                  <span className="max-w-[12rem] truncate">
                    {gallery.albumCount > 1 ? `Xong · ${m.tenMuc}` : "Đã chọn xong"}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

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

        {/*
          Bon dong cai dat gop vao mot khung, cung do rong nhan (w-24 o tung
          component con) de thang cot — truoc day moi thu tu them mot dong
          rieng voi mt-2 cua rieng no, xep chong len nhau khong thang hang,
          nhin nhu mot danh sach roi rac thay vi mot bang cai dat.
        */}
        <div className="mt-3 divide-y divide-line rounded-md border border-line px-3">
          <AccessControl galleryId={gallery.id} code={gallery.accessCode} />
          <LoiNhan galleryId={gallery.id} message={gallery.message} />
          <ThoiHan
            galleryId={gallery.id}
            createdAt={gallery.createdAt}
            expiresAt={gallery.expiresAt}
          />
          <GoiAnh
            galleryId={gallery.id}
            soAnhTrongGoi={gallery.soAnhTrongGoi}
            giaAnhThem={gallery.giaAnhThem}
          />
          <AnhTieuBieu
            galleryId={gallery.id}
            featured={gallery.featured}
            khuHienTai={gallery.khuGioiThieu}
            coTheHien={gallery.coverFileId !== null}
          />
        </div>

        <p className="mt-3 truncate text-xs text-fg-faint">
          /g/{gallery.slug} · {new Date(gallery.createdAt).toLocaleDateString("vi-VN")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <CopyLink
            path={`/g/${gallery.slug}`}
            code={gallery.accessCode}
            expiresAt={gallery.expiresAt}
          />

          <Link href={`/admin/${gallery.slug}`} className="btn">
            Ảnh khách chọn
          </Link>

          <form action={refreshGalleryAction}>
            <input type="hidden" name="folderId" value={gallery.driveFolderId} />
            <input type="hidden" name="galleryId" value={gallery.id} />
            {/* Nút nằm trong component riêng để đọc được trạng thái của form. */}
            <NutLamMoi />
          </form>

          <button
            type="button"
            onClick={() => setMoXoa(true)}
            title={`Xoá album "${title}"`}
            className="btn btn-danger ml-auto"
          >
            Xoá
          </button>
        </div>
      </div>

      {moXoa && (
        <XoaAlbumDialog
          galleryId={gallery.id}
          ten={title}
          onDong={() => setMoXoa(false)}
        />
      )}

      {moChonBia && (
        <CoverPicker
          galleryId={gallery.id}
          folderId={gallery.driveFolderId}
          title={title}
          coverFileId={gallery.coverFileId}
          coverPinned={gallery.coverPinned}
          biaMuc={biaMuc}
          onClose={() => setMoChonBia(false)}
        />
      )}
    </article>
  );
}
