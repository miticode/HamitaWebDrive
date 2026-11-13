"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LOAI_LICH } from "@/lib/hopDongChung";
import { luuLichAction, type DongLichSua } from "../../../actionsHopDong";

const TRANG_THAI_BUOI = ["Chưa làm", "Đang làm", "Hoàn thành"] as const;

/**
 * Lịch chụp của một hợp đồng — sửa ngay tại trang hợp đồng.
 *
 * Sửa CẢ CỤM rồi bấm Lưu một lần: lịch một hợp đồng thường đổi theo chùm
 * (khách dời ngày là ba buổi dời theo), mỗi dòng một lượt lưu thì nửa chừng
 * hỏng là lịch còn một nửa cũ một nửa mới.
 *
 * Người không được sửa vẫn XEM được danh sách này — lịch chụp là thứ cả tiệm
 * cần biết (nguyên tắc 52).
 */
export function KhoiLich({
  hopDongId,
  banDau,
  duocSua,
}: {
  hopDongId: string;
  banDau: DongLichSua[];
  duocSua: boolean;
}) {
  const router = useRouter();
  const [dong, setDong] = useState<DongLichSua[]>(banDau);
  const [dangLuu, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [daLuu, setDaLuu] = useState(false);

  const doi = (i: number, sua: Partial<DongLichSua>) =>
    setDong((ds) => ds.map((d, j) => (i === j ? { ...d, ...sua } : d)));

  const luu = () =>
    start(async () => {
      setLoi(null);
      const kq = await luuLichAction(hopDongId, dong);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setDaLuu(true);
      setTimeout(() => setDaLuu(false), 2000);
      router.refresh();
    });

  if (!duocSua) {
    return dong.length === 0 ? (
      <p className="mt-2 text-sm text-fg-muted">Chưa có buổi nào.</p>
    ) : (
      <ul className="mt-2 grid gap-1.5 text-sm">
        {dong.map((d) => (
          <li key={d.id} className="rounded-md border border-line bg-bg-raised px-3.5 py-2">
            <span className="tabular-nums">{d.ngay}</span>
            {d.gio && <span className="ml-2 font-medium tabular-nums">{d.gio}</span>}
            <span className="mx-2 text-fg-muted">{d.loai}</span>
            <span className="text-xs text-fg-faint">{d.trangThai}</span>
            {d.ghiChu && <span className="block text-xs text-fg-muted">{d.ghiChu}</span>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-2 grid gap-3">
      {dong.map((d, i) => (
        <div key={d.id ?? `moi-${i}`} className="grid gap-2 rounded-md border border-line bg-bg-raised p-3 sm:grid-cols-[9rem_6rem_10rem_9rem_1fr_auto]">
          <label className="block">
            <span className="eyebrow block">Ngày</span>
            <input
              type="date"
              value={d.ngay}
              onChange={(e) => doi(i, { ngay: e.target.value })}
              className="input mt-1.5"
            />
          </label>
          {/*
            Giờ đứng NGAY SAU ngày, vì hai thứ đó đi liền nhau trong đầu người
            nhập. Để trống được: 1.454 buổi cũ không buổi nào có giờ.
          */}
          <label className="block">
            <span className="eyebrow block">Giờ</span>
            <input
              type="time"
              value={d.gio}
              onChange={(e) => doi(i, { gio: e.target.value })}
              className="input mt-1.5 tabular-nums"
            />
          </label>
          <label className="block">
            <span className="eyebrow block">Loại buổi</span>
            <select value={d.loai} onChange={(e) => doi(i, { loai: e.target.value })} className="input mt-1.5">
              {[...new Set([d.loai, ...LOAI_LICH])].filter(Boolean).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow block">Tình trạng</span>
            <select
              value={d.trangThai}
              onChange={(e) => doi(i, { trangThai: e.target.value })}
              className="input mt-1.5"
            >
              {[...new Set([d.trangThai, ...TRANG_THAI_BUOI])].filter(Boolean).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow block">Ghi chú</span>
            <input value={d.ghiChu} onChange={(e) => doi(i, { ghiChu: e.target.value })} className="input mt-1.5" />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setDong((ds) => ds.filter((_, j) => j !== i))}
            >
              Bỏ
            </button>
          </div>
        </div>
      ))}

      {loi && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{loi}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn"
          onClick={() =>
            setDong((ds) => [...ds, { ngay: "", gio: "", loai: LOAI_LICH[0], ghiChu: "", trangThai: "Chưa làm" }])
          }
        >
          Thêm buổi
        </button>
        <button type="button" className="btn-primary px-4" onClick={luu} disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lưu lịch"}
        </button>
        {daLuu && <span className="text-sm text-accent">Đã lưu ✓</span>}
        <span className="text-xs text-fg-faint">Dòng để trống ngày sẽ không được lưu.</span>
      </div>
    </div>
  );
}
