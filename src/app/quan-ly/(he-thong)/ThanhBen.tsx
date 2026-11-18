"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Logo } from "@/components/Logo";
import { BieuTuong } from "./BieuTuong";
import { dangXuatAction } from "../actions";

export type MucMenu = { nhom: string | null; ten: string; href: string };

/**
 * Thanh bên kiểu Lark: máy tính thì là cột trái cố định, điện thoại thì thành
 * một hàng mục cuộn ngang trên đầu trang.
 *
 * Phải là component phía khách chỉ vì cần biết đang ở trang nào để tô mục
 * đang mở — danh sách mục vẫn do máy chủ quyết theo quyền của từng người.
 *
 * ━━ Dựng lại 18/11/2026 ━━
 *
 * Anh bảo "làm cho nó dễ nhìn và đẹp, nhìn vô là biết phần nào". Bản cũ là
 * mười chín dòng chữ thuần xếp dọc, phải ĐỌC mới biết mục nào. Ba thứ đổi:
 *
 *   · BIỂU TƯỢNG cho từng mục — nhận ra bằng dáng, không phải đọc chữ.
 *   · Mục đang mở có THANH DỌC bên trái, không chỉ đổi nền. Nền nhạt một mình
 *     rất dễ chìm khi cuộn giữa mười chín dòng.
 *   · Tên nhóm có ĐƯỜNG KẺ mảnh chạy hết chiều ngang, để mắt bắt được ranh
 *     giới giữa sáu nhóm mà không phải đọc nhãn.
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

  /*
    ĐIỆN THOẠI: KÉO MỤC ĐANG MỞ VÀO TẦM NHÌN.

    Ở đó thanh bên là một hàng ngang cuộn được, mà mục đang mở có thể nằm mãi
    bên phải — mở trang Hợp đồng thì phải cuộn mới biết mình đang ở đâu.

    `block: "nearest"` nên trên máy tính (cột dọc, không cuộn) màn hình đứng
    yên. `inline: "center"` để mục không dính sát mép.
  */
  const mucMo = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    mucMo.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [duongDan]);

  const nhom: { ten: string | null; muc: MucMenu[] }[] = [];
  for (const m of menu) {
    const cuoi = nhom[nhom.length - 1];
    if (cuoi && cuoi.ten === m.nhom) cuoi.muc.push(m);
    else nhom.push({ ten: m.nhom, muc: [m] });
  }

  return (
    <aside className="border-b border-line bg-bg-soft md:sticky md:top-0 md:flex md:h-svh md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 md:px-5 md:pt-5 md:pb-4">
        <Logo size="sm" />
        <span className="font-display text-lg font-light">Quản lý studio</span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:overflow-y-auto md:pb-2">
        {nhom.map((n, i) => (
          <div key={n.ten ?? `nhom-${i}`} className="flex gap-1 md:block">
            {/*
              Nhãn nhóm kèm đường kẻ chạy hết phần còn lại của hàng. Chỉ có
              nhãn chữ thì sáu ranh giới nhóm đều mờ như nhau; thêm đường kẻ
              là mắt bắt được ngay khối nào tới khối nào.

              Giấu trên điện thoại vì ở đó các mục nằm ngang, nhóm không còn
              là hàng riêng nữa.
            */}
            {n.ten && (
              <p className="eyebrow mt-3 mb-1 hidden items-center gap-2 px-3 md:flex">
                <span className="whitespace-nowrap">{n.ten}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
              </p>
            )}
            {n.muc.map((m) => {
              const mo = dangMo(m.href);
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  ref={mo ? mucMo : undefined}
                  aria-current={mo ? "page" : undefined}
                  /*
                    Trên máy tính nén dọc hơn một nấc (py-1.5): mười chín mục
                    cộng sáu nhãn nhóm vốn đã cao hơn màn hình. Đo 18/11 ở màn
                    1000px cao: bản py-2 thiếu 68px, laptop 900px còn thiếu
                    nhiều hơn. Điện thoại giữ py-2 vì ở đó các mục nằm ngang
                    và là chỗ chạm ngón tay.
                  */
                  className={`group relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition md:py-1.5 md:pl-4 ${
                    mo
                      ? "bg-accent-soft font-medium text-accent"
                      : "text-fg-muted hover:bg-bg-raised hover:text-fg"
                  }`}
                >
                  {/*
                    Thanh dọc của mục đang mở. Chỉ hiện ở cột dọc (máy tính) —
                    trên hàng ngang của điện thoại nó thành một gạch lơ lửng
                    bên trái chữ, không nói lên điều gì.
                  */}
                  {mo && (
                    <span
                      className="absolute top-1.5 bottom-1.5 left-0 hidden w-[3px] rounded-full bg-accent md:block"
                      aria-hidden
                    />
                  )}
                  <BieuTuong href={m.href} />
                  {m.ten}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 md:block md:px-5 md:py-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={ten}>
            {ten}
          </p>
          <p className="text-xs text-fg-faint">{vaiTro}</p>
        </div>
        <div className="flex items-center gap-4 md:mt-3">
          {coTaiKhoanRieng && (
            <Link
              href="/quan-ly/toi"
              className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
            >
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
