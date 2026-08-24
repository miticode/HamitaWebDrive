"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setExpiryAction } from "./actions";
import { SO_NGAY_GIU_ANH_MAC_DINH } from "@/lib/constants";

/**
 * Thời hạn giữ ảnh của album — mốc studio dự định xoá ảnh khỏi Drive.
 *
 * Khách thấy đếm ngược để tranh thủ tải. Studio đặt bằng SỐ NGÀY tính từ ngày
 * tạo album, cho khớp với lời nhắc "link mất sau 90 ngày". Để trống là bỏ hạn,
 * khách sẽ không thấy đếm ngược.
 */
export function ThoiHan({
  galleryId,
  createdAt,
  expiresAt,
}: {
  galleryId: string;
  createdAt: string;
  expiresAt: string | null;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [dangLuu, start] = useTransition();

  const soNgayHienTai = expiresAt
    ? Math.max(
        1,
        Math.round(
          (Date.parse(expiresAt) - Date.parse(createdAt)) / 86_400_000
        )
      )
    : SO_NGAY_GIU_ANH_MAC_DINH;

  const [ngay, setNgay] = useState(String(soNgayHienTai));

  const conLai = expiresAt
    ? Math.ceil((Date.parse(expiresAt) - Date.now()) / 86_400_000)
    : null;

  const ngayHan = expiresAt
    ? new Date(expiresAt).toLocaleDateString("vi-VN")
    : null;

  const luu = () =>
    start(async () => {
      const n = parseInt(ngay, 10);
      if (!Number.isFinite(n) || n < 1) return;
      const han = new Date(createdAt);
      han.setDate(han.getDate() + n);
      await setExpiryAction(galleryId, han.toISOString());
      setMo(false);
      router.refresh();
    });

  const boHan = () =>
    start(async () => {
      await setExpiryAction(galleryId, null);
      setMo(false);
      router.refresh();
    });

  if (!mo) {
    return (
      <div className="mt-2 flex items-baseline gap-2 text-xs">
        <span className="shrink-0 text-fg-muted">Hạn giữ ảnh</span>
        <span className="min-w-0 flex-1 truncate">
          {expiresAt ? (
            <>
              còn <b>{conLai}</b> ngày{" "}
              <span className="text-fg-faint">· {ngayHan}</span>
            </>
          ) : (
            <span className="text-fg-faint">không đặt hạn</span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setMo(true)}
          className="shrink-0 text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          sửa
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-line-strong bg-bg-soft p-3">
      <label className="eyebrow block">Số ngày giữ ảnh (tính từ ngày tạo)</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={ngay}
          onChange={(e) => setNgay(e.target.value)}
          className="input w-24"
        />
        <span className="text-sm text-fg-muted">ngày</span>
      </div>
      <p className="mt-1.5 text-xs text-fg-faint">
        Khách sẽ thấy đếm ngược tới ngày này. Chỉ là lời nhắc — hết hạn không tự
        khoá link.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMo(false);
            setNgay(String(soNgayHienTai));
          }}
          className="btn"
        >
          Huỷ
        </button>
        {expiresAt && (
          <button
            type="button"
            onClick={boHan}
            disabled={dangLuu}
            className="btn btn-danger ml-auto"
          >
            Bỏ hạn
          </button>
        )}
      </div>
    </div>
  );
}
