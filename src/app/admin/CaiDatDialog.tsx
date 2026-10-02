"use client";

import { useCallback, useEffect, useState } from "react";
import type { GoiMuc } from "@/lib/store";
import { AccessControl } from "./AccessControl";
import { ChoTai } from "./ChoTai";
import { LoiNhan } from "./LoiNhan";
import { ThoiHan } from "./ThoiHan";
import { GoiAnh } from "./GoiAnh";

/**
 * Năm cài đặt của một album — mã chọn ảnh, cho tải ảnh, lời nhắn, hạn giữ
 * ảnh, gói ảnh — mở thành MỘT CỬA SỔ chồng lên trang.
 *
 * Anh yêu cầu 21/09/2026: trước đó chúng xổ ra ngay trong thẻ, thẻ phình cao
 * gấp đôi và đẩy cả hàng album bên dưới chạy xuống, mà bốn ô nhập thì chen
 * trong bề ngang 470px của thẻ nên chữ gãy dòng liên tục. Cửa sổ riêng rộng
 * 32rem, thẻ đứng yên, và nhìn một lúc là thấy hết cả bốn thứ.
 *
 * Giữ đúng nếp modal của dự án (XoaAlbumDialog, CoverPicker): bấm nền hoặc
 * Escape là đóng, và khoá cuộn nền trong lúc mở — không thì cuộn chuột trong
 * cửa sổ lại kéo cả trang phía sau chạy.
 *
 * KHÔNG có nút "Lưu" chung: mỗi mục con tự lưu phần của nó ngay khi bấm xong,
 * y như hồi còn nằm trong thẻ. Thêm một nút lưu chung ở đây là hứa một điều
 * mà năm component kia không làm.
 */
export function CaiDatDialog({
  galleryId,
  ten,
  accessCode,
  message,
  createdAt,
  expiresAt,
  driveFolderId,
  choTai,
  soAnhTrongGoi,
  giaAnhThem,
  goiMuc,
  onDong,
}: {
  galleryId: string;
  ten: string;
  accessCode: string | null;
  message: string | null;
  createdAt: string;
  expiresAt: string | null;
  driveFolderId: string;
  choTai: boolean;
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
  goiMuc: GoiMuc[];
  onDong: () => void;
}) {
  /*
    Đóng KHÔNG gỡ hộp ngay: bật cờ `dangTat` cho animation chạy hết rồi mới
    báo cho thẻ album gỡ mình đi (anh yêu cầu 21/09/2026 cho mượt). 170ms khớp
    với 160ms của `.hop-tat` trong globals.css — sửa một bên thì sửa cả hai.
  */
  const [dangTat, setDangTat] = useState(false);
  const dong = useCallback(() => {
    setDangTat(true);
    setTimeout(onDong, 170);
  }, [onDong]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [dong]);

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6 ${dangTat ? "nen-tat" : "nen-hien"}`}
      onClick={dong}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Cài đặt album ${ten}`}
        className={`flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-lg bg-bg shadow-[var(--shadow-lift)] sm:max-h-[85dvh] sm:rounded-lg ${dangTat ? "hop-tat" : "hop-hien"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Cài đặt album</p>
            <h2 className="mt-1 truncate font-display text-xl leading-snug font-light" title={ten}>
              {ten}
            </h2>
          </div>
          <button
            type="button"
            onClick={dong}
            aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
        </div>

        {/*
          Ô cuộn riêng cho phần ruột: mục "Gói ảnh" của album nhiều thư mục dài
          hơn màn hình điện thoại, không cho cuộn thì không tới được nút lưu.
        */}
        <div className="min-h-0 flex-1 divide-y divide-line overflow-y-auto px-5">
          <AccessControl galleryId={galleryId} code={accessCode} />
          <ChoTai galleryId={galleryId} choTai={choTai} />
          <LoiNhan galleryId={galleryId} message={message} />
          <ThoiHan galleryId={galleryId} createdAt={createdAt} expiresAt={expiresAt} />
          <GoiAnh
            galleryId={galleryId}
            folderId={driveFolderId}
            soAnhTrongGoi={soAnhTrongGoi}
            giaAnhThem={giaAnhThem}
            goiMuc={goiMuc}
          />
        </div>

        <div className="border-t border-line px-5 py-3 text-right">
          <p className="mb-2 text-left text-[11px] leading-relaxed text-fg-faint">
            Mỗi mục tự lưu ngay khi anh chị bấm xong, không cần lưu lại lần nữa.
          </p>
          <button type="button" onClick={dong} className="btn">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
