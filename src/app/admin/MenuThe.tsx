"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

/**
 * Bảng "…" ở góc thẻ album — chỗ để mọi việc làm với album đó.
 *
 * Anh yêu cầu 21/09/2026: thẻ album trông như bên Gump — ảnh bìa to, dưới ảnh
 * chỉ còn tên và một hàng số liệu nhỏ. Hàng bốn nút cũ ăn mất 57px mỗi thẻ, mà
 * đúng 57px đó là phần ảnh bìa bị cắt cụt.
 *
 * Mở ra thì có một tấm trong suốt phủ kín màn hình phía sau: bấm đâu cũng đóng
 * được bảng. Cách này chắc hơn nghe `click` trên `document` — không phải gỡ
 * listener, không lo thứ tự sự kiện, và bấm ra ngoài KHÔNG đồng thời bấm trúng
 * thứ nằm dưới (tấm phủ nuốt cú bấm đó).
 *
 * `stopPropagation` ở thân bảng để bấm một mục không đóng ngay trước khi mục
 * đó kịp chạy; riêng các mục đi tới trang khác thì tự đóng khi trang đổi.
 */
/** Bảng cao chừng này — đủ để biết còn chỗ mở xuống hay phải mở ngược lên. */
const CAO_BANG = 340;

export function MenuThe({ ten, children }: { ten: string; children: ReactNode }) {
  const [mo, setMo] = useState(false);
  /*
    Thẻ nằm gần đáy màn thì bảng mở NGƯỢC LÊN. Lưới album là một ô cuộn riêng
    (nguyên tắc 45), nên bảng mở xuống ở hàng thẻ cuối sẽ thò quá đáy ô đó và
    người dùng phải cuộn mới thấy mục cuối — mà cuộn thì thẻ chạy mất.
  */
  const [len, setLen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          setLen(e.currentTarget.getBoundingClientRect().bottom + CAO_BANG > window.innerHeight);
          setMo((m) => !m);
        }}
        aria-expanded={mo}
        aria-haspopup="menu"
        title={`Việc cần làm với album "${ten}"`}
        /* 44px trên điện thoại, 32px từ 640px trở lên — cùng luật với `.btn-gon`. */
        className="grid size-11 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg sm:size-8"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
        <span className="sr-only">Mở bảng việc cần làm</span>
      </button>

      {mo && (
        <>
          <button
            type="button"
            aria-label="Đóng bảng"
            onClick={() => setMo(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className={`absolute right-0 z-50 grid w-60 gap-0.5 rounded-md border border-line bg-bg-raised p-1.5 shadow-[var(--shadow-lift)] ${
              len ? "bottom-full mb-1" : "mt-1"
            }`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/** Một dòng trong bảng, dạng liên kết sang trang khác. */
export function MucMenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="muc-menu" role="menuitem">
      {children}
    </Link>
  );
}
