"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SoDongBo = { them: number; sua: number; mat: number };
type SoSinhViec = { hopDong: number; them: number; don: number };

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
      /*
        Đầu việc web tự sinh nói riêng, không gộp vào con số "thêm" — nó là
        việc của WEB chứ không phải thứ chép về, mà lại là thứ anh đang chờ
        xem có chạy không sau khi khai bảng đầu việc cho một gói.
      */
      const tuSinh = (j.ketQua.viecTuSinh ?? { hopDong: 0, them: 0, don: 0 }) as SoSinhViec;
      const cauViec = tuSinh.them
        ? ` Web tự sinh ${tuSinh.them} đầu việc cho ${tuSinh.hopDong} hợp đồng.`
        : "";
      const cauDon = tuSinh.don ? ` Dọn ${tuSinh.don} đầu việc trùng.` : "";

      if (j.ketQua.khongDoi) {
        setBao(`Bên AppSheet không có gì mới.${cauViec}${cauDon}`);
        return;
      }
      const bang = Object.values(j.ketQua.bang as Record<string, SoDongBo>);
      const them = bang.reduce((s, b) => s + b.them, 0);
      const sua = bang.reduce((s, b) => s + b.sua, 0);
      setBao(
        them || sua
          ? `Xong: thêm ${them}, cập nhật ${sua} dòng.${cauViec}${cauDon}`
          : `Xong: không có gì mới.${cauViec}${cauDon}`,
      );
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
