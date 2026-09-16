"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { ngayVN, tachTrangThai } from "@/lib/hopDongChung";
import type { HopDongGon } from "@/lib/noiAlbum";
import { ganHopDongAction, timHopDongAction } from "../actionsHopDong";

/**
 * Gắn album ảnh vào hợp đồng bên hệ thống quản lý studio.
 *
 * Web KHÔNG tự gắn, chỉ gợi ý vài hợp đồng trùng tên rồi để người bấm: trùng
 * tên khách là chuyện thường (hai nhà cùng tên, một nhà hai hợp đồng), gắn
 * nhầm thì tiền và tiến độ nhà này hiện sang nhà kia.
 */
export function GanHopDong({
  galleryId,
  dangGan,
  goiY,
}: {
  galleryId: string;
  dangGan: HopDongGon | null;
  goiY: HopDongGon[];
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [q, setQ] = useState("");
  const [ketQua, setKetQua] = useState<HopDongGon[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, start] = useTransition();

  const gan = (hopDongId: string | null) =>
    start(async () => {
      setLoi(null);
      const kq = await ganHopDongAction(galleryId, hopDongId);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setMo(false);
      setKetQua(null);
      setQ("");
      router.refresh();
    });

  const tim = () =>
    start(async () => {
      setKetQua(await timHopDongAction(q));
    });

  if (dangGan && !mo) {
    const { buoc, ten } = tachTrangThai(dangGan.trangThai);
    return (
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm">
        <span className="min-w-0">
          <span className="eyebrow">Hợp đồng</span>
          <span className="mt-0.5 block font-medium">{dangGan.tenKhach}</span>
          <span className="block text-xs text-fg-muted">
            {[dangGan.loaiDV, dangGan.ngayDat ? `đặt ${ngayVN(dangGan.ngayDat)}` : null, buoc ? `bước ${buoc}. ${ten}` : ten]
              .filter(Boolean)
              .join(" · ")}
            {dangGan.conLai > 0 && <span className="text-amber-800"> · còn {tien(dangGan.conLai)}đ</span>}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 gap-3 text-xs">
          <Link href={`/quan-ly/hop-dong/${dangGan.id}`} className="text-fg-muted underline underline-offset-2 hover:text-accent">
            Mở hợp đồng
          </Link>
          <button type="button" onClick={() => setMo(true)} className="text-fg-muted underline underline-offset-2 hover:text-accent">
            Đổi
          </button>
          <button
            type="button"
            disabled={dangChay}
            onClick={() => gan(null)}
            className="text-fg-muted underline underline-offset-2 hover:text-accent"
          >
            Bỏ gắn
          </button>
        </span>
        {loi && <p className="w-full text-xs text-red-700">{loi}</p>}
      </div>
    );
  }

  if (!mo) {
    return (
      <div className="mt-4">
        <button type="button" className="btn" onClick={() => setMo(true)}>
          Gắn hợp đồng
        </button>
        <span className="ml-3 text-xs text-fg-faint">Để mở hợp đồng ra là thấy album này, và ngược lại.</span>
      </div>
    );
  }

  const ds = ketQua ?? goiY;
  return (
    <div className="mt-4 rounded-md border border-line bg-bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-64"
          placeholder="Tìm tên khách, số điện thoại, mã HĐ"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), tim())}
          autoFocus
        />
        <button type="button" className="btn" disabled={dangChay} onClick={tim}>Tìm</button>
        <button type="button" className="btn" onClick={() => { setMo(false); setKetQua(null); }}>Đóng</button>
      </div>

      <p className="mt-3 text-xs text-fg-faint">
        {ketQua ? `${ketQua.length} hợp đồng khớp` : goiY.length ? "Hợp đồng có tên giống album này:" : "Gõ tên khách rồi bấm Tìm."}
      </p>

      <ul className="mt-2 divide-y divide-line text-sm">
        {ds.map((h) => {
          const { buoc, ten } = tachTrangThai(h.trangThai);
          return (
            <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{h.tenKhach}</span>
                <span className="block text-xs text-fg-muted">
                  {[h.soDienThoai, h.loaiDV, h.ngayDat ? ngayVN(h.ngayDat) : null, buoc ? `bước ${buoc}. ${ten}` : ten]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <button type="button" className="btn shrink-0" disabled={dangChay} onClick={() => gan(h.id)}>
                Gắn
              </button>
            </li>
          );
        })}
        {ds.length === 0 && <li className="py-3 text-fg-muted">Không có hợp đồng nào khớp.</li>}
      </ul>
      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}
    </div>
  );
}
