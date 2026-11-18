"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MA_ALBUM } from "@/lib/maAlbum";
import {
  chepLoaiBuoiAction,
  suaLoaiBuoiAction,
  themLoaiBuoiAction,
  xoaLoaiBuoiAction,
} from "../../actionsLoaiBuoi";

export type DongLoai = {
  id: string;
  ten: string;
  maAlbum: string | null;
  dangDung: boolean;
  /** Bao nhiêu buổi chụp đang mang loại này. */
  soBuoi: number;
};

/*
  BẢNG LOẠI BUỔI CHỤP — anh yêu cầu 18/11/2026.

  Sửa ngay tại dòng, không mở trang riêng: danh mục này chỉ mười mấy dòng,
  mà mỗi dòng có ba thứ để đổi (tên, mã album, đang dùng). Mở một trang cho
  mỗi lần sửa một chữ là phí.

  Cột "Đang dùng bao nhiêu buổi" là cột quan trọng nhất của bảng này: nó cho
  biết đổi tên dòng đó sẽ kéo theo bao nhiêu dòng lịch, và vì sao có dòng
  không xoá được.
*/
export function BangLoaiBuoi({ ds, laQuanLy }: { ds: DongLoai[]; laQuanLy: boolean }) {
  const router = useRouter();
  const [dang, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [nhac, setNhac] = useState<string | null>(null);
  const [suaId, setSuaId] = useState<string | null>(null);
  const [themMo, setThemMo] = useState(false);
  /*
    Dòng đang chờ xác nhận xoá. Xoá là không lùi được, mà bảng này mỗi dòng
    chỉ cao chừng 40px — bấm trượt một dòng là chuyện thường.
  */
  const [choXoa, setChoXoa] = useState<string | null>(null);

  const xong = (ok: { loi?: string }, lam?: () => void) => {
    if (ok.loi) {
      setLoi(ok.loi);
      return false;
    }
    setLoi(null);
    lam?.();
    router.refresh();
    return true;
  };

  const chep = () =>
    batDau(async () => {
      const kq = await chepLoaiBuoiAction();
      if (xong(kq)) setNhac(kq.them ? `Đã chép ${kq.them} loại.` : "Không có loại nào để chép thêm.");
    });

  const xoa = (d: DongLoai) =>
    batDau(async () => {
      setChoXoa(null);
      if (xong(await xoaLoaiBuoiAction(d.id))) setNhac(`Đã xoá loại “${d.ten}”.`);
    });

  return (
    <div>
      {laQuanLy && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => setThemMo((x) => !x)} disabled={dang}>
            {themMo ? "Thôi" : "+ Thêm loại"}
          </button>
          {/*
            Nút chép chỉ hiện khi bảng còn rỗng: nó là việc làm MỘT LẦN lúc
            mới mở tính năng. Để nó nằm đó mãi thì sẽ có người bấm nhầm rồi
            lo không biết vừa làm gì.
          */}
          {ds.length === 0 && (
            <button type="button" className="btn" onClick={chep} disabled={dang}>
              Chép 15 loại đang dùng
            </button>
          )}
        </div>
      )}

      {themMo && laQuanLy && (
        <DongThem
          dang={dang}
          onLuu={(ten, ma) =>
            batDau(async () => {
              if (xong(await themLoaiBuoiAction(ten, ma))) setThemMo(false);
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
              <th className="px-4 py-2.5 font-medium">Loại buổi</th>
              <th className="px-4 py-2.5 font-medium">Mã album</th>
              <th className="px-4 py-2.5 text-right font-medium">Đang dùng</th>
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
                  onLuu={(ten, ma, dung) =>
                    batDau(async () => {
                      const kq = await suaLoaiBuoiAction(d.id, { ten, maAlbum: ma, dangDung: dung });
                      if (xong(kq)) {
                        setSuaId(null);
                        if (kq.doiLich) setNhac(`Đã đổi tên, và ${kq.doiLich} buổi chụp đổi theo.`);
                      }
                    })
                  }
                />
              ) : (
                <tr key={d.id} className={`transition hover:bg-bg-soft ${d.dangDung ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2.5 font-medium">{d.ten}</td>
                  <td className="px-4 py-2.5">
                    {d.maAlbum ? (
                      <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-[11px] tracking-wide text-accent">
                        {d.maAlbum}
                      </span>
                    ) : (
                      <span className="text-fg-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-fg-muted tabular-nums">{d.soBuoi}</td>
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
                      {/*
                        NÚT XOÁ LUÔN HIỆN — sửa 18/11/2026 sau khi anh báo
                        "chưa có chức năng delete".

                        Bản đầu em giấu nút khi loại còn lịch, nghĩ rằng đỡ
                        mời người ta bấm một thứ chắc chắn bị từ chối. Nhưng
                        đo ra thì CẢ 15 LOẠI đều đang có lịch — nút không hiện
                        ở một dòng nào, nên nhìn vào bảng thì chức năng xoá
                        coi như không tồn tại.

                        Giấu một chức năng khác hẳn với chặn nó. Giờ nút luôn
                        thấy, bấm vào thì nói rõ vì sao chưa xoá được và phải
                        làm gì thay thế. Máy chủ vẫn chặn lần nữa (nguyên tắc 3).
                      */}
                      <button
                        type="button"
                        className="btn btn-danger ml-2 px-3 py-1 text-xs"
                        onClick={() => {
                          if (d.soBuoi > 0) {
                            setNhac(null);
                            setLoi(
                              `“${d.ten}” đang có ${d.soBuoi} buổi dùng nên không xoá được. ` +
                                "Bấm Sửa rồi bỏ tick “Đang dùng” để nó không hiện trong ô chọn nữa.",
                            );
                            return;
                          }
                          if (choXoa === d.id) xoa(d);
                          else {
                            setLoi(null);
                            setChoXoa(d.id);
                          }
                        }}
                        disabled={dang}
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
            Chưa có loại nào. Web đang dùng bảng cứng sẵn có — bấm “Chép 15 loại đang dùng” để quản lý
            được từ đây.
          </p>
        )}
      </div>
    </div>
  );
}

function ChonMa({ ma, onDoi }: { ma: string; onDoi: (m: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {MA_ALBUM.map((m) => (
        <button
          key={m.ma}
          type="button"
          onClick={() => onDoi(ma === m.ma ? "" : m.ma)}
          title={m.nghia ? `${m.ma} — ${m.nghia}` : m.ma}
          className={`min-h-7 rounded-full border px-2 text-[11px] tracking-wide transition ${
            ma === m.ma
              ? "border-transparent bg-fg text-bg"
              : "border-line-strong bg-bg text-fg-muted hover:border-accent hover:text-fg"
          }`}
        >
          {m.ma}
        </button>
      ))}
    </div>
  );
}

function DongThem({ dang, onLuu }: { dang: boolean; onLuu: (ten: string, ma: string) => void }) {
  const [ten, setTen] = useState("");
  const [ma, setMa] = useState("");
  return (
    <div className="mt-3 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <input
        autoFocus
        value={ten}
        onChange={(e) => setTen(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ten.trim() && onLuu(ten, ma)}
        placeholder="Tên loại buổi, ví dụ: Chụp sự kiện"
        className="input"
      />
      <p className="eyebrow mt-3">Mã album (không bắt buộc)</p>
      <div className="mt-1.5">
        <ChonMa ma={ma} onDoi={setMa} />
      </div>
      <button type="button" className="btn btn-primary mt-3" onClick={() => onLuu(ten, ma)} disabled={dang || !ten.trim()}>
        {dang ? "Đang lưu…" : "Thêm loại"}
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
  d: DongLoai;
  dang: boolean;
  onLuu: (ten: string, ma: string, dangDung: boolean) => void;
  onThoi: () => void;
}) {
  const [ten, setTen] = useState(d.ten);
  const [ma, setMa] = useState(d.maAlbum ?? "");
  const [dung, setDung] = useState(d.dangDung);
  const doiTen = ten.trim() !== d.ten;

  return (
    <tr className="bg-accent-soft/20">
      <td colSpan={5} className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-4">
          <label className="block min-w-56 flex-1">
            <span className="eyebrow block">Tên loại buổi</span>
            <input value={ten} onChange={(e) => setTen(e.target.value)} className="input mt-1.5" />
            {/*
              Báo trước bao nhiêu buổi sẽ đổi theo — anh chốt 18/11 là đổi tên
              thì lịch cũ đổi luôn. Con số này là thứ duy nhất cho người ta
              biết mình sắp đụng vào bao nhiêu dòng dữ liệu thật.
            */}
            {doiTen && d.soBuoi > 0 && (
              <span className="mt-1 block text-xs text-amber-700">
                {d.soBuoi} buổi chụp đang mang tên “{d.ten}” sẽ đổi theo.
              </span>
            )}
          </label>
          <div className="min-w-56">
            <span className="eyebrow block">Mã album</span>
            <div className="mt-1.5">
              <ChonMa ma={ma} onDoi={setMa} />
            </div>
          </div>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={dung} onChange={(e) => setDung(e.target.checked)} className="size-4" />
            Đang dùng
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onLuu(ten, ma, dung)}
            disabled={dang || !ten.trim()}
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
