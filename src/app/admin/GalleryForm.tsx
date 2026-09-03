"use client";

import { useActionState, useRef, useState } from "react";
import { MA_ALBUM, ganMa, laMa } from "@/lib/maAlbum";
import { createGalleryAction, type ActionState } from "./actions";

export function GalleryForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createGalleryAction,
    {},
  );

  /*
    Ô tên khách phải do React giữ giá trị thì nút gợi ý mới sửa được nó. Trước
    đây ô này để trình duyệt tự lo, nhưng lúc đó bấm nút cũng không chèn được
    chữ nào vào.
  */
  const [ten, setTen] = useState("");
  const oTen = useRef<HTMLInputElement>(null);

  const bamMa = (ma: string) => {
    const moi = ganMa(ten, ma);
    setTen(moi);
    /*
      Trả con trỏ về cuối ô ngay sau khi chèn: bấm mã xong việc tiếp theo luôn
      là gõ tên khách. Không làm bước này thì nhân viên phải bấm thêm một cái
      vào ô nữa, mà lỗi kiểu đó không ai báo — họ chỉ thấy "gõ mãi không lên
      chữ" rồi thôi không dùng nút gợi ý nữa.
    */
    requestAnimationFrame(() => {
      const o = oTen.current;
      if (!o) return;
      o.focus();
      o.setSelectionRange(moi.length, moi.length);
    });
  };

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

      <label htmlFor="clientName" className="eyebrow mt-5 block">
        Tên khách{" "}
        <span className="text-fg-faint">(để trống thì lấy tên thư mục)</span>
      </label>
      <input
        id="clientName"
        ref={oTen}
        name="clientName"
        value={ten}
        onChange={(e) => setTen(e.target.value)}
        placeholder="Vũ Phương & Kim Tiên"
        className="input mt-1.5"
      />

      {/*
        Hàng mã gợi ý. Bấm một cái là chèn vào đầu tên, bấm lại thì gỡ ra.

        Hiện ĐỦ BỘ, kể cả mã chưa album nào dùng — khác hẳn hàng nút lọc ở
        danh sách bên kia, nơi mã không có album thì ẩn đi. Hai chỗ hỏi hai câu
        khác nhau: bên kia là "đang có gì để xem", còn ở đây là "được phép đặt
        những mã nào". Ẩn mã chưa dùng ở đây thì mã mới không bao giờ có album
        đầu tiên.
      */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {MA_ALBUM.map((m) => {
          const dang = laMa(ten, m.ma);
          return (
            <button
              key={m.ma}
              type="button"
              onClick={() => bamMa(m.ma)}
              /* Nghĩa của mã để trong tooltip chứ không in ra: tám cái nút mà
                 nút nào cũng kèm chú thích thì hàng này dài hơn cả cái form. */
              title={m.nghia ? `${m.ma} — ${m.nghia}` : m.ma}
              className={`min-h-8 rounded-full border px-2.5 text-xs tracking-wide transition ${
                dang
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
              }`}
            >
              {m.ma}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-fg-faint">
        Bấm một mã để thêm vào đầu tên, bấm lại để bỏ.
      </p>

      <p className="notice mt-5 bg-accent-soft text-fg">
        Khách xem ảnh thoải mái, nhưng phải có mã của studio mới chọn được ảnh.
        Mã sinh sẵn sau khi tạo, anh copy gửi khách.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="allowDownload"
          defaultChecked
          className="size-4"
        />
        Cho khách tải ảnh về
      </label>

      {state.error && (
        <p className="mt-4 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && <p className="mt-4 text-sm text-emerald-700">{state.ok}</p>}

      <button disabled={pending} className="btn-primary mt-6">
        {pending ? "Đang kiểm tra thư mục…" : "Tạo link"}
      </button>
    </form>
  );
}
