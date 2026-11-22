"use client";

import type { Dispatch, SetStateAction } from "react";
import { tien } from "@/lib/constants";
import { ngayVN } from "@/lib/hopDongChung";
import { Khung } from "../ChonDichVu";

/*
  KHỐI ĐẦU VIỆC trong form lập hợp đồng — tách khỏi FormHopDongMoi 22/11/2026.

  Khối lớn nhất của bước ba (150 dòng) và cũng là khối tự chứa nhất: nó chỉ
  đọc danh sách việc gợi ý, cộng ba thứ người lập tự đổi (bỏ tick, đổi buổi,
  thêm việc tay). Không chạm tới khách, dịch vụ hay phiếu thu.

  TÁCH THEO KHỐI, không theo "bước" của form. Cắt đúng theo bước thì component
  bước 3 phải nhận hai mươi props vì nó chạm gần hết state của cha; khối này
  chỉ cần mười.

  BA CHỖ ĐỔI SO VỚI BẢN CŨ, đều là đổi cách LẤY dữ liệu chứ không đổi hành vi:
  trước đây khối đọc thẳng mảng `lich`, nay nhận `soBuoi`, `ngayBuoi(i)` và
  `nhanLich(i)`. Nhận cả mảng lịch vào đây thì khối này phải biết hình dạng
  một dòng lịch, trong khi nó chỉ cần đếm và hỏi ngày.

  Ngoài ba chỗ đó, mã giữ y nguyên: lớp CSS, chữ, thứ tự, chú thích.
*/

export type ViecGoiY = {
  khoa: string;
  dong: number;
  loai: string;
  donGia: number;
  soLuong: number;
  thoiHan: string;
  tenDV: string;
  /** Buổi thứ mấy TRONG LỊCH của cả hợp đồng, đếm từ 0. null = hậu kỳ. */
  buoi: number | null;
};

export type ViecTay = { loai: string; donGia: string; buoi: string };

export function KhoiDauViec({
  viecGoiY,
  boViec,
  setBoViec,
  setBuoiViec,
  viecTay,
  setViecTay,
  soBuoi,
  ngayBuoi,
  buoiCua,
  nhanLich,
}: {
  viecGoiY: ViecGoiY[];
  boViec: Set<string>;
  setBoViec: Dispatch<SetStateAction<Set<string>>>;
  setBuoiViec: Dispatch<SetStateAction<Map<string, string>>>;
  viecTay: ViecTay[];
  setViecTay: Dispatch<SetStateAction<ViecTay[]>>;
  /** Số dòng lịch — ô chọn buổi chỉ hiện khi từ hai buổi trở lên. */
  soBuoi: number;
  /** Ngày của buổi thứ `i`, để tính hạn hiện bên phải mỗi dòng việc. */
  ngayBuoi: (i: number) => string;
  /** Buổi thật sự của một việc: người lập đổi rồi thì theo họ, chưa thì theo bảng giá. */
  buoiCua: (v: { khoa: string; buoi: number | null }) => number | null;
  /** Chữ trên ô chọn buổi: "Buổi 2 · nhà trai 24/11". */
  nhanLich: (i: number) => string;
}) {
  return (
        <Khung
          ten="Đầu việc"
          chu="Việc tự sinh theo bảng giá hạng mục của từng dịch vụ, kèm tiền công người làm nhận. Ô bên phải không hỏi việc đó là việc gì — nó hỏi người làm phải có mặt ở buổi chụp nào, và quyết định việc hiện lên lịch ngày nào."
        >
          {viecGoiY.length === 0 ? (
            <p className="text-sm text-fg-muted">
              Những dịch vụ đã chọn chưa có bảng giá hạng mục nên chưa sinh đầu việc nào. Khai ở trang
              Dịch vụ thì lần sau tự có — hoặc thêm tay ngay bên dưới.
            </p>
          ) : (
            <div className="grid gap-1.5">
              {viecGoiY.map((v) => {
                const bo = boViec.has(v.khoa);
                const b = buoiCua(v);
                const han = (b !== null ? ngayBuoi(b) : "") || v.thoiHan;
                return (
                  <div
                    key={v.khoa}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line px-3 py-2 text-sm ${bo ? "opacity-50" : ""}`}
                  >
                    {/*
                      Điện thoại: tên việc chiếm trọn một hàng, ô buổi xuống
                      hàng dưới. Để cùng hàng thì ô chọn 11rem ăn mất chỗ và tên
                      bị cắt còn "Makeu", "Photos" — đo 20/11 ở 375px.
                    */}
                    <label className="flex w-full min-w-0 items-center gap-3 sm:w-auto sm:flex-1">
                      <input
                        type="checkbox"
                        checked={!bo}
                        onChange={() =>
                          setBoViec((cu) => {
                            const m = new Set(cu);
                            if (m.has(v.khoa)) m.delete(v.khoa);
                            else m.add(v.khoa);
                            return m;
                          })
                        }
                        className="size-4 shrink-0"
                      />
                      <span className="font-medium">{v.loai}</span>
                      <span className="truncate text-fg-faint">{v.tenDV}</span>
                    </label>

                    {/*
                      Ô BUỔI chỉ hiện khi lịch có TỪ HAI DÒNG trở lên — anh chốt
                      20/11/2026. Hợp đồng một buổi thì mọi việc đều thuộc buổi
                      ấy, bày thêm một ô chọn chỉ tổ bắt người lập bấm vô ích.
                    */}
                    {soBuoi >= 2 && (
                      <select
                        value={b === null ? "" : String(b)}
                        onChange={(e) => setBuoiViec((cu) => new Map(cu).set(v.khoa, e.target.value))}
                        disabled={bo}
                        className="input w-full py-1 text-xs sm:w-auto sm:min-w-[11rem]"
                        title="Người làm việc này có mặt ở buổi chụp nào — quyết định nó hiện lên lịch ngày nào"
                      >
                        <option value="">— Làm sau, không ra buổi —</option>
                        {Array.from({ length: soBuoi }).map((_, i) => (
                          <option key={i} value={i}>
                            {nhanLich(i)}
                          </option>
                        ))}
                      </select>
                    )}

                    <span className="ml-auto shrink-0 tabular-nums text-fg-muted">
                      {tien(Math.round(v.donGia * v.soLuong))}
                      {han && <span className="ml-2 text-fg-faint">hạn {ngayVN(han)}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/*
            THÊM VIỆC TAY — anh yêu cầu 20/11/2026.

            Đứng ngay dưới danh sách tự sinh chứ không thành khối riêng: người
            lập nhìn một lượt là thấy đủ việc của hợp đồng này, không phải nhớ
            còn một chỗ nữa ở đâu đó.
          */}
          <div className="mt-4 border-t border-line pt-3">
            {viecTay.length > 0 && (
              <div className="grid gap-1.5">
                {viecTay.map((v, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-2"
                  >
                    <input
                      value={v.loai}
                      onChange={(e) =>
                        setViecTay((ds) => ds.map((x, j) => (i === j ? { ...x, loai: e.target.value } : x)))
                      }
                      placeholder="Tên việc — Chụp nhà gái, Quay lễ tối…"
                      className="input w-full py-1 text-sm sm:w-auto sm:min-w-[10rem] sm:flex-1"
                    />
                    <input
                      value={v.donGia}
                      onChange={(e) =>
                        setViecTay((ds) => ds.map((x, j) => (i === j ? { ...x, donGia: e.target.value } : x)))
                      }
                      inputMode="numeric"
                      placeholder="Tiền công"
                      className="input w-28 py-1 text-right text-sm tabular-nums"
                    />
                    {soBuoi >= 2 && (
                      <select
                        value={v.buoi}
                        onChange={(e) =>
                          setViecTay((ds) => ds.map((x, j) => (i === j ? { ...x, buoi: e.target.value } : x)))
                        }
                        className="input w-full py-1 text-xs sm:w-auto sm:min-w-[11rem]"
                      >
                        <option value="">— Làm sau, không ra buổi —</option>
                        {Array.from({ length: soBuoi }).map((_, k) => (
                          <option key={k} value={k}>
                            {nhanLich(k)}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => setViecTay((ds) => ds.filter((_, j) => j !== i))}
                      className="grid size-8 shrink-0 place-items-center rounded-md border border-line text-fg-faint transition hover:border-red-300 hover:text-red-700"
                      aria-label={`Bỏ việc thêm tay ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() =>
                setViecTay((ds) => [
                  ...ds,
                  /* Gắn sẵn buổi đầu: việc thêm tay gần như luôn là việc hiện trường. */
                  { loai: "", donGia: "", buoi: soBuoi > 0 ? "0" : "" },
                ])
              }
              className="btn btn-gon mt-2"
            >
              + Thêm việc ngoài bảng giá
            </button>
          </div>
        </Khung>
  );
}
