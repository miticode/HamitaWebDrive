"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  chepDanhMucAction,
  suaDanhMucAction,
  themDanhMucAction,
  xoaDanhMucAction,
} from "../../actionsDanhMuc";
import { Bang, Hang, HangRong, O, type CotBang } from "../_ui/Bang";

export type DongDanhMuc = {
  id: string;
  ten: string;
  dangDung: boolean;
  /** Bao nhiêu bản ghi đang mang giá trị này. */
  soDung: number;
};

/*
  BẢNG DANH MỤC DÙNG CHUNG — anh yêu cầu 18/11/2026.

  Một component cho cả ba nhóm (loại hợp đồng, hình thức thu, nội dung thu):
  chúng giống hệt nhau về thao tác, chỉ khác chữ trên tiêu đề và đơn vị đếm.
  Viết ba bản gần như chép lại nhau là ba chỗ phải sửa khi đổi một hành vi.

  Cùng hai ràng buộc anh chốt cho loại buổi chụp: đổi tên thì dữ liệu cũ đổi
  theo, xoá thì chặn khi còn dữ liệu dùng.
*/
/* Cột "Việc" chỉ quản lý thấy, nên khai theo tên. */
const COT = {
  ten: { ten: "Giá trị", chinh: true },
  dangDung: { ten: "Đang dùng", phai: true },
  trangThai: { ten: "Trạng thái" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

export function BangDanhMuc({
  nhom,
  ds,
  laQuanLy,
  donVi,
  tenCot,
}: {
  nhom: string;
  ds: DongDanhMuc[];
  laQuanLy: boolean;
  /** "hợp đồng" hay "phiếu thu" — hiện ở cột đếm cho rõ đang đếm cái gì. */
  donVi: string;
  tenCot: string;
}) {
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
            {themMo ? "Thôi" : "+ Thêm giá trị"}
          </button>
          {/* Chỉ hiện lúc bảng còn rỗng — đây là việc làm MỘT LẦN. */}
          {ds.length === 0 && (
            <button
              type="button"
              className="btn"
              disabled={dang}
              onClick={() =>
                batDau(async () => {
                  const kq = await chepDanhMucAction(nhom);
                  if (xong(kq)) setNhac(kq.them ? `Đã chép ${kq.them} giá trị.` : "Không có gì để chép.");
                })
              }
            >
              Chép giá trị đang dùng
            </button>
          )}
        </div>
      )}

      {themMo && laQuanLy && (
        <DongThem
          dang={dang}
          onLuu={(ten) =>
            batDau(async () => {
              if (xong(await themDanhMucAction(nhom, ten))) setThemMo(false);
            })
          }
        />
      )}

      {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
      {nhac && !loi && <p className="mt-3 text-sm text-emerald-700">{nhac}</p>}

      <Bang
        lop="mt-4"
        /* Tên cột đầu do nơi gọi đặt — "Loại hợp đồng", "Hình thức thu"… */
        cot={[{ ...COT.ten, ten: tenCot }, COT.dangDung, COT.trangThai, ...(laQuanLy ? [COT.viec] : [])]}
        trong="Chưa có giá trị nào. Web đang dùng bảng cứng sẵn có — bấm “Chép giá trị đang dùng” để quản lý được từ đây."
      >
        {ds.map((d) =>
              suaId === d.id ? (
                <DongSua
                  key={d.id}
                  d={d}
                  donVi={donVi}
                  dang={dang}
                  onThoi={() => setSuaId(null)}
                  soCot={laQuanLy ? 4 : 3}
                  onLuu={(ten, dung) =>
                    batDau(async () => {
                      const kq = await suaDanhMucAction(d.id, { ten, dangDung: dung });
                      if (xong(kq)) {
                        setSuaId(null);
                        if (kq.doiTheo) setNhac(`Đã đổi tên, và ${kq.doiTheo} ${donVi} đổi theo.`);
                      }
                    })
                  }
                />
              ) : (
                <Hang key={d.id} lop={`transition hover:bg-bg-soft ${d.dangDung ? "" : "opacity-60"}`}>
                  <O cot={COT.ten} lop="font-medium">
                    {d.ten}
                  </O>
                  <O cot={COT.dangDung} lop="text-fg-muted tabular-nums">
                    {d.soDung}
                  </O>
                  <O cot={COT.trangThai} lop="whitespace-nowrap">
                    {d.dangDung ? (
                      <span className="text-fg-muted">Đang dùng</span>
                    ) : (
                      <span className="text-fg-faint">Ngưng dùng</span>
                    )}
                  </O>
                  {laQuanLy && (
                    <O cot={COT.viec} lop="whitespace-nowrap">
                      <button type="button" className="btn px-3 py-1 text-xs" onClick={() => setSuaId(d.id)} disabled={dang}>
                        Sửa
                      </button>
                      {/*
                        Nút xoá LUÔN HIỆN, kể cả khi chắc chắn bị từ chối —
                        bài học 18/11: giấu nút thì người dùng tưởng chức năng
                        không tồn tại. Bấm vào thì nói rõ vì sao và làm gì thay.
                      */}
                      <button
                        type="button"
                        className="btn btn-danger ml-2 px-3 py-1 text-xs"
                        disabled={dang}
                        onClick={() => {
                          if (d.soDung > 0) {
                            setNhac(null);
                            setLoi(
                              `“${d.ten}” đang có ${d.soDung} ${donVi} dùng nên không xoá được. ` +
                                "Bấm Sửa rồi bỏ tick “Đang dùng” để nó không hiện trong ô chọn nữa.",
                            );
                            return;
                          }
                          if (choXoa === d.id) {
                            batDau(async () => {
                              setChoXoa(null);
                              if (xong(await xoaDanhMucAction(d.id))) setNhac(`Đã xoá “${d.ten}”.`);
                            });
                          } else {
                            setLoi(null);
                            setChoXoa(d.id);
                          }
                        }}
                      >
                        {choXoa === d.id ? "Bấm lần nữa để xoá" : "Xoá"}
                      </button>
                    </O>
                  )}
                </Hang>
              ),
            )}
      </Bang>
    </div>
  );
}

function DongThem({ dang, onLuu }: { dang: boolean; onLuu: (ten: string) => void }) {
  const [ten, setTen] = useState("");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <input
        autoFocus
        value={ten}
        onChange={(e) => setTen(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ten.trim() && onLuu(ten)}
        placeholder="Gõ giá trị mới rồi bấm Enter"
        className="input max-w-sm flex-1"
      />
      <button type="button" className="btn btn-primary" onClick={() => onLuu(ten)} disabled={dang || !ten.trim()}>
        {dang ? "Đang lưu…" : "Thêm"}
      </button>
    </div>
  );
}

function DongSua({
  d,
  donVi,
  dang,
  soCot,
  onLuu,
  onThoi,
}: {
  d: DongDanhMuc;
  donVi: string;
  dang: boolean;
  /** Số cột đang hiện — hàng form chiếm trọn bấy nhiêu. */
  soCot: number;
  onLuu: (ten: string, dangDung: boolean) => void;
  onThoi: () => void;
}) {
  const [ten, setTen] = useState(d.ten);
  const [dung, setDung] = useState(d.dangDung);
  const doiTen = ten.trim() !== d.ten;

  return (
    <HangRong soCot={soCot} lop="bg-accent-soft/20">
        <div className="flex flex-wrap items-start gap-4">
          <label className="block min-w-56 flex-1">
            <span className="eyebrow block">Giá trị</span>
            <input value={ten} onChange={(e) => setTen(e.target.value)} className="input mt-1.5" />
            {/* Con số này là thứ duy nhất cho biết sắp đụng vào bao nhiêu dòng thật. */}
            {doiTen && d.soDung > 0 && (
              <span className="mt-1 block text-xs text-amber-700">
                {d.soDung} {donVi} đang mang “{d.ten}” sẽ đổi theo.
              </span>
            )}
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm">
            <input type="checkbox" checked={dung} onChange={(e) => setDung(e.target.checked)} className="size-4" />
            Đang dùng
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => onLuu(ten, dung)} disabled={dang || !ten.trim()}>
            {dang ? "Đang lưu…" : "Lưu"}
          </button>
          <button type="button" className="btn" onClick={onThoi} disabled={dang}>
            Thôi
          </button>
        </div>
    </HangRong>
  );
}
