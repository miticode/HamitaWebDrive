"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duyetDonAction, guiDonAction, huyDonAction } from "../../actionsNhanSu";
import { LOAI_DON, LOAI_NGHI } from "@/lib/donTuChung";

/**
 * Gửi đơn, huỷ đơn của mình, và hai nút duyệt của quản lý.
 *
 * Gom một tệp vì cả ba đều là client component nhỏ của cùng một trang.
 */

export function NutGuiDon({ homNay }: { homNay: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [loaiDon, setLoaiDon] = useState<string>(LOAI_DON[0]);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  const laUngLuong = loaiDon === "Xin ứng lương";

  function gui(fd: FormData) {
    setLoi(null);
    batDau(async () => {
      const kq = await guiDonAction({
        loaiDon: String(fd.get("loaiDon") ?? ""),
        loaiNghi: String(fd.get("loaiNghi") ?? ""),
        ngayYeuCau: String(fd.get("ngayYeuCau") ?? ""),
        lyDo: String(fd.get("lyDo") ?? ""),
        soTien: Number(String(fd.get("soTien") ?? "").replace(/\D/g, "")),
      });
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
        Gửi đơn
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dang && setMo(false)}
    >
      <form
        ref={form}
        action={gui}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Nhân sự</p>
        <h2 className="mt-1.5 font-display text-2xl font-light">Gửi đơn</h2>

        <label className="mt-5 block">
          <span className="eyebrow">Loại đơn</span>
          <select
            name="loaiDon"
            value={loaiDon}
            onChange={(e) => setLoaiDon(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
          >
            {LOAI_DON.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>

        {/*
          Hai ô dưới loại trừ nhau theo loại đơn. Giấu hẳn ô không dùng chứ
          không để mờ: ô xin ứng lương mà hiện trong đơn xin nghỉ là mời người
          ta điền nhầm, rồi máy chủ từ chối mà họ không hiểu vì sao.
        */}
        {!laUngLuong ? (
          <label className="mt-4 block">
            <span className="eyebrow">Nghỉ có hưởng lương không</span>
            <select
              name="loaiNghi"
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
            >
              {LOAI_NGHI.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mt-4 block">
            <span className="eyebrow">Số tiền xin ứng</span>
            <input
              name="soTien"
              inputMode="numeric"
              required
              placeholder="0"
              className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm tabular-nums"
            />
          </label>
        )}

        <label className="mt-4 block">
          <span className="eyebrow">{laUngLuong ? "Ngày xin ứng" : "Ngày nghỉ"}</span>
          <input
            type="date"
            name="ngayYeuCau"
            defaultValue={homNay}
            required
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="eyebrow">Lý do</span>
          <textarea
            name="lyDo"
            required
            rows={3}
            maxLength={500}
            className="mt-1.5 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 py-2 text-sm"
          />
        </label>

        {loi && (
          <p className="mt-4 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loi}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={dang} className="btn-primary flex-1 disabled:opacity-50">
            {dang ? "Đang gửi…" : "Gửi đơn"}
          </button>
          <button type="button" disabled={dang} onClick={() => setMo(false)} className="btn">
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

/** Nút huỷ đơn của chính mình, chỉ hiện khi đơn còn chờ. */
export function NutHuyDon({ id }: { id: string }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={dang}
        onClick={() =>
          batDau(async () => {
            if (!confirm("Huỷ đơn này?")) return;
            const kq = await huyDonAction(id);
            if ("loi" in kq) setLoi(kq.loi);
            else router.refresh();
          })
        }
        className="btn btn-gon disabled:opacity-50"
      >
        Huỷ
      </button>
      {loi && <span className="block text-xs text-amber-800">{loi}</span>}
    </>
  );
}

/** Hai nút của quản lý. Không duyệt thì bắt ghi lý do. */
export function NutDuyetDon({ id }: { id: string }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const xu = (dongY: boolean) =>
    batDau(async () => {
      setLoi(null);
      let ghiChu = "";
      if (!dongY) {
        /*
          Bắt ghi lý do khi TỪ CHỐI, không bắt khi đồng ý: người bị từ chối
          cần biết vì sao, còn đơn được duyệt thì bản thân việc duyệt đã là
          câu trả lời.
        */
        const v = prompt("Vì sao không duyệt đơn này?");
        if (v === null) return;
        if (!v.trim()) {
          setLoi("Phải ghi lý do không duyệt.");
          return;
        }
        ghiChu = v;
      }
      const kq = await duyetDonAction(id, dongY, ghiChu);
      if ("loi" in kq) setLoi(kq.loi);
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" disabled={dang} onClick={() => xu(true)} className="btn btn-gon disabled:opacity-50">
        Duyệt
      </button>
      <button type="button" disabled={dang} onClick={() => xu(false)} className="btn btn-gon disabled:opacity-50">
        Không duyệt
      </button>
      {loi && <span className="block w-full text-right text-xs text-amber-800">{loi}</span>}
    </div>
  );
}
