import type { Metadata } from "next";
import { cookies } from "next/headers";

/**
 * Chi de khai bao robots cho toan bo /admin/* — ap dung cho ca /admin va
 * /admin/[slug]. Trang quan tri da co mat khau bao ve, nhung khong co ly do
 * gi de Google index no: khong khach nao can tim thay trang dang nhap qua
 * ket qua tim kiem.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /*
    Doc lua chon tong mau o PHIA MAY CHU roi dung san dung tong ngay trong dong
    HTML dau tien. Neu doc o phia khach (localStorage) thi trang luon hien ra
    sang truoc roi moi nhay sang toi — choi mat moi lan mo.
  */
  const toi = (await cookies()).get("admin-tong")?.value === "toi";

  /*
    Thuoc tinh nam o day chu KHONG phai tren <html>: rieng vung nay moi doi
    tong. Trang khach xem anh phai giu tong sang co dinh (nguyen tac 12), va
    dat o day thi khong co duong nao dinh sang do — chuyen sang trang khach la
    the boc nay bien mat.

    min-h-svh de khi noi dung ngan, phan con lai khong lo ra nen sang cua body.
  */
  return (
    <div data-admin-theme={toi ? "dark" : "light"} className="min-h-svh bg-bg text-fg">
      {children}
    </div>
  );
}
