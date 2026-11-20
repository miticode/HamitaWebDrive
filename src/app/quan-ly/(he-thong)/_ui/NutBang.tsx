import Link from "next/link";
import type { ReactNode } from "react";

/*
  NÚT NHỎ TRONG HÀNG BẢNG — anh duyệt 20/11/2026.

  `btn px-3 py-1 text-xs` viết tay ở chừng 15 chỗ, và mỗi chỗ nhớ thêm một
  thứ khác: chỗ có `whitespace-nowrap`, chỗ có `ml-2`, chỗ quên `disabled`.

  CỠ CHẠM: `.btn` đặt min-height 44px cho cả web (xem globals.css — "đầu ngón
  tay người lớn rộng 45–57px"). Nút trong bảng KHÔNG hạ mức đó xuống trên
  điện thoại, vì đó đúng là lúc người ta chạm bằng ngón tay; chỉ từ 640px trở
  lên — nơi có con chuột — mới thu lại cho hàng bảng đỡ cao.
*/

const LOP = "btn btn-gon min-h-11 px-3 text-xs whitespace-nowrap sm:min-h-8 sm:py-1";

export function NutBang({
  href,
  onClick,
  nguy,
  tat,
  tieuDe,
  children,
}: {
  /** Có `href` thì là link, không thì là nút. */
  href?: string;
  onClick?: () => void;
  /** Việc không lùi được — xoá. Viền đỏ. */
  nguy?: boolean;
  tat?: boolean;
  tieuDe?: string;
  children: ReactNode;
}) {
  const lop = `${LOP} ${nguy ? "btn-danger" : ""}`;

  if (href) {
    return (
      <Link href={href} title={tieuDe} className={lop}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={tat} title={tieuDe} className={lop}>
      {children}
    </button>
  );
}

/**
 * Hàng nút cuối mỗi dòng bảng.
 *
 * Trên điện thoại hàng này nằm trong một thẻ, nên nút trải trái lề chứ không
 * dồn phải: dồn phải trên màn hẹp là đẩy nút vào đúng chỗ ngón cái che.
 *
 * KHÔNG xuống dòng từ 768px trở lên (`md:flex-nowrap`): cột việc trong bảng
 * thường hẹp nhất, để wrap thì hai nút "Mở" và "Xoá" xếp chồng và hàng bảng
 * cao gấp đôi — đo 20/11 trên route thử. Dưới ngưỡng đó thì wrap là đúng, vì
 * lúc ấy hàng đã thành thẻ và có trọn chiều ngang.
 */
export function HangNut({ children }: { children: ReactNode }) {
  return (
    <span className="flex flex-wrap items-center gap-2 md:flex-nowrap md:justify-end">
      {children}
    </span>
  );
}
