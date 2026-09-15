"use client";

import { useActionState } from "react";
import { DO_DAI_TOI_THIEU } from "@/lib/nhanVienChung";
import { doiMatKhauAction, type KetQua } from "./actions";

/**
 * Ô đổi mật khẩu — dùng ở hai chỗ: trang bắt buộc đổi ngay sau khi đăng nhập
 * bằng mật khẩu tạm, và trang "Tài khoản của tôi".
 */
export function FormDoiMatKhau({ batBuoc }: { batBuoc: boolean }) {
  const [kq, action, dangChay] = useActionState<KetQua, FormData>(doiMatKhauAction, {});

  return (
    <form action={action} className="grid gap-3">
      {/* Mật khẩu tạm vừa gõ xong thì không hỏi lại — xem doiMatKhauAction. */}
      {!batBuoc && (
        <label className="block">
          <span className="text-xs text-fg-muted">Mật khẩu hiện tại</span>
          <input
            id="matKhauCu"
            name="matKhauCu"
            type="password"
            autoComplete="current-password"
            className="input mt-1"
          />
        </label>
      )}
      <label className="block">
        <span className="text-xs text-fg-muted">Mật khẩu mới</span>
        <input
          id="matKhauMoi"
          name="matKhauMoi"
          type="password"
          autoComplete="new-password"
          autoFocus={batBuoc}
          className="input mt-1"
        />
      </label>
      <label className="block">
        <span className="text-xs text-fg-muted">Nhập lại mật khẩu mới</span>
        <input
          id="nhapLai"
          name="nhapLai"
          type="password"
          autoComplete="new-password"
          className="input mt-1"
        />
      </label>

      <p className="text-xs leading-relaxed text-fg-faint">
        Ít nhất {DO_DAI_TOI_THIEU} ký tự. Không dùng số điện thoại hay tên đăng
        nhập — ai biết số của anh chị là đoán ra.
      </p>

      {kq.loi && <p className="text-sm text-red-700">{kq.loi}</p>}
      {kq.ok && <p className="text-sm text-emerald-700">{kq.ok}</p>}

      <button disabled={dangChay} className="btn-primary justify-center">
        {dangChay ? "Đang lưu…" : "Đổi mật khẩu"}
      </button>
    </form>
  );
}
