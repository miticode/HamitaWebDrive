"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { themViecLichAction, suaViecLichAction, xoaViecLichAction } from "../../actionsLich";

/*
  THÊM VIỆC VÀO LỊCH CHỤP — anh yêu cầu 20/11/2026 ("hoạt động tự tay quản lý
  thêm vào lịch", tô màu đỏ).

  Họp, giao hàng, đi khảo sát, nghỉ lễ — việc của tiệm không do hợp đồng nào
  sinh ra nhưng cả tiệm vẫn phải thấy trên lịch.

  Cửa sổ chứ không phải dòng sửa tại chỗ: trang Lịch có hai kiểu xem (lưới và
  bảng) và một panel ngày, nhét form vào thì phải nhét ba lần. Một cửa sổ dùng
  chung cho cả thêm lẫn sửa.
*/

export type ViecLich = {
  id: string;
  ngay: string | null;
  gio: string | null;
  tieuDe: string | null;
  ghiChu: string | null;
};

export function NutThemViecLich({ ngayGoiY, lop }: { ngayGoiY: string; lop?: string }) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className={lop ?? "btn"} onClick={() => setMo(true)}>
        + Thêm việc
      </button>
      {mo && <CuaSoViec ngayGoiY={ngayGoiY} onDong={() => setMo(false)} />}
    </>
  );
}

export function NutSuaViecLich({ viec }: { viec: ViecLich }) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setMo(true)}
        className="text-xs text-fg-muted underline-offset-2 transition hover:text-fg hover:underline"
      >
        Sửa
      </button>
      {mo && <CuaSoViec viec={viec} ngayGoiY={viec.ngay ?? ""} onDong={() => setMo(false)} />}
    </>
  );
}

function CuaSoViec({
  viec,
  ngayGoiY,
  onDong,
}: {
  viec?: ViecLich;
  ngayGoiY: string;
  onDong: () => void;
}) {
  const router = useRouter();
  const [ngay, setNgay] = useState(viec?.ngay ?? ngayGoiY);
  const [gio, setGio] = useState(viec?.gio ?? "");
  const [tieuDe, setTieuDe] = useState(viec?.tieuDe ?? "");
  const [ghiChu, setGhiChu] = useState(viec?.ghiChu ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  /* Xoá là không lùi được, mà nút nằm ngay cạnh nút Lưu. */
  const [choXoa, setChoXoa] = useState(false);
  const [dang, batDau] = useTransition();

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDong();
    };
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  }, [onDong]);

  const luu = () =>
    batDau(async () => {
      setLoi(null);
      const du = { ngay, gio, tieuDe, ghiChu };
      const kq = viec ? await suaViecLichAction(viec.id, du) : await themViecLichAction(du);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      onDong();
      router.refresh();
    });

  const xoa = () =>
    batDau(async () => {
      if (!viec) return;
      setLoi(null);
      const kq = await xoaViecLichAction(viec.id);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      onDong();
      router.refresh();
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={viec ? "Sửa việc trên lịch" : "Thêm việc vào lịch"}
      className="nen-hien fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
      onClick={onDong}
    >
      <div onClick={(e) => e.stopPropagation()} className="hop-hien card relative w-full max-w-md p-5 sm:p-6">
        <button
          type="button"
          onClick={onDong}
          aria-label="Đóng"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
        >
          ✕
        </button>

        <p className="eyebrow">Việc của tiệm</p>
        <h2 className="mt-1 pr-10 font-display text-2xl font-light">
          {viec ? "Sửa việc trên lịch" : "Thêm việc vào lịch"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Họp, giao hàng, đi khảo sát, nghỉ lễ… Việc ghi ở đây hiện màu đỏ trên lịch và không gắn
          hợp đồng nào.
        </p>

        <label className="mt-4 block">
          <span className="eyebrow block">Việc gì</span>
          <input
            autoFocus
            value={tieuDe}
            onChange={(e) => setTieuDe(e.target.value)}
            placeholder="Họp đầu tháng, giao album nhà chị Lan…"
            className="input mt-1.5"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-3">
          <label className="min-w-40 flex-1">
            <span className="eyebrow block">Ngày</span>
            <input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} className="input mt-1.5" />
          </label>
          <label className="w-32">
            <span className="eyebrow block">Giờ</span>
            <input type="time" value={gio} onChange={(e) => setGio(e.target.value)} className="input mt-1.5" />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="eyebrow block">Ghi chú (không bắt buộc)</span>
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            rows={2}
            className="input mt-1.5 text-sm"
          />
        </label>

        {loi && (
          <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{loi}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={luu}
            disabled={dang || !tieuDe.trim() || !ngay}
            className={!tieuDe.trim() || !ngay ? "btn cursor-not-allowed opacity-45" : "btn-primary"}
          >
            {dang ? "Đang lưu…" : viec ? "Lưu" : "Thêm vào lịch"}
          </button>
          <button type="button" onClick={onDong} className="btn" disabled={dang}>
            Thôi
          </button>
          {viec && (
            <button
              type="button"
              onClick={() => (choXoa ? xoa() : setChoXoa(true))}
              className="btn btn-danger ml-auto"
              disabled={dang}
            >
              {choXoa ? "Bấm lần nữa để xoá" : "Xoá việc"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
