"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duyetChiAction, themChiAction, xoaChiAction } from "../../actionsSoQuy";
import { HINH_THUC_CHI, KHOAN_CHI_HAY_DUNG } from "@/lib/soQuyChung";

/**
 * Ghi một khoản chi, và hai nút việc trên từng dòng sổ.
 *
 * Để chung một tệp vì cả ba đều là client component nhỏ của cùng một trang —
 * tách ra ba tệp chỉ làm khó tìm hơn.
 */

export function NutGhiChi({ taiKhoanCu, homNay }: { taiKhoanCu: string[]; homNay: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [hinhThuc, setHinhThuc] = useState<string>(HINH_THUC_CHI[0]);
  const [dangGui, batDau] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function gui(fd: FormData) {
    setLoi(null);
    batDau(async () => {
      const anh = fd.get("anh");
      const kq = await themChiAction(
        {
          ngayChi: String(fd.get("ngayChi") ?? ""),
          khoanChi: String(fd.get("khoanChi") ?? ""),
          soTien: Number(String(fd.get("soTien") ?? "").replace(/\D/g, "")),
          hinhThuc: String(fd.get("hinhThuc") ?? ""),
          taiKhoan: String(fd.get("taiKhoan") ?? ""),
          dienGiai: String(fd.get("dienGiai") ?? ""),
          nguoiNhan: String(fd.get("nguoiNhan") ?? ""),
          ghiChu: String(fd.get("ghiChu") ?? ""),
        },
        anh instanceof File && anh.size > 0 ? anh : null,
      );
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
        Ghi khoản chi
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dangGui && setMo(false)}
    >
      <form
        ref={form}
        action={gui}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Sổ quỹ</p>
        <h2 className="mt-1.5 font-display text-2xl font-light">Ghi một khoản chi</h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Ngày chi</span>
            <input
              type="date"
              name="ngayChi"
              defaultValue={homNay}
              required
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="eyebrow">Số tiền</span>
            <input
              name="soTien"
              inputMode="numeric"
              required
              placeholder="0"
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm tabular-nums"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="eyebrow">Chi vào khoản gì</span>
          {/*
            Gõ tự do nhưng CÓ GỢI Ý: bên AppSheet cột này có 139 cách viết khác
            nhau cho chừng vài chục khoản thật, vì ai cũng gõ tay. Danh sách
            gợi ý kéo mọi người về cùng một cách viết mà không chặn ai cả —
            khoản mới vẫn gõ được.
          */}
          <input
            name="khoanChi"
            list="khoan-chi-goi-y"
            required
            maxLength={120}
            placeholder="Trả lương, Lấy váy, Mặt bằng…"
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
          />
          <datalist id="khoan-chi-goi-y">
            {KHOAN_CHI_HAY_DUNG.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Hình thức</span>
            <select
              name="hinhThuc"
              value={hinhThuc}
              onChange={(e) => setHinhThuc(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
            >
              {HINH_THUC_CHI.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          {/* Chi tiền mặt thì không có tài khoản nào để ghi — giấu hẳn ô đi. */}
          {hinhThuc !== "Tiền mặt" && (
            <label className="block">
              <span className="eyebrow">Chi từ tài khoản</span>
              <input
                name="taiKhoan"
                list="tai-khoan-goi-y"
                required
                className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
              />
              <datalist id="tai-khoan-goi-y">
                {taiKhoanCu.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
          )}
        </div>

        <label className="mt-4 block">
          <span className="eyebrow">Diễn giải</span>
          <input
            name="dienGiai"
            placeholder="Chi tiết khoản này"
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Người nhận</span>
            <input
              name="nguoiNhan"
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="eyebrow">Ghi chú</span>
            <input
              name="ghiChu"
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="eyebrow">Ảnh chứng từ (không bắt buộc)</span>
          <input
            type="file"
            name="anh"
            accept="image/*,application/pdf"
            capture="environment"
            className="mt-1.5 w-full text-sm text-fg-muted file:mr-3 file:rounded-[3px] file:border file:border-line-strong file:bg-bg-raised file:px-3 file:py-2 file:text-sm"
          />
          <span className="mt-1 block text-xs text-fg-faint">
            Lưu trên Drive của studio, tối đa 8 MB. Chụp thẳng bằng điện thoại cũng được.
          </span>
        </label>

        {loi && (
          <p className="mt-4 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loi}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={dangGui} className="btn-primary flex-1 disabled:opacity-50">
            {dangGui ? "Đang ghi…" : "Ghi vào sổ"}
          </button>
          <button
            type="button"
            disabled={dangGui}
            onClick={() => setMo(false)}
            className="btn"
          >
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

/** Hai nút việc trên một dòng sổ — chỉ quản lý thấy. */
export function NutChi({
  id,
  choDuyet,
  tuAppSheet,
}: {
  id: string;
  choDuyet: boolean;
  tuAppSheet: boolean;
}) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const chay = (viec: () => Promise<{ loi: string } | { ok: true }>) =>
    batDau(async () => {
      setLoi(null);
      const kq = await viec();
      if ("loi" in kq) setLoi(kq.loi);
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {choDuyet && (
        <button
          type="button"
          disabled={dang}
          onClick={() => chay(() => duyetChiAction(id))}
          className="btn px-3 py-1 text-xs disabled:opacity-50"
        >
          Duyệt
        </button>
      )}
      {/*
        Dòng chép từ AppSheet không hiện nút xoá: xoá ở đây thì đêm nay lịch
        chép chạy là nó quay lại y nguyên. Giấu nút chứ không phải chặn ngầm —
        máy chủ vẫn từ chối nếu ai đó gọi thẳng (nguyên tắc 3).
      */}
      {!tuAppSheet && (
        <button
          type="button"
          disabled={dang}
          onClick={() => {
            if (confirm("Xoá hẳn khoản chi này?")) chay(() => xoaChiAction(id));
          }}
          className="btn px-3 py-1 text-xs disabled:opacity-50"
        >
          Xoá
        </button>
      )}
      {loi && <span className="block w-full text-right text-xs text-amber-800">{loi}</span>}
    </div>
  );
}
