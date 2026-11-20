import type { ReactNode } from "react";

/*
  BẢNG DÙNG CHUNG — anh duyệt 20/11/2026 (KE-HOACH-GIAO-DIEN.md §2.2).

  Đo trước khi làm: 21 tệp trong /quan-ly chép lại cùng một khung bảng, 21 chỗ
  chép lại cùng hàng tiêu đề, và không bảng nào có bản cho điện thoại.

  MÁY TÍNH ra bảng, ĐIỆN THOẠI ra thẻ — cùng một markup. Phép đổi nằm trọn
  trong CSS (`globals.css`, khối "BẢNG DÙNG CHUNG"), nên ở đây không có nhánh
  `if (dienThoai)` nào cả: component chỉ lo gắn đúng `data-*` cho CSS đọc.

  Vì sao không dùng thư viện bảng: 21 bảng này render Ở MÁY CHỦ, không sort
  không filter phía máy khách. Thay bằng TanStack Table là phải đổi hết sang
  client component — xem §3 của kế hoạch.
*/

export type CotBang = {
  /** Chữ trên hàng tiêu đề, và là nhãn của ô khi thành thẻ trên điện thoại. */
  ten: string;
  /**
   * Cột này là TÊN của hàng (tên khách, tên việc). Trên điện thoại nó thành
   * tiêu đề thẻ: chiếm trọn hàng, bỏ nhãn, chữ đậm hơn.
   *
   * Mỗi bảng nên có đúng một cột như vậy. Không có thì thẻ chỉ là một đống
   * nhãn ngang nhau, nhìn không ra đang đọc nhà nào.
   */
  chinh?: boolean;
  /** Canh phải — tiền, số lượng. Giữ nguyên cả khi thành thẻ. */
  phai?: boolean;
  /**
   * Ô chứa nút hoặc ô chọn. Trên điện thoại bỏ nhãn và chiếm trọn hàng: một
   * dòng "VIỆC   [Sửa] [Xoá]" trên thẻ nhìn vô nghĩa.
   */
  rong?: boolean;
  /** Lớp thêm cho `<th>` — thường là `w-32`, `whitespace-nowrap`. */
  lop?: string;
};

export function Bang({
  cot,
  trong,
  children,
  lop,
}: {
  cot: CotBang[];
  /**
   * Hiện khi không có hàng nào. Để trống thì không vẽ gì.
   *
   * Nhận cả JSX chứ không chỉ chữ: trạng thái rỗng phải có LỐI RA (mục P2-3
   * của KE-HOACH-UX), mà lối ra thường là một link "Bỏ lọc".
   */
  trong?: ReactNode;
  /** Các `<Hang>`. Rỗng thì `trong` hiện ra thay. */
  children: ReactNode;
  lop?: string;
}) {
  const rong = !children || (Array.isArray(children) && children.length === 0);
  return (
    <div className={`bang-khung ${lop ?? ""}`}>
      <table className="bang">
        <thead>
          <tr>
            {cot.map((c, i) => (
              <th
                key={i}
                data-phai={c.phai ? "" : undefined}
                className={c.lop}
                scope="col"
              >
                {c.ten}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
      {rong && trong && (
        /*
          Câu rỗng nằm NGOÀI `<table>`, không phải một `<tr colSpan>`: trên
          điện thoại `<tr>` đã bị CSS đổi thành thẻ có viền, nên câu rỗng sẽ
          mang theo một khung thẻ trống rỗng quanh nó.
        */
        <p className="px-4 py-8 text-center text-sm text-fg-muted">{trong}</p>
      )}
    </div>
  );
}

/** Một hàng. Trên điện thoại nó là một thẻ. */
export function Hang({ children, lop }: { children: ReactNode; lop?: string }) {
  return <tr className={lop}>{children}</tr>;
}

/**
 * Một ô. `cot` là cột tương ứng trong `cot` của `Bang` — truyền để ô lấy nhãn
 * và các dấu `chinh`/`phai`/`rong` từ đó, khỏi khai hai lần hai nơi rồi lệch.
 */
export function O({
  cot,
  children,
  lop,
}: {
  cot: CotBang;
  children?: ReactNode;
  lop?: string;
}) {
  return (
    <td
      data-nhan={cot.chinh || cot.rong ? undefined : cot.ten}
      data-chinh={cot.chinh ? "" : undefined}
      data-phai={cot.phai ? "" : undefined}
      data-rong={cot.rong ? "" : undefined}
      className={lop}
    >
      {children}
    </td>
  );
}
