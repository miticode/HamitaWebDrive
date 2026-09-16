"use client";

import { useState, useTransition } from "react";
import { dangXuatMoiMayAction } from "../../actions";

/**
 * "Đăng xuất mọi máy" — hỏi lại trước khi làm, vì nó đá cả tiệm ra cùng lúc,
 * kể cả chính người đang bấm.
 */
export function NutDangXuatMoiMay({ soChuaCoMatKhau }: { soChuaCoMatKhau: number }) {
  const [hoi, setHoi] = useState(false);
  const [dangChay, start] = useTransition();

  if (!hoi) {
    return (
      <button type="button" className="btn" onClick={() => setHoi(true)}>
        Đăng xuất mọi máy
      </button>
    );
  }

  return (
    <div className="max-w-md rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Đá mọi máy ra khỏi hệ thống?</p>
      <p className="mt-1 leading-relaxed">
        Mọi máy đang đăng nhập — kể cả máy anh chị đang dùng và máy còn giữ phiên bằng mật khẩu chung cũ —
        sẽ phải đăng nhập lại. Mật khẩu không đổi.
        {soChuaCoMatKhau > 0 &&
          ` ${soChuaCoMatKhau} người chưa được cấp mật khẩu sẽ không vào được cho tới khi anh chị cấp.`}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-danger"
          disabled={dangChay}
          onClick={() => start(async () => { await dangXuatMoiMayAction(); })}
        >
          {dangChay ? "Đang đăng xuất…" : "Đăng xuất mọi máy"}
        </button>
        <button type="button" className="btn" disabled={dangChay} onClick={() => setHoi(false)}>
          Huỷ
        </button>
      </div>
    </div>
  );
}
