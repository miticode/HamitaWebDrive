"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerateCodeAction, setAccessAction } from "./actions";

/**
 * Mã chọn ảnh của album.
 *
 * Khách xem ảnh thoải mái, nhưng phải có mã mới tim/tick được — tránh người
 * ngoài chọn bậy vào danh sách in của khách. Cả nhà dùng chung một mã nên lựa
 * chọn cũng là một danh sách chung: cô dâu chọn trên điện thoại rồi mở laptop
 * vẫn thấy đúng, và hai người cùng tim một tấm cũng chỉ tính một lần.
 */
export function AccessControl({
  galleryId,
  code,
}: {
  galleryId: string;
  code: string | null;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [ma, setMa] = useState(code ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();
  const [daChep, setDaChep] = useState(false);

  const luu = () =>
    start(async () => {
      const kq = await setAccessAction(galleryId, ma);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      router.refresh();
    });

  const sinhLai = () =>
    start(async () => {
      const kq = await regenerateCodeAction(galleryId);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      router.refresh();
    });

  if (!mo) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 text-xs">
        <span className="w-24 shrink-0 text-fg-muted">Mã chọn ảnh</span>
        <button
          type="button"
          onClick={async () => {
            if (!code) return;
            await navigator.clipboard.writeText(code);
            setDaChep(true);
            setTimeout(() => setDaChep(false), 1500);
          }}
          title="Chép mã để gửi khách"
          className="rounded border border-line-strong bg-bg-soft px-1.5 py-0.5 font-mono tracking-wider"
        >
          {daChep ? "đã chép ✓" : (code ?? "chưa có")}
        </button>
        <button
          type="button"
          onClick={() => setMo(true)}
          className="text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          đổi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-line-strong bg-bg-soft p-3">
      <label className="eyebrow block">Mã gửi khách</label>
      <input
        value={ma}
        onChange={(e) => setMa(e.target.value.toUpperCase())}
        placeholder="123456"
        className="input mt-1.5 font-mono tracking-wider"
      />
      <button
        type="button"
        onClick={sinhLai}
        disabled={dangLuu}
        className="mt-1.5 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
      >
        sinh mã mới (khách đang mở sẽ phải nhập lại)
      </button>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMo(false);
            setLoi(null);
            setMa(code ?? "");
          }}
          className="btn"
        >
          Huỷ
        </button>
      </div>
    </div>
  );
}
