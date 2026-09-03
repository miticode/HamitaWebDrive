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

/** Sự kiện đã được đoạn script trong layout giữ sẵn từ trước khi React chạy. */
function loiMoiDaChot(): SuKienCai | null {
  if (typeof window === "undefined") return null;
  return (window as { __hamitaCaiApp?: SuKienCai | null }).__hamitaCaiApp ?? null;
}

/** Bảng chỉ đường đang mở là của hệ nào; null là chưa mở bảng nào. */
type ChiDan = null | "ios" | "android";

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
 * KHÔNG ĐƯỢC giấu nút trên Android chỉ vì chưa có sự kiện. Bản đầu làm vậy
 * (`if (!may.ios && !suKien) return null`) và đó là lỗi anh gặp ngày 03/09/2026:
 * khách Android không tạo được app. Sự kiện của Chrome vắng mặt trong rất nhiều
 * tình huống thường gặp — khách mở link ngay trong Zalo/Facebook (trình duyệt
 * nhúng không bắn sự kiện này), khách dùng Firefox hay Samsung Internet, hoặc
 * đơn giản là sự kiện bắn ra trước khi React kịp nghe. Giấu nút đi thì khách
 * Android không có lấy một lời hướng dẫn nào, trong khi khách iPhone được chỉ
 * tận nơi. Nên giờ Android luôn thấy nút; thiếu sự kiện thì mở bảng chỉ đường
 * của Android, y như cách làm với iPhone.
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
  const [may, setMay] = useState<{
    ios: boolean;
    android: boolean;
    trongApp: boolean;
    /** Đang xem trong trình duyệt nhúng của Zalo/Facebook chứ không phải Safari/Chrome. */
    trongUngDungKhac: boolean;
  } | null>(null);
  const [chiDan, setChiDan] = useState<ChiDan>(null);
  const [daCai, setDaCai] = useState(false);

  useEffect(() => {
    /*
      Đăng ký service worker. Chrome trên Android chỉ bắn sự kiện mời cài khi
      trang có một service worker biết xử lý fetch — thiếu bước này thì trình
      duyệt không bao giờ mời cài. Tệp sw.js cố ý không cache gì, xem chú thích
      trong chính tệp đó.

      Giới hạn phạm vi ở /g/ để nó chỉ đụng tới các trang album, không quản
      trang giới thiệu hay trang quản lý.

      Hỏng thì bỏ qua: không đăng ký được cũng chỉ mất lời mời cài một chạm,
      bảng chỉ đường thủ công vẫn còn — album vẫn xem bình thường.
    */
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/g/" }).catch(() => {});
    }

    /*
      Nhận diện máy khách trong effect chứ không phải lúc dựng trang: máy chủ
      không biết khách dùng máy gì, đoán bừa thì lượt vẽ đầu ở máy khách sẽ
      lệch với máy chủ.

      Qua setTimeout và gom các giá trị vào MỘT lần đặt: đổi state thẳng trong
      thân effect sẽ kéo theo một lượt vẽ lại ngay sau lượt vừa xong (xem mục
      bẫy ESLint trong CLAUDE.md).
    */
    const id = setTimeout(() => {
      const ua = navigator.userAgent;
      setMay({
        ios:
          /iPad|iPhone|iPod/.test(ua) ||
          // iPad đời mới tự khai là máy Mac, phải nhìn thêm số điểm chạm.
          (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
        /*
          Nhận riêng Android để biết có được phép chỉ đường thủ công hay không.
          Máy bàn cũng cài được app, nhưng máy bàn KHÔNG có lời mời thì phải
          giấu nút đi như cũ: chỉ khách máy bàn bấm "⋮ → Thêm vào Màn hình
          chính" là chỉ sai — trên máy bàn mục đó không nằm ở đó, và khách máy
          bàn cũng chẳng có màn hình chính nào để thêm.
        */
        android: /Android/i.test(ua),
        /*
          Khách hay bấm link ngay trong Zalo hoặc Facebook. Trình duyệt nhúng
          của mấy ứng dụng đó KHÔNG cài được app — trên iPhone vì không có nút
          Chia sẻ của Safari, trên Android vì không có menu của Chrome. Nhận ra
          sớm để đổi lời chỉ dẫn, chứ chỉ vào một nút không tồn tại thì khách
          tìm mãi không thấy rồi bỏ cuộc.
        */
        trongUngDungKhac: /FBAN|FBAV|Instagram|Zalo|Line\/|MicroMessenger/i.test(ua),
        trongApp:
          window.matchMedia("(display-mode: standalone)").matches ||
          // Safari dùng cờ riêng, không theo chuẩn display-mode.
          (window.navigator as { standalone?: boolean }).standalone === true,
      });

      /*
        Lấy lời mời mà đoạn script trong layout đã chốt sẵn. Đây mới là đường
        chính: sự kiện thường bắn ra trước khi React kịp chạy tới đây.
      */
      setSuKien(loiMoiDaChot());
    }, 0);

    // Sự kiện tới muộn hơn (lần vào đầu tiên, service worker vừa mới cài xong).
    const coLoiMoi = () => setSuKien(loiMoiDaChot());
    const daXong = () => setDaCai(true);

    window.addEventListener("hamita:co-the-cai", coLoiMoi);
    window.addEventListener("hamita:da-cai", daXong);
    window.addEventListener("appinstalled", daXong);
    return () => {
      clearTimeout(id);
      window.removeEventListener("hamita:co-the-cai", coLoiMoi);
      window.removeEventListener("hamita:da-cai", daXong);
      window.removeEventListener("appinstalled", daXong);
    };
  }, []);

  const bam = async () => {
    if (may?.ios) {
      setChiDan("ios");
      return;
    }

    // Android không có lời mời một chạm thì chỉ đường thủ công, đừng đứng im.
    if (!suKien) {
      setChiDan("android");
      return;
    }

    /*
      Bọc try/catch: `prompt()` ném lỗi trong vài trường hợp thật — sự kiện đã
      dùng một lần rồi ("may only be called once"), hoặc trang đã đổi kể từ lúc
      Chrome bắn sự kiện. Bản đầu không bắt, nên lỗi rơi vào khoảng không và
      khách bấm nút thấy KHÔNG CÓ GÌ XẢY RA — không cách nào biết là hỏng. Giờ
      hỏng thì lùi về bảng chỉ đường, vẫn còn đường cho khách đi.
    */
    try {
      await suKien.prompt();
      const { outcome } = await suKien.userChoice;
      // Sự kiện chỉ dùng được một lần; dùng rồi phải bỏ đi.
      setSuKien(null);
      (window as { __hamitaCaiApp?: SuKienCai | null }).__hamitaCaiApp = null;
      if (outcome === "accepted") setDaCai(true);
    } catch {
      setSuKien(null);
      (window as { __hamitaCaiApp?: SuKienCai | null }).__hamitaCaiApp = null;
      setChiDan("android");
    }
  };

  // Chưa nhận diện xong máy, hoặc đang mở sẵn trong cửa sổ app, hoặc vừa cài
  // xong — đều không cần nút.
  if (!may || may.trongApp || daCai) return null;

  /*
    Còn lại một trường hợp duy nhất phải giấu nút: MÁY BÀN mà trình duyệt không
    mời cài. Điện thoại thì luôn hiện — iPhone và Android đều có bảng chỉ đường
    thủ công, nên nút bấm vào lúc nào cũng dẫn tới một việc làm được.
  */
  if (!may.ios && !may.android && !suKien) return null;

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

      {chiDan && (
        <BangChiDan
          he={chiDan}
          trongUngDungKhac={may.trongUngDungKhac}
          tenKhach={tenKhach}
          dong={() => setChiDan(null)}
        />
      )}
    </>
  );
}

/**
 * Bảng chỉ từng bước cho khách tự thêm lối tắt.
 *
 * Dùng chung cho cả hai hệ vì khung bảng, cách đóng mở và lời kết giống hệt
 * nhau — chỉ khác ba bước ở giữa và tên nút phải bấm. Tách ra một component để
 * `NutLuuApp` khỏi phồng lên gấp đôi vì hai bản gần như trùng nhau.
 */
function BangChiDan({
  he,
  trongUngDungKhac,
  tenKhach,
  dong,
}: {
  he: "ios" | "android";
  trongUngDungKhac: boolean;
  tenKhach: string;
  dong: () => void;
}) {
  const ios = he === "ios";

  /*
    Đang xem trong Zalo/Facebook thì mọi lời chỉ đường đều chỉ vào nút không
    tồn tại — trình duyệt nhúng của mấy ứng dụng đó không có menu cài app. Phải
    đưa khách ra trình duyệt thật trước, rồi mới nói tiếp.
  */
  const trinhDuyet = ios ? "Safari" : "Chrome";

  const buoc = ios
    ? [
        {
          chu: (
            <>
              Bấm nút <b>Chia sẻ</b> ở thanh dưới cùng của Safari.
            </>
          ),
          // Đúng biểu tượng Chia sẻ của iOS: ô vuông có mũi tên đi lên.
          hinh: (
            <>
              <path d="M12 3v11m0-11 3.2 3.2M12 3 8.8 6.2" />
              <path d="M6.5 10.5H5.2A1.2 1.2 0 0 0 4 11.7v8.1A1.2 1.2 0 0 0 5.2 21h13.6a1.2 1.2 0 0 0 1.2-1.2v-8.1a1.2 1.2 0 0 0-1.2-1.2h-1.3" />
            </>
          ),
        },
        {
          chu: (
            <>
              Kéo xuống, chọn <b>Thêm vào MH chính</b>.
            </>
          ),
          hinh: (
            <>
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
              <path d="M12 8.5v7M8.5 12h7" />
            </>
          ),
        },
        {
          chu: (
            <>
              Bấm <b>Thêm</b> ở góc trên bên phải là xong.
            </>
          ),
          hinh: (
            <>
              <circle cx="12" cy="12" r="8.5" />
              <path d="m8.5 12.3 2.4 2.4 4.6-5" />
            </>
          ),
        },
      ]
    : [
        {
          chu: (
            <>
              Bấm nút <b>⋮</b> ở góc trên bên phải của Chrome.
            </>
          ),
          // Ba chấm dọc — đúng nút khách phải tìm.
          hinh: (
            <>
              <circle cx="12" cy="5" r="1.4" />
              <circle cx="12" cy="12" r="1.4" />
              <circle cx="12" cy="19" r="1.4" />
            </>
          ),
        },
        {
          chu: (
            <>
              Chọn <b>Thêm vào Màn hình chính</b> (máy khác có thể ghi{" "}
              <b>Cài đặt ứng dụng</b>).
            </>
          ),
          hinh: (
            <>
              <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
              <path d="M12 8.5v7M8.5 12h7" />
            </>
          ),
        },
        {
          chu: (
            <>
              Bấm <b>Thêm</b> hoặc <b>Cài đặt</b> để xác nhận là xong.
            </>
          ),
          hinh: (
            <>
              <circle cx="12" cy="12" r="8.5" />
              <path d="m8.5 12.3 2.4 2.4 4.6-5" />
            </>
          ),
        },
      ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      onClick={dong}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">{ios ? "Trên iPhone" : "Trên Android"}</p>
        <h2 className="mt-1.5 font-display text-2xl leading-snug font-light">
          {trongUngDungKhac
            ? `Mở bằng ${trinhDuyet} trước đã ạ`
            : "Ba bước là xong ạ"}
        </h2>

        {trongUngDungKhac && (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
            Anh chị đang xem trong Zalo/Facebook nên chưa lưu được. Bấm{" "}
            <b>•••</b> ở góc màn hình, chọn <b>Mở bằng {trinhDuyet}</b>, rồi làm
            tiếp ba bước dưới đây nhé ạ.
          </p>
        )}

        <ol className="mt-5 space-y-4 text-sm leading-relaxed">
          {buoc.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-medium text-white">
                {i + 1}
              </span>
              <span className="flex-1">{b.chu}</span>
              {/* Vẽ đúng hình khách phải tìm — nhìn hình nhận ra nhanh hơn đọc chữ. */}
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-fg-faint"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {b.hinh}
              </svg>
            </li>
          ))}
        </ol>

        <p className="mt-5 text-xs leading-relaxed text-fg-faint">
          Xong rồi thì trên màn hình điện thoại anh chị sẽ có một biểu tượng
          Hamita, tên “{tenKhach}”.
        </p>

        <button type="button" onClick={dong} className="btn-primary mt-6 w-full">
          Đã rõ rồi ạ
        </button>
      </div>
    </div>
  );
}
