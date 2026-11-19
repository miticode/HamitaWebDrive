"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEN_LOAI, type DuLieuDichVu, type LoaiDichVu } from "@/lib/dichVuChung";
import { suaDichVuAction, themDichVuAction } from "../../actionsDichVu";

/** Đơn vị đang dùng bên AppSheet, xếp theo số lần dùng (đo 15/09). */
const DON_VI = ["Bộ", "Váy", "Cái", "Gói", "Tấm", "Lần", "Cuốn", "Bó", "Người", "Đôi"];

type Props = {
  che: "them" | "sua";
  id?: string;
  banDau: DuLieuDichVu;
  /** Những loại người này được chọn — phòng Váy chỉ có trang phục. */
  dsLoai: LoaiDichVu[];
  nhomGoiY: Partial<Record<LoaiDichVu, string[]>>;
  onXong?: () => void;
};

export function FormDichVu({ che, id, banDau, dsLoai, nhomGoiY, onXong }: Props) {
  const router = useRouter();
  const [du, setDu] = useState(banDau);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();
  const doi = <K extends keyof DuLieuDichVu>(k: K, v: DuLieuDichVu[K]) => setDu((c) => ({ ...c, [k]: v }));

  const luu = () =>
    start(async () => {
      setLoi(null);
      if (che === "them") {
        const kq = await themDichVuAction(du);
        if (kq.loi || !kq.id) {
          setLoi(kq.loi ?? "Chưa lưu được, anh chị thử lại giúp em.");
          return;
        }
        router.push(`/quan-ly/dich-vu/${kq.id}`);
        return;
      }
      const kq = await suaDichVuAction(id!, du);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      onXong?.();
      router.refresh();
    });

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        luu();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <O
          nhan="Mã"
          goiY={
            che === "sua"
              ? "Mã không đổi được — hợp đồng cũ bên AppSheet tìm dịch vụ theo mã này."
              : "Ví dụ ADQ01, QPS7TR. Không trùng mã đã có."
          }
        >
          <input
            className="input"
            value={du.maDV}
            disabled={che === "sua"}
            autoFocus={che === "them"}
            onChange={(e) => doi("maDV", e.target.value)}
          />
        </O>
        <O nhan="Loại">
          {dsLoai.length > 1 ? (
            <select className="input" value={du.loai} onChange={(e) => doi("loai", e.target.value as LoaiDichVu)}>
              {dsLoai.map((l) => (
                <option key={l} value={l}>{TEN_LOAI[l]}</option>
              ))}
            </select>
          ) : (
            <input className="input" value={TEN_LOAI[du.loai]} disabled />
          )}
        </O>
        <div className="sm:col-span-2">
          <O nhan="Tên">
            <input className="input" value={du.ten} onChange={(e) => doi("ten", e.target.value)} />
          </O>
        </div>
        <O nhan="Nhóm" goiY="Chọn nhóm có sẵn hoặc gõ nhóm mới.">
          <input
            className="input"
            list="goi-y-nhom"
            value={du.nhom}
            onChange={(e) => doi("nhom", e.target.value)}
          />
          <datalist id="goi-y-nhom">
            {(nhomGoiY[du.loai] ?? []).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </O>

        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <O nhan="Đơn giá (đ)">
            <input
              className="input tabular-nums"
              inputMode="numeric"
              placeholder="3.500.000"
              value={du.donGia}
              onChange={(e) => doi("donGia", e.target.value)}
            />
          </O>
          <O nhan="Đơn vị">
            <input className="input" list="goi-y-don-vi" value={du.donVi} onChange={(e) => doi("donVi", e.target.value)} />
            <datalist id="goi-y-don-vi">
              {DON_VI.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </O>
        </div>
        <div className="sm:col-span-2">
          <O nhan="Chi tiết" goiY="Mỗi món trong gói một dòng, như bên AppSheet.">
            <textarea
              className="input min-h-36 leading-relaxed"
              rows={6}
              value={du.chiTiet}
              onChange={(e) => doi("chiTiet", e.target.value)}
            />
          </O>
        </div>
      </div>

      {che === "sua" && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={du.dangDung}
            onChange={(e) => doi("dangDung", e.target.checked)}
          />
          <span>
            Đang dùng
            <span className="block text-xs text-fg-faint">
              Bỏ chọn khi không cho thuê, không bán nữa. Không xoá hẳn: hợp đồng cũ vẫn trỏ tới mục này.
            </span>
          </span>
        </label>
      )}

      {loi && <p className="text-sm text-red-700" role="alert">{loi}</p>}
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : che === "them" ? "Thêm" : "Lưu"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={onXong ?? (() => router.push(`/quan-ly/dich-vu?loai=${du.loai}`))}
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}

/** Nút "Sửa" ở trang một mục — bấm mới mở khung sửa, đọc thì không bị ô nhập che. */
export function NutSuaDichVu(props: Omit<Props, "che" | "onXong">) {
  const [mo, setMo] = useState(false);
  if (!mo) {
    return (
      <button type="button" className="btn" onClick={() => setMo(true)}>
        Sửa
      </button>
    );
  }
  return (
    <div className="rounded-md border border-line bg-bg-raised p-4 sm:p-5">
      <FormDichVu {...props} che="sua" onXong={() => setMo(false)} />
    </div>
  );
}

function O({ nhan, goiY, children }: { nhan: string; goiY?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-fg-muted">{nhan}</span>
      {children}
      {goiY && <span className="text-xs text-fg-faint">{goiY}</span>}
    </label>
  );
}
