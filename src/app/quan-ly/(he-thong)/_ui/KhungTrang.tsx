import Link from "next/link";
import type { ReactNode } from "react";

/*
  ĐẦU TRANG DÙNG CHUNG — anh duyệt 20/11/2026.

  28 trang trong /quan-ly, mỗi trang tự dựng lại phần tiêu đề: cái thì
  `font-display text-3xl`, cái `text-2xl`, cái có dòng mô tả cái không, link
  quay lại chỗ `eyebrow` chỗ `text-sm`.

  Gom vào đây thì đổi một lần là cả 28 trang theo — và quan trọng hơn, trang
  mới viết sau này không phải đoán xem phải trông thế nào.
*/

export function KhungTrang({
  nhom,
  ten,
  chu,
  quayLai,
  nut,
  children,
}: {
  /** Chữ nhỏ phía trên tiêu đề — tên nhóm trong thanh bên ("Kế toán"). */
  nhom?: string;
  ten: string;
  /** Một câu nói trang này để làm gì. Bỏ qua khi tên trang đã đủ rõ. */
  chu?: ReactNode;
  /** Link quay lại trang cha — trang con thì nên có. */
  quayLai?: { ten: string; href: string };
  /** Nút bên phải tiêu đề: "Lập hợp đồng", "Thêm phiếu thu"… */
  nut?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      {quayLai && (
        <Link href={quayLai.href} className="eyebrow transition hover:text-accent">
          ← {quayLai.ten}
        </Link>
      )}

      <div className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-3 ${quayLai ? "mt-3" : ""}`}>
        <div className="min-w-0">
          {nhom && <p className="eyebrow">{nhom}</p>}
          <h1 className={`font-display text-3xl font-light text-balance ${nhom ? "mt-2" : ""}`}>
            {ten}
          </h1>
          {chu && <div className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{chu}</div>}
        </div>
        {/*
          Nút nằm CÙNG HÀNG với tiêu đề và dính mép phải. Trên điện thoại
          `flex-wrap` đẩy nó xuống dòng dưới, vẫn trái lề — không ép nút chính
          ra góc phải màn hẹp, nơi ngón tay cầm máy hay che mất.
        */}
        {nut && <div className="flex flex-wrap items-center gap-2">{nut}</div>}
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
