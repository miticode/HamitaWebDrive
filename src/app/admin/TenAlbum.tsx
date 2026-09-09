"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setClientNameAction } from "./actions";

/**
 * Tên album hiện cho khách, sửa được tại chỗ.
 *
 * Tên này là `clientName`. Để trống thì cả trang quản lý lẫn trang khách quay
 * về dùng tên thư mục trên Drive — đó là trạng thái bình thường lúc mới tạo
 * link, không phải thiếu sót.
 *
 * Đổi tên KHÔNG đụng tới địa chỉ link (slug). Slug đã sinh lúc tạo link và có
 * thể studio đã gửi cho khách rồi; đổi tên mà kéo theo đổi địa chỉ thì mọi link
 * đã gửi đều chết, mà không có cách nào báo cho những người đã nhận link biết.
 */
export function TenAlbum({
  galleryId,
  slug,
  ten,
  tenThuMuc,
}: {
  galleryId: string;
  slug: string;
  /** Tên đang hiển thị (tên khách, hoặc tên thư mục nếu chưa đặt). */
  ten: string;
  /** Tên thư mục trên Drive — cái sẽ dùng lại nếu bỏ trống ô nhập. */
  tenThuMuc: string;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [chu, setChu] = useState(ten);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setClientNameAction(galleryId, chu);
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
    setChu(ten);
  };

  if (!mo) {
    return (
      <div className="flex min-w-0 items-baseline gap-2">
        {/* title: tên dài bị cắt trên thẻ hẹp — rê chuột đọc lại được đủ. */}
        <Link
          href={`/g/${slug}`}
          title={ten}
          className="truncate font-display text-xl leading-snug transition group-hover:text-accent"
        >
          {ten}
        </Link>
        <button
          type="button"
          onClick={() => setMo(true)}
          title="Đổi tên album — không làm đổi link đã gửi khách"
          className="shrink-0 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          sửa
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="eyebrow block">Tên album hiện cho khách</label>
      <input
        value={chu}
        autoFocus
        maxLength={120}
        onChange={(e) => setChu(e.target.value)}
        onKeyDown={(e) => {
          // Enter để lưu, Esc để bỏ — nhanh hơn rê chuột xuống nút.
          if (e.key === "Enter") luu();
          if (e.key === "Escape") huy();
        }}
        placeholder={tenThuMuc}
        className="input mt-1.5"
      />
      <p className="mt-1 text-[11px] leading-relaxed text-fg-faint">
        Để trống thì dùng lại tên thư mục trên Drive ({tenThuMuc}). Đổi tên không
        làm đổi link đã gửi khách.
      </p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-2 flex gap-2">
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
