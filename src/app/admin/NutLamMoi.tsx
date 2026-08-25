"use client";

import { useFormStatus } from "react-dom";

/**
 * Nút "Làm mới" của một album, có báo trạng thái trong lúc chạy.
 *
 * Việc này lâu thật sự: đọc lại toàn bộ cây thư mục trên Drive, chụp lại số
 * liệu, rồi dựng sẵn những tấm ảnh đầu tiên — album nhiều ảnh mất hàng chục
 * giây. Trước đây nút không đổi gì trong suốt thời gian đó, nên rất dễ tưởng
 * bấm hụt rồi bấm thêm mấy lần nữa, mỗi lần lại một lượt đọc Drive.
 *
 * Phải tách thành component riêng vì `useFormStatus` chỉ đọc được trạng thái
 * khi nó nằm BÊN TRONG thẻ form — đặt ngang hàng với form thì luôn báo rảnh.
 */
export function NutLamMoi() {
  const { pending } = useFormStatus();

  return (
    <button
      className="btn"
      disabled={pending}
      title={
        pending
          ? "Đang đọc lại thư mục trên Drive, album nhiều ảnh có thể mất vài chục giây"
          : "Đọc lại thư mục trên Drive và dựng sẵn những tấm ảnh đầu tiên"
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
