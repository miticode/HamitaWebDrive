import type { ReactNode } from "react";

/*
  CHIP DÙNG CHUNG — anh duyệt 20/11/2026.

  Đo trước khi làm: ~10 biến thể của `rounded-full border … text-[11px]` rải
  khắp /quan-ly, mỗi nơi một kiểu viền và một kiểu màu. Không cái nào sai,
  nhưng đứng cạnh nhau thì lộ ra là ba người viết ba lúc.

  NĂM KIỂU, không hơn. Mỗi kiểu nói một chuyện khác nhau:

    trung-tinh  nhãn, phân loại — không khen không chê
    nhan        nhấn nhẹ bằng màu thương hiệu (mã album, bộ lọc đang bật)
    yen         xong rồi, không phải lo
    canh-bao    cần để ý, chưa hỏng
    nguy        quá hạn, hỏng, nợ

  Thêm kiểu thứ sáu là bắt đầu lại đúng cái mớ vừa dọn, nên nếu cần màu khác
  thì hỏi lại xem nó có thật sự là chuyện thứ sáu không.

  Màu viết bằng lớp tiện ích Tailwind chứ không bằng biến: bản tối của trang
  quản lý đã có khối chỉnh sẵn cho `bg-amber-50`, `text-red-700`… (xem
  globals.css, khối `[data-admin-theme="dark"]`). Dùng biến mới là phải khai
  thêm sáu biến nữa cho cả hai bản.
*/

export type KieuChip = "trung-tinh" | "nhan" | "yen" | "canh-bao" | "nguy";

const LOP: Record<KieuChip, string> = {
  "trung-tinh": "border-line-strong bg-bg-soft text-fg-muted",
  nhan: "border-accent/40 bg-accent-soft text-accent",
  yen: "border-emerald-300 bg-emerald-50 text-emerald-800",
  "canh-bao": "border-amber-300 bg-amber-50 text-amber-900",
  nguy: "border-red-300 bg-red-50 text-red-800",
};

export function Chip({
  kieu = "trung-tinh",
  tieuDe,
  children,
  lop,
}: {
  kieu?: KieuChip;
  /** Hiện khi rê chuột — chỗ để giải thích một chữ viết tắt. */
  tieuDe?: string;
  children: ReactNode;
  lop?: string;
}) {
  return (
    <span
      title={tieuDe}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] whitespace-nowrap ${LOP[kieu]} ${lop ?? ""}`}
    >
      {children}
    </span>
  );
}
