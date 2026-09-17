import Link from "next/link";
import type { ReactNode } from "react";
import { FadeIn } from "@/components/FadeIn";
import { Logo } from "@/components/Logo";
import { DICH_VU, STUDIO, TRANG_DICH_VU } from "@/lib/studio";
import { STUDIO_NAME } from "@/lib/constants";
import type { NhomGioiThieu } from "@/lib/nhomGioiThieu";
import { NavGioiThieu } from "../NavGioiThieu";

/** Chữ đầu trang của một nhóm: lấy từ thẻ tương ứng trong lưới "Hamita chụp gì?". */
export function chuNhom(nhom: NhomGioiThieu) {
  const the = DICH_VU.muc.find((m) => m.khu === nhom.khu);
  return {
    nhan: the?.nhan ?? "",
    tieuDe: the?.ten ?? nhom.ten,
    moTa: TRANG_DICH_VU.moTaRieng[nhom.khu] ?? the?.moTa ?? "",
  };
}

/**
 * Khung chung của trang một nhóm dịch vụ: đầu trang + hàng nút mục + lời mời
 * liên hệ. Dùng cho cả trang danh sách thư mục lẫn trang ảnh của một thư mục,
 * để khách đang xem ảnh vẫn chuyển mục được mà không phải quay lại.
 *
 * Nhóm chỉ có một mục thì không hiện hàng nút — một nút duy nhất không chọn
 * được gì. Mục chưa có thư mục nào cũng không có nút (mở ra trống trơn).
 */
export function KhungDichVu({
  nhom,
  muc,
  mucCo,
  children,
}: {
  nhom: NhomGioiThieu;
  muc: string;
  mucCo: Set<string>;
  children: ReactNode;
}) {
  const chu = chuNhom(nhom);
  const nut = nhom.muc.length > 1 ? nhom.muc.filter((m) => mucCo.has(m.key)) : [];

  return (
    <main>
      <NavGioiThieu coAnhNen={false} trangKhac />

      <section className="border-b border-line bg-bg-soft pt-16">
        <div className="mx-auto max-w-3xl px-5 pt-14 pb-10 text-center sm:px-6 sm:pt-20">
          <FadeIn>
            {chu.nhan && <p className="eyebrow">{chu.nhan}</p>}
            <h1 className="mt-4 font-display text-4xl leading-tight font-light sm:text-5xl">{chu.tieuDe}</h1>
            {chu.moTa && (
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-balance text-fg-muted">{chu.moTa}</p>
            )}
          </FadeIn>

          {nut.length > 0 && (
            /*
              Liên kết thật, không phải nút đổi state: mỗi mục một địa chỉ riêng
              để gửi khách. Trên điện thoại cuộn ngang thay vì xuống dòng, để
              ảnh vẫn nằm gần đầu màn hình.
            */
            <nav
              aria-label={`Các mục ${nhom.ten}`}
              className="-mx-5 mt-8 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
            >
              {nut.map((m) => {
                const dang = m.key === muc;
                return (
                  <Link
                    key={m.key}
                    href={`/dich-vu/${nhom.key}/${m.key}`}
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
          )}
        </div>
      </section>

      {children}

      <section className="border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-6">
          <p className="text-sm leading-relaxed text-fg-muted">{TRANG_DICH_VU.moiGoi}</p>
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

/** Lưới thẻ thư mục (ảnh bìa + tên nhà), canh giữa vì mỗi mục thường chỉ vài thư mục. */
export function LuoiThuMuc({
  nhom,
  thuMuc,
}: {
  nhom: string;
  thuMuc: { id: string; ten: string; anhBia: string | null; soAnh: number }[];
}) {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
        <ul className="flex flex-wrap justify-center gap-3 sm:gap-5">
          {thuMuc.map((t, i) => (
            <li key={t.id} className="w-[calc(50%-0.375rem)] sm:w-[calc(50%-0.625rem)] lg:w-[calc((100%-2.5rem)/3)]">
              <FadeIn cham={i < 9 ? i * 60 : 0}>
                <Link
                  href={`/dich-vu/${nhom}/anh/${t.id}`}
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
  );
}
