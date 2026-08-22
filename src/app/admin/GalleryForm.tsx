"use client";

import { useActionState } from "react";
import { createGalleryAction, type ActionState } from "./actions";

export function GalleryForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGalleryAction,
    {}
  );

  return (
    <form action={action} className="card p-5 sm:p-6">
      <h2 className="font-display text-2xl font-light">Tạo link mới</h2>

      <label className="eyebrow mt-4 block">Link folder Drive</label>
      <input
        name="driveLink"
        required
        placeholder="https://drive.google.com/drive/folders/..."
        className="input mt-1.5"
      />
      <p className="mt-1.5 text-xs text-fg-faint">
        Mở folder khách trên Drive rồi copy địa chỉ trên thanh trình duyệt.
      </p>

      <label className="eyebrow mt-5 block">
        Tên khách <span className="text-fg-faint">(để trống thì lấy tên thư mục)</span>
      </label>
      <input name="clientName" placeholder="Vũ Phương & Kim Tiên" className="input mt-1.5" />

      <p className="notice mt-5 bg-accent-soft text-fg">
        Khách xem ảnh thoải mái, nhưng phải có mã của studio mới chọn được ảnh.
        Mã sinh sẵn sau khi tạo, anh copy gửi khách.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" name="allowDownload" defaultChecked className="size-4" />
        Cho khách tải ảnh về
      </label>

      {state.error && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && (
        <p className="mt-4 text-sm text-emerald-700">{state.ok}</p>
      )}

      <button disabled={pending} className="btn-primary mt-6">
        {pending ? "Đang kiểm tra thư mục…" : "Tạo link"}
      </button>
    </form>
  );
}
