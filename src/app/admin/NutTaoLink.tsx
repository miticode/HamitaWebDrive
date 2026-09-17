"use client";

import { useEffect, useState } from "react";
import { GalleryForm } from "./GalleryForm";

/**
 * Nút "Tạo link mới" ở đầu trang quản lý album, bấm mới mở khung tạo link.
 *
 * Trước 17/09/2026 khung tạo link đứng hẳn một cột 340px bên phải, chiếm chỗ
 * suốt cả lúc không dùng — thẻ album bị ép còn khoảng 235px, chữ gãy dòng, ảnh
 * bìa nhỏ. Anh muốn lưới album to và thoáng như Gump, nên việc tạo link (làm
 * vài lần một ngày) nhường chỗ cho việc xem album (làm cả ngày) và thu vào một
 * nút, giống nút "Tạo" của Gump.
 */
export function NutTaoLink() {
  const [mo, setMo] = useState(false);

  useEffect(() => {
    if (!mo) return;
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMo(false);
    };
    window.addEventListener("keydown", phim);
    // Khoá cuộn trang phía sau, không thì cuộn trong khung lại trôi cả lưới album.
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", phim);
      document.body.style.overflow = cu;
    };
  }, [mo]);

  return (
    <>
      <button type="button" onClick={() => setMo(true)} className="btn-primary min-h-11 gap-2 px-5">
        <span aria-hidden className="text-lg leading-none">+</span>
        Tạo link mới
      </button>

      {mo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tạo link mới"
          onClick={() => setMo(false)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
        >
          {/* Bấm vào chính khung thì không đóng — chỉ bấm ra vùng tối xung quanh mới đóng. */}
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMo(false)}
              aria-label="Đóng"
              className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
            >
              ✕
            </button>
            <GalleryForm />
          </div>
        </div>
      )}
    </>
  );
}
