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
export function TuLamMoi() {
  const router = useRouter();

  useEffect(() => {
    let lucRoiDi = 0;

    const khiDoiTrangThai = () => {
      if (document.visibilityState === "hidden") {
        lucRoiDi = Date.now();
        return;
      }
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
