import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { STUDIO, TRANG_ANH_CUOI } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { MUC_ANH_CUOI, laMucAnhCuoi } from "@/lib/anhCuoi";
import { docAnhThuMuc, mucDangCo, type AnhCongKhai } from "@/lib/anhGioiThieu";
import { KhungAnhCuoi } from "../../KhungAnhCuoi";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ muc: string; thuMuc: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { muc } = await params;
  const m = MUC_ANH_CUOI.find((x) => x.key === muc);
  const tieuDe = `${TRANG_ANH_CUOI.tieuDe}${m ? ` · ${m.ten}` : ""} — ${STUDIO_NAME}`;
  return { title: tieuDe, description: TRANG_ANH_CUOI.moTa, robots: { index: false } };
}

/** Ảnh bên trong MỘT thư mục đã chọn cho trang Ảnh cưới — toàn bộ, tải dần khi cuộn. */
export default async function AnhCuoiThuMucPage({ params }: Props) {
  const { muc, thuMuc } = await params;
  if (!laMucAnhCuoi(muc)) notFound();
  const tenMuc = MUC_ANH_CUOI.find((m) => m.key === muc)!.ten;

  const co = await mucDangCo();
  let du: { ten: string; anh: AnhCongKhai[] } | null = null;
  let driveLoi = false;
  try {
    du = await docAnhThuMuc(muc, thuMuc);
    if (!du) notFound();
  } catch (e) {
    // notFound() cũng ném — để nó đi tiếp, chỉ bắt lỗi Drive (nguyên tắc 19).
    if (e && typeof e === "object" && "digest" in e) throw e;
    driveLoi = true;
  }

  return (
    <KhungAnhCuoi muc={muc} mucCo={co}>
      <section>
        <div className="mx-auto max-w-[1700px] px-5 py-10 sm:px-6 sm:py-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div>
              <Link href={`/anh-cuoi/${muc}`} className="eyebrow transition hover:text-accent">
                ← {tenMuc}
              </Link>
              {du && <h2 className="mt-2 font-display text-3xl font-light sm:text-4xl">{du.ten}</h2>}
            </div>
            {du && <p className="text-sm text-fg-muted">{du.anh.length} ảnh</p>}
          </div>

          {driveLoi || !du || du.anh.length === 0 ? (
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
              {du.anh.map((p, i) => (
                <div key={p.id} className="mb-2 break-inside-avoid sm:mb-4">
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
    </KhungAnhCuoi>
  );
}
