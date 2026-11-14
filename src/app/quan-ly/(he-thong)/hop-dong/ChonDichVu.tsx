"use client";

import { useMemo, useState, useTransition } from "react";
import { boDau, tien } from "@/lib/constants";
import { LOAI_DICH_VU, TEN_LOAI, laLoaiDichVu, type LoaiDichVu } from "@/lib/dichVuChung";
import { themDichVuAction } from "../../actionsDichVu";

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
  const [taoMoi, setTaoMoi] = useState(false);

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
        {/*
          TẠO MỤC MỚI ngay tại form hợp đồng — anh yêu cầu 14/11/2026, đối
          chiếu với AppSheet (ô "Mã DV" bên đó có sẵn mục "Tạo mới").

          Vì sao quan trọng: tiệm làm việc bằng MÃ, không phải tên tự do. Đo
          7.251 dòng chi tiết thật thì chỉ 2 dòng không có mã. Dòng gõ tay
          không mã thì không ghép được với bảng Dịch vụ, nên không có bảng giá
          hạng mục và KHÔNG SINH ĐẦU VIỆC nào — hợp đồng lập xong mà không ai
          biết phải làm gì.

          Quyền khớp sẵn: `loaiDuocSua` cho quản trị và sale sửa cả ba loại,
          mà đó cũng đúng là nhóm được lập hợp đồng.
        */}
        <button type="button" className="btn" onClick={() => setTaoMoi(true)}>
          Tạo mục mới
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            onChon(null);
            setQ("");
          }}
          title="Một dòng không mã, chỉ dùng cho khoản lẻ không cần lưu vào bảng"
        >
          Dòng gõ tay
        </button>
      </div>

      {taoMoi && (
        <KhungTaoMuc
          goiY={q.trim()}
          onThoi={() => setTaoMoi(false)}
          onXong={(dv) => {
            onChon(dv);
            setTaoMoi(false);
            setQ("");
          }}
        />
      )}

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

/**
 * Tạo một mục mới trong bảng Dịch vụ & trang phục rồi dùng luôn cho hợp đồng
 * đang lập.
 *
 * Dùng lại `themDichVuAction` chứ không mở đường ghi mới: phép kiểm quyền
 * theo loại, phép chặn trùng mã (kể cả khác hoa thường) và dòng nhật ký đều
 * giữ nguyên. Mục tạo ở đây hiện luôn trong trang Dịch vụ & trang phục, không
 * phải một bảng riêng.
 */
function KhungTaoMuc({
  goiY,
  onThoi,
  onXong,
}: {
  /** Chữ người đang gõ ở ô tìm — điền sẵn vào ô Tên cho đỡ gõ lại. */
  goiY: string;
  onThoi: () => void;
  onXong: (dv: DichVuGon) => void;
}) {
  const [maDV, setMaDV] = useState("");
  const [ten, setTen] = useState(goiY);
  const [loai, setLoai] = useState<LoaiDichVu>("dich-vu");
  const [nhom, setNhom] = useState("");
  const [donGia, setDonGia] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const luu = () =>
    batDau(async () => {
      setLoi(null);
      const gia = Number(donGia.replace(/\D/g, "")) || 0;
      const kq = await themDichVuAction({
        maDV, loai, ten, nhom, chiTiet: "", donGia: String(gia), donVi: "", dangDung: true,
      });
      if (kq.loi || !kq.id) {
        setLoi(kq.loi ?? "Chưa tạo được mục này.");
        return;
      }
      onXong({ id: kq.id, maDV: maDV.trim(), ten: ten.trim(), loai, nhom: nhom.trim() || null, donGia: gia, donVi: null });
    });

  return (
    <div className="mt-2 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <p className="eyebrow">Mục mới trong bảng Dịch vụ &amp; trang phục</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {LOAI_DICH_VU.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLoai(l)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              loai === l ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
            }`}
          >
            {TEN_LOAI[l]}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <O nhan="Mã">
          <input
            value={maDV}
            onChange={(e) => setMaDV(e.target.value)}
            placeholder="VD: ADQ07"
            autoComplete="off"
            className="input"
          />
        </O>
        <O nhan="Tên">
          <input value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="off" className="input" />
        </O>
        <O nhan="Nhóm">
          <input
            value={nhom}
            onChange={(e) => setNhom(e.target.value)}
            placeholder="Cưới, Baby, Thuê lẻ…"
            autoComplete="off"
            className="input"
          />
        </O>
        <O nhan="Đơn giá">
          <input
            value={donGia ? Number(donGia.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
            onChange={(e) => setDonGia(e.target.value)}
            inputMode="numeric"
            className="input tabular-nums"
          />
        </O>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Mục này vào thẳng bảng Dịch vụ &amp; trang phục, lần sau gõ mã là ra. Mã đã có thì web báo
        lại — <span className="text-fg-muted">không ghi đè mục cũ</span>.
      </p>

      {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={luu} disabled={dang} className="btn-primary disabled:opacity-50">
          {dang ? "Đang tạo…" : "Tạo và dùng cho dòng này"}
        </button>
        <button type="button" onClick={onThoi} disabled={dang} className="btn">Thôi</button>
      </div>
    </div>
  );
}
