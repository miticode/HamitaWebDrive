import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { FadeIn } from "@/components/FadeIn";
import { StudioIcon } from "@/components/StudioIcon";
import {
  ALBUM_HC,
  ANH_BIA,
  CO_SO,
  DAU_TRANG,
  DICH_VU,
  HAMI_BABY,
  HANH_TRINH,
  LOI_KE,
  PHIM_TRUONG,
  STUDIO,
  VE_HAMITA,
} from "@/lib/studio";
import { listGalleries, type KhuGioiThieu } from "@/lib/store";
import { loadTree } from "@/lib/gallery";
import { NavGioiThieu } from "./NavGioiThieu";
import { AnhBiaChay } from "./AnhBiaChay";
import { NutLienHeNoi } from "./NutLienHeNoi";

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

/*
  Nút bo tròn dùng chung cả trang — bố cục học từ mohome.vn (16/09/2026): nút
  dạng viên thuốc, cao 48px cho dễ bấm trên điện thoại. Nút chính nền đậm chứ
  không nền vàng đồng: chữ trắng trên #9c7c4f chỉ đạt 3,9:1, dưới mức đọc rõ.
*/
const NUT_CHINH =
  "inline-flex min-h-12 items-center gap-2 rounded-full bg-fg px-6 text-sm font-medium tracking-wide text-bg shadow-[0_12px_30px_-14px_rgba(31,28,26,0.55)] transition hover:opacity-90 active:scale-95";
const NUT_PHU =
  "inline-flex min-h-12 items-center gap-2 rounded-full border border-line-strong bg-bg-raised px-6 text-sm tracking-wide text-fg transition hover:border-accent hover:text-accent active:scale-95";

/** Thẻ bo góc lớn, viền mảnh, bóng mềm ngả màu nhấn — kiểu thẻ chung của trang. */
const THE =
  "rounded-[1.75rem] border border-line bg-bg-raised shadow-[0_24px_50px_-34px_rgba(156,124,79,0.45)]";

/**
 * Trang giới thiệu studio.
 *
 * Bố cục học từ mohome.vn theo yêu cầu 16/09/2026: đầu trang hai cột, lưới
 * "chụp gì" bằng thẻ ảnh lớn, thẻ hai cơ sở, dải kêu gọi bo tròn, nút liên hệ
 * nổi. Web đó chỉ có mảng bé; ở đây giữ nguyên BỐN KHU của Hamita (nguyên tắc
 * 24) và giọng kể hành trình của khách (nguyên tắc 25) — chỉ đổi cách bày.
 *
 * Không chép hai phần "cảm nhận khách hàng" và "blog" của họ: Hamita chưa có
 * dữ liệu thật cho hai phần đó, dựng ra là bịa.
 */
export default async function Home() {
  /*
    Chỉ lấy album nào studio đã chủ động tích chọn. Ảnh cưới là ảnh của khách,
    không tự động bung hết lên trang công khai.
  */
  const galleries = await listGalleries();
  const daChon = galleries.filter((g) => g.featured && g.coverFileId);
  const biaCuaKhu = (khu: KhuGioiThieu) =>
    daChon
      .filter((g) => g.khuGioiThieu === khu)
      .map((g) => g.coverFileId as string)
      .slice(0, 8);

  const anhTieuBieu = biaCuaKhu("cuoi");
  const anhAlbumHC = biaCuaKhu("albumhc");
  const anhBaby = biaCuaKhu("baby");

  /*
    Khu phim trường đọc THẲNG nhiều ảnh trong một album duy nhất (bối cảnh của
    studio, một tấm bìa không khoe được gì) — lời gọi Drive duy nhất của trang,
    cache 5 phút chung với trang khách xem. Chỉ lấy ẢNH DỌC cho khung 2:3, thiếu
    thì bù tấm còn lại (nguyên tắc 24). Drive trục trặc thì bỏ qua khu này, không
    để cả trang quảng bá chết theo.
  */
  const albumPhimTruong = galleries.find((g) => g.featured && g.khuGioiThieu === "phimtruong");
  let anhPhimTruong: string[] = [];
  let tongGocChup = 0;
  if (albumPhimTruong) {
    try {
      const tree = await loadTree(albumPhimTruong.driveFolderId);
      const tatCa = tree.albums.flatMap((a) => a.photos);
      tongGocChup = tatCa.length;
      const doc = tatCa.filter((p) => p.width && p.height && p.height > p.width);
      anhPhimTruong = [...doc, ...tatCa.filter((p) => !doc.includes(p))].slice(0, 8).map((p) => p.id);
    } catch {
      /* Xem chú thích ngay trên. */
    }
  }

  /* Ảnh đặt lên từng thẻ của lưới "Hamita chụp gì?". */
  const anhThe: Record<string, string | undefined> = {
    cuoi: anhTieuBieu[0],
    albumhc: anhAlbumHC[0],
    phimtruong: anhPhimTruong[0],
    baby: anhBaby[0],
    // Váy & trang điểm không có khu ảnh riêng — ảnh cưới nào cũng là váy và trang điểm.
    vay: anhTieuBieu[1] ?? anhTieuBieu[0],
  };

  /*
    Thẻ chỉ trỏ tới khu ĐANG HIỆN. Khu ảnh cưới, album chỉ dựng khi có album
    được tích "hiện lên trang giới thiệu" — đo trên web thật 16/09/2026: chưa
    có album nào như vậy, nên hai khu đó đang ẩn. Trỏ vào một neo không tồn tại
    thì bấm thẻ đứng im, khách tưởng hỏng. Lúc đó đưa về phần hành trình, nơi
    vẫn kể đúng mảng ấy bằng chữ.
  */
  const khuDangHien: Record<string, boolean> = {
    cuoi: anhTieuBieu.length > 0,
    albumhc: anhAlbumHC.length > 0,
    phimtruong: anhPhimTruong.length > 0,
    baby: true,
    vay: true,
  };
  const hrefThe = (m: (typeof DICH_VU.muc)[number]) =>
    khuDangHien[m.khu] ? m.href : m.khu === "phimtruong" ? "#lien-he" : "#hanh-trinh";

  /* "Sang trọng từ tâm — tận tình như nhà": nửa sau in nghiêng màu nhấn. */
  const [dauKhauHieu, cuoiKhauHieu] = STUDIO.khauHieu.split(/\s*—\s*/);
  const tenTrangFacebook = STUDIO.facebook.replace(/\/+$/, "").split("/").pop();
  const chiDuong = (diaChi: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(diaChi)}`;

  return (
    <main>
      <NavGioiThieu
        coAnhNen={false}
        anMuc={[
          ...(khuDangHien.cuoi ? [] : ["#anh"]),
          ...(khuDangHien.albumhc ? [] : ["#album-hc"]),
          ...(khuDangHien.phimtruong ? [] : ["#phim-truong"]),
        ]}
      />
      <NutLienHeNoi />

      {/* ── Đầu trang: hai cột ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16">
        {/*
          Cả khu đầu trang ngả một lớp màu nhấn rất nhạt thay vì trắng phẳng —
          học từ mohome: nhìn vào là biết đây là phần mở đầu, tách khỏi thân trang.
        */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent-soft via-bg to-bg" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-20">
          <FadeIn>
            <p className="text-xs font-medium tracking-[0.22em] text-accent uppercase">{STUDIO.moTa}</p>
            <h1 className="mt-5 font-display text-[2.6rem] leading-[1.05] font-light text-balance sm:text-6xl">
              {STUDIO.ten}
            </h1>
            <p className="mt-4 font-display text-2xl leading-snug font-light text-fg-muted sm:text-[2rem]">
              {dauKhauHieu}
              {cuoiKhauHieu && (
                <>
                  {" — "}
                  <em className="text-accent">{cuoiKhauHieu}</em>
                </>
              )}
            </p>
            <p className="mt-6 max-w-lg text-[15px] leading-[1.85] text-fg-muted">{LOI_KE.moDau}</p>
            <p className="mt-6 text-[11px] font-medium tracking-[0.2em] text-accent uppercase">{DAU_TRANG.dongPhu}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href={STUDIO.zalo} target="_blank" rel="noreferrer" className={NUT_CHINH}>
                <IconChat /> Nhắn Zalo
              </a>
              <a href={`tel:${STUDIO.dienThoaiSo}`} className={NUT_PHU}>
                <IconGoi /> {STUDIO.dienThoai}
              </a>
              <a href={`https://m.me/${tenTrangFacebook}`} target="_blank" rel="noreferrer" className={NUT_PHU}>
                Messenger
              </a>
            </div>
            <a href="#dich-vu" className="mt-7 inline-flex items-center gap-1.5 text-sm text-accent hover:underline hover:underline-offset-4">
              Xem Hamita chụp gì <span aria-hidden>→</span>
            </a>
          </FadeIn>

          {/*
            Khung ảnh bìa bo góc lớn bên phải. Bên trong vẫn là dải trang album
            chạy như trước (AnhBiaChay) — ảnh album dàn chữ sẵn nên hiện trọn,
            không cắt. Khung 4:3 vì ba trên bốn tấm là trang ngang.
          */}
          <FadeIn cham={120}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-[0_40px_80px_-40px_rgba(156,124,79,0.6)]">
              <AnhBiaChay anh={ANH_BIA} trongKhung />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Về Hamita + số liệu ───────────────────────────────────────── */}
      <section id="gioi-thieu" className="scroll-mt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            {/* Cụm ba ảnh ghép: một tấm cao bên trái, hai tấm vuông xếp chồng bên phải. */}
            {anhTieuBieu.length >= 3 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <AnhThe id={anhTieuBieu[0]} className="row-span-2 aspect-[3/5]" rong={960} />
                <AnhThe id={anhTieuBieu[1]} className="aspect-square" />
                <AnhThe id={anhTieuBieu[2]} className="aspect-square" />
              </div>
            ) : anhTieuBieu[0] ? (
              <AnhThe id={anhTieuBieu[0]} className="aspect-[4/5]" rong={1440} />
            ) : (
              /*
                Chưa album cưới nào được tích lên trang giới thiệu: dùng tấm bìa
                album dọc có sẵn (bia-4, 853×1280 ≈ 2:3). Khung 2:3 đúng tỉ lệ
                đó nên không xén mất chữ trên bìa.
              */
              <div className="mx-auto max-w-sm overflow-hidden rounded-[1.75rem] shadow-[0_40px_80px_-40px_rgba(156,124,79,0.6)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/bia/bia-4.webp" alt={ANH_BIA[3].mo} className="aspect-[2/3] size-full object-cover" loading="lazy" />
              </div>
            )}
          </FadeIn>

          <FadeIn cham={140}>
            <DauMuc nhan={VE_HAMITA.nhan} tieuDe={VE_HAMITA.tieuDe} />
            <p className="mt-6 text-[15px] leading-[1.85] text-fg-muted">{VE_HAMITA.ke}</p>
            {/* Số thật từ trang Facebook của studio — không tự bịa số liệu. */}
            <dl className="mt-9 grid grid-cols-2 gap-3 sm:gap-4">
              {[
                { so: STUDIO.soNguoiTheoDoi, nhan: "Người theo dõi" },
                { so: `${STUDIO.soDanhGia}+`, nhan: "Lượt đánh giá" },
                { so: "100%", nhan: "Hài lòng" },
                { so: "10+", nhan: "Album mỗi tháng" },
              ].map((s) => (
                <div key={s.nhan} className={`${THE} px-5 py-4`}>
                  <dd className="font-display text-3xl font-light text-accent sm:text-4xl">{s.so}</dd>
                  <dt className="mt-1 text-xs tracking-wide text-fg-muted">{s.nhan}</dt>
                </div>
              ))}
            </dl>
          </FadeIn>
        </div>
      </section>

      {/* ── Hai cơ sở ─────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-6 sm:py-20">
          <FadeIn>
            <DauMuc nhan={CO_SO.nhan} tieuDe={CO_SO.tieuDe} moTa={CO_SO.moTa} />
          </FadeIn>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              { co: STUDIO, ten: STUDIO.ten, loai: "Cưới hỏi" },
              { co: HAMI_BABY, ten: HAMI_BABY.ten, loai: "Bé & gia đình", khu: "khu-baby" },
            ].map((c, i) => (
              <FadeIn key={c.ten} cham={i * 100}>
                {/* Thẻ Hami Baby mang luôn tông trắng hồng của khu bé (.khu-baby). */}
                <div className={`${c.khu ?? ""} ${THE} h-full p-6 sm:p-7`}>
                  <p className="text-[11px] font-medium tracking-[0.2em] text-accent uppercase">{c.loai}</p>
                  <h3 className="mt-2 font-display text-2xl font-normal sm:text-[1.7rem]">{c.ten}</h3>
                  <ul className="mt-5 space-y-2.5 text-sm text-fg-muted">
                    <li className="flex gap-3"><IconGhim /> {c.co.diaChi}</li>
                    <li className="flex gap-3"><IconDongHo /> {STUDIO.gioMoCua}</li>
                    <li className="flex gap-3">
                      <IconGoi />
                      <a href={`tel:${c.co.dienThoaiSo}`} className="font-medium text-fg hover:text-accent">{c.co.dienThoai}</a>
                    </li>
                  </ul>
                  <a
                    href={chiDuong(c.co.diaChi)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm text-accent hover:underline hover:underline-offset-4"
                  >
                    Chỉ đường <span aria-hidden>→</span>
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hamita chụp gì? ───────────────────────────────────────────── */}
      <section id="dich-vu" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <FadeIn>
            <DauMuc nhan={DICH_VU.nhan} tieuDe={DICH_VU.tieuDe} />
          </FadeIn>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {DICH_VU.muc.map((m, i) => {
              const anh = anhThe[m.khu];
              return (
                <FadeIn key={m.ten} cham={i * 70}>
                  {/*
                    Chữ nằm trên ảnh, dưới một lớp tối dần từ đáy — kiểu thẻ của
                    mohome: nhìn ảnh là biết mảng gì, không phải đọc nhãn dưới.
                    Cả thẻ là một liên kết, bấm đâu cũng tới đúng khu đó.
                  */}
                  <a
                    href={hrefThe(m)}
                    className={`group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] ${m.khu === "baby" ? "khu-baby" : ""} ${anh ? "bg-bg-soft" : "border border-line bg-gradient-to-br from-accent-soft to-bg-soft"}`}
                  >
                    {anh ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/img/${anh}?w=960`}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      /*
                        Chưa có ảnh album cho mảng này: biểu tượng lớn trên nền
                        màu nhấn nhạt, chữ màu đậm. Ô trống xám trông như ảnh
                        tải hỏng; ô có chủ ý thì không.
                      */
                      <span className="absolute top-6 left-6 grid size-16 place-items-center rounded-full border border-line-strong bg-bg-raised text-accent">
                        <StudioIcon ten={m.icon} className="size-7" />
                      </span>
                    )}
                    {anh && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />}
                    <span className={`absolute inset-x-0 bottom-0 p-6 ${anh ? "text-white" : "text-fg"}`}>
                      <span className="block text-[11px] font-medium tracking-[0.2em] uppercase opacity-85">{m.nhan}</span>
                      <span className="mt-1.5 block font-display text-[1.9rem] leading-tight">{m.ten}</span>
                      <span className="mt-1 flex items-center justify-between gap-3 text-sm opacity-90">
                        {m.moTa}
                        <span
                          aria-hidden
                          className={`grid size-8 shrink-0 place-items-center rounded-full transition ${anh ? "bg-white/20 backdrop-blur-sm group-hover:bg-white/35" : "border border-line-strong group-hover:border-accent group-hover:text-accent"}`}
                        >
                          →
                        </span>
                      </span>
                    </span>
                  </a>
                </FadeIn>
              );
            })}

            {/* Thẻ thứ sáu: mời tư vấn, lấp đủ hàng thay vì chừa một ô trống. */}
            <FadeIn cham={DICH_VU.muc.length * 70}>
              <div className="flex aspect-[4/5] flex-col justify-end rounded-[1.75rem] bg-fg p-7 text-bg">
                <StudioIcon ten="rings" className="size-9 opacity-70" />
                <p className="mt-auto font-display text-[1.9rem] leading-tight">{DICH_VU.tuVan.tieuDe}</p>
                <p className="mt-3 text-sm leading-relaxed opacity-75">{DICH_VU.tuVan.ke}</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <a href={STUDIO.zalo} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-bg px-5 text-sm font-medium text-fg transition hover:opacity-90">
                    Nhắn Zalo
                  </a>
                  <a href={`tel:${STUDIO.dienThoaiSo}`} className="inline-flex min-h-11 items-center rounded-full border border-bg/40 px-5 text-sm transition hover:border-bg">
                    Gọi Hamita
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── Ảnh cưới ──────────────────────────────────────────────────── */}
      {anhTieuBieu.length > 0 && (
        <section id="anh" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <FadeIn>
              <DauMuc
                nhan="Ảnh cưới"
                tieuDe="Những khoảnh khắc Hamita giữ lại"
                moTa="Mỗi tấm dưới đây là của một nhà khác nhau, chụp ở một ngày khác nhau. Anh chị xem thử có bắt gặp mình ở đâu trong đó không."
              />
            </FadeIn>
            <LuoiAnh ds={anhTieuBieu} khung="aspect-[3/4]" />
          </div>
        </section>
      )}

      {/* ── Album & hình cổng — khung 4:5 vì trang album rộng bản hơn ảnh chân dung. */}
      {anhAlbumHC.length > 0 && (
        <section id="album-hc" className="scroll-mt-16 border-t border-line bg-bg-soft">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <FadeIn>
              <DauMuc nhan={ALBUM_HC.nhan} tieuDe={ALBUM_HC.tieuDe} moTa={ALBUM_HC.moTa} />
            </FadeIn>
            <LuoiAnh ds={anhAlbumHC} khung="aspect-[4/5]" />
          </div>
        </section>
      )}

      {/* ── Phim trường — tông giấy da châu Âu (.khu-phim-truong), khung 2:3. */}
      {anhPhimTruong.length > 0 && (
        <section id="phim-truong" className="khu-phim-truong scroll-mt-16 border-t border-line bg-bg-soft">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <FadeIn>
              <DauMuc
                nhan={`${PHIM_TRUONG.nhan} · ${tongGocChup} góc chụp`}
                tieuDe={PHIM_TRUONG.tieuDe}
                moTa={PHIM_TRUONG.moTa}
                phai={
                  tongGocChup > anhPhimTruong.length ? (
                    <Link href="/phim-truong" className={NUT_PHU}>
                      Xem tất cả {tongGocChup} góc chụp <span aria-hidden>→</span>
                    </Link>
                  ) : null
                }
              />
            </FadeIn>
            {/* Bấm vào ảnh nào cũng sang trang xem đủ bối cảnh — phản xạ đầu tiên của khách là bấm vào chính tấm ảnh. */}
            <LuoiAnh ds={anhPhimTruong} khung="aspect-[2/3]" href="/phim-truong" alt={`Bối cảnh tại ${PHIM_TRUONG.ten}`} />
            <FadeIn>
              <p className="mt-10 text-center text-sm text-fg-muted">
                {PHIM_TRUONG.moiGoi}{" "}
                <a href={`tel:${STUDIO.dienThoaiSo}`} className="font-medium text-fg underline underline-offset-4 hover:text-accent">
                  {STUDIO.dienThoai}
                </a>
              </p>
            </FadeIn>
          </div>
        </section>
      )}

      {/* ── Hami Baby — tông trắng hồng (.khu-baby). */}
      <section id="baby" className="khu-baby scroll-mt-16 border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
          <FadeIn>
            <DauMuc
              nhan={`Bé & gia đình · ${HAMI_BABY.soNguoiTheoDoi} người theo dõi`}
              tieuDe={HAMI_BABY.ten}
              moTa={HAMI_BABY.moTa}
              phai={
                <span className="flex flex-wrap gap-3">
                  <a href={`tel:${HAMI_BABY.dienThoaiSo}`} className={NUT_PHU}>
                    <IconGoi /> {HAMI_BABY.dienThoai}
                  </a>
                  <a href={HAMI_BABY.facebook} target="_blank" rel="noreferrer" className={NUT_PHU}>
                    Facebook
                  </a>
                </span>
              }
            />
          </FadeIn>
          {anhBaby.length > 0 && <LuoiAnh ds={anhBaby} khung="aspect-[3/4]" />}
        </div>
      </section>

      {/* ── Hành trình năm bước ───────────────────────────────────────── */}
      {/*
        Vẫn là năm chương THEO ĐÚNG THỨ TỰ (nguyên tắc 25), chỉ đổi từ dòng kể
        dọc sang dải thẻ. Đường kẻ mảnh chạy sau dải thẻ (máy tính) và số thứ tự
        trên mỗi thẻ giữ lại đúng ý "đây là một mạch liền", không phải năm món rời.
      */}
      <section id="hanh-trinh" className="scroll-mt-16 border-t border-line">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28">
          <FadeIn>
            <DauMuc nhan={HANH_TRINH.nhan} tieuDe={HANH_TRINH.tieuDe} giua />
          </FadeIn>
          <ol className="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <span aria-hidden className="absolute top-[3.25rem] right-8 left-8 hidden h-px bg-line-strong lg:block" />
            {HANH_TRINH.chuong.map((c, i) => (
              <li key={c.so} className={i === HANH_TRINH.chuong.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""}>
                <FadeIn cham={i * 90} className="h-full">
                  <div className={`${THE} relative h-full p-6`}>
                    <div className="flex items-center justify-between">
                      <span className="grid size-12 place-items-center rounded-full border border-line-strong bg-bg text-accent">
                        <StudioIcon ten={c.icon} className="size-5" />
                      </span>
                      <span className="font-display text-3xl font-light text-accent/60">{c.so}</span>
                    </div>
                    <h3 className="mt-5 font-display text-[1.45rem] leading-snug font-normal">{c.ten}</h3>
                    <p className="mt-3 text-[13.5px] leading-[1.8] text-fg-muted">{c.ke}</p>
                  </div>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Dải kêu gọi bo tròn ───────────────────────────────────────── */}
      <section className="px-5 pb-20 sm:px-6 sm:pb-28">
        <FadeIn>
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-line bg-gradient-to-br from-accent-soft via-bg-soft to-bg-raised px-6 py-16 text-center sm:px-12 sm:py-20">
            <Logo size="sm" className="mx-auto opacity-70" />
            <h2 className="mx-auto mt-6 max-w-2xl font-display text-3xl leading-[1.2] font-light text-balance sm:text-5xl">
              {LOI_KE.ketTieuDe}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-[1.85] text-balance text-fg-muted">{LOI_KE.ket}</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <a href={STUDIO.zalo} target="_blank" rel="noreferrer" className={NUT_CHINH}>
                <IconChat /> Nhắn Zalo
              </a>
              <a href={`https://m.me/${tenTrangFacebook}`} target="_blank" rel="noreferrer" className={NUT_PHU}>
                Messenger
              </a>
              <a href={`tel:${STUDIO.dienThoaiSo}`} className={NUT_PHU}>
                <IconGoi /> {STUDIO.dienThoai}
              </a>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* ── Liên hệ & bản đồ ──────────────────────────────────────────── */}
      <section id="lien-he" className="scroll-mt-16 border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
          <FadeIn>
            <DauMuc nhan="Liên hệ" tieuDe="Hẹn gặp anh chị tại studio" moTa={`${STUDIO.gioMoCua} · ${STUDIO.email}`} />
          </FadeIn>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {[
              { ten: STUDIO.ten, loai: "cưới hỏi", co: STUDIO },
              { ten: HAMI_BABY.ten, loai: "bé và gia đình", co: HAMI_BABY },
            ].map((c) => (
              <FadeIn key={c.ten}>
                <figure className={`${THE} overflow-hidden`}>
                  <div className="skeleton aspect-[4/3]">
                    <iframe
                      src={c.co.mapEmbed}
                      title={`Bản đồ ${c.ten}`}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="size-full border-0"
                    />
                  </div>
                  <figcaption className="px-5 py-4 text-sm">
                    <span className="font-medium">{c.ten}</span>
                    <span className="text-fg-faint"> · {c.loai}</span>
                    <span className="mt-0.5 block text-fg-muted">{c.co.diaChi}</span>
                  </figcaption>
                </figure>
              </FadeIn>
            ))}
          </div>
          <FadeIn>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={`mailto:${STUDIO.email}`} className={NUT_PHU}>{STUDIO.email}</a>
              <a href={STUDIO.facebook} target="_blank" rel="noreferrer" className={NUT_PHU}>Facebook</a>
              <a href={STUDIO.tiktok} target="_blank" rel="noreferrer" className={NUT_PHU}>TikTok</a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* pb-24 trên điện thoại: chừa chỗ cho ba nút liên hệ nổi, không che dòng chữ cuối. */}
      <footer className="border-t border-line pt-14 pb-24 text-center sm:pb-14">
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

/* ── Mảnh dùng chung trong trang ───────────────────────────────────────── */

/**
 * Đầu mỗi khu: nhãn nhỏ chữ hoa màu nhấn, tiêu đề lớn, câu dẫn — canh TRÁI,
 * nút "xem thêm" (nếu có) dạt sang phải cùng hàng. Kiểu đầu mục của mohome:
 * mắt đọc từ trái sang là gặp ngay tiêu đề rồi tới lưới, không phải dò giữa.
 */
function DauMuc({
  nhan,
  tieuDe,
  moTa,
  phai,
  giua = false,
}: {
  nhan: string;
  tieuDe: string;
  moTa?: string;
  phai?: ReactNode;
  giua?: boolean;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-x-8 gap-y-5 ${giua ? "justify-center text-center" : ""}`}>
      <div className={`min-w-0 ${giua ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
        <p className="text-[11px] font-medium tracking-[0.22em] text-accent uppercase">{nhan}</p>
        <h2 className="mt-3 font-display text-3xl leading-[1.2] font-light text-balance sm:text-[2.75rem]">{tieuDe}</h2>
        {moTa && <p className="mt-4 text-[15px] leading-[1.8] text-balance text-fg-muted">{moTa}</p>}
      </div>
      {phai}
    </div>
  );
}

/** Một tấm ảnh bo góc lớn, phóng nhẹ khi rê chuột. */
function AnhThe({ id, className, rong = 640, alt = "" }: { id: string; className: string; rong?: number; alt?: string }) {
  return (
    <div className={`group skeleton overflow-hidden rounded-[1.5rem] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/img/${id}?w=${rong}`}
        alt={alt}
        loading="lazy"
        className="size-full object-cover transition duration-700 ease-out group-hover:scale-105"
      />
    </div>
  );
}

/**
 * Lưới ảnh của một khu. Khung ảnh truyền vào theo TỈ LỆ ẢNH THẬT của khu đó
 * (nguyên tắc 24) — đừng đổi cho đẹp mà không đo lại.
 */
function LuoiAnh({ ds, khung, href, alt = "" }: { ds: string[]; khung: string; href?: string; alt?: string }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {ds.map((id, i) => (
        <FadeIn key={id} cham={i * 60}>
          {href ? (
            <Link href={href} className="block">
              <AnhThe id={id} className={khung} alt={alt} />
            </Link>
          ) : (
            <AnhThe id={id} className={khung} alt={alt} />
          )}
        </FadeIn>
      ))}
    </div>
  );
}

function IconGoi() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  );
}

function IconGhim() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function IconDongHo() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
