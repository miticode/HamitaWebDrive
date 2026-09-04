"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ẩn lâu hơn mốc này thì lúc quay lại mới đáng đi hỏi máy chủ. */
const NGUONG_AN = 20_000;

/**
 * Tự lấy lại nội dung mới khi khách quay lại trang.
 *
 * Vì sao cần: khi album đã được đặt ra màn hình chính, mở lại lối tắt KHÔNG
 * phải là tải trang mới — hệ điều hành khôi phục nguyên cửa sổ cũ đang nằm
 * trong bộ nhớ. Studio vừa thêm thư mục, khách bấm vào app thì vẫn thấy y
 * nguyên bộ ảnh của lần xem trước, phải tắt hẳn app mở lại mới có. Trình duyệt
 * thường cũng vậy khi khách bấm nút quay lại (trang lấy từ bộ nhớ đệm).
 *
 * Chỉ hỏi lại khi khách đã rời đi một lúc (quá 20 giây). Chuyển tạm sang app
 * khác vài giây rồi quay lại thì không việc gì phải tải lại — vừa tốn vừa làm
 * giật trang đang xem dở.
 */
/**
 * Xoá con số đỏ trên biểu tượng app.
 *
 * Khách đang mở album ra xem thì con số không còn nghĩa gì nữa. Phải làm HAI
 * việc chứ không phải một: xoá con số đang hiện, và nhắn cho service worker
 * xoá luôn bộ đếm của nó — bộ đếm nằm bên đó, không xoá thì thông báo kế tiếp
 * cộng tiếp từ số cũ và khách thấy "3" trong khi chỉ có một tin mới.
 */
function xoaSoDo() {
  try {
    navigator.clearAppBadge?.();
    navigator.serviceWorker?.controller?.postMessage({ kieu: "xoaSoDo" });
  } catch {
    // Máy không hỗ trợ số đỏ thì thôi, không phải lỗi.
  }
}

export function TuLamMoi() {
  const router = useRouter();

  useEffect(() => {
    let lucRoiDi = 0;

    // Mở trang ra là đã xem, xoá ngay chứ không đợi khách làm gì thêm.
    xoaSoDo();

    const khiDoiTrangThai = () => {
      if (document.visibilityState === "hidden") {
        lucRoiDi = Date.now();
        return;
      }
      // Quay lại app cũng là đã xem — kể cả khi chưa tới ngưỡng tải lại.
      xoaSoDo();
      if (lucRoiDi && Date.now() - lucRoiDi > NGUONG_AN) {
        router.refresh();
        lucRoiDi = 0;
      }
    };

    /*
      Trang được khôi phục nguyên vẹn từ bộ nhớ đệm của trình duyệt (khách bấm
      nút quay lại). Lúc này không có sự kiện đổi trạng thái nào bắn ra, nên
      phải bắt riêng — nếu không thì đúng cái cảnh trang cũ hiện lại y nguyên.
    */
    const khiHienLai = (e: PageTransitionEvent) => {
      if (e.persisted) router.refresh();
    };

    document.addEventListener("visibilitychange", khiDoiTrangThai);
    window.addEventListener("pageshow", khiHienLai);
    return () => {
      document.removeEventListener("visibilitychange", khiDoiTrangThai);
      window.removeEventListener("pageshow", khiHienLai);
    };
  }, [router]);

  return null;
}
