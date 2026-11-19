"use client";

import { useFormStatus } from "react-dom";

/**
 * Nút "Làm mới" của một album, có báo trạng thái trong lúc chạy.
 *
 * Việc này lâu thật sự: đọc lại toàn bộ cây thư mục trên Drive rồi chụp lại số
 * liệu. Đo 19/11/2026 trên album lớn nhất của tiệm (5.170 ảnh, 10 thư mục):
 * 4,6 giây; album cỡ trung 490 ảnh: 1,4 giây. Trước đây nút không đổi gì trong
 * suốt thời gian đó, nên rất dễ tưởng bấm hụt rồi bấm thêm mấy lần nữa.
 *
 * Từ 19/11/2026 nút bị khoá cho tới khi số liệu đã ghi xong thật — trước đó
 * việc đồng bộ chạy nền nên nút nhả ra ngay trong khi con số chưa đổi, và anh
 * phải bấm bốn năm lần mới thấy ảnh mới. Phần dựng sẵn ảnh cho trang khách vẫn
 * chạy nền sau đó, nhưng nó không đổi con số nào ở đây.
 *
 * Phải tách thành component riêng vì `useFormStatus` chỉ đọc được trạng thái
 * khi nó nằm BÊN TRONG thẻ form — đặt ngang hàng với form thì luôn báo rảnh.
 */
export function NutLamMoi({ lop }: { lop?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      className={lop ?? "btn"}
      disabled={pending}
      title={
        pending
          ? "Đang đọc lại thư mục trên Drive — album nhiều ảnh mất khoảng năm giây"
          : "Đọc lại thư mục trên Drive, cập nhật số ảnh và dung lượng"
      }
    >
      {pending ? (
        <>
          {/*
            Vòng xoay là chỗ DUY NHẤT còn hiệu ứng chuyển động sau khi đã bỏ hết
            nhấp nháy khỏi web: ở đây nó mang thông tin thật — máy đang chạy chứ
            không treo. Đứng yên thì không phân biệt được với nút hỏng.
          */}
          <svg
            viewBox="0 0 24 24"
            className="size-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          Đang làm mới…
        </>
      ) : (
        "Làm mới"
      )}
    </button>
  );
}
