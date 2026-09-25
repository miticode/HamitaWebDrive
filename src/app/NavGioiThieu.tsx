"use client";

import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { STUDIO } from "@/lib/studio";

/*
  Hai mang tach rieng tren thanh dieu huong: khach di tim chup cuoi va khach di
  tim chup thoi noi la hai nguoi khac nhau, gop chung mot muc "Album anh" thi
  ai cung phai cuon do.
*/
const MUC = [
  /* Lưới "Hamita chụp gì?" — thay chỗ "Hành trình": khách mở menu là để tìm
     mảng mình cần, hành trình vẫn nằm trong trang cho ai cuộn tới. */
  { href: "#dich-vu", nhan: "Dịch vụ" },
  { href: "#gioi-thieu", nhan: "Giới thiệu" },
  /* Sang trang riêng có các mục nhỏ (17/09/2026), không cuộn tới khu trong trang chủ nữa. */
  { href: "/dich-vu/anh-cuoi", nhan: "Ảnh cưới" },
  { href: "#phim-truong", nhan: "Phim trường" },
  { href: "#baby", nhan: "Chụp bé" },
  { href: "#lien-he", nhan: "Liên hệ" },
];

/**
 * Thanh điều hướng đầu trang giới thiệu.
 *
 * Trong suốt, chữ trắng khi còn nằm trên ảnh nền hero; đặc lại nền trắng khi
 * khách cuộn xuống — cùng cơ chế phát hiện cuộn với GalleryHeader ở trang xem
 * ảnh, để hai nơi nhất quán.
 */
export function NavGioiThieu({
  coAnhNen,
  /*
    Thanh này dùng ở cả trang chủ lẫn trang /phim-truong. Ở trang chủ các mục
    là neo trong trang ("#anh"); ở trang khác chúng phải quay về trang chủ rồi
    mới cuộn tới ("/#anh"), không thì bấm vào chẳng đi đâu cả.
  */
  trangKhac = false,
  /*
    Neo của những khu KHÔNG hiện trên trang (khu ảnh cưới, album chỉ dựng khi
    có album được tích lên trang giới thiệu). Giữ mục đó trên menu thì bấm vào
    đứng im, khách tưởng web hỏng — đo 16/09/2026: đúng hai mục "Ảnh cưới" và
    "Album" đang như vậy.
  */
  anMuc = [],
}: {
  coAnhNen: boolean;
  trangKhac?: boolean;
  anMuc?: string[];
}) {
  const [daCuon, setDaCuon] = useState(false);

  useEffect(() => {
    const onScroll = () => setDaCuon(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const noiSang = coAnhNen && !daCuon;
  const duong = (href: string) => (trangKhac && href.startsWith("#") ? `/${href}` : href);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        daCuon ? "border-b border-line bg-bg/90 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href={trangKhac ? "/" : "#"} className="flex items-center gap-2.5">
          <Logo size="sm" on={noiSang ? "dark" : "page"} className="h-8 sm:h-9" />
        </a>

        <nav className="hidden items-center gap-7 lg:flex">
          {MUC.filter((m) => !anMuc.includes(m.href)).map((m) => (
            <a
              key={m.href}
              href={duong(m.href)}
              className="text-xs tracking-[0.14em] uppercase transition hover:opacity-70"
              style={{ color: noiSang ? "#fff" : "var(--fg-muted)" }}
            >
              {m.nhan}
            </a>
          ))}
        </nav>

        <a
          href={`tel:${STUDIO.dienThoaiSo}`}
          /*
            py-3 -my-3: vung cham cao 40px thay vi 16px, ma thanh dieu huong
            khong day them mot ly nao — le am keo lai dung bang phan vua them.

            Day la hanh dong CHINH cua ca trang gioi thieu: khach xem xong thi
            viec tiep theo la goi. De 16px thi tren dien thoai phai nham lam moi
            trung.
          */
          className="inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-medium tracking-wide transition hover:border-accent hover:text-accent sm:text-sm"
          style={{ color: noiSang ? "#fff" : "var(--fg)", borderColor: noiSang ? "rgba(255,255,255,.6)" : "var(--line-strong)" }}
        >
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
          </svg>
          {STUDIO.dienThoai}
        </a>
      </div>
    </header>
  );
}
