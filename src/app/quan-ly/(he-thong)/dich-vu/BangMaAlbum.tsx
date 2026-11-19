"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  chepMaAlbumAction,
  suaMaAlbumAction,
  themMaAlbumAction,
  xoaMaAlbumAction,
} from "../../actionsMaAlbum";

export type DongMa = {
  id: string;
  ma: string;
  nghia: string | null;
  dangDung: boolean;
  /** Bao nhiêu album đang mang mã này. */
  soAlbum: number;
  /** Bao nhiêu loại buổi suy ra mã này. */
  soLoaiBuoi: number;
};

/*
  BẢNG MÃ ALBUM — anh yêu cầu 19/11/2026.

  Khác hai bảng danh mục kia ở một điểm: ô MÃ khoá lại khi đã có album dùng.
  Mã nằm trong tên album, mà tên album là chữ tự do — cùng một mã có cái viết
  "HIS - ", cái viết "His-", cái viết "HIS-". Sửa hàng loạt là dễ sót hoặc
  sửa nhầm phần tên khách, nên anh chốt không cho đổi.

  Phần nghĩa thì sửa lúc nào cũng được: nó chỉ hiện trong gợi ý, không nằm
  trong dữ liệu nào.
*/
export function BangMaAlbum({ ds, laQuanLy }: { ds: DongMa[]; laQuanLy: boolean }) {
  const router = useRouter();
  const [dang, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [nhac, setNhac] = useState<string | null>(null);
  const [suaId, setSuaId] = useState<string | null>(null);
  const [themMo, setThemMo] = useState(false);
  const [choXoa, setChoXoa] = useState<string | null>(null);

  const xong = (kq: { loi?: string }, lam?: () => void) => {
    if (kq.loi) {
      setLoi(kq.loi);
      return false;
    }
    setLoi(null);
    lam?.();
    router.refresh();
    return true;
  };

  return (
    <div>
      {laQuanLy && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => setThemMo((x) => !x)} disabled={dang}>
            {themMo ? "Thôi" : "+ Thêm mã"}
          </button>
          {ds.length === 0 && (
            <button
              type="button"
              className="btn"
              disabled={dang}
              onClick={() =>
                batDau(async () => {
                  const kq = await chepMaAlbumAction();
                  if (xong(kq)) setNhac(kq.them ? `Đã chép ${kq.them} mã.` : "Không có mã nào để chép.");
                })
              }
            >
              Chép 12 mã đang dùng
            </button>
          )}
        </div>
      )}

      {themMo && laQuanLy && (
        <DongThem
          dang={dang}
          onLuu={(ma, nghia) =>
            batDau(async () => {
              if (xong(await themMaAlbumAction(ma, nghia))) setThemMo(false);
            })
          }
        />
      )}

      {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
      {nhac && !loi && <p className="mt-3 text-sm text-emerald-700">{nhac}</p>}

      <div className="mt-4 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Mã</th>
              <th className="px-4 py-2.5 font-medium">Nghĩa</th>
              <th className="px-4 py-2.5 text-right font-medium">Album</th>
              <th className="px-4 py-2.5 text-right font-medium">Gắn sẵn</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              {laQuanLy && <th className="px-4 py-2.5 text-right font-medium">Việc</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((d) =>
              suaId === d.id ? (
                <DongSua
                  key={d.id}
                  d={d}
                  dang={dang}
                  onThoi={() => setSuaId(null)}
                  onLuu={(ma, nghia, dung) =>
                    batDau(async () => {
                      if (xong(await suaMaAlbumAction(d.id, { ma, nghia, dangDung: dung }))) setSuaId(null);
                    })
                  }
                />
              ) : (
                <tr key={d.id} className={`transition hover:bg-bg-soft ${d.dangDung ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-xs tracking-wide text-accent">
                      {d.ma}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-fg-muted">{d.nghia ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-fg-muted tabular-nums">{d.soAlbum}</td>
                  {/*
                    "Gắn sẵn" = bao nhiêu loại buổi chụp đang trỏ tới mã này.
                    Khác cột Album: album là cái đã có rồi, gắn sẵn là cái sẽ
                    sinh ra tiếp. Cả hai đều chặn xoá.
                  */}
                  <td className="px-4 py-2.5 text-right text-fg-muted tabular-nums">
                    {d.soLoaiBuoi === 0 ? "—" : d.soLoaiBuoi}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {d.dangDung ? (
                      <span className="text-fg-muted">Đang dùng</span>
                    ) : (
                      <span className="text-fg-faint">Ngưng dùng</span>
                    )}
                  </td>
                  {laQuanLy && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button type="button" className="btn px-3 py-1 text-xs" onClick={() => setSuaId(d.id)} disabled={dang}>
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger ml-2 px-3 py-1 text-xs"
                        disabled={dang}
                        onClick={() => {
                          const dung = d.soAlbum + d.soLoaiBuoi;
                          if (dung > 0) {
                            setNhac(null);
                            setLoi(
                              `“${d.ma}” đang có ${d.soAlbum} album và ${d.soLoaiBuoi} loại buổi dùng nên không xoá được. ` +
                                "Bấm Sửa rồi bỏ tick “Đang dùng” để nó không hiện trong ô chọn nữa.",
                            );
                            return;
                          }
                          if (choXoa === d.id) {
                            batDau(async () => {
                              setChoXoa(null);
                              if (xong(await xoaMaAlbumAction(d.id))) setNhac(`Đã xoá mã “${d.ma}”.`);
                            });
                          } else {
                            setLoi(null);
                            setChoXoa(d.id);
                          }
                        }}
                      >
                        {choXoa === d.id ? "Bấm lần nữa để xoá" : "Xoá"}
                      </button>
                    </td>
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            Chưa có mã nào. Web đang dùng bộ mã cứng sẵn có — bấm “Chép 12 mã đang dùng” để quản lý
            được từ đây.
          </p>
        )}
      </div>
    </div>
  );
}

function DongThem({ dang, onLuu }: { dang: boolean; onLuu: (ma: string, nghia: string) => void }) {
  const [ma, setMa] = useState("");
  const [nghia, setNghia] = useState("");
  return (
    <div className="mt-3 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <div className="flex flex-wrap gap-3">
        <label className="block w-36">
          <span className="eyebrow block">Mã</span>
          <input
            autoFocus
            value={ma}
            onChange={(e) => setMa(e.target.value)}
            placeholder="PS"
            className="input mt-1.5"
          />
        </label>
        <label className="block min-w-48 flex-1">
          <span className="eyebrow block">Nghĩa</span>
          <input
            value={nghia}
            onChange={(e) => setNghia(e.target.value)}
            placeholder="phóng sự"
            className="input mt-1.5"
          />
        </label>
      </div>
      <p className="mt-1.5 text-xs text-fg-faint">
        Mã hiện ở đầu tên album — “PS - Minh Trí &amp; Tuyết Nhi”. Không dùng dấu gạch ngang trong mã.
      </p>
      <button type="button" className="btn btn-primary mt-3" onClick={() => onLuu(ma, nghia)} disabled={dang || !ma.trim()}>
        {dang ? "Đang lưu…" : "Thêm mã"}
      </button>
    </div>
  );
}

function DongSua({
  d,
  dang,
  onLuu,
  onThoi,
}: {
  d: DongMa;
  dang: boolean;
  onLuu: (ma: string, nghia: string, dangDung: boolean) => void;
  onThoi: () => void;
}) {
  const [ma, setMa] = useState(d.ma);
  const [nghia, setNghia] = useState(d.nghia ?? "");
  const [dung, setDung] = useState(d.dangDung);
  const khoaMa = d.soAlbum > 0;

  return (
    <tr className="bg-accent-soft/20">
      <td colSpan={6} className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <label className="block w-36">
            <span className="eyebrow block">Mã</span>
            <input
              value={ma}
              onChange={(e) => setMa(e.target.value)}
              disabled={khoaMa}
              className="input mt-1.5 disabled:opacity-60"
            />
          </label>
          <label className="block min-w-48 flex-1">
            <span className="eyebrow block">Nghĩa</span>
            <input value={nghia} onChange={(e) => setNghia(e.target.value)} className="input mt-1.5" />
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={dung} onChange={(e) => setDung(e.target.checked)} className="size-4" />
            Đang dùng
          </label>
        </div>
        {/*
          Nói thẳng vì sao ô mã khoá, ngay tại chỗ. Khoá mà không giải thích
          thì người ta tưởng web hỏng.
        */}
        {khoaMa && (
          <p className="mt-2 text-xs text-amber-800">
            {d.soAlbum} album đang mang mã này nên không đổi được chữ mã — mã nằm trong tên album, sửa
            hàng loạt dễ sót. Cần mã khác thì tắt “Đang dùng” rồi thêm mã mới.
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onLuu(ma, nghia, dung)}
            disabled={dang || !ma.trim()}
          >
            {dang ? "Đang lưu…" : "Lưu"}
          </button>
          <button type="button" className="btn" onClick={onThoi} disabled={dang}>
            Thôi
          </button>
        </div>
      </td>
    </tr>
  );
}
