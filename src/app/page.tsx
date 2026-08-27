import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { FadeIn } from "@/components/FadeIn";
import { StudioIcon } from "@/components/StudioIcon";
import {
  ALBUM_HC,
  ANH_BIA,
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

  /*
    Studio có nhiều mảng tách bạch và khách của từng mảng khác hẳn nhau: người
    tìm chụp cưới không đi tìm chụp thôi nôi, còn người hỏi thuê phim trường
    lại là nhóm khác nữa. Nên ảnh chia theo khu — ảnh cưới, ảnh bé, phim trường.
  */
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
    Khu phim trường đọc khác hẳn hai khu trên.

    Ảnh cưới và ảnh bé gom ẢNH BÌA của nhiều album — mỗi album là buổi chụp của
    một nhà khách. Phim trường thì chỉ có MỘT album, và chính các góc chụp bên
    trong nó mới là thứ cần khoe; lấy một tấm bìa thì chẳng quảng cáo được gì.
    Nên ở đây đọc thẳng cây thư mục của album đó ra.

    Đây là lời gọi Drive duy nhất của trang này. Chấp nhận được vì `loadTree`
    có cache 5 phút dùng chung với trang khách xem, nên thực tế là một lần gọi
    mỗi 5 phút chứ không phải mỗi lượt khách vào.
  */
  const albumPhimTruong = galleries.find(
    (g) => g.featured && g.khuGioiThieu === "phimtruong"
  );
  let anhPhimTruong: string[] = [];
  if (albumPhimTruong) {
    try {
      const tree = await loadTree(albumPhimTruong.driveFolderId);
      anhPhimTruong = tree.albums
        .flatMap((a) => a.photos)
        .map((p) => p.id)
        .slice(0, 8);
    } catch {
      /*
        Drive trục trặc thì bỏ qua khu này, KHÔNG để cả trang giới thiệu chết
        theo — đây là trang quảng bá công khai, mất nó là mất khách vào xem.
      */
    }
  }

  // Ảnh minh hoạ cạnh phần "Về Hamita" — đoạn đó nói về cưới nên lấy ảnh cưới.
  const anhBenCanh = anhTieuBieu[0] ?? null;

  return (
    <main>
      {/*
        coAnhNen={false} chứ không phải true như hồi còn ảnh bìa cố định: ảnh
        bìa cũ là poster nền đen nên chữ menu màu trắng nổi rõ, còn bốn trang
        album bây giờ phần lớn nền sáng — để chữ trắng là menu biến mất. Chữ
        tối, cộng với dải sáng ở mép trên dải ảnh, đọc được trên cả bốn tấm.
      */}
      <NavGioiThieu coAnhNen={false} />

      {/*
        Dải ảnh bìa chạy. Ảnh là trang album đã dàn chữ nên hiện trọn tấm, không
        cắt — xem AnhBiaChay.tsx. Cũng vì ảnh đã kín chữ sẵn nên KHÔNG chồng
        thêm chữ của trang lên; tên studio nằm ở dải tiêu đề ngay dưới, như cách
        đặt caption dưới ảnh bìa tạp chí.
      */}
      <AnhBiaChay anh={ANH_BIA} />

      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center sm:py-16">
          <FadeIn>
            <h1 className="font-display text-3xl leading-tight font-light sm:text-5xl">
              {STUDIO.ten}
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-display text-lg font-light text-fg-muted text-balance sm:text-xl">
              {STUDIO.khauHieu}
            </p>

            {/*
              Câu mở đầu đặt ngay đây, thay chỗ dòng "Chụp ảnh cưới, gia đình &
              bé yêu tại Tầm Vu, Long An" cũ.

              Dòng cũ là một cái nhãn phân loại — đúng nhưng không mời ai đọc
              tiếp. Câu này nói thẳng vào thứ khách đang lo (ngày cưới trôi rất
              nhanh) rồi mới nói Hamita làm gì với nó. Địa chỉ không mất đi, nó
              nằm ở phần liên hệ và trong thẻ mô tả trang.
            */}
            <p className="mx-auto mt-7 max-w-lg text-[15px] leading-[1.9] text-balance text-fg-muted">
              {LOI_KE.moDau}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href={`tel:${STUDIO.dienThoaiSo}`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-fg px-7 text-sm font-medium tracking-wide text-bg transition hover:opacity-88 active:scale-95"
              >
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
                </svg>
                {STUDIO.dienThoai}
              </a>
              <a
                href="#hanh-trinh"
                className="inline-flex min-h-12 items-center rounded-full border px-7 text-sm tracking-wide transition active:scale-95"
                style={{ borderColor: "var(--line-strong)", color: "var(--fg)" }}
              >
                Xem hành trình
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

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
            <p className="eyebrow">{VE_HAMITA.nhan}</p>
            <h2 className="rule mt-5 font-display text-3xl leading-[1.3] font-light text-balance sm:text-4xl">
              {VE_HAMITA.tieuDe}
            </h2>
            <p className="mt-7 text-[15px] leading-[1.85] text-fg-muted">
              {VE_HAMITA.ke}
            </p>
          </FadeIn>
        </div>
      </section>

      {/*
        Năm dịch vụ, kể lại thành năm chương theo đúng thứ tự chúng diễn ra với
        một cặp đôi.

        Trước đây là lưới năm ô có icon — đúng nhưng đọc như tờ rao giá, và
        khách phải tự ghép xem mình sẽ trải qua những gì. Xếp theo thời gian
        thì tự nó thành một mạch, đọc hết là hình dung được cả chặng đường.

        Đánh số 01–05 ở đây là CÓ NGHĨA chứ không phải trang trí: đây thật sự
        là một trình tự, chương 02 xảy ra sau chương 01. Sợi chỉ dọc nối các
        chương cũng vì thế — nó nói rằng đây là một mạch liền, không phải năm
        món rời nhau.
      */}
      <section id="hanh-trinh" className="scroll-mt-16 border-y border-line bg-bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-24 sm:px-6 sm:py-32">
          <FadeIn>
            <p className="eyebrow text-center">{HANH_TRINH.nhan}</p>
            <h2 className="rule mx-auto mt-5 max-w-xl text-center font-display text-3xl leading-[1.25] font-light text-balance sm:text-4xl">
              {HANH_TRINH.tieuDe}
            </h2>
          </FadeIn>

          <ol className="mt-16 sm:mt-20">
            {HANH_TRINH.chuong.map((c, i) => (
              <li key={c.so}>
                <FadeIn cham={i * 90}>
                  <div className="relative grid grid-cols-[auto_1fr] gap-x-5 pb-12 sm:gap-x-8 sm:pb-14">
                    {/*
                      Sợi chỉ nối xuống chương sau. Chương cuối không có, nếu
                      không sẽ có một đoạn chỉ thừa chạy vào khoảng trống.
                    */}
                    {i < HANH_TRINH.chuong.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute top-12 bottom-0 left-[1.375rem] w-px bg-line-strong sm:top-14 sm:left-[1.75rem]"
                      />
                    )}

                    <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-line-strong bg-bg text-accent sm:size-14">
                      <StudioIcon ten={c.icon} className="size-5 sm:size-6" />
                    </div>

                    <div>
                      <p className="font-display text-sm tracking-[0.3em] text-accent">
                        {c.so}
                      </p>
                      <h3 className="mt-1.5 font-display text-2xl font-normal sm:text-[1.75rem]">
                        {c.ten}
                      </h3>
                      <p className="mt-3 text-[15px] leading-[1.85] text-fg-muted">
                        {c.ke}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {anhTieuBieu.length > 0 && (
        <section id="anh" className="scroll-mt-16">
          <div className="mx-auto max-w-[1700px] px-2 py-24 sm:px-6 sm:py-32">
            <FadeIn>
              {/* Nói rõ "ảnh cưới": từ khi tách khu chụp bé xuống dưới, một
                  nhãn chung chung không còn phân biệt được hai mảng. */}
              <p className="eyebrow text-center">Ảnh cưới</p>
              <h2 className="rule mx-auto mt-5 max-w-lg text-center font-display text-3xl font-light sm:text-4xl">
                Những khoảnh khắc Hamita giữ lại
              </h2>
              {/* Ba khu ảnh phía dưới đều có một câu dẫn; riêng khu này trước
                  đó nhảy thẳng từ tiêu đề vào lưới ảnh, đọc bị hụt một nhịp. */}
              <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-balance text-fg-muted">
                Mỗi tấm dưới đây là của một nhà khác nhau, chụp ở một ngày khác
                nhau. Anh chị xem thử có bắt gặp mình ở đâu trong đó không.
              </p>
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

      {/*
        Khu Album và hình cổng — sản phẩm in.

        Tách khỏi khu ảnh cưới ngay trên vì khách nhìn hai thứ đó với hai mục
        đích khác nhau: xem ảnh cưới là xem PHONG CÁCH CHỤP, còn xem album và
        hình cổng là xem THỨ MÌNH SẼ CẦM VỀ. Gộp chung một lưới thì cả hai đều
        bị loãng — người đang chọn studio không phân biệt được studio này chụp
        đẹp hay dàn album đẹp.

        Đặt liền ngay sau ảnh cưới: xem xong ảnh, câu hỏi kế tiếp thường là
        "rồi tôi nhận được gì".

        Khung 4/5 chứ không phải 3/4 như khu ảnh cưới — trang album dàn ngang
        và hình cổng đều rộng bản hơn ảnh chân dung, khung cao quá sẽ xén mất
        hai bên đúng chỗ có chữ.
      */}
      {anhAlbumHC.length > 0 && (
        <section id="album-hc" className="scroll-mt-16 border-t border-line">
          <div className="mx-auto max-w-[1700px] px-2 py-24 sm:px-6 sm:py-32">
            <FadeIn>
              <p className="eyebrow text-center">{ALBUM_HC.nhan}</p>
              <h2 className="rule mx-auto mt-5 max-w-lg text-center font-display text-3xl font-light sm:text-4xl">
                {ALBUM_HC.tieuDe}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-center text-sm leading-relaxed text-balance text-fg-muted">
                {ALBUM_HC.moTa}
              </p>
            </FadeIn>

            <div className="mt-16 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {anhAlbumHC.map((fileId, i) => (
                <FadeIn key={fileId} cham={i * 60}>
                  <div className="group skeleton aspect-[4/5] overflow-hidden rounded-sm">
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

      {/*
        Khu phim trường.

        Đặt ngay sau khu ảnh cưới chứ không xuống cuối trang: người vừa xem
        xong ảnh cưới là người đang cân nhắc đặt chụp, và câu hỏi kế tiếp của
        họ thường là "chụp ở đâu". Trả lời ngay lúc đó là đúng nhịp nhất.

        Bố cục cố ý khác hai khu kia — ảnh đầu tràn rộng, bảy tấm còn lại xếp
        lưới nhỏ bên dưới. Đây là bối cảnh chứ không phải ảnh của khách, khoe
        không gian thì cần một tấm đủ lớn để thấy được tổng thể.
      */}
      {anhPhimTruong.length > 0 && (
        <section
          id="phim-truong"
          className="scroll-mt-16 border-t border-line bg-bg-soft"
        >
          <div className="mx-auto max-w-[1700px] px-5 py-24 sm:px-6 sm:py-28">
            <FadeIn>
              <div className="mx-auto max-w-3xl text-center">
                <p className="eyebrow">{PHIM_TRUONG.nhan}</p>
                <h2 className="rule mx-auto mt-5 font-display text-3xl font-light sm:text-4xl">
                  {PHIM_TRUONG.tieuDe}
                </h2>
                <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-balance text-fg-muted">
                  {PHIM_TRUONG.moTa}
                </p>
                <p className="eyebrow mt-4">
                  {PHIM_TRUONG.ten} · {albumPhimTruong?.photoCount ?? 0} góc chụp
                </p>
              </div>
            </FadeIn>

            {/*
              Khung 2:3 chứ không phải 3/4 như hai khu kia, và cũng không phải
              một tấm ngang lớn như bản đầu.

              Lý do đo được: cả 16 tấm của album này đều là ảnh DỌC 1365x2048,
              tức đúng 2:3. Bản đầu em dựng một tấm 16:9 tràn rộng cho hoành
              tráng, nhưng object-cover sẽ xén mất khoảng 63% chiều cao mỗi
              tấm — mà đây là ảnh khoe KHÔNG GIAN, xén đi thì còn lại đúng cái
              nó cần cho thấy. Khung khớp đúng tỉ lệ gốc thì không xén tấm nào.
            */}
            <div className="mt-14 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {anhPhimTruong.map((fileId, i) => (
                <FadeIn key={fileId} cham={i * 60}>
                  <div className="group skeleton aspect-[2/3] overflow-hidden rounded-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/img/${fileId}?w=640`}
                      alt={`Bối cảnh tại ${PHIM_TRUONG.ten}`}
                      loading="lazy"
                      className="size-full object-cover transition duration-700 ease-out group-hover:scale-105"
                    />
                  </div>
                </FadeIn>
              ))}
            </div>

            <FadeIn>
              <div className="mt-12 text-center">
                <p className="text-sm text-fg-muted">{PHIM_TRUONG.moiGoi}</p>
                <a
                  href={`tel:${STUDIO.dienThoaiSo}`}
                  className="btn-primary mt-5 inline-flex"
                >
                  {STUDIO.dienThoai}
                </a>
              </div>
            </FadeIn>
          </div>
        </section>
      )}

      {/*
        Khu Hami Baby — mảng chụp bé và gia đình.

        Trước đây chỉ có chữ, không một tấm ảnh nào: người đang tìm chỗ chụp
        thôi nôi đọc xong vẫn không biết studio chụp bé ra sao. Giờ ảnh của
        mảng này nằm ngay đây, tách hẳn khỏi ảnh cưới phía trên.
      */}
      {/*
        khu-baby đổi bảng màu của cả khu sang tông trắng hồng — xem chú thích
        ở globals.css. Đặt trên chính <section> chứ không phải thẻ con, để
        đường kẻ trên và nền cũng nằm trong phạm vi đổi màu.
      */}
      <section id="baby" className="khu-baby scroll-mt-16 border-t border-line bg-bg-soft">
        <div className="mx-auto max-w-[1700px] px-5 py-24 sm:px-6 sm:py-28">
          <FadeIn>
            <div className="mx-auto max-w-3xl text-center">
              <p className="eyebrow">Mảng dịch vụ khác</p>
              <h2 className="mt-5 font-display text-3xl font-light sm:text-4xl">
                {HAMI_BABY.ten}
              </h2>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-balance text-fg-muted">
                {HAMI_BABY.moTa}
              </p>
              <p className="eyebrow mt-4">{HAMI_BABY.soNguoiTheoDoi} người theo dõi</p>
            </div>
          </FadeIn>

          {anhBaby.length > 0 && (
            <div className="mt-14 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {anhBaby.map((fileId, i) => (
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
          )}

          <FadeIn>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
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

      {/*
        Câu kết, đặt ngay trước phần liên hệ.

        Một trang kể chuyện mà hết ảnh là nhảy thẳng vào bảng địa chỉ với bản
        đồ thì cụt. Đoạn này khép mạch lại — nhắc rằng chương 01 (ngồi nghe
        nhau) là thứ tiếp theo khách cần làm, rồi mới đưa số điện thoại.
      */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-6 sm:py-28">
          <FadeIn>
            <span aria-hidden className="mx-auto block h-px w-10 bg-line-strong" />
            <h2 className="mt-8 font-display text-3xl leading-[1.25] font-light text-balance sm:text-4xl">
              {LOI_KE.ketTieuDe}
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-[15px] leading-[1.9] text-balance text-fg-muted">
              {LOI_KE.ket}
            </p>
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

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <p className="eyebrow">{STUDIO.ten} · cưới hỏi</p>
                <div className="skeleton mt-2 aspect-[4/3] overflow-hidden rounded-sm border border-line-strong">
                  <iframe
                    src={STUDIO.mapEmbed}
                    title={`Bản đồ ${STUDIO.ten}`}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="size-full border-0"
                  />
                </div>
              </div>
              <div>
                <p className="eyebrow">{HAMI_BABY.ten} · bé và gia đình</p>
                <div className="skeleton mt-2 aspect-[4/3] overflow-hidden rounded-sm border border-line-strong">
                  <iframe
                    src={HAMI_BABY.mapEmbed}
                    title={`Bản đồ ${HAMI_BABY.ten}`}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="size-full border-0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-14 flex flex-wrap justify-center gap-3">
              <a href={STUDIO.zalo} target="_blank" rel="noreferrer" className="btn-primary">
                Nhắn tin Zalo
              </a>
              <a href={STUDIO.facebook} target="_blank" rel="noreferrer" className="btn">
                Facebook
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
