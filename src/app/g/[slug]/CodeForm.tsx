"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moKhoaAction } from "./actions";

/**
 * O nhap ma xem album.
 * Dung chung cho ca man hinh khoa toan bo album lan hop thoai hoi ma luc chon anh.
 */
export function CodeForm({
  slug,
  onDone,
  autoFocus = false,
}: {
  slug: string;
  onDone: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [ma, setMa] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, start] = useTransition();

  const gui = (e: React.FormEvent) => {
    e.preventDefault();
    setLoi(null);
    start(async () => {
      try {
        const kq = await moKhoaAction(slug, ma);
        if (!kq.ok) {
          setLoi(kq.error ?? "Hamita chưa mở được album này ạ.");
          return;
        }
        onDone();
        router.refresh();
      } catch {
        setLoi("Mạng đang trục trặc, anh chị thử lại giúp Hamita nhé.");
      }
    });
  };

  return (
    <form onSubmit={gui}>
      <input
        value={ma}
        onChange={(e) => setMa(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        /*
          KHÔNG viết mã mẫu vào đây.

          Chỗ này từng ghi sẵn "123456" cho khách dễ hình dung, mà đó đúng là mã
          mặc định của mọi album (MA_MAC_DINH trong access.ts) — hoá ra ô nhập
          tự khai luôn đáp án. Ai cầm được link chỉ cần gõ đúng dòng chữ mờ đang
          hiện là chọn ảnh được, trong khi cả lớp mã sinh ra để chặn đúng chuyện
          đó (nguyên tắc 1).

          Studio đổi mã mặc định thì cũng đừng đặt lại mẫu ở đây: mã nào rồi
          cũng có ngày trùng với thứ ai đó đoán ra. Ô trống kèm nhãn "Mã studio
          gửi anh chị" là đủ để khách biết phải gõ gì.
        */
        placeholder="Mã studio gửi anh chị"
        aria-label="Mã xem album"
        /*
          Chữ hoa và giãn ký tự chỉ áp cho MÃ KHÁCH GÕ VÀO, không áp cho dòng
          gợi ý: mã dạng "HAMITA-AB12" viết hoa giãn ra thì dễ đọc, còn một câu
          tiếng Việt bị kéo giãn và viết hoa hết thì vừa dài vừa khó đọc.
        */
        className="input text-center tracking-[0.12em] uppercase placeholder:tracking-normal placeholder:normal-case"
      />
      {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
      <button
        disabled={dangGui || !ma.trim()}
        className="btn-primary mt-4 w-full"
      >
        {dangGui ? "Đang kiểm tra…" : "Mở album"}
      </button>
    </form>
  );
}
