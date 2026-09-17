import Link from "next/link";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";
import { STUDIO, TRANG_ANH_CUOI } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { MUC_ANH_CUOI } from "@/lib/anhCuoi";
import { NavGioiThieu } from "../NavGioiThieu";

/**
 * Khung chung của trang Ảnh cưới: đầu trang + hàng nút mục + lời mời liên hệ.
 * Dùng cho cả trang danh sách thư mục (/anh-cuoi/<mục>) lẫn trang ảnh của một
 * thư mục (/anh-cuoi/<mục>/<thư mục>), để khách đang xem ảnh vẫn chuyển mục
 * được mà không phải quay lại.
 */
export function KhungAnhCuoi({
  muc,
  mucCo,
  children,
}: {
  muc: string;
  /** Những mục đang có ảnh — chỉ các mục này có nút. */
  mucCo: Set<string>;
  children: ReactNode;
}) {
  const nut = MUC_ANH_CUOI.filter((m) => mucCo.has(m.key));

  return (
    <main>
      <NavGioiThieu coAnhNen={false} trangKhac />

      <section className="border-b border-line bg-bg-soft pt-16">
        <div className="mx-auto max-w-3xl px-5 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
          <FadeIn>
            <p className="eyebrow">{TRANG_ANH_CUOI.nhan}</p>
            <h1 className="mt-4 font-display text-4xl leading-tight font-light sm:text-5xl">
              {TRANG_ANH_CUOI.tieuDe}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-balance text-fg-muted">
              {TRANG_ANH_CUOI.moTa}
            </p>
          </FadeIn>

          {/*
            Hàng nút mục là LIÊN KẾT thật, không phải nút đổi state: mỗi mục một
            địa chỉ riêng để gửi khách, và bấm quay lại của trình duyệt đi đúng
            mục trước. Trên điện thoại hàng này cuộn ngang thay vì xuống dòng,
            để ảnh vẫn nằm gần đầu màn hình.
          */}
          <nav
            aria-label="Các mục ảnh cưới"
            className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
          >
            {nut.map((m) => {
              const dang = m.key === muc;
              return (
                <Link
                  key={m.key}
                  href={`/anh-cuoi/${m.key}`}
                  aria-current={dang ? "page" : undefined}
                  scroll={false}
                  className={`inline-flex min-h-11 shrink-0 items-center rounded-full border px-5 text-sm whitespace-nowrap transition ${
                    dang
                      ? "border-transparent bg-fg text-bg"
                      : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
                  }`}
                >
                  {m.ten}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {children}

      <section className="border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
          <p className="text-sm leading-relaxed text-fg-muted">{TRANG_ANH_CUOI.moiGoi}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a href={STUDIO.zalo} target="_blank" rel="noreferrer" className="btn-primary">
              Nhắn Zalo
            </a>
            <a href={`tel:${STUDIO.dienThoaiSo}`} className="btn">
              {STUDIO.dienThoai}
            </a>
          </div>
          <p className="mt-10">
            <Link href="/" className="text-xs tracking-[0.14em] text-fg-muted uppercase underline-offset-4 hover:underline">
              ← Về trang chủ
            </Link>
          </p>
        </div>
      </section>

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>
    </main>
  );
}
