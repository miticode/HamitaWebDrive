import { STUDIO } from "@/lib/studio";

/**
 * Ba nút liên hệ nổi ở góc phải màn hình, chỉ trên trang giới thiệu (bố cục học
 * từ mohome.vn, 16/09/2026).
 *
 * Khách đọc tới khu nào thấy ưng là muốn hỏi ngay lúc đó — bắt họ cuộn về đầu
 * hay xuống cuối trang tìm số điện thoại là mất đi đúng khoảnh khắc ấy.
 *
 * KHÔNG đặt trên trang xem ảnh của khách (/g/…): ở đó góc dưới đã có nút thả
 * tim, nút tải, khung "Hỏi Hamita" — thêm ba nút nổi nữa là che mất ảnh.
 *
 * Messenger đi qua m.me/<tên trang> — lấy đúng tên trang trong STUDIO.facebook
 * nên đổi trang Facebook thì nút này tự theo.
 */
export function NutLienHeNoi() {
  const tenTrang = STUDIO.facebook.replace(/\/+$/, "").split("/").pop();
  const nut =
    "grid size-12 place-items-center rounded-full shadow-[0_10px_30px_-10px_rgba(31,28,26,0.45)] transition hover:-translate-y-0.5 active:scale-95";
  return (
    <div className="fixed right-4 bottom-4 z-30 flex flex-col gap-2.5 sm:right-6 sm:bottom-6">
      <a href={STUDIO.zalo} target="_blank" rel="noreferrer" aria-label="Nhắn Zalo cho Hamita" className={`${nut} bg-[#0068ff] text-white`}>
        <span className="text-[11px] font-semibold tracking-tight">Zalo</span>
      </a>
      <a
        href={`https://m.me/${tenTrang}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Nhắn Messenger cho Hamita"
        className={`${nut} border border-line bg-bg-raised text-[#0866ff]`}
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
          <path d="M12 2C6.4 2 2 6.1 2 11.6c0 2.9 1.2 5.4 3.1 7.1v3.3l3-1.7c.9.3 1.9.4 2.9.4 5.6 0 10-4.1 10-9.6S17.6 2 12 2Zm1 12.9-2.5-2.7-4.9 2.7 5.4-5.8 2.6 2.7 4.8-2.7-5.4 5.8Z" />
        </svg>
      </a>
      <a href={`tel:${STUDIO.dienThoaiSo}`} aria-label={`Gọi Hamita ${STUDIO.dienThoai}`} className={`${nut} bg-fg text-bg`}>
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 5c0 8.3 6.7 15 15 15l2-3-4-2-2 2a15 15 0 0 1-6-6l2-2-2-4Z" />
        </svg>
      </a>
    </div>
  );
}
