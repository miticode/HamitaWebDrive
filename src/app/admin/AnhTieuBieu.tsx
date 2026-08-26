"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { KhuGioiThieu } from "@/lib/store";
import { setKhuAction, setFeaturedAction } from "./actions";

/**
 * Cho phép đưa album này lên trang giới thiệu công khai, và chọn nó thuộc khu nào.
 *
 * Mặc định tắt. Ảnh cưới là ảnh của khách nên phải do studio chủ động chọn
 * từng album một, không tự động lấy hết đưa ra ngoài.
 *
 * Ô chọn khu chỉ hiện ra SAU KHI đã bật đưa lên trang giới thiệu: album không
 * lên trang thì nó thuộc khu nào cũng không thay đổi điều gì, hiện ra chỉ tổ
 * làm người dùng phân vân một lựa chọn vô nghĩa.
 *
 * Dùng ô TRÒN chứ không phải ô vuông: ba khu loại trừ nhau, mà ô vuông thì
 * tích được cả "là ảnh bé" lẫn "là phim trường" cùng lúc rồi không ai đoán
 * được album đó hiện ở đâu.
 */

const KHU: { ma: KhuGioiThieu; nhan: string; giaiThich: string }[] = [
  {
    ma: "cuoi",
    nhan: "Ảnh cưới",
    giaiThich: "Ảnh bìa hiện ở khu Ảnh cưới",
  },
  {
    ma: "baby",
    nhan: "Ảnh bé — khu Hami Baby",
    giaiThich: "Ảnh bìa hiện ở khu Hami Baby thay vì khu ảnh cưới",
  },
  {
    ma: "phimtruong",
    nhan: "Phim trường — khu riêng",
    giaiThich:
      "Khu Phim trường lấy NHIỀU ảnh từ trong album này ra, không phải một tấm bìa. Chỉ nên đặt cho một album duy nhất.",
  },
];

export function AnhTieuBieu({
  galleryId,
  featured,
  laBaby,
  laPhimTruong,
  coTheHien,
}: {
  galleryId: string;
  featured: boolean;
  /** Album thuoc mang chup be (Hami Baby). */
  laBaby: boolean;
  /** Album la phim truong cua studio, khong phai anh cua khach. */
  laPhimTruong: boolean;
  /** Chua co anh bia thi bat len cung khong hien duoc gi. */
  coTheHien: boolean;
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();

  const khuHienTai: KhuGioiThieu = laPhimTruong
    ? "phimtruong"
    : laBaby
      ? "baby"
      : "cuoi";

  const doiHien = () =>
    start(async () => {
      await setFeaturedAction(galleryId, !featured);
      router.refresh();
    });

  const doiKhu = (khu: KhuGioiThieu) =>
    start(async () => {
      await setKhuAction(galleryId, khu);
      router.refresh();
    });

  return (
    <div className={coTheHien ? "" : "opacity-50"}>
      <label
        className="flex items-center gap-2 py-2 text-xs"
        title={
          coTheHien
            ? "Album này sẽ hiện ở trang giới thiệu"
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
        <span className="text-fg-muted">Đưa lên trang giới thiệu</span>
      </label>

      {featured &&
        KHU.map((k) => (
          <label
            key={k.ma}
            className="flex items-center gap-2 pb-1.5 text-xs"
            title={k.giaiThich}
          >
            {/* Thụt bằng đúng cột nhãn ở trên để thấy rõ đây là lựa chọn phụ thuộc. */}
            <span className="w-24 shrink-0" />
            <input
              type="radio"
              name={`khu-${galleryId}`}
              checked={khuHienTai === k.ma}
              disabled={dangLuu}
              onChange={() => doiKhu(k.ma)}
              className="size-3.5"
            />
            <span className={khuHienTai === k.ma ? "text-fg" : "text-fg-muted"}>
              {k.nhan}
            </span>
          </label>
        ))}
    </div>
  );
}
