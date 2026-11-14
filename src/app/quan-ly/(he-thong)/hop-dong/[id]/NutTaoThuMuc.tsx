"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { taoThuMucAlbumAction } from "../../../actionsHopDong";

/**
 * Nút tạo thư mục Drive và album cho một hợp đồng chưa có — thêm 14/11/2026.
 *
 * Hai việc cùng một nút:
 *
 * 1. **Đường lui của việc chạy nền.** Lập hợp đồng xong web tự tạo, nhưng
 *    việc đó chạy nền và có thể hỏng (Drive rớt mạng, kết nối hết hạn). Hỏng
 *    thì vẫn còn đường đi bộ, thay vì phải vào Drive tạo tay rồi quay ra dán
 *    link rồi lại bấm Gắn hợp đồng.
 * 2. **Dùng cho 2.400 hợp đồng cũ** lập từ trước ngày có tính năng này.
 *
 * Mất khoảng 4,4 giây (ba lượt hỏi Drive nối đuôi nhau), nên nút nói rõ đang
 * chạy chứ không đứng im.
 */
export function NutTaoThuMuc({ hopDongId }: { hopDongId: string }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const tao = () =>
    batDau(async () => {
      setLoi(null);
      const kq = await taoThuMucAlbumAction(hopDongId);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      router.refresh();
    });

  return (
    <div className="mt-3">
      <button type="button" onClick={tao} disabled={dang} className="btn disabled:opacity-50">
        {dang ? "Đang tạo trên Drive…" : "Tạo thư mục Drive & album"}
      </button>
      <p className="mt-1.5 text-xs text-fg-faint">
        Thư mục vào đúng <b className="text-fg-muted">năm / tháng chụp</b> như tiệm vẫn xếp, và album
        gắn sẵn hợp đồng này. Mất vài giây.
      </p>
      {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}
    </div>
  );
}
