import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { TRANG_ANH_CUOI } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { MUC_ANH_CUOI, laMucAnhCuoi } from "@/lib/anhCuoi";
import { docThuMucCongKhai, mucDangCo } from "@/lib/anhGioiThieu";
import { KhungAnhCuoi } from "../KhungAnhCuoi";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ muc: string }> };

/**
 * Một mục của trang Ảnh cưới (/anh-cuoi/nha-gai): hiện các THƯ MỤC đã chọn
 * trước, mỗi thư mục một thẻ ảnh bìa; bấm thẻ mới sang xem ảnh bên trong (anh
 * yêu cầu 17/09/2026). Trang này chỉ đọc database nên mở nhanh.
 *
 * Công khai như /phim-truong, KHÔNG dẫn vào album gốc /g/[slug] của nhà khách:
 * link album là bí mật của nhà đó (nguyên tắc 17).
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

  const [co, thuMuc] = await Promise.all([mucDangCo(), docThuMucCongKhai(muc)]);
  // Mục chưa có thư mục nào thì coi như không tồn tại — trang trống hại hơn 404.
  if (thuMuc.length === 0) notFound();

  return (
    <KhungAnhCuoi muc={muc} mucCo={co}>
      <section>
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
          {/*
            Flex canh giữa chứ không phải lưới 3 cột: một mục thường chỉ vài thư
            mục, lưới thì 2 thẻ dồn sang trái chừa một ô trống bên phải.
          */}
          <ul className="flex flex-wrap justify-center gap-3 sm:gap-5">
            {thuMuc.map((t, i) => (
              <li key={t.id} className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-2.5rem)/3)]">
                <FadeIn cham={i < 9 ? i * 60 : 0}>
                  <Link
                    href={`/anh-cuoi/${muc}/${t.id}`}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-[1.25rem] bg-bg-soft sm:rounded-[1.75rem]"
                  >
                    {t.anhBia && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/img/${t.anhBia}?w=960`}
                        alt=""
                        loading={i < 6 ? "eager" : "lazy"}
                        className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                    )}
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white sm:p-6">
                      <span className="min-w-0">
                        <span className="block font-display text-xl leading-tight sm:text-[1.7rem]">{t.ten}</span>
                        <span className="mt-1 block text-xs opacity-85 sm:text-sm">{t.soAnh} ảnh</span>
                      </span>
                      <span
                        aria-hidden
                        className="hidden size-9 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur-sm transition group-hover:bg-white/35 sm:grid"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </FadeIn>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </KhungAnhCuoi>
  );
}
