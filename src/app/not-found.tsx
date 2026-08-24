import Link from "next/link";
import { Logo } from "@/components/Logo";
import { STUDIO } from "@/lib/studio";

/**
 * Trang hiện khi khách gõ sai link, hoặc album đã bị xoá.
 *
 * Next.js tự động dùng file này thay cho trang lỗi trắng mặc định — mọi
 * `notFound()` trong app (album không tồn tại, ảnh không tồn tại, gõ sai URL)
 * đều rơi vào đây.
 */
export default function KhongTimThay() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Logo size="md" className="mx-auto" />

      <p className="eyebrow mt-8">Lỗi 404</p>
      <h1 className="rule mt-4 font-display text-4xl leading-tight font-light sm:text-5xl">
        Không tìm thấy trang này
      </h1>
      <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-fg-muted">
        Đường dẫn có thể đã gõ sai, hoặc album không còn tồn tại. Anh chị kiểm
        tra lại link studio đã gửi, hoặc liên hệ để được gửi lại.
      </p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn-primary">
          Về trang chủ
        </Link>
        <a href={STUDIO.facebook} target="_blank" rel="noreferrer" className="btn">
          Nhắn tin Facebook
        </a>
      </div>

      <a
        href={`tel:${STUDIO.dienThoaiSo}`}
        className="mt-8 text-sm text-fg-faint transition hover:text-accent"
      >
        {STUDIO.dienThoai}
      </a>
    </main>
  );
}
