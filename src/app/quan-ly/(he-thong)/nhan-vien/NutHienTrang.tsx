"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { doiHienTrenTrangAction, doiThuTuDoiNguAction } from "../../actions";

/**
 * Công tắc đưa một người lên khu "Đội ngũ" của trang giới thiệu (anh yêu cầu
 * 25/09/2026). Chỉ quản lý thấy nút này.
 *
 * Không có ảnh vẫn bật được — ngoài trang sẽ hiện chữ cái đầu tên trên nền
 * màu, và chính người đó tự thêm ảnh ở mục "Tài khoản của tôi".
 */
export function NutHienTrang({
  id,
  hien,
  coAnh,
  dauDanh,
  cuoiDanh,
}: {
  id: string;
  hien: boolean;
  coAnh: boolean;
  /** Đang đứng đầu / cuối khu Đội ngũ — để khoá mũi tên tương ứng. */
  dauDanh: boolean;
  cuoiDanh: boolean;
}) {
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
      {/* Sắp thứ tự: chỉ hiện với người đang lên trang, vì người chưa bật
          thì không có chỗ nào trong khu đó để mà xê dịch. */}
      {hien && (
        <span className="inline-flex gap-1">
          <button
            type="button"
            title="Đưa lên trước"
            disabled={dauDanh || dangLam}
            onClick={() =>
              batDau(async () => {
                const kq = await doiThuTuDoiNguAction(id, true);
                if (kq.loi) setLoi(kq.loi);
                router.refresh();
              })
            }
            className="grid size-7 place-items-center rounded border border-line text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            title="Đẩy xuống sau"
            disabled={cuoiDanh || dangLam}
            onClick={() =>
              batDau(async () => {
                const kq = await doiThuTuDoiNguAction(id, false);
                if (kq.loi) setLoi(kq.loi);
                router.refresh();
              })
            }
            className="grid size-7 place-items-center rounded border border-line text-fg-muted transition hover:border-accent hover:text-fg disabled:opacity-30"
          >
            ↓
          </button>
        </span>
      )}
      {hien && !coAnh && (
        <span className="text-[11px] text-fg-faint" title="Người này chưa tự thêm ảnh ở mục Tài khoản của tôi">
          chưa có ảnh
        </span>
      )}
      {loi && <span className="text-[11px] text-red-700">{loi}</span>}
    </span>
  );
}
