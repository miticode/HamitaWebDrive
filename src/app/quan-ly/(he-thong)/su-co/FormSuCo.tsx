"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dongSuCoAction, ghiSuCoAction } from "../../actionsSuCo";

/** Ghi sự cố (cả tiệm) và đóng / mở lại (quản lý). Đợt 6 (13/11/2026). */

export function NutGhiSuCo() {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function gui(fd: FormData) {
    setLoi(null);
    batDau(async () => {
      const kq = await ghiSuCoAction({
        vanDe: String(fd.get("vanDe") ?? ""),
        thongTin: String(fd.get("thongTin") ?? ""),
      });
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      form.current?.reset();
      setMo(false);
      router.refresh();
    });
  }

  if (!mo) {
    return (
      <button type="button" className="btn-primary" onClick={() => setMo(true)}>
        Ghi sự cố
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dang && setMo(false)}
    >
      <form
        ref={form}
        action={gui}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Hệ thống</p>
        <h2 className="mt-1.5 font-display text-2xl font-light">Ghi sự cố</h2>

        <label className="mt-5 block">
          <span className="eyebrow">Sự cố gì</span>
          <input
            name="vanDe"
            required
            maxLength={200}
            autoFocus
            placeholder="Máy ảnh KAG hỏng màn hình"
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="eyebrow">Chi tiết</span>
          <textarea
            name="thongTin"
            rows={3}
            maxLength={2000}
            placeholder="Xảy ra lúc nào, ở đâu, ảnh hưởng gì…"
            className="mt-1.5 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 py-2 text-sm"
          />
        </label>

        <p className="mt-4 text-xs leading-relaxed text-fg-faint">
          Web tự ghi <span className="text-fg-muted">thời điểm</span> và{" "}
          <span className="text-fg-muted">người ghi</span>. Sự cố nằm ở trạng thái “Đang tạo” cho tới
          khi quản lý đóng lại.
        </p>

        {loi && (
          <p className="mt-4 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loi}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={dang} className="btn-primary flex-1 disabled:opacity-50">
            {dang ? "Đang ghi…" : "Ghi"}
          </button>
          <button type="button" disabled={dang} onClick={() => setMo(false)} className="btn">
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

export function NutDongSuCo({ id }: { id: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [xuLy, setXuLy] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  if (!mo) {
    return (
      <button type="button" className="btn btn-gon" onClick={() => setMo(true)}>
        Đóng
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <textarea
        value={xuLy}
        onChange={(e) => setXuLy(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Đã xử lý thế nào"
        className="w-56 rounded-[3px] border border-line-strong bg-bg-raised px-2 py-1 text-xs"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={dang}
          className="btn btn-gon disabled:opacity-50"
          onClick={() =>
            batDau(async () => {
              setLoi(null);
              const kq = await dongSuCoAction(id, xuLy);
              if ("loi" in kq) setLoi(kq.loi);
              else {
                setMo(false);
                router.refresh();
              }
            })
          }
        >
          Xong
        </button>
        <button type="button" disabled={dang} onClick={() => setMo(false)} className="btn btn-gon">
          Thôi
        </button>
      </div>
      {loi && <span className="text-xs text-amber-800">{loi}</span>}
    </div>
  );
}

export function NutMoLaiSuCo({ id }: { id: string }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={dang}
        className="btn btn-gon disabled:opacity-50"
        onClick={() =>
          batDau(async () => {
            setLoi(null);
            if (!confirm("Mở lại sự cố này? Việc này được ghi vào nhật ký.")) return;
            const kq = await dongSuCoAction(id, "", true);
            if ("loi" in kq) setLoi(kq.loi);
            else router.refresh();
          })
        }
      >
        Mở lại
      </button>
      {loi && <span className="block text-xs text-amber-800">{loi}</span>}
    </>
  );
}
