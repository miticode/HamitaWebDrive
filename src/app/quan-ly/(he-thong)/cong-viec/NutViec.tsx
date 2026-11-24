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
  tenNguoiLam,
  quanTri,
  maToi,
}: {
  id: string;
  nguoiPhuTrachMaNV: string | null;
  trangThai: string | null;
  nhanVien: NhanVienGon[];
  /**
   * Tên người đang giữ việc này — anh yêu cầu 20/11/2026 ("việc đã có người
   * nhận thì hãy hiển thị tên người đó").
   *
   * Máy chủ tra sẵn rồi truyền xuống, thay vì gửi cả danh sách nhân viên cho
   * người thường tự tra: cái cần ở đây là TÊN CỦA MỘT NGƯỜI trên một việc cụ
   * thể, không phải danh bạ cả tiệm (nguyên tắc 55).
   */
  tenNguoiLam: string | null;
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
  /*
    Việc đang của NGƯỜI KHÁC, với người thường.

    Máy chủ đã chặn họ đụng vào (xem `duocDung` trong actionsViec.ts). Ở đây
    khoá ô luôn, để không ai bấm rồi mới nhận lời từ chối — và để con mắt
    nhận ra ngay việc nào còn nhận được.
  */
  const cuaNguoiKhac =
    !quanTri && !!nguoiPhuTrachMaNV && nguoiPhuTrachMaNV.toLowerCase() !== (maToi ?? "").toLowerCase();
  /* Việc chưa ai nhận: người thường nhận được về mình, nên hai ô vẫn mở. */
  const tt = trangThai && (TRANG_THAI_VIEC as readonly string[]).includes(trangThai) ? trangThai : "";

  /*
    ĐÁNH DẤU XONG RỒI THÌ KHOÁ — anh chốt 24/11/2026.

    Vì tiền: ngày hoàn thành ghi lúc tick chính là thứ quyết định việc đó rơi
    vào lương tháng nào. Máy chủ đã từ chối (`daDanhDauXong` trong
    actionsViec.ts), khoá ở đây để không ai bấm rồi mới nhận lời từ chối.

    Quản lý không bị khoá — tick nhầm thì phải có người mở lại được.
  */
  const daXong = !quanTri && tt === "Đã làm";
  const khoa = dangChay || cuaNguoiKhac || daXong;
  const viSao = daXong
    ? "Đã đánh dấu xong — nhờ quản lý mở lại nếu cần sửa."
    : cuaNguoiKhac
      ? "Việc của người khác."
      : undefined;

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <select
          value={nguoiPhuTrachMaNV ?? ""}
          disabled={khoa}
          title={viSao}
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
            Mã không có trong danh sách vẫn phải hiện, không thì ô nhảy về
            "chưa giao" và nhìn như việc không của ai. Hai trường hợp khác nhau:

            · Quản lý thấy mã trần — đó là người đã nghỉ hoặc mã cũ bên
              AppSheet, và biết mã nào là việc của họ.
            · Người thường thì MỌI mã đồng nghiệp đều "lạ", vì từ 20/11/2026
              danh sách nhân viên cắt ở máy chủ (nguyên tắc 55). Hiện mã trần
              cho họ vừa lộ mã vừa nhìn như lỗi, nên chỉ nói đã có người.
          */}
          {nguoiPhuTrachMaNV && !dsNguoi.some((n) => n.maNV === nguoiPhuTrachMaNV) && (
            <option value={nguoiPhuTrachMaNV}>{tenNguoiLam ?? nguoiPhuTrachMaNV}</option>
          )}
        </select>

        {/*
          KHOÁ TRẠNG THÁI việc của người khác — anh chốt 20/11/2026 ("không
          được chỉnh sửa trạng thái công việc của người đó, còn việc của bản
          thân mình thì được đổi").

          Máy chủ vốn đã từ chối (`duocDung` trong actionsViec.ts); khoá ở đây
          để không ai bấm rồi mới nhận lời từ chối, và để nhìn là biết dòng nào
          của mình.
        */}
        <select
          value={tt}
          disabled={khoa}
          title={viSao}
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
