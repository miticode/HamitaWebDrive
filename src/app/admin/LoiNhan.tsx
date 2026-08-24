"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMessageAction } from "./actions";

/**
 * Lời nhắn studio gửi riêng cho album này, hiện ở đầu trang khách xem.
 *
 * Để trống là trạng thái bình thường, không phải thiếu sót: khách sẽ thấy lời
 * chúc chung — thứ hợp với mọi kiểu buổi chụp.
 */
export function LoiNhan({
  galleryId,
  message,
}: {
  galleryId: string;
  message: string | null;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [chu, setChu] = useState(message ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setMessageAction(galleryId, chu);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      router.refresh();
    });

  if (!mo) {
    return (
      <div className="flex items-baseline gap-2 py-2 text-xs">
        <span className="w-24 shrink-0 text-fg-muted">Lời nhắn</span>
        <span className={`min-w-0 flex-1 truncate ${message ? "" : "text-fg-faint"}`}>
          {message || "đang dùng lời chúc chung"}
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
      <label className="eyebrow block">Lời nhắn riêng cho khách này</label>
      <textarea
        value={chu}
        onChange={(e) => setChu(e.target.value)}
        rows={4}
        maxLength={500}
        placeholder="Để trống thì khách thấy lời chúc chung."
        className="input mt-1.5 resize-y leading-relaxed"
      />
      <p className="mt-1 text-right text-[11px] text-fg-faint">{chu.length}/500</p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-2 flex gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMo(false);
            setLoi(null);
            setChu(message ?? "");
          }}
          className="btn"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
