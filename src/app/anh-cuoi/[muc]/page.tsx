import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";
import { STUDIO, TRANG_ANH_CUOI } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { MUC_ANH_CUOI, laMucAnhCuoi } from "@/lib/anhCuoi";
import { docAnhCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { NavGioiThieu } from "../../NavGioiThieu";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ muc: string }> };

/**
 * Trang Ảnh cưới, mỗi mục nhỏ một đường dẫn riêng (/anh-cuoi/dinh-hon) để
 * studio gửi thẳng cho khách đang hỏi đúng mảng đó (anh yêu cầu 17/09/2026).
 *
 * Công khai như /phim-truong, KHÔNG dẫn vào album gốc /g/[slug] của nhà khách:
 * link album là bí mật của nhà đó (nguyên tắc 17). Ở đây chỉ hiện ảnh.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { muc } = await params;
  const m = MUC_ANH_CUOI.find((x) => x.key === muc);
  const tieuDe = `${TRANG_ANH_CUOI.tieuDe}${m ? ` · ${m.ten}` : ""} — ${STUDIO_NAME}`;
  return {
    title: tieuDe,
    description: TRANG_ANH_CUOI.moTa,
    alternates: { canonical: `/anh-cuoi/${muc}` },
    openGraph: { title: tieuDe, description: TRANG_ANH_CUOI.moTa, type: "website" },
  };
}

export default async function AnhCuoiMucPage({ params }: Props) {
  const { muc } = await params;
  if (!laMucAnhCuoi(muc)) notFound();

  const co = await mucDangCo();
  // Mục chưa có thư mục nào thì coi như không tồn tại — trang trống hại hơn 404.
  if (!co.has(muc)) notFound();
  const anh = await docAnhCongKhai(muc);
  // Chỉ hiện nút cho mục đang có ảnh.
  const nut = MUC_ANH_CUOI.filter((m) => co.has(m.key));

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

      <section>
        <div className="mx-auto max-w-[1700px] px-5 py-10 sm:px-6 sm:py-14">
          {anh.length === 0 ? (
            /* Có thư mục mà Drive trục trặc: nói thật, kèm đường liên hệ. */
            <p className="py-16 text-center text-sm text-fg-muted">
              Ảnh đang tải chưa được, anh chị thử lại sau ít phút hoặc gọi Hamita{" "}
              <a href={`tel:${STUDIO.dienThoaiSo}`} className="font-medium text-fg underline underline-offset-4">
                {STUDIO.dienThoai}
              </a>
              .
            </p>
          ) : (
            /* Lưới cột báo, mỗi tấm đúng tỉ lệ gốc — cùng lý do với /phim-truong. */
            <div className="columns-2 gap-2 sm:columns-3 sm:gap-4 lg:columns-4">
              {anh.map((p, i) => (
                <div key={`${p.id}-${i}`} className="mb-2 break-inside-avoid sm:mb-4">
                  <FadeIn cham={i < 12 ? i * 50 : 0}>
                    <div
                      className="skeleton overflow-hidden rounded-sm"
                      style={{ aspectRatio: p.width && p.height ? `${p.width} / ${p.height}` : "2 / 3" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/img/${p.id}?w=960`}
                        alt={`Ảnh cưới do ${STUDIO_NAME} chụp`}
                        loading={i < 6 ? "eager" : "lazy"}
                        className="size-full object-cover"
                      />
                    </div>
                  </FadeIn>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
