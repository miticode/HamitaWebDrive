import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { STUDIO } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { docMuc, docNhom } from "@/lib/mucDichVu";
import { docAnhThuMuc, mucDangCo, type AnhCongKhai } from "@/lib/anhGioiThieu";
import { KhungDichVu, chuNhom } from "../../../KhungDichVu";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ nhom: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const nhom = await docNhom((await params).nhom);
  if (!nhom) return {};
  return { title: `${chuNhom(nhom).tieuDe} — ${STUDIO_NAME}`, robots: { index: false } };
}

/** Ảnh bên trong MỘT thư mục đã chọn — toàn bộ, tải dần khi cuộn. */
export default async function AnhThuMucPage({ params }: Props) {
  const p = await params;
  const nhom = await docNhom(p.nhom);
  if (!nhom) notFound();

  let du: { muc: string; ten: string; anh: AnhCongKhai[] } | null = null;
  let driveLoi = false;
  try {
    du = await docAnhThuMuc(nhom.key, p.id);
  } catch {
    driveLoi = true;
  }
  if (!du && !driveLoi) notFound();

  const co = await mucDangCo(nhom.key);
  const muc = du ? await docMuc(nhom.key, du.muc) : undefined;
  // Nút quay lại: nhóm nhiều mục về đúng mục, nhóm một mục về trang nhóm.
  const quayLai =
    nhom.muc.length > 1 && muc
      ? { href: `/dich-vu/${nhom.key}/${muc.key}`, ten: muc.ten }
      : { href: `/dich-vu/${nhom.key}`, ten: chuNhom(nhom).tieuDe };

  return (
    <KhungDichVu nhom={nhom} muc={du?.muc ?? ""} mucCo={co}>
      <section>
        <div className="mx-auto max-w-[1700px] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <Link href={quayLai.href} className="eyebrow transition hover:text-accent">
                ← {quayLai.ten}
              </Link>
              {du && <h2 className="mt-2 font-display text-3xl font-light sm:text-4xl">{du.ten}</h2>}
            </div>
            {du && <p className="text-sm text-fg-muted">{du.anh.length} ảnh</p>}
          </div>

          {!du || du.anh.length === 0 ? (
            /* Drive trục trặc: nói thật, kèm đường liên hệ (nguyên tắc 19). */
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
              {du.anh.map((a, i) => (
                <div key={a.id} className="mb-2 break-inside-avoid sm:mb-4">
                  <FadeIn cham={i < 12 ? i * 50 : 0}>
                    <div
                      className="skeleton overflow-hidden rounded-sm"
                      style={{ aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : "2 / 3" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/img/${a.id}?w=960`}
                        alt={`Ảnh do ${STUDIO_NAME} chụp`}
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
    </KhungDichVu>
  );
}
