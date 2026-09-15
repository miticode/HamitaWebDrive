"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { suaNoiQuyAction, themNoiQuyAction, type DuLieuNoiQuy } from "../../actionsStudio";

type NoiQuyHang = { id: string; noiDung: string; mucPhat: number; dangApDung: boolean };

/**
 * Bảng nội quy cho QUẢN LÝ: sửa ngay trên dòng, thêm dòng mới, ngưng hay áp
 * dụng lại. Không có nút xoá — xem chú thích model NoiQuy.
 */
export function BangNoiQuy({ ds }: { ds: NoiQuyHang[] }) {
  const [dangSua, setDangSua] = useState<string | null>(null);
  const [dangThem, setDangThem] = useState(false);
  const dangDung = ds.filter((n) => n.dangApDung);
  const daNgung = ds.filter((n) => !n.dangApDung);

  return (
    <div className="mt-6 grid gap-6">
      <ul className="divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
        {dangDung.map((n) =>
          dangSua === n.id ? (
            <li key={n.id} className="px-4 py-3">
              <FormNoiQuy
                banDau={{ noiDung: n.noiDung, mucPhat: String(n.mucPhat), dangApDung: true }}
                onLuu={(du) => suaNoiQuyAction(n.id, du)}
                onXong={() => setDangSua(null)}
              />
            </li>
          ) : (
            <HangNoiQuy key={n.id} n={n} onSua={() => setDangSua(n.id)} />
          ),
        )}
        {dangDung.length === 0 && (
          <li className="px-4 py-8 text-center text-fg-muted">Chưa có nội quy nào đang áp dụng.</li>
        )}
        <li className="px-4 py-3">
          {dangThem ? (
            <FormNoiQuy
              banDau={{ noiDung: "", mucPhat: "", dangApDung: true }}
              onLuu={themNoiQuyAction}
              onXong={() => setDangThem(false)}
            />
          ) : (
            <button type="button" className="text-sm text-accent underline underline-offset-2" onClick={() => setDangThem(true)}>
              + Thêm nội quy
            </button>
          )}
        </li>
      </ul>

      {daNgung.length > 0 && (
        <section>
          <h2 className="eyebrow">Đã ngưng áp dụng</h2>
          <p className="mt-1 text-xs text-fg-faint">Nhân viên không thấy các dòng này. Giữ lại vì các lần phạt cũ còn trỏ tới.</p>
          <ul className="mt-2 divide-y divide-line rounded-md border border-line text-sm text-fg-muted">
            {daNgung.map((n) => (
              <HangNoiQuy key={n.id} n={n} onSua={() => setDangSua(n.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HangNoiQuy({ n, onSua }: { n: NoiQuyHang; onSua: () => void }) {
  const router = useRouter();
  const [dangChay, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  const batTat = () =>
    start(async () => {
      const kq = await suaNoiQuyAction(n.id, {
        noiDung: n.noiDung,
        mucPhat: String(n.mucPhat),
        dangApDung: !n.dangApDung,
      });
      if (kq.loi) setLoi(kq.loi);
      else router.refresh();
    });

  return (
    <li className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
      <span className="min-w-0 flex-1">{n.noiDung}</span>
      <span className="shrink-0 font-medium tabular-nums">
        {n.mucPhat > 0 ? `${tien(n.mucPhat)}đ` : "nhắc nhở"}
      </span>
      <span className="flex shrink-0 gap-3 text-xs">
        {n.dangApDung && (
          <button type="button" onClick={onSua} className="text-fg-muted underline underline-offset-2 hover:text-accent">
            Sửa
          </button>
        )}
        <button
          type="button"
          onClick={batTat}
          disabled={dangChay}
          className="text-fg-muted underline underline-offset-2 hover:text-accent"
        >
          {dangChay ? "…" : n.dangApDung ? "Ngưng áp dụng" : "Áp dụng lại"}
        </button>
      </span>
      {loi && <p className="w-full text-xs text-red-700">{loi}</p>}
    </li>
  );
}

function FormNoiQuy({
  banDau,
  onLuu,
  onXong,
}: {
  banDau: DuLieuNoiQuy;
  onLuu: (du: DuLieuNoiQuy) => Promise<{ loi?: string }>;
  onXong: () => void;
}) {
  const router = useRouter();
  const [du, setDu] = useState(banDau);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await onLuu(du);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      onXong();
      router.refresh();
    });

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          id="nq-noi-dung"
          className="input min-w-0 flex-1"
          placeholder="Nội dung, ví dụ: Đi trễ"
          value={du.noiDung}
          autoFocus
          onChange={(e) => setDu((c) => ({ ...c, noiDung: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && luu()}
        />
        <input
          id="nq-muc-phat"
          className="input w-36"
          inputMode="numeric"
          placeholder="Mức phạt (đ)"
          value={du.mucPhat}
          onChange={(e) => setDu((c) => ({ ...c, mucPhat: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && luu()}
        />
      </div>
      {loi && <p className="text-xs text-red-700">{loi}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn-primary" disabled={dangLuu} onClick={luu}>
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" className="btn" onClick={onXong}>Huỷ</button>
      </div>
    </div>
  );
}
