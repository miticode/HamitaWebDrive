import type { Metadata } from "next";
import { cookies } from "next/headers";

/**
 * Khung ngoài cùng của phần quản lý studio (/quan-ly) — thay dần app AppSheet
 * cũ (kế hoạch 15/09/2026).
 *
 * Dùng chung tông sáng/tối với trang quản lý album (cookie "admin-tong"): cùng
 * một người dùng hai trang, bật tối ở trang này mà trang kia vẫn sáng thì chói.
 * Thuộc tính gắn trên thẻ bọc chứ không trên <html>, cùng lý do với
 * src/app/admin/layout.tsx: trang khách xem ảnh không được dính tông tối.
 */
export const metadata: Metadata = {
  title: "Quản lý studio — Hamita",
  robots: { index: false, follow: false },
};

export default async function QuanLyLayout({ children }: { children: React.ReactNode }) {
  const toi = (await cookies()).get("admin-tong")?.value === "toi";
  return (
    <div data-admin-theme={toi ? "dark" : "light"} className="min-h-svh bg-bg text-fg">
      {children}
    </div>
  );
}
