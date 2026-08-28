"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moKhoaAction } from "./actions";

/**
 * O nhap ma xem album.
 * Dung chung cho ca man hinh khoa toan bo album lan hop thoai hoi ma luc chon anh.
 */
export function CodeForm({
  slug,
  onDone,
  autoFocus = false,
}: {
  slug: string;
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [ma, setMa] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, start] = useTransition();

  const gui = (e: React.FormEvent) => {
    e.preventDefault();
    setLoi(null);
    start(async () => {
      try {
        const kq = await moKhoaAction(slug, ma);
        if (!kq.ok) {
          setLoi(kq.error ?? "Hamita chưa mở được album này ạ.");
          return;
        }
        onDone();
        router.refresh();
      } catch {
        setLoi("Mạng đang trục trặc, anh chị thử lại giúp Hamita nhé.");
      }
    });
  };

  return (
    <form onSubmit={gui}>
      <input
        value={ma}
        onChange={(e) => setMa(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder="123456"
        aria-label="Mã xem album"
        className="input text-center tracking-[0.12em] uppercase"
      />
      {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
      <button disabled={dangGui || !ma.trim()} className="btn-primary mt-4 w-full">
        {dangGui ? "Đang kiểm tra…" : "Mở album"}
      </button>
    </form>
  );
}
