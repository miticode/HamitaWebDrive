import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DICH_VU, HAMI_BABY, STUDIO } from "@/lib/studio";
import { listGalleries } from "@/lib/store";

/* Đọc database mỗi lần mở trang, để anh vừa tích chọn album là thấy ngay. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `${STUDIO.ten} — ${STUDIO.moTa}`,
  description: `${STUDIO.khauHieu}. Trọn gói ngày cưới, phim trường độc quyền, chụp album, trang điểm cô dâu và cho thuê váy cưới tại Tầm Vu, Long An.`,
  openGraph: {
    title: STUDIO.ten,
    description: STUDIO.khauHieu,
    type: "website",
  },
};

/**
 * Trang giới thiệu studio.
 *
 * Trước đây địa chỉ gốc nhảy thẳng vào trang quản trị — ai gõ đúng tên miền
 * cũng rơi vào ô đăng nhập, không biết đây là studio nào. Giờ là trang giới
 * thiệu thật; trang quản trị vẫn ở `/admin`, có lối vào kín đáo dưới chân trang.
 */
export default async function Home() {
  /*
    Chỉ lấy album nào studio đã chủ động tích chọn. Ảnh cưới là ảnh của khách,
    không tự động bung hết lên trang công khai.
  */
  const galleries = await listGalleries();
  const anhTieuBieu = galleries
    .filter((g) => g.featured && g.coverFileId)
    .map((g) => g.coverFileId as string)
    .slice(0, 8);

  const anhNen = anhTieuBieu[0] ?? null;

  return (
    <main>
      <header className="relative flex min-h-[88svh] items-center justify-center overflow-hidden">
        {anhNen && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${anhNen}?w=2048`}
              alt=""
              aria-hidden
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/50 to-black/65" />
          </>
        )}

        <div className="relative w-full px-6 py-24 text-center">
          <Logo size="lg" on={anhNen ? "dark" : "page"} className="mx-auto" />

          <h1
            className="mt-8 font-display text-[2.75rem] leading-[1.05] font-light sm:text-6xl lg:text-7xl"
            style={anhNen ? { color: "#fff" } : undefined}
          >
            {STUDIO.ten}
          </h1>

          <p
            className="mx-auto mt-6 max-w-xl font-display text-xl font-light text-balance sm:text-2xl"
            style={{ color: anhNen ? "rgba(255,255,255,0.88)" : "var(--fg-muted)" }}
          >
            {STUDIO.khauHieu}
          </p>

          <p
            className="mt-7 text-xs tracking-[0.22em] uppercase"
            style={{ color: anhNen ? "rgba(255,255,255,0.65)" : "var(--fg-faint)" }}
          >
            {STUDIO.moTa}
          </p>

          <a
            href={`tel:${STUDIO.dienThoaiSo}`}
            className="mt-9 inline-flex min-h-11 items-center gap-2 rounded-full border px-6 text-sm tracking-wide transition"
            style={
              anhNen
                ? { borderColor: "rgba(255,255,255,0.5)", color: "#fff" }
                : { borderColor: "var(--line-strong)", color: "var(--fg)" }
            }
          >
            <svg
              viewBox="0 0 24 24"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
            </svg>
            {STUDIO.dienThoai}
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 sm:py-28">
        <p className="eyebrow">Về chúng tôi</p>
        <p className="rule mt-6 font-display text-2xl leading-[1.6] font-light text-balance sm:text-[1.75rem]">
          Hamita Wedding House lo trọn gói ngày cưới tại Tầm Vu, Long An — từ lễ
          hỏi, ảnh cưới, trang điểm cho tới chiếc váy cô dâu mặc trong ngày trọng
          đại.
        </p>
      </section>

      <section className="border-y border-line bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow text-center">Dịch vụ</p>
          <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {DICH_VU.map((dv) => (
              <div key={dv.ten}>
                <h2 className="font-display text-2xl font-normal">{dv.ten}</h2>
                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{dv.mo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {anhTieuBieu.length > 0 && (
        <section className="mx-auto max-w-[1700px] px-2 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow text-center">Một vài bộ ảnh</p>
          <div className="mt-12 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {anhTieuBieu.map((fileId) => (
              <div
                key={fileId}
                className="skeleton aspect-[3/4] overflow-hidden rounded-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/img/${fileId}?w=640`}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 sm:py-24">
          <p className="eyebrow">Thương hiệu cùng nhà</p>
          <h2 className="mt-5 font-display text-3xl font-light sm:text-4xl">
            {HAMI_BABY.ten}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-balance text-fg-muted">
            {HAMI_BABY.moTa}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a href={`tel:${HAMI_BABY.dienThoaiSo}`} className="btn">
              {HAMI_BABY.dienThoai}
            </a>
            <a
              href={HAMI_BABY.facebook}
              target="_blank"
              rel="noreferrer"
              className="btn"
            >
              Xem trang Facebook
            </a>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-4xl px-5 py-20 sm:px-6 sm:py-24">
          <p className="eyebrow text-center">Liên hệ</p>

          <dl className="mt-12 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
            <div>
              <dt className="eyebrow">Địa chỉ</dt>
              <dd className="mt-2 leading-relaxed">{STUDIO.diaChi}</dd>
            </div>
            <div>
              <dt className="eyebrow">Giờ mở cửa</dt>
              <dd className="mt-2 leading-relaxed">{STUDIO.gioMoCua}</dd>
            </div>
            <div>
              <dt className="eyebrow">Điện thoại</dt>
              <dd className="mt-2 leading-relaxed">
                <a href={`tel:${STUDIO.dienThoaiSo}`} className="hover:text-accent">
                  {STUDIO.dienThoai}
                </a>
                <span className="text-fg-faint"> · cưới hỏi</span>
                <br />
                <a href={`tel:${HAMI_BABY.dienThoaiSo}`} className="hover:text-accent">
                  {HAMI_BABY.dienThoai}
                </a>
                <span className="text-fg-faint"> · chụp bé và gia đình</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow">Email</dt>
              <dd className="mt-2 leading-relaxed">
                <a href={`mailto:${STUDIO.email}`} className="hover:text-accent">
                  {STUDIO.email}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <a href={STUDIO.facebook} target="_blank" rel="noreferrer" className="btn">
              Facebook
            </a>
            <a href={STUDIO.tiktok} target="_blank" rel="noreferrer" className="btn">
              TikTok
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-14 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO.ten}</p>
        <p className="mt-6 text-xs text-fg-faint">
          Khách đã nhận link xem ảnh thì mở thẳng link studio gửi.{" "}
          <Link href="/admin" className="underline underline-offset-2 hover:text-accent">
            Quản lý
          </Link>
        </p>
      </footer>
    </main>
  );
}
