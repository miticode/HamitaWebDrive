"use client";

import { useState } from "react";

/**
 * Nút đổi giữa tông sáng và tông tối cho trang quản lý.
 *
 * Đặt cạnh "Đăng xuất" ở đầu trang, kèm chữ "Nền tối" / "Nền sáng". Bản đầu
 * làm nút tròn chỉ có biểu tượng, nổi ở góc dưới phải — người dùng tìm không
 * ra, vì chỗ người ta nhìn khi kiếm một tuỳ chọn là đầu trang chứ không phải
 * góc màn hình, và một biểu tượng mờ không có chữ thì không tự giới thiệu
 * được nó làm gì.
 *
 * Lựa chọn lưu vào cookie chứ không phải localStorage, vì máy chủ cần đọc được
 * nó để dựng sẵn đúng tông ngay từ dòng HTML đầu tiên. Dùng localStorage thì
 * trang luôn hiện ra sáng trước rồi mới nháy sang tối — chói mắt mỗi lần mở.
 *
 * Bấm xong đổi ngay trên thẻ bọc thay vì tải lại trang: đổi tông mà phải chờ
 * một vòng máy chủ thì cảm giác nặng nề, trong khi đây chỉ là chuyện màu sắc.
 */
export function NutDoiTong({ toiBanDau }: { toiBanDau: boolean }) {
  const [toi, setToi] = useState(toiBanDau);

  const doi = () => {
    const moi = !toi;
    setToi(moi);

    // Một năm: đủ lâu để không ai phải chọn lại, và đây chỉ là chuyện màu sắc.
    document.cookie = `admin-tong=${moi ? "toi" : "sang"}; path=/; max-age=31536000; samesite=lax`;

    document
      .querySelector("[data-admin-theme]")
      ?.setAttribute("data-admin-theme", moi ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={doi}
      aria-pressed={toi}
      title={toi ? "Chuyển về nền sáng" : "Chuyển sang nền tối"}
      /*
        py-2 -my-2: noi vung bam theo chieu doc len ~34px cho de trung ngon tay,
        nhung -my-2 keo lai dung bang cu nen bo cuc khong xe dich chut nao.
      */
      className="eyebrow -my-2 inline-flex items-center gap-1.5 py-2 transition hover:text-accent"
    >
      {toi ? (
        // Mặt trời — bấm để quay về nền sáng.
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Mặt trăng — bấm để sang nền tối.
        <svg
          viewBox="0 0 24 24"
          className="size-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
      {toi ? "Nền sáng" : "Nền tối"}
    </button>
  );
}
