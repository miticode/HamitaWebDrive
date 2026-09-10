"use client";

import { useEffect, useState } from "react";
import { STUDIO } from "@/lib/studio";
import { danhSachHoiDap } from "@/lib/hoiDap";

/**
 * Khung hỏi đáp nổi ở góc trang album — chỗ khách hỏi khi thắc mắc.
 *
 * KHÔNG DÙNG AI. Toàn bộ câu trả lời dựng sẵn ở máy chủ từ dữ liệu của chính
 * album đang mở (xem `src/lib/hoiDap.ts`). Không gọi mạng lần nào sau khi trang
 * đã tải: không tốn tiền, không chậm, và không có cách nào bịa ra một con số
 * khác với con số đang hiện trên trang.
 *
 * KHÁCH BẤM, KHÔNG GÕ. Đây là điểm mấu chốt, đừng đổi thành ô nhập chữ: tệp
 * khách của studio ít đọc và ít gõ trên web — một ô trống bắt họ tự nghĩ ra câu
 * hỏi thì phần lớn sẽ bỏ qua. Danh sách nút bấm thì đọc lướt là thấy ngay câu
 * mình đang thắc mắc.
 *
 * Câu nào không có trong danh sách thì dẫn thẳng sang Zalo và số điện thoại
 * studio — cũng là đường liên hệ DUY NHẤT trên trang album, vốn không có từ khi
 * bỏ khối "Phân vân quá…" ngày 28/08/2026.
 */
export function HopHoiDap({
  soAnhTrongGoi,
  giaAnhThem,
  choTaiAnh,
  hanGiuAnh,
  goiTungMuc,
}: {
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
  choTaiAnh: boolean;
  /** Ngày dọn ảnh, đã định dạng sẵn ở máy chủ theo giờ studio. */
  hanGiuAnh: string | null;
  /** Các thư mục có gói riêng — chỉ truyền ở trang bìa, xem danhSachHoiDap. */
  goiTungMuc?: { tenMuc: string; soAnh: number }[];
}) {
  const [mo, setMo] = useState(false);
  /** Câu đang mở. null = chưa mở câu nào, đang xem danh sách. */
  const [dangXem, setDangXem] = useState<number | null>(null);

  const ds = danhSachHoiDap({
    soAnhTrongGoi,
    giaAnhThem,
    choTaiAnh,
    hanGiuAnh,
    goiTungMuc,
  });

  /*
    Esc đóng khung — cùng phím với khung xem ảnh to và hộp nhập mã, để khách
    không phải nhớ mỗi chỗ một kiểu.
  */
  useEffect(() => {
    if (!mo) return;
    const nghe = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMo(false);
    };
    window.addEventListener("keydown", nghe);
    return () => window.removeEventListener("keydown", nghe);
  }, [mo]);

  if (!mo) {
    return (
      /*
        Nút nổi ở góc TRÁI dưới, không phải góc phải.

        Góc phải dưới đã có nút "lên đầu trang" của lưới ảnh (`fixed right-4
        bottom-4`). Hai nút tròn chồng chỗ nhau thì khách bấm nhầm, mà dời nút
        cũ đi thì đụng vào thứ đang chạy tốt. Bên trái đang trống hẳn.

        z-30: trên nội dung trang, nhưng DƯỚI khung xem ảnh to (z-50) và hộp
        nhập mã (z-60) — khách đang ngắm ảnh toàn màn hình thì không có nút nào
        nổi lên che ảnh.
      */
      <button
        type="button"
        onClick={() => setMo(true)}
        aria-label="Hỏi Hamita"
        className="fixed bottom-4 left-4 z-30 flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-bg-raised/95 pr-4 pl-3 text-sm text-fg shadow-[var(--shadow-soft)] backdrop-blur transition hover:border-accent hover:text-accent sm:bottom-6 sm:left-6"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-5 shrink-0 text-accent"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
          <path d="M9 9h6M9 12.5h4" />
        </svg>
        Hỏi Hamita
      </button>
    );
  }

  return (
    /*
      Trên điện thoại là tấm trượt lên từ đáy, trên máy tính là thẻ neo ở góc
      trái — giống cách hộp nhập mã và bảng chỉ đường cài app đang làm, để cả
      trang chỉ có một kiểu hộp thoại.
    */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Hỏi Hamita"
      onClick={() => setMo(false)}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-end sm:justify-start sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85svh] w-full max-w-lg flex-col rounded-t-lg border border-line bg-bg-raised sm:max-h-[80svh] sm:rounded-lg"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-light">
              Hamita nghe đây ạ
            </p>
            <p className="mt-0.5 text-xs text-fg-muted">
              Anh chị bấm vào câu mình đang thắc mắc nhé
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMo(false)}
            aria-label="Đóng"
            className="grid size-11 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ul className="flex flex-col gap-1.5">
            {ds.map((c, i) => {
              const dangMo = dangXem === i;
              return (
                <li key={c.hoi}>
                  {/*
                    Bấm lần nữa thì gấp lại, và mỗi lúc chỉ mở MỘT câu: mở hết
                    ra cùng lúc thì khung thành một bài dài, đúng thứ khách
                    không đọc.
                  */}
                  <button
                    type="button"
                    onClick={() => setDangXem(dangMo ? null : i)}
                    aria-expanded={dangMo}
                    className={`flex min-h-11 w-full items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-left text-sm transition ${
                      dangMo
                        ? "border-accent bg-accent-soft text-fg"
                        : "border-line bg-bg-soft text-fg hover:border-accent"
                    }`}
                  >
                    <span className="min-w-0 flex-1">{c.hoi}</span>
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      className={`size-4 shrink-0 text-fg-faint transition-transform ${dangMo ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {dangMo && (
                    /* whitespace-pre-line: câu trả lời xuống dòng bằng "\n"
                       trong hoiDap.ts, giữ nguyên cách ngắt đoạn đã viết. */
                    <p className="mt-1.5 mb-1 rounded-md bg-bg-soft px-3.5 py-3 text-sm leading-relaxed whitespace-pre-line text-fg-muted">
                      {c.dap}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/*
          Đường sang người thật LUÔN ĐỨNG SẴN ở đáy, không đợi khách bấm hết
          các câu mới hiện. Khung này chỉ trả lời được chừng ấy việc; thứ nó
          không biết thì phải giao lại cho studio ngay, đừng để khách loay hoay.
        */}
        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 text-xs text-fg-muted">
            Không có câu anh chị cần? Nhắn thẳng cho Hamita nhé ạ:
          </p>
          <div className="flex gap-2">
            <a
              href={STUDIO.zalo}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex-1 justify-center"
            >
              Nhắn Zalo
            </a>
            <a
              href={`tel:${STUDIO.dienThoaiSo}`}
              className="btn flex-1 justify-center"
            >
              Gọi {STUDIO.dienThoai}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
