"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { dangNhapAction, type KetQua } from "../actions";

export function FormDangNhap({ tiep }: { tiep?: string }) {
  const [kq, action, dangChay] = useActionState<KetQua, FormData>(dangNhapAction, {});

  return (
    <form action={action} className="mx-auto mt-24 w-full max-w-xs px-6 text-center">
      <Logo size="md" className="mx-auto" />
      <h1 className="rule mt-6 font-display text-2xl font-light">Đăng nhập</h1>
      {tiep && <input type="hidden" name="tiep" value={tiep} />}
      <p className="mt-3 text-xs text-fg-faint">
        {tiep?.startsWith("/admin") ? "Quản lý album ảnh" : "Quản lý studio"}
      </p>

      <label className="mt-8 block text-left">
        <span className="text-xs text-fg-muted">Tên đăng nhập</span>
        {/*
          autoCapitalize tắt: điện thoại tự viết hoa chữ đầu, "Hoa" với "hoa"
          lệch nhau là gõ đúng vẫn báo sai. Máy chủ vẫn hạ chữ thường cho chắc.
        */}
        <input
          id="tenDangNhap"
          name="tenDangNhap"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus
          placeholder="Số điện thoại của anh chị"
          className="input mt-1"
        />
      </label>
      <label className="mt-3 block text-left">
        <span className="text-xs text-fg-muted">Mật khẩu</span>
        {/*
          KHÔNG để "current-password" (anh yêu cầu 25/09/2026): mấy máy trong
          studio dùng chung một tài khoản Google, mật khẩu lưu ở máy này là
          mọi máy khác tự điền được luôn — nhân viên mở trang quản lý ra là
          vào thẳng bằng tài khoản của anh.

          "new-password" là cách duy nhất web nói được với trình duyệt rằng
          đừng tự điền ô này. Còn chuyện trình duyệt có HỎI LƯU hay không thì
          web không cấm được — Chrome cố tình bỏ qua mọi yêu cầu kiểu đó. Phần
          ấy phải tắt trong cài đặt Chrome của từng máy.
        */}
        <input
          id="matKhau"
          name="matKhau"
          type="password"
          autoComplete="new-password"
          className="input mt-1"
        />
      </label>

      {kq.loi && <p className="mt-3 text-left text-sm text-red-700">{kq.loi}</p>}

      <button disabled={dangChay} className="btn-primary mt-4 w-full justify-center">
        {dangChay ? "Đang kiểm tra…" : "Đăng nhập"}
      </button>

      <p className="mt-6 text-xs leading-relaxed text-fg-faint">
        Quên mật khẩu hoặc chưa có mật khẩu thì nhờ quản lý cấp lại giúp.
      </p>
    </form>
  );
}
