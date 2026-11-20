import type { ReactNode } from "react";

/*
  KHỐI TRONG TRANG — anh duyệt 20/11/2026.

  Trang chi tiết hợp đồng có 7 khối (Khách, Tiền, Album, Dịch vụ, Lịch, Đầu
  việc, Phiếu thu), mỗi khối tự dựng lại `<section className="mt-8">` + tiêu
  đề + đôi khi một nút bên phải. Trang khách hàng, trang nhân viên cũng vậy.

  `TieuDeKhoi` đã có sẵn và lo phần chữ + con số. Khối này lo phần còn lại:
  khoảng cách, hàng nút bên phải, và câu rỗng.
*/

export function Khoi({
  ten,
  so,
  chu,
  nut,
  trong,
  children,
  lop,
}: {
  ten: string;
  /** Con số cạnh tên — "Album ảnh 1". Bỏ qua khi đếm không có nghĩa. */
  so?: number;
  /** Một câu dưới tiêu đề. */
  chu?: ReactNode;
  /** Nút bên phải tiêu đề. */
  nut?: ReactNode;
  /** Câu hiện khi không có gì — chỉ dùng khi `children` rỗng. */
  trong?: string;
  children?: ReactNode;
  lop?: string;
}) {
  const rong = !children || (Array.isArray(children) && children.length === 0);
  return (
    <section className={`mt-8 ${lop ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-baseline gap-2 font-display text-xl font-light">
          {ten}
          {so !== undefined && (
            <span className="text-sm text-fg-faint tabular-nums">{so}</span>
          )}
        </h2>
        {nut && <div className="flex flex-wrap items-center gap-2">{nut}</div>}
      </div>
      {chu && <p className="mt-1 text-sm text-fg-muted">{chu}</p>}
      <div className="mt-3">
        {rong && trong ? (
          <p className="rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-sm text-fg-muted">
            {trong}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
