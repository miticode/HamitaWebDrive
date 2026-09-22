"use client";

import { useMemo, useState } from "react";
import { boDau, tien } from "@/lib/constants";
import { TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";

export type DichVuGon = {
  id: string;
  maDV: string;
  ten: string;
  loai: string;
  nhom: string | null;
  donGia: number;
  donVi: string | null;
};

export type GiaGon = { dichVuId: string; hangMuc: string | null; donGia: number };

/**
 * Ô tìm dịch vụ, dùng chung cho form LẬP và form SỬA hợp đồng.
 *
 * Lọc NGAY TRONG MÁY trên bảng đã tải sẵn (1.018 mục) — gõ tới đâu ra tới đó
 * mà không tốn lượt hỏi database nào (nguyên tắc 53).
 *
 * Tìm không dấu: nhân viên gõ "vay cuoi" phải ra "Váy cưới". Mã dịch vụ cũng
 * tìm được vì nhiều người thuộc mã hơn thuộc tên.
 */
export function ChonDichVu({
  dichVu,
  onChon,
}: {
  dichVu: DichVuGon[];
  onChon: (dv: DichVuGon | null) => void;
}) {
  const [q, setQ] = useState("");

  const ketQua = useMemo(() => {
    const k = boDau(q.trim());
    if (k.length < 2) return [];
    return dichVu.filter((d) => boDau(`${d.maDV} ${d.ten} ${d.nhom ?? ""}`).includes(k)).slice(0, 12);
  }, [q, dichVu]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ mã hoặc tên dịch vụ, trang phục, sản phẩm…"
          aria-label="Tìm dịch vụ"
          className="input flex-1"
        />
        <button
          type="button"
          className="btn"
          onClick={() => {
            onChon(null);
            setQ("");
          }}
          title="Thêm một dòng trống để gõ tay, dùng khi dịch vụ chưa có trong bảng"
        >
          Dòng gõ tay
        </button>
      </div>

      {ketQua.length > 0 && (
        <div className="mt-2 grid gap-1.5">
          {ketQua.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                onChon(d);
                setQ("");
              }}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-sm transition hover:border-accent"
            >
              <span className="min-w-0">
                <b className="font-medium">{d.ten}</b>
                <span className="ml-2 text-xs text-fg-faint">
                  {d.maDV}
                  {laLoaiDichVu(d.loai) ? ` · ${TEN_LOAI[d.loai]}` : ""}
                  {d.nhom ? ` · ${d.nhom}` : ""}
                </span>
              </span>
              <span className="tabular-nums text-fg-muted">{tien(d.donGia)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Ô nhập có nhãn — dùng chung giữa form lập và form sửa. */
export function O({
  nhan,
  chu,
  children,
}: {
  nhan: string;
  chu?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow block">{nhan}</span>
      <div className="mt-1.5">{children}</div>
      {chu && <span className="mt-1 block text-[11px] text-fg-faint">{chu}</span>}
    </label>
  );
}

/** Một khung có tiêu đề nhỏ — dùng chung giữa form lập và form sửa. */
export function Khung({
  ten,
  chu,
  children,
}: {
  ten: string;
  chu?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-bg-raised p-4">
      <h2 className="eyebrow">{ten}</h2>
      {chu && <p className="mt-1 text-xs text-fg-faint">{chu}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Một dòng "tên — số tiền" trong bảng tổng kết. */
export function Hang({ ten, gia, dam }: { ten: string; gia: number; dam?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{ten}</span>
      <span className={`tabular-nums ${dam ? "font-medium text-fg" : ""}`}>{tien(gia)}</span>
    </div>
  );
}
