"use client";

import { useRouter } from "next/navigation";

/*
  Thanh nút trên tờ hợp đồng — KHÔNG in ra giấy (lớp `khong-in`).

  Để riêng một tệp client nhỏ xíu vì `window.print()` và nút Quay lại là hai
  thứ duy nhất ở trang này cần chạy trên trình duyệt. Cả tờ giấy còn lại là
  server component, không gửi JavaScript nào xuống.
*/
export function ThanhNutIn({ quayVe }: { quayVe: string }) {
  const router = useRouter();
  return (
    <div className="khong-in to-hd-thanh">
      <button type="button" onClick={() => router.push(quayVe)} className="to-hd-nut">
        ← Về hợp đồng
      </button>
      <button type="button" onClick={() => window.print()} className="to-hd-nut to-hd-nut-chinh">
        In / Lưu PDF
      </button>
      <p className="to-hd-chu">
        Hộp in của trình duyệt có mục <b>Lưu dưới dạng PDF</b> nếu muốn gửi file cho khách.
      </p>
    </div>
  );
}
