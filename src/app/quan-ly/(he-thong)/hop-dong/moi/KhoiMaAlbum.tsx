"use client";

import type { MaAlbum } from "@/lib/maAlbum";
import { Khung } from "../ChonDichVu";

/*
  KHỐI MÃ ALBUM trong form lập hợp đồng — tách khỏi FormHopDongMoi 22/11/2026.

  Tách THEO KHỐI, không theo "bước" của form. Form chia ba bước (khách → dịch
  vụ → lịch), nhưng cắt đúng theo bước thì component bước 3 phải nhận hai mươi
  props vì nó chạm tới gần hết state của cha. Khối này chỉ cần năm, nên nó
  đứng riêng được mà không kéo theo cả bộ máy.

  KHÔNG đổi một dòng logic nào: mã, lớp CSS, chữ, thứ tự — y nguyên.
*/
export function KhoiMaAlbum({
  boMa,
  maAlbum,
  maGoiY,
  maTuGo,
  tenAlbumXem,
  doiMa,
  veNhuWebDoan,
}: {
  boMa: readonly MaAlbum[];
  /** Mã đang chọn — gợi ý của web, hoặc thứ người lập tự bấm. */
  maAlbum: string[];
  /** Mã web tự đoán từ dịch vụ và lịch. */
  maGoiY: string[];
  /** `null` = chưa ai đụng vào, cứ theo gợi ý. Khác hẳn mảng rỗng. */
  maTuGo: string[] | null;
  /** Tên album sẽ ra, đã ghép mã vào trước tên khách. */
  tenAlbumXem: string;
  doiMa: (ma: string) => void;
  veNhuWebDoan: () => void;
}) {
  return (
    <Khung
      ten="Mã album"
      chu="Album trên web sẽ mang mã này ở đầu tên. Thư mục trên Drive thì không — mã chỉ để lọc ở trang quản lý album."
    >
      <div className="flex flex-wrap gap-1.5">
        {boMa.map((m) => {
          const chon = maAlbum.includes(m.ma);
          return (
            <button
              key={m.ma}
              type="button"
              onClick={() => doiMa(m.ma)}
              title={m.nghia ? `${m.ma} — ${m.nghia}` : m.ma}
              aria-pressed={chon}
              className={`min-h-8 rounded-full border px-2.5 text-xs tracking-wide transition ${
                chon
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
              }`}
            >
              {m.ma}
            </button>
          );
        })}
      </div>
      {/*
        Hiện luôn TÊN SẼ RA. Người lập không phải dịch "HIS + HER" trong
        đầu thành cái tên thật, và nhìn một cái là biết mình bấm đúng chưa.
      */}
      <p className="mt-2 text-xs text-fg-muted">
        Album sẽ tên: <b className="text-fg">{tenAlbumXem}</b>
        {maTuGo === null && maGoiY.length > 0 && (
          <span className="text-fg-faint"> · web tự đoán theo dịch vụ và lịch</span>
        )}
        {maTuGo !== null && (
          <>
            {" · "}
            <button
              type="button"
              onClick={veNhuWebDoan}
              className="underline underline-offset-2 hover:text-accent"
            >
              về như web đoán
            </button>
          </>
        )}
      </p>
    </Khung>
  );
}
