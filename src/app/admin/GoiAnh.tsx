"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setGoiAnhAction } from "./actions";

/** Viết 12000 thành "12.000" cho dễ đọc, dùng dấu chấm như cách viết tiền Việt. */
function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * Số ảnh in đã bao gồm trong gói khách mua, và giá mỗi tấm chọn vượt gói.
 *
 * Hai số này hiện ở phần hướng dẫn chọn ảnh phía khách. Mỗi gói mỗi khác nên
 * phải đặt riêng từng album; để trống số ảnh thì phần hướng dẫn bỏ hẳn đoạn
 * giá cả, chỉ nói cách chọn — hợp với những album studio không tính theo gói.
 */
export function GoiAnh({
  galleryId,
  soAnhTrongGoi,
  giaAnhThem,
}: {
  galleryId: string;
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [soAnh, setSoAnh] = useState(soAnhTrongGoi?.toString() ?? "");
  const [gia, setGia] = useState(giaAnhThem.toString());
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setGoiAnhAction(galleryId, soAnh, gia);
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
    setGia(giaAnhThem.toString());
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
        placeholder="để trống nếu không tính theo gói"
        className="input mt-1.5"
      />

      <label className="eyebrow mt-3 block">Giá mỗi ảnh chọn thêm (đồng)</label>
      <input
        type="number"
        min={0}
        step={1000}
        value={gia}
        onChange={(e) => setGia(e.target.value)}
        className="input mt-1.5"
      />

      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        {soAnh
          ? `Khách sẽ đọc: "Gói của anh chị gồm ${soAnh} ảnh in. Thích thêm tấm nào ngoài gói vẫn chọn được, mỗi tấm ${tien(Number(gia) || 0)}đ đã gồm chỉnh sửa và in."`
          : "Để trống số ảnh thì phần hướng dẫn cho khách bỏ hẳn đoạn giá cả, chỉ nói cách chọn ảnh."}
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
