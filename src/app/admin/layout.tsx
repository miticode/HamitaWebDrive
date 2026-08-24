import type { Metadata } from "next";

/**
 * Chi de khai bao robots cho toan bo /admin/* — ap dung cho ca /admin va
 * /admin/[slug]. Trang quan tri da co mat khau bao ve, nhung khong co ly do
 * gi de Google index no: khong khach nao can tim thay trang dang nhap qua
 * ket qua tim kiem.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
