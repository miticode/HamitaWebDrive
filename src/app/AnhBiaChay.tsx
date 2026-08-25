"use client";

import { useEffect, useState } from "react";

/** Bao lâu thì tự sang tấm kế. Đủ chậm để đọc hết chữ trên trang album. */
const DOI_SAU = 6500;

/** Vuốt ngang bao nhiêu điểm ảnh mới tính là muốn chuyển tấm. */
const NGUONG_VUOT = 45;

/**
 * Dải ảnh bìa chạy ở đầu trang giới thiệu.
 *
 * Ảnh ở đây là TRANG ALBUM ĐÃ DÀN — có chữ, có bố cục riêng, không phải ảnh
 * đơn. Nên phải hiện trọn tấm (`object-contain`) chứ không cắt theo khung như
 * ảnh bìa thường: cắt là mất chữ và vỡ bố cục người thiết kế đã dựng.
 *
 * Hiện trọn thì bốn tấm mỗi tấm một tỉ lệ (ba tấm ngang, một tấm dọc) sẽ chừa
 * lại khoảng trống hai bên khác nhau. Lấp bằng chính tấm đó phóng to và làm mờ
 * ở lớp dưới — khung luôn đầy, màu luôn ăn với ảnh đang hiện, mà không phải
 * cắt tấm nào.
 */
export function AnhBiaChay({ anh }: { anh: readonly { ten: string; mo: string }[] }) {
  const [hienTai, setHienTai] = useState(0);
  const [tuDung, setTuDung] = useState(false);
  const [batDauVuot, setBatDauVuot] = useState<number | null>(null);

  const sang = (i: number) => {
    setHienTai((i + anh.length) % anh.length);
    // Người xem đã tự bấm/vuốt thì thôi tự chạy — họ đang muốn xem tấm cụ thể,
    // để nó tự trôi đi là giật mất khỏi tay người ta.
    setTuDung(true);
  };

  useEffect(() => {
    if (tuDung || anh.length < 2) return;

    // Người đã xin giảm chuyển động thì không tự chạy; vẫn bấm tay được.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => setHienTai((n) => (n + 1) % anh.length), DOI_SAU);
    return () => clearInterval(id);
  }, [tuDung, anh.length]);

  return (
    <section
      className="relative h-[62svh] overflow-hidden bg-bg-soft sm:h-[84svh]"
      aria-roledescription="carousel"
      aria-label="Ảnh album tiêu biểu"
      onTouchStart={(e) => setBatDauVuot(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (batDauVuot === null) return;
        const doi = e.changedTouches[0].clientX - batDauVuot;
        if (Math.abs(doi) > NGUONG_VUOT) sang(hienTai + (doi < 0 ? 1 : -1));
        setBatDauVuot(null);
      }}
    >
      {anh.map((a, i) => (
        <div
          key={a.ten}
          aria-hidden={i !== hienTai}
          className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
            i === hienTai ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Lớp dưới: chính tấm đó, phóng to và làm mờ, chỉ để lấp khoảng trống. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/bia/${a.ten}-nho.webp`}
            alt=""
            aria-hidden
            className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-2xl"
          />

          {/* Lớp trên: tấm ảnh thật, trọn vẹn, không cắt gì. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/bia/${a.ten}.webp`}
            srcSet={`/bia/${a.ten}-nho.webp 1280w, /bia/${a.ten}.webp 2048w`}
            sizes="100vw"
            alt={a.mo}
            /*
              KHÔNG dùng loading="lazy" ở đây, dù bốn tấm chỉ có một tấm hiện.
              Đã đo thật: với lazy, ba tấm sau bị trình duyệt hoãn vô thời hạn
              (sau 4 giây vẫn chưa tải), nên tới lượt hiện là khách thấy khoảng
              trống. Cả bộ chưa tới 1 MB và nằm ngay đầu trang, hoãn không được
              lợi gì. Chỉ hạ thứ tự ưu tiên để tấm đầu vẫn được lấy trước.
            */
            fetchPriority={i === 0 ? "high" : "low"}
            /*
              Bóng đổ bám theo mép ảnh thật (drop-shadow chứ không phải
              box-shadow, vì thẻ img rộng bằng cả khung còn ảnh thì không).

              Đã đo ở màn 1440: ba tấm ngang chiếm 67–76% bề ngang, riêng tấm
              bìa dọc chỉ 35% — chênh nhau nhiều. Bóng đổ tách tấm ảnh khỏi nền
              mờ phía sau, để mỗi tấm đọc ra là một trang album đặt trên nền,
              chứ không phải một tấm ảnh không vừa khung.
            */
            className="relative size-full object-contain drop-shadow-[0_8px_30px_rgba(31,28,26,0.18)]"
          />
        </div>
      ))}

      {/*
        Dải sáng mỏng ở mép trên: thanh điều hướng nằm đè lên ảnh, mà bốn tấm
        này chỗ sáng chỗ tối nên chữ menu có lúc chìm hẳn. Dải này cho menu một
        nền ổn định mà không phải phủ tối cả tấm ảnh.
      */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg via-bg/70 to-transparent"
      />

      {anh.length > 1 && (
        <>
          {/* Nút lật — chỉ hiện trên máy tính, điện thoại đã có vuốt. */}
          <button
            type="button"
            onClick={() => sang(hienTai - 1)}
            aria-label="Xem tấm trước"
            className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-bg/70 text-fg-muted backdrop-blur-sm transition hover:bg-bg hover:text-accent sm:grid"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 5-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => sang(hienTai + 1)}
            aria-label="Xem tấm sau"
            className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-bg/70 text-fg-muted backdrop-blur-sm transition hover:bg-bg hover:text-accent sm:grid"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 5 7 7-7 7" />
            </svg>
          </button>

          {/* Chấm chỉ vị trí, cũng là nút nhảy thẳng tới một tấm. */}
          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2.5">
            {anh.map((a, i) => (
              <button
                key={a.ten}
                type="button"
                onClick={() => sang(i)}
                aria-label={`Xem tấm ${i + 1}`}
                aria-current={i === hienTai}
                /* py-3 -my-3: nới vùng bấm cho ngón tay, chấm nhìn vẫn nhỏ. */
                className="-my-3 py-3"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    i === hienTai ? "w-7 bg-accent" : "w-1.5 bg-fg-faint/60"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
