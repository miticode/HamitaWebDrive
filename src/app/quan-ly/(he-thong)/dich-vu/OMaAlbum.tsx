"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MA_ALBUM, type MaAlbum } from "@/lib/maAlbum";
import { ganMaAlbumAction } from "../../actionsDichVu";

/*
  Ô MÃ ALBUM NGAY TRÊN BẢNG — anh yêu cầu 18/11/2026 ("hiện tag lên đây để a xem").

  Hôm anh mở bảng thì cả 95 dịch vụ đều chưa gắn mã nào, nên cột này trống
  trơn và nhìn như chưa làm gì. Mà muốn gắn thì phải mở từng form sửa — bảng
  có 95 dịch vụ, 888 trang phục, 37 sản phẩm, gắn kiểu đó là vài trăm lần mở
  trang.

  Nên gắn thẳng tại dòng: bấm ô, chọn mã, xong. Không có nút Lưu — chọn là
  lưu luôn, vì đây là một ô duy nhất chứ không phải cả biểu mẫu, và bắt bấm
  thêm một nút nữa cho mỗi trong chín trăm dòng là phí.
*/
export function OMaAlbum({
  id,
  maDau,
  suaDuoc,
  boMa = MA_ALBUM,
}: {
  id: string;
  /** Mã đang gắn, "" nếu chưa có. */
  maDau: string;
  /** Không có quyền sửa loại này thì chỉ xem. */
  suaDuoc: boolean;
  /**
   * Bộ mã album, đọc từ bảng `MaAlbum` (anh yêu cầu 19/11/2026).
   * Thiếu thì dùng bộ cứng — ô chọn không bao giờ được phép rỗng.
   */
  boMa?: readonly MaAlbum[];
}) {
  const router = useRouter();
  const [ma, setMa] = useState(maDau);
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const khung = useRef<HTMLDivElement>(null);

  /* Máy chủ đổi mã (người khác sửa, hoặc revalidate) thì ô này theo luôn. */
  useEffect(() => setMa(maDau), [maDau]);

  /*
    Bấm ra ngoài hoặc Escape thì đóng. Bảng có tới chín trăm dòng, mỗi dòng
    một ô như thế này — để mở lung tung thì màn hình đầy bảng chọn.
  */
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (khung.current && !khung.current.contains(e.target as Node)) setMo(false);
    };
    const phim = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo]);

  const chon = (moi: string) =>
    batDau(async () => {
      setLoi(null);
      const truoc = ma;
      /* Đổi ngay trên màn hình cho khỏi khựng, hỏng thì trả về như cũ. */
      setMa(moi);
      setMo(false);
      const kq = await ganMaAlbumAction(id, moi);
      if (kq.loi) {
        setMa(truoc);
        setLoi(kq.loi);
        return;
      }
      router.refresh();
    });

  if (!suaDuoc) {
    return ma ? <ChipMa ma={ma} /> : <span className="text-fg-faint">—</span>;
  }

  return (
    <div ref={khung} className="relative inline-block">
      <button
        type="button"
        onClick={() => setMo((x) => !x)}
        disabled={dang}
        aria-expanded={mo}
        title={ma ? `Mã album: ${ma}` : "Chưa gắn mã album"}
        className={
          ma
            ? "rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-[11px] tracking-wide text-accent transition hover:border-accent"
            : "rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[11px] text-fg-faint transition hover:border-accent hover:text-accent"
        }
      >
        {ma || "+ mã"}
      </button>

      {mo && (
        <div className="absolute top-full left-0 z-30 mt-1 w-56 rounded-md border border-line bg-bg-raised p-2 shadow-lift">
          <div className="flex flex-wrap gap-1">
            {boMa.map((m) => (
              <button
                key={m.ma}
                type="button"
                onClick={() => chon(ma === m.ma ? "" : m.ma)}
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
          {ma && (
            <button
              type="button"
              onClick={() => chon("")}
              className="mt-2 w-full rounded border border-line px-2 py-1 text-[11px] text-fg-muted transition hover:border-accent hover:text-fg"
            >
              Bỏ mã
            </button>
          )}
        </div>
      )}

      {loi && <p className="mt-1 text-[11px] text-red-700">{loi}</p>}
    </div>
  );
}

function ChipMa({ ma }: { ma: string }) {
  return (
    <span className="rounded-full border border-accent/40 bg-accent-soft px-2.5 py-0.5 text-[11px] tracking-wide text-accent">
      {ma}
    </span>
  );
}
