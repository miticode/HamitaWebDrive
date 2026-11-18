"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suaBuocAction, themBuocAction, xoaBuocAction } from "../../actionsDanhMuc";

export type DongBuoc = {
  id: string;
  ten: string;
  thuTu: number;
  trachNhiem: string | null;
  /** Bao nhiêu hợp đồng đang ở bước này. */
  soHopDong: number;
};

/*
  BẢNG MƯỜI TÁM BƯỚC — anh yêu cầu 18/11/2026.

  Bảng `BuocHopDong` có từ đợt 6 nhưng chưa bao giờ có trang sửa; muốn đổi
  một bước phải vào database.

  Nặng tay hơn mấy danh mục kia: đo 18/11 thì 1.057 hợp đồng đang ở bước
  "12. Đã xong tiệc" và 914 ở bước 18. Đổi tên một bước là đụng vào ngần ấy
  dòng, nên con số báo trước phải đúng và phải thấy rõ.
*/
export function BangBuoc({ ds, laQuanLy }: { ds: DongBuoc[]; laQuanLy: boolean }) {
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
        <div className="mt-4">
          <button type="button" className="btn" onClick={() => setThemMo((x) => !x)} disabled={dang}>
            {themMo ? "Thôi" : "+ Thêm bước"}
          </button>
        </div>
      )}

      {themMo && laQuanLy && (
        <DongThem
          dang={dang}
          onLuu={(ten, trach) =>
            batDau(async () => {
              if (xong(await themBuocAction(ten, trach))) setThemMo(false);
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
              <th className="px-4 py-2.5 font-medium">Bước</th>
              <th className="px-4 py-2.5 font-medium">Ai lo</th>
              <th className="px-4 py-2.5 text-right font-medium">Hợp đồng</th>
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
                  onLuu={(ten, trach) =>
                    batDau(async () => {
                      const kq = await suaBuocAction(d.id, { ten, trachNhiem: trach });
                      if (xong(kq)) {
                        setSuaId(null);
                        if (kq.doiTheo) setNhac(`Đã đổi tên, và ${kq.doiTheo} hợp đồng đổi theo.`);
                      }
                    })
                  }
                />
              ) : (
                <tr key={d.id} className="transition hover:bg-bg-soft">
                  <td className="px-4 py-2.5 font-medium">{d.ten}</td>
                  <td className="px-4 py-2.5 text-fg-muted">{d.trachNhiem ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right text-fg-muted tabular-nums">{d.soHopDong}</td>
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
                          if (d.soHopDong > 0) {
                            setNhac(null);
                            setLoi(`“${d.ten}” đang có ${d.soHopDong} hợp đồng ở bước này nên không xoá được.`);
                            return;
                          }
                          if (choXoa === d.id) {
                            batDau(async () => {
                              setChoXoa(null);
                              if (xong(await xoaBuocAction(d.id))) setNhac(`Đã xoá bước “${d.ten}”.`);
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
          <p className="px-4 py-8 text-center text-sm text-fg-muted">Chưa có bước nào trong bảng.</p>
        )}
      </div>
    </div>
  );
}

/** Chữ nhắc về số đầu tên — dùng chung cho ô thêm và ô sửa. */
function ChuSo() {
  return (
    <span className="mt-1 block text-xs text-fg-faint">
      Bắt đầu bằng số và dấu chấm, ví dụ “5. Đang Retouch”. Số đó quyết định thứ tự và nhánh — 1–9
      nhánh chụp, 10–18 nhánh tiệc.
    </span>
  );
}

function DongThem({ dang, onLuu }: { dang: boolean; onLuu: (ten: string, trach: string) => void }) {
  const [ten, setTen] = useState("");
  const [trach, setTrach] = useState("");
  return (
    <div className="mt-3 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <div className="flex flex-wrap gap-3">
        <label className="block min-w-64 flex-1">
          <span className="eyebrow block">Tên bước</span>
          <input autoFocus value={ten} onChange={(e) => setTen(e.target.value)} className="input mt-1.5" />
          <ChuSo />
        </label>
        <label className="block min-w-40">
          <span className="eyebrow block">Ai lo</span>
          <input
            value={trach}
            onChange={(e) => setTrach(e.target.value)}
            placeholder="Sale / Nhiếp ảnh"
            className="input mt-1.5"
          />
        </label>
      </div>
      <button type="button" className="btn btn-primary mt-3" onClick={() => onLuu(ten, trach)} disabled={dang || !ten.trim()}>
        {dang ? "Đang lưu…" : "Thêm bước"}
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
  d: DongBuoc;
  dang: boolean;
  onLuu: (ten: string, trach: string) => void;
  onThoi: () => void;
}) {
  const [ten, setTen] = useState(d.ten);
  const [trach, setTrach] = useState(d.trachNhiem ?? "");
  const doiTen = ten.trim() !== d.ten;

  return (
    <tr className="bg-accent-soft/20">
      <td colSpan={4} className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-3">
          <label className="block min-w-64 flex-1">
            <span className="eyebrow block">Tên bước</span>
            <input value={ten} onChange={(e) => setTen(e.target.value)} className="input mt-1.5" />
            {doiTen && d.soHopDong > 0 ? (
              <span className="mt-1 block text-xs text-amber-700">
                {d.soHopDong} hợp đồng đang ở bước “{d.ten}” sẽ đổi theo.
              </span>
            ) : (
              <ChuSo />
            )}
          </label>
          <label className="block min-w-40">
            <span className="eyebrow block">Ai lo</span>
            <input value={trach} onChange={(e) => setTrach(e.target.value)} className="input mt-1.5" />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => onLuu(ten, trach)} disabled={dang || !ten.trim()}>
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
