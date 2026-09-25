import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { FadeIn } from "@/components/FadeIn";
import { StudioIcon } from "@/components/StudioIcon";
import {
  ANH_BIA,
  CO_SO,
  DAU_TRANG,
  DOI_NGU,
  DICH_VU,
  HAMI_BABY,
  LOI_KE,
  PHAN_DICH_VU,
  PHIM_TRUONG,
  STUDIO,
  VE_HAMITA,
} from "@/lib/studio";
import { docAnhNhom, docThuMucGioiThieu } from "@/lib/anhGioiThieu";
import { docNhomCoMuc } from "@/lib/mucDichVu";
import { docDoiNgu } from "@/lib/doiNgu";
import { NHOM_GIOI_THIEU } from "@/lib/nhomGioiThieu";
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
    MỌI THỨ trên trang giới thiệu chọn ở MỘT chỗ: /admin/gioi-thieu (anh chốt
    17/09/2026, bỏ ô tích "Trang giới thiệu" trên thẻ album). Cột featured /
    khuGioiThieu của Gallery không còn ai đọc — giữ trong database, không xoá.

    Studio chọn THƯ MỤC cho từng nhóm dịch vụ; trang chủ lấy tấm bìa từng thư
    mục (chỉ đọc database). Riêng khu phim trường đọc ảnh thật trong thư mục
    (lời gọi Drive duy nhất của trang, cache 5 phút chung với trang khách).
  */
  const [thuMucGioiThieu, nhomCoMuc, doiNgu] = await Promise.all([docThuMucGioiThieu(), docNhomCoMuc(), docDoiNgu()]);
  const nhomCuaKhu = (khu: string) => NHOM_GIOI_THIEU.find((n) => n.khu === khu);

  /*
    Mục nhỏ của một nhóm (Bầu, Sơ sinh, Gia đình…) — anh yêu cầu 25/09/2026 cho
    Hami Baby Studio: phần nào của thương hiệu chỉ có một mảng dịch vụ mà mảng
    đó lại chia nhiều mục thì bày thẳng các mục ra trang chủ, khách thấy ngay
    studio chụp những gì thay vì phải bấm vào mới biết.
  */
  const mucCuaKhu = (khu: string) => nhomCoMuc.find((n) => n.khu === khu)?.muc ?? [];
  const biaCuaMuc = (nhomKey: string, mucKey: string) =>
    thuMucGioiThieu.find((t) => t.nhom === nhomKey && t.muc === mucKey)?.anhBia ?? undefined;
  const thuMucCuaKhu = (khu: string) => thuMucGioiThieu.filter((t) => t.nhom === nhomCuaKhu(khu)?.key);
  const biaCuaKhu = (khu: string) =>
    thuMucCuaKhu(khu)
      .map((t) => t.anhBia)
      .filter((x): x is string => !!x)
      .slice(0, 8);
  const biaNhom = (khu: string) => biaCuaKhu(khu)[0];

  const anhTieuBieu = biaCuaKhu("cuoi");
  const anhBaby = biaCuaKhu("baby");

  /*
    Khu phim trường: chỉ lấy ẢNH DỌC cho khung 2:3, thiếu thì bù tấm còn lại
    (nguyên tắc 24). Drive trục trặc thì khu này tự ẩn, trang không chết theo.
  */
  let anhPhimTruong: string[] = [];
  let tongGocChup = 0;
  if (thuMucCuaKhu("phimtruong").length > 0) {
    const tatCa = await docAnhNhom("hamita-garden");
    tongGocChup = tatCa.length;
    const doc = tatCa.filter((p) => p.width && p.height && p.height > p.width);
    anhPhimTruong = [...doc, ...tatCa.filter((p) => !doc.includes(p))].slice(0, 8).map((p) => p.id);
  }

  /* Ảnh đặt lên từng thẻ của lưới "Hamita chụp gì?". */
  const anhThe: Record<string, string | undefined> = {
    cuoi: biaNhom("cuoi"),
    phimtruong: biaNhom("phimtruong") ?? anhPhimTruong[0],
    baby: biaNhom("baby"),
    // Váy & trang điểm chưa có thư mục riêng thì mượn ảnh cưới — tấm nào cũng là váy và trang điểm.
    vay: biaNhom("vay") ?? anhTieuBieu[1] ?? anhTieuBieu[0],
    nhasu: biaNhom("nhasu"),
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
    phimtruong: anhPhimTruong.length > 0,
    baby: true,
    vay: true,
    nhasu: true,
  };
  const hrefThe = (m: (typeof DICH_VU.muc)[number]) => {
    const nhom = nhomCuaKhu(m.khu);
    // Nhóm đã có thư mục chọn ở /admin/gioi-thieu thì sang trang riêng của nó.
    if (nhom && thuMucCuaKhu(m.khu).length > 0) return `/dich-vu/${nhom.key}`;
    // Khu hành trình đã gỡ 25/09/2026 nên mảng chưa có ảnh dẫn thẳng về liên hệ.
    return khuDangHien[m.khu] ? m.href : "#lien-he";
  };

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
          ...(thuMucCuaKhu("cuoi").length > 0 ? [] : ["/dich-vu/anh-cuoi"]),
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
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pt-12 pb-8 sm:px-6 sm:pt-16 sm:pb-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pt-20 lg:pb-10">
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

            {/*
              Bốn cái tên studio đang dùng (anh yêu cầu 25/09/2026). Để dạng
              thẻ viền chứ KHÔNG phải một dòng chữ hoa nữa: ngay trên đã có một
              dòng chữ hoa màu nhấn rồi, thêm dòng thứ hai cùng kiểu thì hai
              dòng tranh nhau, mắt không biết đọc cái nào trước.
            */}
            <ul className="mt-4 flex flex-wrap gap-2">
              {DAU_TRANG.thuongHieu.map((t) => (
                <li key={t} className="rounded-full border border-line-strong px-3 py-1 text-xs text-fg-muted">
                  {t}
                </li>
              ))}
            </ul>

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

      {/* ── Hamita chụp gì? ───────────────────────────────────────────── */}
      {/*
        Đứng NGAY SAU đầu trang, trước "Về Hamita" (anh yêu cầu 17/09/2026): khách
        mới vào phải thấy các dịch vụ liền để dễ bán thêm, không phải cuộn qua
        đoạn giới thiệu. Lề trên hẹp hơn các khu khác để hàng thẻ đầu ló vào
        ngay màn hình đầu tiên.
      */}
      <section id="dich-vu" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-5 pt-4 pb-20 sm:px-6 sm:pb-28 lg:pt-6">
          <FadeIn>
            <DauMuc nhan={DICH_VU.nhan} tieuDe={DICH_VU.tieuDe} />
          </FadeIn>
          {/*
            BỐN PHẦN theo thương hiệu (anh yêu cầu 25/09/2026): Hamita Wedding
            gom ba mảng cưới, còn Hami Baby Studio, Tiệm ảnh nhà Su và Váy cưới
            & trang điểm mỗi cái một dải ngang riêng. Trước đó sáu thẻ nằm
            chung một lưới, khách không thấy được đây là mấy cái tên khác nhau.

            Phần nhiều thẻ giữ lưới thẻ dọc như cũ; phần một thẻ thành dải
            ngang ảnh trái chữ phải — một thẻ dọc đứng lẻ giữa hàng trông như
            lưới bị thiếu ảnh.
          */}
          {PHAN_DICH_VU.map((phan, iPhan) => {
            const the = DICH_VU.muc.filter((m) => (phan.khu as readonly string[]).includes(m.khu));
            if (the.length === 0) return null;
            /*
              Phần một mảng mà mảng đó chia nhiều mục (Hami Baby Studio: Bầu,
              Sơ sinh, Baby - Thôi nôi, Gia đình) thì bày thẳng các mục — anh
              yêu cầu 25/09/2026. Mục chưa chọn thư mục nào vẫn hiện, nhưng dẫn
              về khu ảnh trong trang chứ KHÔNG dẫn sang trang mục: mục trống
              bên đó trả 404 (nguyên tắc 24).
            */
            const nhomDon = the.length === 1 ? nhomCuaKhu(the[0].khu) : undefined;
            const mucCon = the.length === 1 ? mucCuaKhu(the[0].khu) : [];
            const bayMucCon = !!nhomDon && mucCon.length > 1;

            /*
              Tên phần trùng tên thẻ duy nhất thì thôi, khỏi đọc hai lần — trừ
              khi đang bày mục con, vì lúc đó thẻ mang tên ấy không còn hiện
              nữa và phần sẽ mất luôn tên (ba ô "Sinh nhật / Tết / Beauty"
              đứng trơ, khách không biết của tiệm nào).
            */
            const inTenPhan = bayMucCon || !the.some((m) => m.ten === phan.ten);

            return (
              <div key={phan.ten} className={iPhan === 0 ? "mt-10" : "mt-16"}>
                {inTenPhan && (
                  <FadeIn>
                    <div className="flex items-center gap-4">
                      <h3 className="font-display text-xl whitespace-nowrap sm:text-2xl">{phan.ten}</h3>
                      <span aria-hidden className="h-px flex-1 bg-line" />
                    </div>
                  </FadeIn>
                )}

                {bayMucCon ? (
                  <div className={`${inTenPhan ? "mt-5" : ""} grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4`}>
                    {mucCon.map((mc, i) => {
                      const anh = biaCuaMuc(nhomDon.key, mc.key);
                      const nenKhu = the[0].khu === "baby" ? "khu-baby" : "";
                      const href = anh ? `/dich-vu/${nhomDon.key}/${mc.key}` : hrefThe(the[0]);
                      return (
                        <FadeIn key={mc.key} cham={i * 70}>
                          <a
                            href={href}
                            className={`group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] ${nenKhu} ${anh ? "bg-bg-soft" : "border border-line bg-gradient-to-br from-accent-soft to-bg-soft"}`}
                          >
                            {anh ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={`/api/img/${anh}?w=760`}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                              />
                            ) : (
                              <span className="absolute top-5 left-5 grid size-14 place-items-center rounded-full border border-line-strong bg-bg-raised text-accent">
                                <StudioIcon ten={the[0].icon} className="size-6" />
                              </span>
                            )}
                            {anh && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
                            <span className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 ${anh ? "text-white" : "text-fg"}`}>
                              <span className="font-display text-[1.6rem] leading-tight">{mc.ten}</span>
                              <span
                                aria-hidden
                                className={`grid size-8 shrink-0 place-items-center rounded-full transition ${anh ? "bg-white/20 backdrop-blur-sm group-hover:bg-white/35" : "border border-line-strong group-hover:border-accent group-hover:text-accent"}`}
                              >
                                →
                              </span>
                            </span>
                          </a>
                        </FadeIn>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`${inTenPhan ? "mt-5" : ""} grid gap-4 sm:gap-5 ${
                      the.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : ""
                    }`}
                  >
                  {the.map((m, i) => {
                    const anh = anhThe[m.khu];
                    const nhan = m.nhan && m.nhan !== phan.ten ? m.nhan : "";
                    const nenKhu = m.khu === "baby" ? "khu-baby" : "";

                    /* Dải ngang: ảnh một bên, chữ trên nền sáng bên kia. */
                    if (the.length === 1) {
                      return (
                        <FadeIn key={m.ten} cham={i * 70}>
                          <a
                            href={hrefThe(m)}
                            className={`group grid overflow-hidden rounded-[1.75rem] border border-line bg-bg-raised transition hover:border-line-strong sm:grid-cols-[minmax(0,17rem)_1fr] lg:grid-cols-[minmax(0,20rem)_1fr] ${nenKhu}`}
                          >
                            {/*
                              Khung ảnh DỌC 4:5, y như thẻ ở phần trên. Lúc đầu
                              em làm khung ngang 16:10 cho ra dáng dải, nhưng
                              ảnh studio là ảnh dọc 960×1440 nên khung đó nuốt
                              mất 61% tấm hình — anh nhìn ra ngay 25/09/2026.
                              Khung 4:5 giữ được 84%, bằng đúng thẻ dọc cũ.
                            */}
                            <span className="relative block aspect-[4/5] overflow-hidden">
                              {anh ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`/api/img/${anh}?w=1280`}
                                  alt=""
                                  loading="lazy"
                                  className="absolute inset-0 size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                                />
                              ) : (
                                <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-accent-soft to-bg-soft text-accent">
                                  <StudioIcon ten={m.icon} className="size-10" />
                                </span>
                              )}
                            </span>
                            <span className="flex flex-col justify-center p-7 sm:p-9">
                              {nhan && (
                                <span className="block text-[11px] font-medium tracking-[0.2em] text-fg-muted uppercase">{nhan}</span>
                              )}
                              <span className="mt-2 block font-display text-[2rem] leading-tight">{m.ten}</span>
                              {m.moTa && <span className="mt-3 block text-sm leading-relaxed text-fg-muted">{m.moTa}</span>}
                              <span className="mt-5 flex items-center gap-2 text-sm text-accent">
                                Xem thử
                                <span
                                  aria-hidden
                                  className="grid size-8 place-items-center rounded-full border border-line-strong transition group-hover:border-accent"
                                >
                                  →
                                </span>
                              </span>
                            </span>
                          </a>
                        </FadeIn>
                      );
                    }

                    return (
                      <FadeIn key={m.ten} cham={i * 70}>
                        {/*
                          Chữ nằm trên ảnh, dưới một lớp tối dần từ đáy — kiểu thẻ của
                          mohome: nhìn ảnh là biết mảng gì, không phải đọc nhãn dưới.
                          Cả thẻ là một liên kết, bấm đâu cũng tới đúng khu đó.
                        */}
                        <a
                          href={hrefThe(m)}
                          className={`group relative block aspect-[4/5] overflow-hidden rounded-[1.75rem] ${nenKhu} ${anh ? "bg-bg-soft" : "border border-line bg-gradient-to-br from-accent-soft to-bg-soft"}`}
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
                            {nhan && <span className="block text-[11px] font-medium tracking-[0.2em] uppercase opacity-85">{nhan}</span>}
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
                </div>
                )}
              </div>
            );
          })}

          <div className="mt-16">

            {/*
              Mời tư vấn: một DẢI NGANG khép lại cả khu dịch vụ. Trước 17/09/2026
              nó là thẻ thứ sáu lấp đủ hai hàng ba thẻ; từ 25/09 lưới chia thành
              bốn phần thương hiệu nên nó đứng riêng dưới cùng.
            */}
            <FadeIn>
              <div className="flex flex-col gap-5 rounded-[1.75rem] bg-fg p-7 text-bg sm:p-9 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                <StudioIcon ten="rings" className="size-9 opacity-70" />
                <p className="mt-4 font-display text-[1.9rem] leading-tight">{DICH_VU.tuVan.tieuDe}</p>
                <p className="mt-3 text-sm leading-relaxed opacity-75">{DICH_VU.tuVan.ke}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2.5">
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
                    <Link href="/dich-vu/hamita-garden" className={NUT_PHU}>
                      Xem tất cả {tongGocChup} góc chụp <span aria-hidden>→</span>
                    </Link>
                  ) : null
                }
              />
            </FadeIn>
            {/* Bấm vào ảnh nào cũng sang trang xem đủ bối cảnh — phản xạ đầu tiên của khách là bấm vào chính tấm ảnh. */}
            <LuoiAnh ds={anhPhimTruong} khung="aspect-[2/3]" href="/dich-vu/hamita-garden" alt={`Bối cảnh tại ${PHIM_TRUONG.ten}`} />
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

      {/*
        ── Đội ngũ ────────────────────────────────────────────────────────
        Anh yêu cầu 25/09/2026. Danh sách lấy thẳng từ mục Nhân viên của CRM,
        chỉ hiện người quản lý đã bật cờ "trang giới thiệu" và còn đang làm —
        không gõ lại một danh sách thứ hai để rồi hai bên lệch nhau.

        Cả khu TỰ ẨN khi chưa ai được bật: một khu trống với cái tiêu đề trơ
        trọi còn tệ hơn là không có.
      */}
      {doiNgu.length > 0 && (
        <section id="doi-ngu" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-28">
            <FadeIn>
              <DauMuc nhan="Đội ngũ" tieuDe={DOI_NGU.tieuDe} moTa={DOI_NGU.moTa} giua />
            </FadeIn>
            <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
              {doiNgu.map((n, i) => (
                <FadeIn key={n.id} cham={i * 60}>
                  <li className="text-center">
                    <div className="mx-auto size-28 overflow-hidden rounded-full border border-line bg-bg-soft sm:size-32">
                      {n.anhLuc ? (
                        /* ?v= là lúc ảnh được cập nhật: đổi ảnh thì địa chỉ
                           đổi theo nên trình duyệt tải tấm mới ngay, không
                           còn dính tấm cũ trong bộ nhớ đệm 5 phút. */
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/anh-nv/${n.id}?v=${n.anhLuc}`}
                          alt={n.ten}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        /* Chưa tự thêm ảnh: chữ cái đầu tên trên nền màu nhấn
                           nhạt — ô xám trống trông như ảnh hỏng. */
                        <span className="grid size-full place-items-center bg-accent-soft font-display text-3xl text-accent">
                          {n.ten.trim().slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 font-display text-lg leading-tight">{n.ten}</p>
                    <p className="mt-1 text-xs tracking-wide text-fg-muted">{n.phongBan}</p>
                    {n.gioiThieu && (
                      <p className="mx-auto mt-2 max-w-[22ch] text-xs leading-relaxed text-fg-faint">{n.gioiThieu}</p>
                    )}
                  </li>
                </FadeIn>
              ))}
            </ul>
          </div>
        </section>
      )}

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
        {/*
          Bỏ dòng "Khách đã nhận link xem ảnh thì mở thẳng link studio gửi ·
          Quản lý" (anh yêu cầu 25/09/2026). Lối vào trang quản lý nay chỉ còn
          gõ thẳng /admin — đừng tự dựng lại link đó ở chân trang.
        */}
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
