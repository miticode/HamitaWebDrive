"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { STUDIO } from "@/lib/studio";

/**
 * Trang hiện khi có lỗi thật sự xảy ra lúc dựng trang (không phải "không tìm
 * thấy" — đó là not-found.tsx). Next.js bắt buộc file này là "use client".
 *
 * Không hiện chi tiết lỗi kỹ thuật cho khách — chỉ hiện mã lỗi (nếu có) để
 * studio đối chiếu lại trong log Vercel khi khách báo sự cố.
 */
export default function CoLoi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Logo size="md" className="mx-auto" />

      <p className="eyebrow mt-8">Có lỗi xảy ra</p>
      <h1 className="rule mt-4 font-display text-4xl leading-tight font-light sm:text-5xl">
        Trang gặp trục trặc
      </h1>
      <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-fg-muted">
        Có gì đó không ổn phía máy chủ. Anh chị thử tải lại giúp em, hoặc liên
        hệ studio nếu vẫn còn lỗi.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button onClick={reset} className="btn-primary">
          Thử lại
        </button>
        <Link href="/" className="btn">
          Về trang chủ
        </Link>
      </div>

      <a
        href={`tel:${STUDIO.dienThoaiSo}`}
        className="mt-8 text-sm text-fg-faint transition hover:text-accent"
      >
        {STUDIO.dienThoai}
      </a>

      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-fg-faint">
          Mã lỗi: {error.digest}
        </p>
      )}
    </main>
  );
}
