"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SoDongBo = { them: number; sua: number; mat: number };

/** Nút "Đồng bộ ngay" của quản lý — gọi đúng đường lịch chạy đêm gọi. */
export function NutDongBo() {
  const router = useRouter();
  const [dang, setDang] = useState(false);
  const [bao, setBao] = useState<string | null>(null);

  async function chay() {
    setDang(true);
    setBao(null);
    try {
      const r = await fetch("/api/cron/dong-bo", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) {
        setBao(j.error ?? "Chưa đồng bộ được, anh thử lại giúp em.");
        return;
      }
      const bang = Object.values(j.ketQua.bang as Record<string, SoDongBo>);
      const them = bang.reduce((s, b) => s + b.them, 0);
      const sua = bang.reduce((s, b) => s + b.sua, 0);
      setBao(them || sua ? `Xong: thêm ${them}, cập nhật ${sua} dòng.` : "Xong: không có gì mới.");
      router.refresh();
    } catch {
      setBao("Mất kết nối giữa chừng, anh thử lại giúp em.");
    } finally {
      setDang(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" className="btn" disabled={dang} onClick={chay}>
        {dang ? "Đang chép… (khoảng nửa phút)" : "Đồng bộ ngay"}
      </button>
      {bao && <span className="text-xs" role="status">{bao}</span>}
    </span>
  );
}
