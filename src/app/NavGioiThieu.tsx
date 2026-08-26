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
  { href: "#gioi-thieu", nhan: "Giới thiệu" },
  { href: "#hanh-trinh", nhan: "Hành trình" },
  { href: "#anh", nhan: "Ảnh cưới" },
  /* "Album" chu khong phai "Album & HC": HC la tieng long trong nghe, khach
     khong hieu. Ten day du nam o tieu de cua chinh khu do. */
  { href: "#album-hc", nhan: "Album" },
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
export function NavGioiThieu({ coAnhNen }: { coAnhNen: boolean }) {
  const [daCuon, setDaCuon] = useState(false);

  useEffect(() => {
    const onScroll = () => setDaCuon(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const noiSang = coAnhNen && !daCuon;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        daCuon ? "border-b border-line bg-bg/90 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="#" className="flex items-center gap-2.5">
          <Logo size="sm" on={noiSang ? "dark" : "page"} className="h-8 sm:h-9" />
        </a>

        <nav className="hidden items-center gap-8 sm:flex">
          {MUC.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="text-xs tracking-[0.14em] uppercase transition hover:opacity-70"
              style={{ color: noiSang ? "#fff" : "var(--fg-muted)" }}
            >
              {m.nhan}
            </a>
          ))}
        </nav>

        <a
          href={`tel:${STUDIO.dienThoaiSo}`}
          className="text-xs font-medium tracking-wide sm:text-sm"
          style={{ color: noiSang ? "#fff" : "var(--fg)" }}
        >
          {STUDIO.dienThoai}
        </a>
      </div>
    </header>
  );
}
