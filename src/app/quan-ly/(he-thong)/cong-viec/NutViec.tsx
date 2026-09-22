"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TRANG_THAI_VIEC } from "@/lib/hopDongChung";
import { doiTrangThaiViecAction, giaoViecAction } from "../../actionsViec";

export type NhanVienGon = { maNV: string; ten: string };

/**
 * Hai ô chọn trên mỗi dòng đầu việc: giao cho ai, và đang ở trạng thái nào.
 *
 * Chọn xong là lưu ngay, không có nút "Lưu" — một bảng ba chục dòng mà mỗi
 * dòng một nút lưu thì không ai bấm đúng dòng. Lưu hỏng thì câu báo lỗi hiện
 * ngay dưới ô đó và ô quay về giá trị cũ.
 *
 * Người không phải quản lý chỉ thấy hai lựa chọn trong ô người: để trống (việc
 * chưa giao) và chính mình — nhưng chặn thật nằm trong server action, ở đây
 * chỉ là đỡ bấm nhầm (nguyên tắc 3).
 */
export function NutViec({
  id,
  nguoiPhuTrachMaNV,
  trangThai,
  nhanVien,
  quanTri,
  maToi,
}: {
  id: string;
  nguoiPhuTrachMaNV: string | null;
  trangThai: string | null;
  nhanVien: NhanVienGon[];
  quanTri: boolean;
  maToi: string | null;
}) {
  const router = useRouter();
  const [dangChay, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  const chay = (viec: () => Promise<{ loi: string } | { ok: true }>) =>
    start(async () => {
      setLoi(null);
      const kq = await viec();
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      router.refresh();
    });

  const dsNguoi = quanTri ? nhanVien : nhanVien.filter((n) => n.maNV === maToi);
  const tt = trangThai && (TRANG_THAI_VIEC as readonly string[]).includes(trangThai) ? trangThai : "";

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={nguoiPhuTrachMaNV ?? ""}
          disabled={dangChay}
          aria-label="Người làm"
          onChange={(e) => chay(() => giaoViecAction(id, e.target.value))}
          className="input btn-gon w-auto min-w-28"
        >
          <option value="">— chưa giao —</option>
          {dsNguoi.map((n) => (
            <option key={n.maNV} value={n.maNV}>
              {n.ten}
            </option>
          ))}
          {/*
            Mã lạ (người đã nghỉ, mã cũ bên AppSheet) vẫn phải hiện, không thì
            ô nhảy về "chưa giao" và nhìn như việc không của ai.
          */}
          {nguoiPhuTrachMaNV && !dsNguoi.some((n) => n.maNV === nguoiPhuTrachMaNV) && (
            <option value={nguoiPhuTrachMaNV}>{nguoiPhuTrachMaNV}</option>
          )}
        </select>

        <select
          value={tt}
          disabled={dangChay}
          aria-label="Trạng thái việc"
          onChange={(e) => chay(() => doiTrangThaiViecAction(id, e.target.value))}
          className="input btn-gon w-auto min-w-28"
        >
          {tt === "" && <option value="">— {trangThai ?? "chưa rõ"} —</option>}
          {TRANG_THAI_VIEC.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {loi && <span className="text-xs text-red-700">{loi}</span>}
    </div>
  );
}
