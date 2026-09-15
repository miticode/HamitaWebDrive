"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteGalleryAction } from "./actions";

/**
 * Hop thoai xac nhan xoa album.
 *
 * Truoc day nut Xoa goi thang server action, khong hoi lai — bam nham la mat
 * album kem toan bo lua chon anh cua khach, khong lay lai duoc. Cung mau voi
 * CodeDialog o trang khach xem anh, de hai noi giong nhau khi dung modal.
 */
export function XoaAlbumDialog({
  galleryId,
  ten,
  onDong,
}: {
  galleryId: string;
  ten: string;
  onDong: () => void;
}) {
  const router = useRouter();
  const [dangXoa, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dangXoa) onDong();
    };
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [onDong, dangXoa]);

  const xacNhanXoa = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", galleryId);
      await deleteGalleryAction(fd);
      router.refresh();
    });

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dangXoa && onDong()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow text-red-700">Xoá album</p>
        <h2 className="mt-1.5 font-display text-2xl leading-snug font-light text-balance">
          Xoá “{ten}”?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Toàn bộ ảnh khách đã thả tim trong album này sẽ mất theo, không lấy
          lại được. Ảnh gốc trên Drive vẫn còn nguyên — chỉ link xem và các lựa
          chọn bị xoá.
        </p>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onDong}
            disabled={dangXoa}
            className="btn flex-1"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={xacNhanXoa}
            disabled={dangXoa}
            className="flex min-h-9 flex-1 items-center justify-center rounded-[3px] bg-red-700 px-4 text-[0.8125rem] font-medium text-white transition hover:bg-red-800 active:scale-[0.98] disabled:opacity-60"
          >
            {dangXoa ? "Đang xoá…" : "Xoá vĩnh viễn"}
          </button>
        </div>
      </div>
    </div>
  );
}
