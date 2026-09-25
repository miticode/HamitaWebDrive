"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { doiHienTrenTrangAction } from "../../actions";

/**
 * Công tắc đưa một người lên khu "Đội ngũ" của trang giới thiệu (anh yêu cầu
 * 25/09/2026). Chỉ quản lý thấy nút này.
 *
 * Không có ảnh vẫn bật được — ngoài trang sẽ hiện chữ cái đầu tên trên nền
 * màu, và chính người đó tự thêm ảnh ở mục "Tài khoản của tôi".
 */
export function NutHienTrang({ id, hien, coAnh }: { id: string; hien: boolean; coAnh: boolean }) {
  const router = useRouter();
  const [dangLam, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={hien}
        aria-label="Hiện trên trang giới thiệu"
        disabled={dangLam}
        onClick={() =>
          batDau(async () => {
            const kq = await doiHienTrenTrangAction(id, !hien);
            if (kq.loi) {
              setLoi(kq.loi);
              setTimeout(() => setLoi(null), 4000);
              return;
            }
            setLoi(null);
            router.refresh();
          })
        }
        className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${
          hien ? "bg-fg" : "bg-line-strong"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 size-5 rounded-full bg-bg-raised shadow transition-all ${hien ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </button>
      {hien && !coAnh && (
        <span className="text-[11px] text-fg-faint" title="Người này chưa tự thêm ảnh ở mục Tài khoản của tôi">
          chưa có ảnh
        </span>
      )}
      {loi && <span className="text-[11px] text-red-700">{loi}</span>}
    </span>
  );
}
