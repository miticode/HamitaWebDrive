"use client";

import { useEffect, useState } from "react";
import { docLogAction, type DongLogGon, type ViecStudioGon } from "./actions";
import { CHU_HANH_DONG, type HanhDong } from "@/lib/nhatKyChung";
import { MUI_GIO } from "@/lib/constants";

/**
 * Cửa sổ "Logs" — lần đầu khách mở từng thư mục (anh yêu cầu 28/09/2026).
 *
 * Studio up ảnh xong bấm "gửi thông báo" rồi ngồi đợi, trước đây không có cách
 * nào biết khách đã mở ra xem chưa. Nay mỗi thư mục con ghi đúng MỘT dòng, là
 * lần đầu khách mở nó.
 *
 * Đọc khi MỞ cửa sổ chứ không tải sẵn theo thẻ: lưới album có mấy chục thẻ,
 * tải sẵn log cho từng thẻ là mấy chục lượt hỏi database mà chín phần mười
 * không ai mở ra xem (nguyên tắc 53 — Neon tính tiền theo thời gian thức).
 */
const GIO_NGAY = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LogKhach({
  galleryId,
  ten,
  baoTinLuc,
  dong,
}: {
  galleryId: string;
  ten: string;
  /** Lần cuối bấm "Gửi thông báo" (chuỗi ISO) — để so với lúc khách mở. */
  baoTinLuc: string | null;
  dong: () => void;
}) {
  const [ds, setDs] = useState<DongLogGon[] | null>(null);
  const [viec, setViec] = useState<ViecStudioGon[]>([]);
  const [loi, setLoi] = useState<string | null>(null);

  useEffect(() => {
    let boQua = false;
    docLogAction(galleryId).then((kq) => {
      if (boQua) return;
      if (kq.loi) setLoi(kq.loi);
      else {
        setDs(kq.ds ?? []);
        setViec(kq.viec ?? []);
      }
    });
    return () => {
      boQua = true;
    };
  }, [galleryId]);

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  }, [dong]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Log của ${ten}`}
      onClick={dong}
      className="nen-hien fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div onClick={(e) => e.stopPropagation()} className="hop-hien card relative w-full max-w-lg p-5 sm:p-6">
        <button
          type="button"
          onClick={dong}
          aria-label="Đóng"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
        >
          ✕
        </button>

        <p className="eyebrow">Nhật ký album</p>
        <h2 className="mt-1 pr-10 font-display text-2xl">{ten}</h2>

        {baoTinLuc && (
          <p className="mt-1 text-xs text-fg-faint">Gửi thông báo lần cuối: {GIO_NGAY.format(new Date(baoTinLuc))}</p>
        )}

        {loi && <p className="mt-4 text-sm text-red-700">{loi}</p>}

        {/*
          Studio làm gì với album này — ai bấm gửi thông báo lúc mấy giờ là câu
          anh hỏi 28/09/2026. Đặt TRÊN phần của khách vì việc studio xảy ra
          trước: gửi tin rồi khách mới mở.
        */}
        {viec.length > 0 && (
          <>
            <p className="eyebrow mt-5">Studio đã làm</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {viec.map((v, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {CHU_HANH_DONG[v.hanhDong as HanhDong] ?? v.hanhDong}
                      {v.daGui !== undefined && (
                        <span className="ml-1.5 font-normal text-fg-muted">
                          · {v.daGui > 0 ? `tới ${v.daGui} máy` : "không máy nào nhận"}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-fg-muted">{v.nguoiTen}</span>
                  </span>
                  <span className="shrink-0 text-xs text-fg-muted tabular-nums">{GIO_NGAY.format(new Date(v.luc))}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loi && ds === null && <p className="mt-4 text-sm text-fg-muted">Đang đọc…</p>}

        {ds !== null && ds.length === 0 && (
          <p className="mt-4 text-sm text-fg-muted">
            Khách chưa mở thư mục nào. Lượt studio tự mở link không tính vào đây.
          </p>
        )}

        {ds !== null && ds.length > 0 && (
          <>
            <p className="eyebrow mt-5">Khách đã mở</p>
          <ul className="mt-2 divide-y divide-line border-y border-line">
            {ds.map((d) => (
              <li key={d.albumId || "goc"} className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="min-w-0 truncate text-sm font-medium">{d.tenMuc}</span>
                <span className="shrink-0 text-xs text-fg-muted tabular-nums">{GIO_NGAY.format(new Date(d.luc))}</span>
              </li>
            ))}
          </ul>
          </>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
          Mỗi thư mục ghi đúng một dòng — lần đầu khách mở nó. Những lần mở sau
          không ghi thêm.
        </p>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={dong} className="btn min-h-10 px-4">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
