"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGoiAnhAction } from "./actions";

/** Viết 12000 thành "12.000" cho dễ đọc, dùng dấu chấm như cách viết tiền Việt. */
function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * Số ảnh in đã bao gồm trong gói khách mua.
 *
 * Hiện ở phần hướng dẫn chọn ảnh phía khách, bước "thả tim ảnh muốn in". Mỗi
 * gói mỗi khác nên phải đặt riêng từng album; để trống thì phần hướng dẫn bỏ
 * hẳn đoạn giá cả, chỉ nói cách chọn — hợp với album studio không tính theo gói.
 *
 * Giá mỗi tấm vượt gói KHÔNG sửa ở đây: đó là con số cố định của studio, giống
 * nhau ở mọi gói. Cho sửa riêng từng album chỉ thêm một ô để gõ nhầm mà không
 * được lợi gì — muốn đổi giá thì sửa GIA_ANH_THEM_MAC_DINH trong constants.ts,
 * một chỗ đổi là cả hệ thống đổi theo.
 */
export function GoiAnh({
  galleryId,
  soAnhTrongGoi,
  giaAnhThem,
}: {
  galleryId: string;
  soAnhTrongGoi: number | null;
  /** Chỉ để hiển thị — ô này không sửa được giá. */
  giaAnhThem: number;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [soAnh, setSoAnh] = useState(soAnhTrongGoi?.toString() ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setGoiAnhAction(galleryId, soAnh);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      setLoi(null);
      router.refresh();
    });

  const huy = () => {
    setMo(false);
    setLoi(null);
    setSoAnh(soAnhTrongGoi?.toString() ?? "");
  };

  if (!mo) {
    return (
      <div className="flex items-baseline gap-2 py-2 text-xs">
        <span className="w-24 shrink-0 text-fg-muted">Gói ảnh</span>
        <span className={`min-w-0 flex-1 truncate ${soAnhTrongGoi ? "" : "text-fg-faint"}`}>
          {soAnhTrongGoi ? (
            <>
              <b>{soAnhTrongGoi}</b> ảnh · thêm {tien(giaAnhThem)}đ/ảnh
            </>
          ) : (
            "chưa đặt — không nói giá với khách"
          )}
        </span>
        <button
          type="button"
          onClick={() => setMo(true)}
          className="shrink-0 text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          sửa
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-line-strong bg-bg-soft p-3">
      <label className="eyebrow block">Số ảnh in có sẵn trong gói</label>
      <input
        type="number"
        min={1}
        value={soAnh}
        autoFocus
        onChange={(e) => setSoAnh(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") luu();
          if (e.key === "Escape") huy();
        }}
        placeholder="để trống nếu không tính theo gói"
        className="input mt-1.5"
      />

      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        {soAnh
          ? `Khách sẽ đọc: "Gói của anh chị gồm ${soAnh} ảnh in. Thích thêm tấm nào ngoài gói vẫn chọn thoải mái — mỗi tấm ${tien(giaAnhThem)}đ, đã gồm chỉnh sửa và in."`
          : "Để trống thì phần hướng dẫn cho khách bỏ hẳn đoạn giá cả, chỉ nói cách chọn ảnh."}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
        Giá ảnh thêm cố định {tien(giaAnhThem)}đ/ảnh cho mọi gói. Muốn đổi giá thì
        báo em sửa trong mã nguồn, đổi một lần áp dụng cho tất cả album.
      </p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={huy} className="btn">
          Huỷ
        </button>
      </div>
    </div>
  );
}
