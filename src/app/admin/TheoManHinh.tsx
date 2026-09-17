"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** Cùng mốc `2xl` của Tailwind — mốc trang quản lý album chia cột trái riêng. */
const MAN_LON = "(min-width: 1536px)";

function dangKy(bao: () => void) {
  const m = window.matchMedia(MAN_LON);
  m.addEventListener("change", bao);
  return () => m.removeEventListener("change", bao);
}

/** true = màn từ 1536px, false = nhỏ hơn, null = đang dựng ở máy chủ (chưa biết). */
function useManLon(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    dangKy,
    () => window.matchMedia(MAN_LON).matches,
    () => null,
  );
}

/*
  Vì sao không giấu bằng CSS (`hidden 2xl:block`) cho gọn: khối kho ảnh Drive
  tự gọi /api/admin/kho-anh lúc hiện ra. Dựng hai bản rồi giấu một bản bằng CSS
  thì bản bị giấu vẫn gọi — mỗi lần mở trang hỏi Drive hai lần. Ở đây chỉ bản
  đúng với màn hình mới được dựng.
*/

/** Chỉ dựng khi màn từ 1536px. */
export function ChiManLon({ children }: { children: ReactNode }) {
  return useManLon() === true ? <>{children}</> : null;
}

/** Chỉ dựng khi màn dưới 1536px. */
export function ChiManNho({ children }: { children: ReactNode }) {
  return useManLon() === false ? <>{children}</> : null;
}
