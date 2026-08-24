"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setFeaturedAction } from "./actions";

/**
 * Cho phép đưa ảnh bìa album này lên trang giới thiệu công khai.
 *
 * Mặc định tắt. Ảnh cưới là ảnh của khách nên phải do studio chủ động chọn
 * từng album một, không tự động lấy hết đưa ra ngoài.
 */
export function AnhTieuBieu({
  galleryId,
  featured,
  coTheHien,
}: {
  galleryId: string;
  featured: boolean;
  /** Chua co anh bia thi bat len cung khong hien duoc gi. */
  coTheHien: boolean;
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();

  const doi = () =>
    start(async () => {
      await setFeaturedAction(galleryId, !featured);
      router.refresh();
    });

  return (
    <label
      className={`flex items-center gap-2 py-2 text-xs ${
        coTheHien ? "" : "opacity-50"
      }`}
      title={
        coTheHien
          ? "Ảnh bìa album này sẽ hiện ở trang giới thiệu"
          : "Album chưa có ảnh bìa nên chưa hiện được"
      }
    >
      <span className="w-24 shrink-0 text-fg-muted">Trang giới thiệu</span>
      <input
        type="checkbox"
        checked={featured}
        disabled={dangLuu || !coTheHien}
        onChange={doi}
        className="size-3.5"
      />
      <span className="text-fg-muted">Đưa ảnh bìa lên trang giới thiệu</span>
    </label>
  );
}
