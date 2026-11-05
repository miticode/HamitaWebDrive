"use client";

import { useEffect, useMemo, useState } from "react";
import { MUI_GIO, homNayStudio, ngayVietTat, soNgayToiHan } from "@/lib/constants";
import { useSelection } from "./Selection";

/**
 * Cửa sổ hỏi NGÀY CẦN LẤY HÌNH, hiện ngay sau khi khách bấm "đã chọn xong"
 * ở thư mục file gốc hình cổng / album (anh yêu cầu 05/11/2026).
 *
 * Vì sao phải hỏi: ảnh cổng và album là thứ phải xong TRƯỚC ngày cưới, mà
 * trước đây Media chỉ biết "khách đã chọn xong" chứ không biết khách cần khi
 * nào — nhà nào cũng thành gấp như nhau. Hỏi đúng lúc khách vừa bấm xong là
 * lúc duy nhất họ còn đang nghĩ về bộ ảnh này.
 *
 * Chỉ chặn đúng nút "đã chọn xong". Nút "chọn thêm nữa" và "cần chỉnh lại" đi
 * thẳng — xem `baoDaXong` trong Selection.tsx, cửa đặt ở đó chứ không ở từng
 * nút vì có HAI nơi bấm báo xong (thanh trên và khối cuối trang).
 *
 * KHÔNG BẮT BUỘC. Có nút "Chưa biết, để Hamita chủ động" vẫn báo xong bình
 * thường, chỉ là không kèm hạn. Chặn lại thì khách không biết ngày sẽ kẹt ở
 * đây, mà việc chính — báo cho studio biết đã chọn xong — mới là thứ không
 * được mất.
 */

function themNgay(ngay: string, them: number): string {
  const d = new Date(`${ngay}T00:00:00+07:00`);
  d.setDate(d.getDate() + them);
  return d.toLocaleDateString("sv-SE", { timeZone: MUI_GIO });
}

/* Dưới chừng này ngày thì nhắc nhẹ — KHÔNG chặn, xem chú thích ở nút gợi ý. */
const NGAY_HOI_GAP = 7;

const GOI_Y = [
  { ngay: 7, chu: "1 tuần nữa" },
  { ngay: 14, chu: "2 tuần nữa" },
  { ngay: 30, chu: "1 tháng nữa" },
];

export function HoiNgayLay({ tenMuc }: { tenMuc: string }) {
  const { hoiNgay, dongHoiNgay, chotNgayLay } = useSelection();
  const [ngay, setNgay] = useState("");

  const nay = useMemo(() => homNayStudio(), []);

  useEffect(() => {
    if (!hoiNgay) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dongHoiNgay();
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [hoiNgay, dongHoiNgay]);

  if (!hoiNgay) return null;

  const con = ngay ? soNgayToiHan(ngay) : null;
  const gap = con !== null && con < NGAY_HOI_GAP;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={dongHoiNgay}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Bước cuối cùng</p>
        <h2 className="mt-1.5 font-display text-2xl leading-snug font-light">
          Anh chị cần lấy hình ngày nào ạ?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fg-muted">
          Hamita ghi lại ngày này để bên chỉnh ảnh sắp lịch cho kịp, anh chị
          không phải nhắc lại ạ.
        </p>

        {/*
          Ba nút gợi ý đặt TRƯỚC ô lịch: phần lớn khách rơi vào một trong ba
          mốc này, bấm một cái là xong. Ô lịch của điện thoại mở ra là cả một
          bảng tháng, bắt ai cũng phải đi qua nó là bắt làm việc khó hơn mức
          cần thiết.
        */}
        <div className="mt-5 flex flex-wrap gap-2">
          {GOI_Y.map((g) => {
            const d = themNgay(nay, g.ngay);
            const dangChon = ngay === d;
            return (
              <button
                key={g.ngay}
                type="button"
                onClick={() => setNgay(d)}
                className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-[3px] border px-3 text-sm transition ${
                  dangChon
                    ? "border-accent bg-accent text-white"
                    : "border-line-strong bg-bg-raised text-fg hover:border-accent"
                }`}
              >
                {g.chu}
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="eyebrow">Hoặc chọn đúng ngày</span>
          {/*
            `min` đặt là HÔM NAY chứ không phải mai: có khách chọn xong là cần
            lấy trong ngày. Không chặn ngày gấp — studio mới là người quyết
            nhận hay không, cái web không thay họ từ chối khách được. Gấp thì
            chỉ nhắc một dòng bên dưới.
          */}
          <input
            type="date"
            value={ngay}
            min={nay}
            onChange={(e) => setNgay(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm text-fg"
          />
        </label>

        {gap && (
          <p className="mt-2.5 text-xs leading-relaxed text-amber-700">
            Ngày này hơi gấp ạ — Hamita vẫn nhận và sẽ gọi lại cho anh chị để
            xác nhận nhé.
          </p>
        )}

        <button
          type="button"
          disabled={!ngay}
          onClick={() => chotNgayLay(ngay)}
          className="btn-primary mt-5 w-full text-sm disabled:cursor-not-allowed disabled:opacity-45"
        >
          {ngay ? `Báo Hamita — cần lấy ${ngayVietTat(ngay)}` : "Anh chị chọn ngày giúp Hamita"}
        </button>

        <button
          type="button"
          onClick={() => chotNgayLay(null)}
          className="mt-2 w-full py-2 text-xs text-fg-faint transition hover:text-accent"
        >
          Chưa biết ngày, để Hamita chủ động
        </button>

        {/*
          Nói rõ đang báo cho THƯ MỤC NÀO. Trạng thái xong tính riêng từng thư
          mục (nguyên tắc 20), mà cửa sổ này che hết màn hình nên khách không
          còn thấy mình đang đứng ở đâu.
        */}
        <p className="mt-3 text-center text-[11px] leading-relaxed text-fg-faint">
          Đang báo xong thư mục <span className="italic">{tenMuc}</span>
        </p>
      </div>
    </div>
  );
}
