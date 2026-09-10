"use client";

import { useEffect, useState } from "react";

/**
 * Đổi khoá công khai từ dạng chuỗi sang dạng byte mà trình duyệt đòi.
 * Bước máy móc bắt buộc của Push API, không có gì để chọn ở đây.
 *
 * Phải cấp phát ArrayBuffer rõ ràng thay vì dùng Uint8Array.from: trình duyệt
 * chỉ nhận vùng nhớ thường, còn Uint8Array.from cho ra kiểu chung chung có thể
 * là vùng nhớ chia sẻ giữa các luồng — TypeScript bắt đúng chỗ này.
 */
function doiKhoa(chuoi: string): Uint8Array<ArrayBuffer> {
  const dem = "=".repeat((4 - (chuoi.length % 4)) % 4);
  const b64 = (chuoi + dem).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);

  const byte = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) byte[i] = raw.charCodeAt(i);
  return byte;
}

type TrangThai = "chua-biet" | "khong-ho-tro" | "chua-bat" | "da-bat" | "bi-chan";

/**
 * Nút để khách nhận thông báo khi studio thêm ảnh mới, hiện thẳng lên màn hình
 * khoá điện thoại kể cả khi đã đóng web.
 *
 * Trên iPhone chỉ chạy khi khách ĐÃ đặt album ra màn hình chính (từ iOS 16.4)
 * — Apple không cho web trong Safari thường xin quyền này. Nên nút chỉ hiện
 * khi trình duyệt thật sự làm được; iPhone chưa cài app thì giấu đi, thay vào
 * đó nút "Lưu ra màn hình chính" ở ngay trên đã mời khách cài rồi.
 *
 * Khách đã từ chối một lần thì trình duyệt khoá luôn, xin lại cũng vô ích —
 * lúc đó nói thật là phải mở phần cài đặt, chứ không hiện một nút bấm mãi
 * không được.
 */
export function NutThongBao({ slug }: { slug: string }) {
  const [trangThai, setTrangThai] = useState<TrangThai>("chua-biet");
  const [dangChay, setDangChay] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      // Thiếu bất cứ mảnh nào thì không làm được — hay gặp nhất là iPhone chưa
      // cài album ra màn hình chính.
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setTrangThai("khong-ho-tro");
        return;
      }

      if (Notification.permission === "denied") {
        setTrangThai("bi-chan");
        return;
      }

      try {
        const dk = await navigator.serviceWorker.ready;
        const daCo = await dk.pushManager.getSubscription();
        setTrangThai(daCo ? "da-bat" : "chua-bat");
      } catch {
        setTrangThai("khong-ho-tro");
      }
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const bat = async () => {
    setDangChay(true);
    try {
      const quyen = await Notification.requestPermission();
      if (quyen !== "granted") {
        setTrangThai(quyen === "denied" ? "bi-chan" : "chua-bat");
        return;
      }

      const khoa = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!khoa) return;

      const dk = await navigator.serviceWorker.ready;
      const phieu = await dk.pushManager.subscribe({
        // Bắt buộc true: trình duyệt không cho gửi tin thầm lặng, tin nào cũng
        // phải hiện cho khách thấy. Hợp lý — mình cũng chỉ định gửi tin thật.
        userVisibleOnly: true,
        applicationServerKey: doiKhoa(khoa),
      });

      const j = phieu.toJSON();
      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          endpoint: phieu.endpoint,
          p256dh: j.keys?.p256dh,
          auth: j.keys?.auth,
        }),
      });
      // Máy chủ không lưu được thì huỷ luôn phiếu, đừng để khách tưởng đã bật.
      if (!res.ok) {
        await phieu.unsubscribe();
        return;
      }
      setTrangThai("da-bat");
    } catch {
      // Không xin được quyền thì thôi, giữ nguyên nút để khách thử lại.
    } finally {
      setDangChay(false);
    }
  };

  const tat = async () => {
    setDangChay(true);
    try {
      const dk = await navigator.serviceWorker.ready;
      const phieu = await dk.pushManager.getSubscription();
      if (phieu) {
        await fetch("/api/push", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: phieu.endpoint }),
        }).catch(() => {});
        await phieu.unsubscribe();
      }
      setTrangThai("chua-bat");
    } finally {
      setDangChay(false);
    }
  };

  // Chưa dò xong, hoặc máy không làm được — không hiện gì.
  if (trangThai === "chua-biet" || trangThai === "khong-ho-tro") return null;

  if (trangThai === "bi-chan") {
    return (
      <div className="mx-auto mt-4 max-w-md px-5">
        <p className="rounded-md border border-line bg-bg-soft px-4 py-3 text-xs leading-relaxed text-fg-muted">
          Máy đang chặn thông báo từ trang này. Anh chị muốn nhận tin khi Hamita
          thêm ảnh mới thì mở phần cài đặt của trình duyệt, bật lại thông báo
          giúp em nhé ạ.
        </p>
      </div>
    );
  }

  if (trangThai === "da-bat") {
    return (
      <div className="mx-auto mt-4 max-w-md px-5">
        <div className="flex items-center gap-3 rounded-md border border-line bg-bg-soft px-4 py-3">
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-emerald-500" />
          <p className="min-w-0 flex-1 text-xs leading-relaxed text-fg-muted">
            Hamita sẽ báo anh chị ngay khi có ảnh mới.
          </p>
          <button
            type="button"
            onClick={tat}
            disabled={dangChay}
            className="shrink-0 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
          >
            tắt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-4 max-w-md px-5">
      {/*
        Ô này NỔI HƠN nút "Lưu ra màn hình chính" ngay trên nó (studio yêu cầu
        10/09/2026). Trước đây hai ô mặc cùng một bộ áo — viền xám, nền trắng,
        biểu tượng nhạt — nên khách lướt qua như một dòng trang trí.

        Mặc đúng bộ áo của khối "Gói ảnh của anh chị" (HuongDanChon.tsx): viền
        và nền màu nhấn, biểu tượng tròn đặc. Dùng lại một kiểu đã có thay vì
        bịa kiểu thứ ba — khách của studio đã quen nhận ra "khung màu vàng nâu
        là thứ cần đọc".

        Tiêu đề màu CHỮ THƯỜNG, không tô màu nhấn. Đo thật: chữ màu nhấn trên
        nền kem chỉ đạt tương phản 3,33:1, dưới mức 4,5:1 cho chữ cỡ này — mà
        khách của studio vốn ít đọc chữ, tiêu đề phải là thứ dễ đọc nhất. Màu
        nhấn để cho viền, chuông và mũi tên lo phần nổi bật.

        KHÔNG thêm nhấp nháy hay rung lắc để gây chú ý: web đã bỏ hết hiệu ứng
        chuyển động, chỉ còn vòng xoay "đang chạy" (xem NutLamMoi.tsx). Nổi bật
        bằng màu và cỡ chữ là đủ, mà không làm khách tưởng trang đang báo lỗi.
      */}
      <button
        type="button"
        onClick={bat}
        disabled={dangChay}
        className="flex w-full items-center gap-3.5 rounded-md border border-accent bg-accent-soft px-4 py-4 text-left transition hover:shadow-[var(--shadow-lift)] disabled:opacity-70 sm:gap-4 sm:px-5"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white">
          <svg
            viewBox="0 0 24 24"
            className="size-[22px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
            <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-balance text-fg">
            {dangChay ? "Đang bật…" : "Nhận thông báo khi có ảnh mới"}
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-fg">
            Hamita thêm ảnh là điện thoại anh chị hiện ngay, khỏi phải vào xem
            chừng ạ.
          </span>
        </span>
        {/*
          Mũi tên chỉ hiện từ màn 640px trở lên. Đo trên điện thoại 375px: có
          mũi tên thì ô cao 168px, tiêu đề gãy đôi. Cả ô đã là một nút bấm có
          viền màu nhấn — ở màn hẹp, mũi tên không nói thêm gì mà lại chiếm chỗ
          của chữ.
        */}
        <span aria-hidden className="hidden shrink-0 text-lg text-accent sm:inline">
          →
        </span>
      </button>
    </div>
  );
}
