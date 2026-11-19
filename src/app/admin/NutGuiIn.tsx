"use client";

import { useEffect, useState, useTransition } from "react";
import { guiInAction } from "./actionsHopDong";
import { MUI_GIO } from "@/lib/constants";

/**
 * Nút "Đã gửi in" trên thẻ album — anh yêu cầu 19/11/2026.
 *
 * Việc thật của Media: khách duyệt xong ảnh hoàn thiện thì còn phải gửi link
 * Drive cho xưởng in qua Zalo. Web không thấy việc đó, nên trước đây hợp đồng
 * đứng ở bước 6 "Chờ Khách duyệt" cho tới khi ai đó nhớ ra mà đổi tay.
 *
 * ĐIỀU KIỆN BẤM LÀ PHẢI DÁN LINK (anh chốt): không có link thì nút chuyển bước
 * mờ đi. Bước 7 nói "đã gửi in" mà không có gì chứng minh đã gửi cái gì thì
 * hình in sai không truy được.
 *
 * Nút chỉ hiện khi hợp đồng ở bước 6 hoặc 15 — thẻ album quyết việc đó, xem
 * `GUI_IN_HIEN_O`. Ô dán link nằm trong POPUP vì thẻ album chỉ rộng 325px: đo
 * 04/09/2026 một nút 236px đã làm hàng nút vỡ thành ba dòng, nên một ô nhập
 * nhiều dòng thì không có chỗ.
 */
const GIO_NGAY = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function NutGuiIn({
  galleryId,
  tenAlbum,
  lop,
}: {
  galleryId: string;
  tenAlbum: string;
  /** Lớp CSS cho nút — thẻ album gọi nó trong bảng "…" nên hình dạng khác. */
  lop?: string;
}) {
  const [mo, setMo] = useState(false);
  const [linkTho, setLinkTho] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  useEffect(() => {
    if (!mo) return;
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMo(false);
    };
    window.addEventListener("keydown", phim);
    return () => window.removeEventListener("keydown", phim);
  }, [mo]);

  /*
    Đếm link NGAY TRONG TRÌNH DUYỆT để nút nói được "gửi in 2 link".
    Phép tách thật nằm ở máy chủ (`tachLink`) — đây chỉ là con số cho người
    nhìn, nên tách thô bằng khoảng trắng là đủ và không cần khớp từng ký tự.
  */
  const soLink = linkTho.split(/[\s,]+/).filter(Boolean).length;

  const gui = () =>
    start(async () => {
      setLoi(null);
      const kq = await guiInAction(galleryId, linkTho, ghiChu);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      const luc = kq.dot ? GIO_NGAY.format(new Date(kq.dot.luc)) : "";
      setXong(
        [
          `Đã ghi đợt gửi in ${luc} · ${kq.dot?.links.length ?? 0} link`,
          kq.doiBuoc ? `Hợp đồng chuyển sang “${kq.doiBuoc.den}”` : null,
        ]
          .filter(Boolean)
          .join(". "),
      );
      setLinkTho("");
      setGhiChu("");
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setLoi(null);
          setXong(null);
          setMo(true);
        }}
        className={lop ?? "btn"}
        title="Khách đã duyệt ảnh hoàn thiện. Dán link Drive đã gửi cho xưởng in, rồi chuyển hợp đồng sang bước “Gửi in”."
      >
        Đã gửi in
      </button>

      {/* Báo kết quả ngay cạnh nút — làm xong mà im lặng thì lần sau không ai dám bấm. */}
      {xong && <span className="self-center text-xs text-fg-muted">{xong}</span>}

      {mo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Gửi in ${tenAlbum}`}
          className="nen-hien fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setMo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="hop-hien card relative w-full max-w-lg p-5 sm:p-6"
          >
            <button
              type="button"
              onClick={() => setMo(false)}
              aria-label="Đóng"
              className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
            >
              ✕
            </button>

            <p className="eyebrow">Gửi in cho xưởng</p>
            <h2 className="mt-1 pr-10 font-display text-2xl font-light">{tenAlbum}</h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Dán link Drive anh chị vừa gửi cho xưởng qua Zalo. Nhiều link thì mỗi link một dòng.
            </p>

            <label className="mt-4 block">
              <span className="eyebrow block">Link đã gửi in</span>
              <textarea
                value={linkTho}
                onChange={(e) => setLinkTho(e.target.value)}
                rows={4}
                placeholder={"https://drive.google.com/…\nhttps://drive.google.com/…"}
                className="input mt-1.5 font-mono text-xs"
                autoFocus
              />
            </label>

            {/*
              Ghi chú để trả lời câu "link in của đợt nào" — anh yêu cầu. KHÔNG
              phải ô chọn: tên thư mục hoàn thiện mỗi album mỗi khác ("file hoàn
              thiện 1", "photobook hoàn thiện"), nên một ô chọn cứng chắc chắn
              có lúc sai. Để trống được — đợt vẫn định danh bằng thứ tự và giờ.
            */}
            <label className="mt-3 block">
              <span className="eyebrow block">Đợt nào (không bắt buộc)</span>
              <input
                value={ghiChu}
                onChange={(e) => setGhiChu(e.target.value)}
                placeholder="nhà gái, HC, photobook…"
                className="input mt-1.5"
              />
            </label>

            {loi && (
              <p className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {loi}
              </p>
            )}

            <p className="mt-3 text-xs leading-relaxed text-fg-faint">
              Ghi xong, hợp đồng của nhà này chuyển sang bước “Gửi in”. Xem lại các đợt đã gửi ở
              cửa sổ Logs.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {/*
                Nút MỜ ĐI khi chưa dán link — anh chốt phải dán link mới cho
                chuyển bước. Chữ trên nút đếm luôn số link, để người bấm biết
                mình đang gửi mấy cái.
              */}
              <button
                type="button"
                onClick={gui}
                disabled={dangLuu || soLink === 0}
                className={soLink === 0 ? "btn cursor-not-allowed opacity-45" : "btn-primary"}
                title={soLink === 0 ? "Dán ít nhất một link thì mới chuyển bước được." : undefined}
              >
                {dangLuu
                  ? "Đang ghi…"
                  : soLink === 0
                    ? "Chưa có link"
                    : `Ghi ${soLink} link và chuyển bước`}
              </button>
              <button type="button" onClick={() => setMo(false)} className="btn">
                Thôi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
