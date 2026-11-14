"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { ngayVN, tachTrangThai } from "@/lib/hopDongChung";
import type { CapGhep, HopDongUngVien } from "@/lib/ghepAlbum";
import { ganHopDongAction, timHopDongAction } from "../actionsHopDong";
import type { HopDongGon } from "@/lib/noiAlbum";

/**
 * Một album chờ ghép, kèm các hợp đồng ứng viên.
 *
 * Ghép xong thì thẻ TỰ BIẾN MẤT khỏi danh sách (`router.refresh()` dựng lại
 * trang, album đó không còn trong diện chưa gắn). Làm hết một nhóm là nhóm đó
 * trống — người làm nhìn thấy mình tiến tới đâu, thay vì cuộn mãi một danh
 * sách không ngắn đi.
 */
export function TheGhep({ cap }: { cap: CapGhep }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, start] = useTransition();
  const [moTim, setMoTim] = useState(false);
  const [q, setQ] = useState("");
  const [ketQua, setKetQua] = useState<HopDongGon[] | null>(null);

  const ghep = (hopDongId: string) =>
    start(async () => {
      setLoi(null);
      const kq = await ganHopDongAction(cap.galleryId, hopDongId);
      if (kq.loi) setLoi(kq.loi);
      else router.refresh();
    });

  const tim = () =>
    start(async () => {
      setKetQua(await timHopDongAction(q));
    });

  /* Ứng viên đứng đầu, và những ứng viên BẰNG ĐIỂM với nó. */
  const dau = cap.ungVien[0];
  const bangDiem = dau ? cap.ungVien.filter((u) => u.diem === dau.diem) : [];
  const conLai = dau ? cap.ungVien.filter((u) => u.diem < dau.diem) : cap.ungVien;

  return (
    <div className="rounded-md border border-line bg-bg-raised p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="font-medium">{cap.tenAlbum}</p>
          <p className="text-xs text-fg-faint tabular-nums">
            {cap.soAnh > 0 ? `${cap.soAnh} ảnh · ` : ""}
            tạo {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(cap.taoLuc)}
          </p>
        </div>
        <Link
          href={`/admin/${cap.slug}`}
          target="_blank"
          className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
        >
          Mở album
        </Link>
      </div>

      <div className="mt-3 grid gap-2">
        {bangDiem.map((u) => (
          <DongUngVien key={u.id} u={u} noiBat={bangDiem.length === 1} dang={dangChay} onGhep={() => ghep(u.id)} />
        ))}
        {conLai.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-fg-muted hover:text-accent">
              {conLai.length} hợp đồng khác giống ít hơn
            </summary>
            <div className="mt-2 grid gap-2">
              {conLai.map((u) => (
                <DongUngVien key={u.id} u={u} noiBat={false} dang={dangChay} onGhep={() => ghep(u.id)} />
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Tìm tay — lối ra khi không ứng viên nào đúng. */}
      {!moTim ? (
        <button
          type="button"
          onClick={() => setMoTim(true)}
          className="mt-3 text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
        >
          {cap.ungVien.length ? "Không phải những hợp đồng trên — tìm tay" : "Tìm hợp đồng"}
        </button>
      ) : (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && tim()}
              placeholder="Tên khách, số điện thoại hoặc mã hợp đồng…"
              className="input w-72"
            />
            <button type="button" onClick={tim} disabled={dangChay} className="btn">Tìm</button>
            <button type="button" onClick={() => { setMoTim(false); setKetQua(null); }} className="btn">Thôi</button>
          </div>
          {ketQua && (
            <div className="mt-2 grid gap-2">
              {ketQua.map((h) => (
                <DongUngVien
                  key={h.id}
                  u={{ ...h, diem: 0 }}
                  noiBat={false}
                  dang={dangChay}
                  onGhep={() => ghep(h.id)}
                />
              ))}
              {ketQua.length === 0 && <p className="text-xs text-fg-muted">Không tìm thấy hợp đồng nào.</p>}
            </div>
          )}
        </div>
      )}

      {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}
    </div>
  );
}

/** Một hợp đồng ứng viên, kèm nút ghép. */
function DongUngVien({
  u,
  noiBat,
  dang,
  onGhep,
}: {
  u: HopDongUngVien;
  /** Ứng viên duy nhất đứng đầu — tô đậm để bấm nhanh. */
  noiBat: boolean;
  dang: boolean;
  onGhep: () => void;
}) {
  const { buoc, ten } = tachTrangThai(u.trangThai);
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[3px] border px-3 py-2 ${
        noiBat ? "border-accent/40 bg-accent-soft/30" : "border-line"
      }`}
    >
      <div className="min-w-0 text-sm">
        <p className="font-medium">{u.tenKhach}</p>
        <p className="text-xs text-fg-muted">
          {u.loaiDV ?? "—"}
          {u.ngayDat ? ` · đặt ${ngayVN(u.ngayDat)}` : ""}
          {ten ? ` · ${buoc !== null ? `${buoc}. ` : ""}${ten}` : ""}
          {u.conLai > 0 ? ` · còn nợ ${tien(u.conLai)}đ` : ""}
        </p>
      </div>
      <button type="button" onClick={onGhep} disabled={dang} className="btn btn-gon disabled:opacity-50">
        {dang ? "Đang ghép…" : "Ghép"}
      </button>
    </div>
  );
}
