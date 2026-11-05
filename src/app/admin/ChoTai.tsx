"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setChoTaiAction } from "./actions";

/**
 * Bật/tắt quyền tải ảnh của album.
 *
 * Anh hỏi 02/10/2026 "nút bật cho phép tải ảnh ở đâu" — và câu trả lời lúc đó
 * là: không có. Cờ này chỉ đặt được MỘT LẦN trong ô tích của khung "Tạo link
 * mới", rồi không còn đường nào đổi. Nhà nào lúc tạo quên tích thì khách vĩnh
 * viễn không tải được ảnh, trừ khi tạo lại link — mà tạo link mới là giết luôn
 * link cũ đã gửi khách (nguyên tắc 17).
 *
 * Bật THẲNG bằng một cú bấm, không có bước hỏi lại như nút "Gửi thông báo":
 * việc này không chạm tới điện thoại khách và bấm nhầm thì bấm lại là xong,
 * nên một bước hỏi chỉ làm chậm thứ studio phải làm thường xuyên.
 *
 * Nhưng CÓ nói rõ hậu quả ngay dưới nút, theo đúng trạng thái đang bật hay
 * tắt: đây là cái quyết định khách có mang được bộ ảnh cưới về máy hay không,
 * mà hai chữ "cho tải" một mình thì không nói ra điều đó.
 */
export function ChoTai({
  galleryId,
  choTai,
}: {
  galleryId: string;
  choTai: boolean;
}) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const doi = () =>
    start(async () => {
      setLoi(null);
      const kq = await setChoTaiAction(galleryId, !choTai);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      router.refresh();
    });

  return (
    <div className="py-2 text-xs">
      <div className="flex items-baseline gap-2">
        <span className="w-24 shrink-0 text-fg-muted">Tải ảnh</span>
        <span className="min-w-0 flex-1 leading-relaxed">
          {choTai ? (
            <b>khách tải được</b>
          ) : (
            <span className="text-fg-faint">
              <b className="text-fg">khách KHÔNG tải được</b>
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={doi}
          disabled={dangLuu}
          className="shrink-0 text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          {dangLuu ? "…" : choTai ? "tắt" : "bật"}
        </button>
      </div>

      {/*
        Nói hậu quả theo đúng trạng thái đang có, không phải một câu mô tả
        chung. Studio mở ô này ra là đang phân vân "bấm cái này thì sao" —
        trả lời đúng câu đó thì khỏi phải mở trang khách lên xem thử.
      */}
      <p className="mt-1 pl-26 text-[11px] leading-relaxed text-fg-faint">
        {choTai
          ? "Trang khách có nút tải từng tấm và nút tải cả thư mục. Máy chủ cũng chỉ giao ảnh gốc cho album đang bật."
          : "Trang khách không có nút tải nào, và ai ghép link tải thẳng cũng bị từ chối. Thẻ album hiện nhãn “Không cho tải”."}
      </p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}
    </div>
  );
}
