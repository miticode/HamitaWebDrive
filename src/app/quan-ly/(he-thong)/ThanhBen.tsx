"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { dangXuatAction } from "../actions";

export type MucMenu = { nhom: string | null; ten: string; href: string };

/**
 * Thanh bên kiểu Lark: máy tính thì là cột trái cố định, điện thoại thì thành
 * một hàng mục cuộn ngang trên đầu trang.
 *
 * Phải là component phía khách chỉ vì cần biết đang ở trang nào để tô mục
 * đang mở — danh sách mục vẫn do máy chủ quyết theo quyền của từng người.
 */
export function ThanhBen({
  menu,
  ten,
  vaiTro,
  coTaiKhoanRieng,
}: {
  menu: MucMenu[];
  ten: string;
  vaiTro: string;
  /** false = quản trị chung (mật khẩu quản lý album), không có trang tài khoản riêng. */
  coTaiKhoanRieng: boolean;
}) {
  const duongDan = usePathname();
  const dangMo = (href: string) =>
    href === "/quan-ly" ? duongDan === href : duongDan.startsWith(href);

  const nhom: { ten: string | null; muc: MucMenu[] }[] = [];
  for (const m of menu) {
    const cuoi = nhom[nhom.length - 1];
    if (cuoi && cuoi.ten === m.nhom) cuoi.muc.push(m);
    else nhom.push({ ten: m.nhom, muc: [m] });
  }

  const lopMuc = (href: string) =>
    `block rounded-md px-3 py-2 text-sm transition whitespace-nowrap ${
      dangMo(href)
        ? "bg-accent-soft font-medium text-accent"
        : "text-fg-muted hover:bg-bg-soft hover:text-fg"
    }`;

  return (
    <aside className="border-b border-line bg-bg-soft md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center gap-3 px-5 pt-5 pb-3 md:pb-5">
        <Logo size="sm" />
        <span className="font-display text-lg font-light">Quản lý studio</span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-4 md:overflow-y-auto md:pb-0">
        {nhom.map((n, i) => (
          <div key={n.ten ?? `nhom-${i}`} className="flex gap-1 md:block md:space-y-0.5">
            {n.ten && (
              <p className="eyebrow hidden px-3 pb-1 md:block">{n.ten}</p>
            )}
            {n.muc.map((m) => (
              <Link key={m.href} href={m.href} className={lopMuc(m.href)}>
                {m.ten}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 md:block md:py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={ten}>{ten}</p>
          <p className="text-xs text-fg-faint">{vaiTro}</p>
        </div>
        <div className="flex items-center gap-4 md:mt-3">
          {coTaiKhoanRieng && (
            <Link href="/quan-ly/toi" className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent">
              Tài khoản của tôi
            </Link>
          )}
          <form action={dangXuatAction}>
            <button className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
