"use client";

import { useEffect, useState } from "react";

/**
 * Sự kiện Chrome bắn ra khi trang đủ điều kiện cài như app.
 * TypeScript chưa có sẵn kiểu này nên phải tự khai.
 */
type SuKienCai = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Nút đặt album lên màn hình chính điện thoại khách, mở ra như một app.
 *
 * Hai hệ điều hành làm hai kiểu hoàn toàn khác nhau:
 *
 * - Android / Chrome: trình duyệt tự bắn ra sự kiện `beforeinstallprompt` khi
 *   trang đủ điều kiện. Giữ lại sự kiện đó rồi gọi khi khách bấm nút — khách
 *   chỉ cần xác nhận một lần là xong.
 *
 * - iPhone / Safari: Apple KHÔNG có sự kiện nào tương tự, cũng không cho web
 *   tự thêm lối tắt. Đường duy nhất là khách tự bấm nút Chia sẻ rồi chọn "Thêm
 *   vào MH chính". Nên trên iPhone, nút này mở ra một bảng chỉ đường từng bước
 *   thay vì tự làm — thà chỉ rõ còn hơn im lặng để khách tưởng nút hỏng.
 *
 * Đã đặt rồi thì giấu nút đi: lúc đó trang chạy trong cửa sổ app, hiện thêm
 * một nút "đưa lên màn hình chính" nữa chỉ tổ khó hiểu.
 */
export function NutLuuApp({ tenKhach }: { tenKhach: string }) {
  const [suKien, setSuKien] = useState<SuKienCai | null>(null);
  /*
    null = chưa nhận diện xong máy khách. Lúc đó ẩn nút: thà chậm một nhịp còn
    hơn hiện nhầm bảng chỉ đường iPhone cho người dùng Android.
  */
  const [may, setMay] = useState<{ ios: boolean; trongApp: boolean } | null>(null);
  const [moChiDan, setMoChiDan] = useState(false);
  const [daCai, setDaCai] = useState(false);

  useEffect(() => {
    /*
      Đăng ký service worker. Chrome trên Android chỉ bắn sự kiện mời cài khi
      trang có một service worker biết xử lý fetch — thiếu bước này thì nút
      dưới đây không bao giờ hiện trên Android. Tệp sw.js cố ý không cache gì,
      xem chú thích trong chính tệp đó.

      Giới hạn phạm vi ở /g/ để nó chỉ đụng tới các trang album, không quản
      trang giới thiệu hay trang quản lý.

      Hỏng thì bỏ qua: không đăng ký được cũng chỉ mất nút mời cài, còn album
      vẫn xem bình thường — không đáng để làm hỏng cả trang.
    */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/g/" }).catch(() => {});
    }

    /*
      Nhận diện máy khách trong effect chứ không phải lúc dựng trang: máy chủ
      không biết khách dùng máy gì, đoán bừa thì lượt vẽ đầu ở máy khách sẽ
      lệch với máy chủ.

      Qua setTimeout và gom hai giá trị vào MỘT lần đặt: đổi state thẳng trong
      thân effect sẽ kéo theo một lượt vẽ lại ngay sau lượt vừa xong (xem mục
      bẫy ESLint trong CLAUDE.md), mà ở đây lại còn hai lần liên tiếp.
    */
    const id = setTimeout(() => {
      const ua = navigator.userAgent;
      setMay({
        ios:
          /iPad|iPhone|iPod/.test(ua) ||
          // iPad đời mới tự khai là máy Mac, phải nhìn thêm số điểm chạm.
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
        trongApp:
          window.matchMedia("(display-mode: standalone)").matches ||
          // Safari dùng cờ riêng, không theo chuẩn display-mode.
          (window.navigator as { standalone?: boolean }).standalone === true,
      });
    }, 0);

    const giuLai = (e: Event) => {
      // Chặn thanh mời cài mặc định của Chrome để tự đặt nút vào đúng chỗ mình muốn.
      e.preventDefault();
      setSuKien(e as SuKienCai);
    };
    const daXong = () => setDaCai(true);

    window.addEventListener("beforeinstallprompt", giuLai);
    window.addEventListener("appinstalled", daXong);
    return () => {
      clearTimeout(id);
      window.removeEventListener("beforeinstallprompt", giuLai);
      window.removeEventListener("appinstalled", daXong);
    };
  }, []);

  const bam = async () => {
    if (may?.ios) {
      setMoChiDan(true);
      return;
    }
    if (!suKien) return;
    await suKien.prompt();
    const { outcome } = await suKien.userChoice;
    // Sự kiện chỉ dùng được một lần; dùng rồi phải bỏ đi.
    setSuKien(null);
    if (outcome === "accepted") setDaCai(true);
  };

  // Chưa nhận diện xong máy, hoặc đang mở sẵn trong cửa sổ app, hoặc vừa cài
  // xong — đều không cần nút.
  if (!may || may.trongApp || daCai) return null;

  // Android mà trình duyệt chưa mời cài (đã cài rồi, hoặc trình duyệt không hỗ
  // trợ) thì ẩn hẳn, đỡ hiện một nút bấm vào không có gì xảy ra.
  if (!may.ios && !suKien) return null;

  return (
    <>
      <div className="mx-auto mt-10 max-w-md px-5">
        <button
          type="button"
          onClick={bam}
          className="flex w-full items-center gap-3.5 rounded-md border border-line-strong bg-bg-raised px-4 py-3.5 text-left transition hover:border-accent"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="5" y="2" width="14" height="20" rx="2.5" />
              <path d="M12 8v7m0 0 2.5-2.5M12 15l-2.5-2.5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              Lưu bộ ảnh ra màn hình chính
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-fg-muted">
              Lần sau anh chị mở như một app, khỏi phải tìm lại link ạ.
            </span>
          </span>
          <span aria-hidden className="shrink-0 text-fg-faint">
            →
          </span>
        </button>
      </div>

      {/* Bảng chỉ đường cho iPhone — Apple không cho web tự thêm lối tắt. */}
      {moChiDan && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
          onClick={() => setMoChiDan(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
          >
            <p className="eyebrow">Trên iPhone</p>
            <h2 className="mt-1.5 font-display text-2xl leading-snug font-light">
              Ba bước là xong ạ
            </h2>

            <ol className="mt-5 space-y-3.5 text-sm leading-relaxed">
              {[
                <>
                  Bấm nút <b>Chia sẻ</b> ở thanh dưới cùng của Safari (hình ô
                  vuông có mũi tên đi lên).
                </>,
                <>
                  Kéo xuống, chọn <b>Thêm vào MH chính</b>.
                </>,
                <>
                  Bấm <b>Thêm</b> ở góc trên bên phải là xong — biểu tượng ảnh
                  cưới của anh chị sẽ nằm ngay màn hình.
                </>,
              ].map((dong, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-medium text-white">
                    {i + 1}
                  </span>
                  <span className="flex-1">{dong}</span>
                </li>
              ))}
            </ol>

            <p className="mt-5 text-xs leading-relaxed text-fg-faint">
              Lối tắt sẽ mang tên “{tenKhach}”. Nếu anh chị đang mở bằng ứng
              dụng khác (Zalo, Facebook), bấm ••• rồi chọn mở bằng Safari trước
              nhé ạ.
            </p>

            <button
              type="button"
              onClick={() => setMoChiDan(false)}
              className="btn-primary mt-6 w-full"
            >
              Đã rõ rồi ạ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
