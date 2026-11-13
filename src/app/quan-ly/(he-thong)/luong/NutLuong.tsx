"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  chotLuongAction,
  moLaiLuongAction,
  suaTienLuongAction,
  tinhLuongAction,
} from "../../actionsNhanSu";

/** Nút của quản lý trên trang lương. Gom một tệp vì đều nhỏ và cùng một trang. */

export function NutTinhLuong({ nam, thang, daCo }: { nam: number; thang: number; daCo: boolean }) {
  const router = useRouter();
  const [bao, setBao] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={dang}
        className="btn-primary disabled:opacity-50"
        onClick={() =>
          batDau(async () => {
            setBao(null);
            /*
              Hỏi lại khi TÍNH LẠI kỳ đã có số: con số cũ bị ghi đè. Không hỏi
              lần đầu — lúc đó chưa có gì để mất.
            */
            if (daCo && !confirm("Tính lại kỳ này? Con số cũ sẽ bị ghi đè (trừ tạm ứng và đã thanh toán).")) return;
            const kq = await tinhLuongAction(nam, thang);
            if ("loi" in kq) setBao(kq.loi);
            else {
              setBao(`Đã tính ${kq.soDong} người.`);
              router.refresh();
            }
          })
        }
      >
        {dang ? "Đang tính…" : daCo ? "Tính lại kỳ này" : "Tính kỳ này"}
      </button>
      {bao && <span className="text-xs text-fg-muted">{bao}</span>}
    </span>
  );
}

export function NutChotKy({ nam, thang, daChot }: { nam: number; thang: number; daChot: boolean }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const chay = (f: () => Promise<{ loi: string } | { ok: true }>, hoi: string) =>
    batDau(async () => {
      setLoi(null);
      if (!confirm(hoi)) return;
      const kq = await f();
      if ("loi" in kq) setLoi(kq.loi);
      else router.refresh();
    });

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      {daChot ? (
        <button
          type="button"
          disabled={dang}
          className="btn disabled:opacity-50"
          onClick={() =>
            chay(
              () => moLaiLuongAction(nam, thang),
              "Mở lại kỳ đã chốt? Việc này được ghi vào nhật ký.",
            )
          }
        >
          Mở lại kỳ
        </button>
      ) : (
        <button
          type="button"
          disabled={dang}
          className="btn disabled:opacity-50"
          onClick={() =>
            chay(
              () => chotLuongAction(nam, thang),
              "Chốt kỳ này? Sau khi chốt sẽ không tính lại được cho tới khi mở lại.",
            )
          }
        >
          Chốt kỳ
        </button>
      )}
      {loi && <span className="text-xs text-amber-800">{loi}</span>}
    </span>
  );
}

/**
 * Sửa hai con số máy KHÔNG tính ra được: tạm ứng và đã thanh toán.
 *
 * Tạm ứng không tự tính được vì bên AppSheet 13/341 dòng có tạm ứng mà bảng
 * "Yêu cầu" chỉ có 5 đơn xin ứng lương — hai con số không khớp nên không có
 * đường nối nào đáng tin. Để người nhập, còn hơn máy đoán sai tiền.
 */
export function SuaTien({
  id,
  tamUng,
  daThanhToan,
  khoa,
}: {
  id: string;
  tamUng: number;
  daThanhToan: number;
  khoa: boolean;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [a, setA] = useState(String(tamUng));
  const [b, setB] = useState(String(daThanhToan));
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  if (khoa) return <span className="text-xs text-fg-faint">kỳ đã chốt</span>;

  if (!mo) {
    return (
      <button type="button" onClick={() => setMo(true)} className="btn btn-gon">
        Sửa
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          value={a}
          onChange={(e) => setA(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          aria-label="Tạm ứng"
          className="w-24 rounded-[3px] border border-line-strong bg-bg-raised px-2 py-1 text-right text-xs tabular-nums"
        />
        <input
          value={b}
          onChange={(e) => setB(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          aria-label="Đã thanh toán"
          className="w-24 rounded-[3px] border border-line-strong bg-bg-raised px-2 py-1 text-right text-xs tabular-nums"
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={dang}
          className="btn btn-gon disabled:opacity-50"
          onClick={() =>
            batDau(async () => {
              setLoi(null);
              const kq = await suaTienLuongAction(id, Number(a || 0), Number(b || 0));
              if ("loi" in kq) setLoi(kq.loi);
              else {
                setMo(false);
                router.refresh();
              }
            })
          }
        >
          Lưu
        </button>
        <button type="button" disabled={dang} onClick={() => setMo(false)} className="btn btn-gon">
          Thôi
        </button>
      </div>
      {loi && <span className="text-xs text-amber-800">{loi}</span>}
    </div>
  );
}
