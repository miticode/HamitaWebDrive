"use client";

import { useEffect } from "react";
import { CodeForm } from "./CodeForm";
import { useSelection } from "./Selection";

/**
 * Hỏi mã khi khách bắt đầu chọn ảnh, ở album để chế độ "xem tự do".
 * Xem thì không cần mã, nhưng chọn ảnh thì có — tránh người ngoài chọn bậy
 * vào danh sách in của khách.
 */
export function CodeDialog() {
  const { askingCode, closeCode, onUnlocked, slug } = useSelection();

  useEffect(() => {
    if (!askingCode) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeCode();
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [askingCode, closeCode]);

  if (!askingCode) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={closeCode}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Chọn ảnh</p>
        <h2 className="mt-1.5 font-display text-2xl leading-snug font-light">
          Anh chị nhập mã Hamita đã gửi nhé
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Chỉ cần nhập một lần thôi ạ, sau đó anh chị cứ thoải mái chọn.
        </p>

        <div className="mt-5">
          <CodeForm slug={slug} onDone={onUnlocked} autoFocus />
        </div>

        <button
          type="button"
          onClick={closeCode}
          className="mt-2 w-full py-2 text-xs text-fg-faint transition hover:text-accent"
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
