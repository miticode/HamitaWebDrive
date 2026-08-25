"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBabyAction, setFeaturedAction } from "./actions";

/**
 * Cho phép đưa ảnh bìa album này lên trang giới thiệu công khai, và chọn nó
 * thuộc mảng nào.
 *
 * Mặc định tắt. Ảnh cưới là ảnh của khách nên phải do studio chủ động chọn
 * từng album một, không tự động lấy hết đưa ra ngoài.
 *
 * Ô chọn mảng chỉ hiện ra SAU KHI đã bật đưa lên trang giới thiệu: album không
 * lên trang thì nó thuộc mảng nào cũng không thay đổi điều gì, hiện ra chỉ tổ
 * làm người dùng phân vân một lựa chọn vô nghĩa.
 */
export function AnhTieuBieu({
  galleryId,
  featured,
  laBaby,
  coTheHien,
}: {
  galleryId: string;
  featured: boolean;
  /** Album thuoc mang chup be (Hami Baby) thay vi mang cuoi. */
  laBaby: boolean;
  /** Chua co anh bia thi bat len cung khong hien duoc gi. */
  coTheHien: boolean;
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();

  const doiHien = () =>
    start(async () => {
      await setFeaturedAction(galleryId, !featured);
      router.refresh();
    });

  const doiMang = () =>
    start(async () => {
      await setBabyAction(galleryId, !laBaby);
      router.refresh();
    });

  return (
    <div className={coTheHien ? "" : "opacity-50"}>
      <label
        className="flex items-center gap-2 py-2 text-xs"
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
          onChange={doiHien}
          className="size-3.5"
        />
        <span className="text-fg-muted">Đưa ảnh bìa lên trang giới thiệu</span>
      </label>

      {featured && (
        <label
          className="flex items-center gap-2 pb-2 text-xs"
          title="Ảnh sẽ hiện ở khu Hami Baby thay vì khu ảnh cưới"
        >
          {/* Thụt bằng đúng cột nhãn ở trên để thấy rõ đây là lựa chọn phụ thuộc. */}
          <span className="w-24 shrink-0" />
          <input
            type="checkbox"
            checked={laBaby}
            disabled={dangLuu}
            onChange={doiMang}
            className="size-3.5"
          />
          <span className={laBaby ? "text-fg" : "text-fg-muted"}>
            Là ảnh bé — xếp vào khu Hami Baby
          </span>
        </label>
      )}
    </div>
  );
}
