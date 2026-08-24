import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FadeIn } from "@/components/FadeIn";
import { StudioIcon } from "@/components/StudioIcon";
import { DICH_VU, HAMI_BABY, STUDIO } from "@/lib/studio";
import { listGalleries } from "@/lib/store";
import { NavGioiThieu } from "./NavGioiThieu";

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
  const anhBenCanh = anhTieuBieu[1] ?? anhTieuBieu[0] ?? null;

  return (
    <main>
      <NavGioiThieu coAnhNen={anhNen !== null} />

      <header className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
        {anhNen && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/img/${anhNen}?w=2048`}
              alt=""
              aria-hidden
              className="anh-nen-hero absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/40 to-black/70" />
          </>
        )}

        <div className="relative w-full px-6 py-24 text-center">
          <FadeIn>
            <Logo size="lg" on={anhNen ? "dark" : "page"} className="mx-auto" />
          </FadeIn>

          <FadeIn cham={120}>
            <h1
              className="mt-8 font-display text-[2.75rem] leading-[1.05] font-light sm:text-6xl lg:text-7xl"
              style={anhNen ? { color: "#fff" } : undefined}
            >
              {STUDIO.ten}
            </h1>
          </FadeIn>

          <FadeIn cham={220}>
            <p
              className="mx-auto mt-6 max-w-xl font-display text-xl font-light text-balance sm:text-2xl"
              style={{ color: anhNen ? "rgba(255,255,255,0.9)" : "var(--fg-muted)" }}
            >
              {STUDIO.khauHieu}
            </p>
          </FadeIn>

          <FadeIn cham={300}>
            <p
              className="mt-7 text-xs tracking-[0.28em] uppercase"
              style={{ color: anhNen ? "rgba(255,255,255,0.65)" : "var(--fg-faint)" }}
            >
              {STUDIO.moTa}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`tel:${STUDIO.dienThoaiSo}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-medium tracking-wide text-[#1f1c1a] transition hover:opacity-90 active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
                </svg>
                {STUDIO.dienThoai}
              </a>
              <a
                href="#dich-vu"
                className="inline-flex min-h-12 items-center rounded-full border px-7 text-sm tracking-wide transition active:scale-95"
                style={
                  anhNen
                    ? { borderColor: "rgba(255,255,255,0.45)", color: "#fff" }
                    : { borderColor: "var(--line-strong)", color: "var(--fg)" }
                }
              >
                Xem dịch vụ
              </a>
            </div>
          </FadeIn>
        </div>

        <span
          aria-hidden
          className="absolute bottom-7 left-1/2 -translate-x-1/2 text-2xl"
          style={{ color: anhNen ? "rgba(255,255,255,0.5)" : "var(--fg-faint)" }}
        >
          ↓
        </span>
      </header>

      {/* Tin cậy bằng số thật từ Facebook — không tự bịa số liệu. */}
      <section className="border-b border-line bg-bg-soft">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 px-5 py-10 text-center sm:grid-cols-4 sm:gap-4 sm:px-6">
          {[
            { so: STUDIO.soNguoiTheoDoi, nhan: "Người theo dõi" },
            { so: `${STUDIO.soDanhGia}+`, nhan: "Lượt đánh giá" },
            { so: "100%", nhan: "Hài lòng" },
            { so: "10+", nhan: "Album mỗi tháng" },
          ].map((s) => (
            <div key={s.nhan}>
              <p className="font-display text-3xl font-light sm:text-4xl">{s.so}</p>
              <p className="eyebrow mt-1.5">{s.nhan}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="gioi-thieu" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-5 py-24 sm:px-6 sm:py-32 lg:grid-cols-2 lg:gap-20">
          <FadeIn>
            {anhBenCanh ? (
              <div className="skeleton aspect-[4/5] overflow-hidden rounded-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/img/${anhBenCanh}?w=1440`}
                  alt=""
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-sm bg-bg-soft">
                <Logo size="md" className="opacity-30" />
              </div>
            )}
          </FadeIn>

          <FadeIn cham={140}>
            <p className="eyebrow">Về chúng tôi</p>
            <h2 className="rule mt-5 font-display text-3xl leading-[1.3] font-light text-balance sm:text-4xl">
              Lo trọn ngày cưới, từ ý tưởng tới khoảnh khắc cuối cùng
            </h2>
            <p className="mt-7 text-[15px] leading-[1.85] text-fg-muted">
              Hamita Wedding House là nơi lo trọn gói ngày cưới tại Tầm Vu, Long
              An — từ lễ hỏi, ảnh cưới, trang điểm cho tới chiếc váy cô dâu mặc
              trong ngày trọng đại. Mỗi cặp đôi một câu chuyện riêng, chúng tôi
              lắng nghe trước khi bấm máy.
            </p>
          </FadeIn>
        </div>
      </section>

      <section id="dich-vu" className="scroll-mt-16 border-y border-line bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-6 sm:py-32">
          <FadeIn>
            <p className="eyebrow text-center">Dịch vụ</p>
            <h2 className="rule mx-auto mt-5 max-w-lg text-center font-display text-3xl font-light sm:text-4xl">
              Mọi thứ cho một ngày trọn vẹn
            </h2>
          </FadeIn>

          <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {DICH_VU.map((dv, i) => (
              <FadeIn key={dv.ten} cham={i * 80}>
                <div className="group">
                  <div className="flex size-14 items-center justify-center rounded-full border border-line-strong text-accent transition duration-500 group-hover:border-accent group-hover:bg-accent-soft">
                    <StudioIcon ten={dv.icon} className="size-6" />
                  </div>
                  <h3 className="mt-5 font-display text-2xl font-normal">{dv.ten}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{dv.mo}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {anhTieuBieu.length > 0 && (
        <section id="anh" className="scroll-mt-16">
          <div className="mx-auto max-w-[1700px] px-2 py-24 sm:px-6 sm:py-32">
            <FadeIn>
              <p className="eyebrow text-center">Một vài bộ ảnh</p>
              <h2 className="rule mx-auto mt-5 max-w-lg text-center font-display text-3xl font-light sm:text-4xl">
                Khoảnh khắc chúng tôi ghi lại
              </h2>
            </FadeIn>

            <div className="mt-16 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {anhTieuBieu.map((fileId, i) => (
                <FadeIn key={fileId} cham={i * 60}>
                  <div className="group skeleton aspect-[3/4] overflow-hidden rounded-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/img/${fileId}?w=640`}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-6 sm:py-28">
          <FadeIn>
            <p className="eyebrow">Thương hiệu cùng nhà</p>
            <h2 className="mt-5 font-display text-3xl font-light sm:text-4xl">
              {HAMI_BABY.ten}
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-balance text-fg-muted">
              {HAMI_BABY.moTa}
            </p>
            <p className="eyebrow mt-4">{HAMI_BABY.soNguoiTheoDoi} người theo dõi</p>
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
          </FadeIn>
        </div>
      </section>

      <section id="lien-he" className="scroll-mt-16 border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-4xl px-5 py-24 sm:px-6 sm:py-32">
          <FadeIn>
            <p className="eyebrow text-center">Liên hệ</p>
            <h2 className="rule mx-auto mt-5 max-w-md text-center font-display text-3xl font-light sm:text-4xl">
              Hẹn gặp anh chị tại studio
            </h2>
          </FadeIn>

          <FadeIn cham={140}>
            <dl className="mt-16 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
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

            <div className="mt-14 flex flex-wrap justify-center gap-3">
              <a href={STUDIO.facebook} target="_blank" rel="noreferrer" className="btn-primary">
                Nhắn tin Facebook
              </a>
              <a href={STUDIO.tiktok} target="_blank" rel="noreferrer" className="btn">
                TikTok
              </a>
            </div>
          </FadeIn>
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
