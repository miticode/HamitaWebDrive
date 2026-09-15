import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";
import { PHIM_TRUONG, STUDIO } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import { listGalleries } from "@/lib/store";
import { loadTree } from "@/lib/gallery";
import { NavGioiThieu } from "../NavGioiThieu";

export const dynamic = "force-dynamic";

/**
 * Trang xem TẤT CẢ bối cảnh của phim trường studio.
 *
 * Vì sao phải là một trang riêng chứ không phải trang album `/g/[slug]` có sẵn:
 * trang album là chỗ riêng tư của một nhà khách — có nhập mã, thả tim, đếm
 * ngược hạn giữ ảnh, và khai báo "đừng đưa lên Google". Phim trường
 * thì ngược lại hoàn toàn: đây là trang quảng bá công khai, càng nhiều người
 * tìm thấy càng tốt, và khách xem nó thì không chọn ảnh gì cả.
 *
 * Trang giới thiệu chỉ khoe tám tấm mời gọi; ai muốn xem hết thì sang đây.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${PHIM_TRUONG.ten} — ${STUDIO_NAME}`,
    description: PHIM_TRUONG.moTa,
    alternates: { canonical: "/phim-truong" },
    openGraph: {
      title: `${PHIM_TRUONG.ten} — ${STUDIO_NAME}`,
      description: PHIM_TRUONG.moTa,
      type: "website",
    },
  };
}

export default async function PhimTruongPage() {
  const galleries = await listGalleries();
  const album = galleries.find(
    (g) => g.featured && g.khuGioiThieu === "phimtruong"
  );
  // Studio chưa gắn album phim trường nào thì trang này không có nội dung.
  if (!album) notFound();

  /*
    Drive trục trặc thì trả 404 chứ không hiện một trang rỗng: trang rỗng khiến
    khách tưởng studio chẳng có bối cảnh nào, còn tệ hơn là không tìm thấy
    trang. Khu phim trường ở trang chủ cũng tự ẩn khi Drive hỏng nên hai nơi
    hành xử giống nhau.
  */
  let anh: { id: string; width: number | null; height: number | null }[] = [];
  try {
    const tree = await loadTree(album.driveFolderId);
    anh = tree.albums.flatMap((a) => a.photos);
  } catch {
    notFound();
  }
  if (anh.length === 0) notFound();

  return (
    <main className="khu-phim-truong">
      <NavGioiThieu coAnhNen={false} trangKhac />

      <section className="border-b border-line bg-bg-soft pt-16">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6 sm:py-20">
          <FadeIn>
            <p className="eyebrow">{PHIM_TRUONG.nhan}</p>
            <h1 className="rule mx-auto mt-5 font-display text-3xl leading-tight font-light sm:text-5xl">
              {PHIM_TRUONG.tieuDe}
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-balance text-fg-muted">
              {PHIM_TRUONG.moTa}
            </p>
            <p className="eyebrow mt-5">
              {PHIM_TRUONG.ten} · {anh.length} góc chụp
            </p>
          </FadeIn>
        </div>
      </section>

      <section className="bg-bg-soft">
        <div className="mx-auto max-w-[1700px] px-5 py-16 sm:px-6 sm:py-20">
          {/*
            Lưới kiểu cột báo (`columns`) chứ không phải lưới ô đều.

            Đo album này ngày 03/09/2026 trên 20 tấm: 12 dọc, 8 ngang, tỉ lệ
            trải từ 0,563 tới 1,499 — không có một khung cố định nào vừa cả hai
            kiểu. Ép vào khung 2:3 thì tấm ngang bị xén mất khoảng 55% chiều
            rộng, mà đây là ảnh khoe KHÔNG GIAN: xén đi là mất đúng thứ khách
            cần nhìn. Cột báo để mỗi tấm cao đúng tỉ lệ gốc của nó, không tấm
            nào bị cắt.

            `aspect-ratio` đặt sẵn theo kích thước Drive trả về (Drive có sẵn
            width/height, không tốn thêm lời gọi nào) nên chỗ trống được chừa
            đúng trước khi ảnh tải xong — trang không giật nhảy khi ảnh lần
            lượt hiện ra. Tấm nào Drive không cho kích thước thì lùi về 2:3,
            tỉ lệ phổ biến nhất trong album.
          */}
          <div className="columns-2 gap-2 sm:columns-3 sm:gap-4 lg:columns-4">
            {anh.map((p, i) => (
              <div key={p.id} className="mb-2 break-inside-avoid sm:mb-4">
                {/* Chỉ mấy tấm đầu mới cần hiệu ứng hiện dần; tấm thứ 20 trở đi
                    khách đã cuộn tới nơi rồi, chờ thêm chỉ tổ ngắt nhịp xem. */}
                <FadeIn cham={i < 12 ? i * 50 : 0}>
                  <div
                    className="skeleton overflow-hidden rounded-sm"
                    style={{
                      aspectRatio:
                        p.width && p.height ? `${p.width} / ${p.height}` : "2 / 3",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/img/${p.id}?w=960`}
                      alt={`Bối cảnh tại ${PHIM_TRUONG.ten}`}
                      /*
                        Sáu tấm đầu tải ngay, còn lại đợi cuộn tới. Album 60 tấm
                        mà tải hết một lượt thì khách mạng yếu ngồi nhìn trang
                        trắng khá lâu.
                      */
                      loading={i < 6 ? "eager" : "lazy"}
                      className="size-full object-cover"
                    />
                  </div>
                </FadeIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-6">
          <FadeIn>
            <p className="text-sm leading-relaxed text-fg-muted">
              {PHIM_TRUONG.moiGoi}
            </p>
            <a
              href={`tel:${STUDIO.dienThoaiSo}`}
              className="btn-primary mt-6 inline-flex"
            >
              {STUDIO.dienThoai}
            </a>
            <p className="mt-10">
              <Link
                href="/"
                className="text-xs tracking-[0.14em] text-fg-muted uppercase underline-offset-4 hover:underline"
              >
                ← Về trang chủ
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>

      <footer className="border-t border-line py-12 text-center">
        <Logo size="sm" className="mx-auto opacity-60" />
        <p className="eyebrow mt-4">{STUDIO_NAME}</p>
      </footer>
    </main>
  );
}
