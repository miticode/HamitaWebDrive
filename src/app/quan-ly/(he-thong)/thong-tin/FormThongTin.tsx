"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suaThongTinStudioAction, type DuLieuThongTin } from "../../actionsStudio";
import { chuanToaDo, linkBanDo } from "@/lib/studioNoiBo";

/** Ô sửa phần nội bộ của thông tin studio. */
export function FormThongTin({ banDau }: { banDau: DuLieuThongTin }) {
  const router = useRouter();
  const [du, setDu] = useState(banDau);
  const [loi, setLoi] = useState<string | null>(null);
  const [daLuu, setDaLuu] = useState(false);
  const [dangLuu, start] = useTransition();

  const doi = (k: keyof DuLieuThongTin, v: string) => {
    setDu((c) => ({ ...c, [k]: v }));
    setDaLuu(false);
  };
  const coDoi = (Object.keys(du) as (keyof DuLieuThongTin)[]).some((k) => du[k] !== banDau[k]);

  const luu = () =>
    start(async () => {
      const kq = await suaThongTinStudioAction(du);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setLoi(null);
      setDaLuu(true);
      router.refresh();
    });

  const o = "grid gap-1 text-xs text-fg-muted";
  const toaDoDung = du.toaDo.trim() ? chuanToaDo(du.toaDo) : null;
  const toaDo2Dung = du.toaDo2.trim() ? chuanToaDo(du.toaDo2) : null;

  return (
    <div className="grid gap-4">
      <label className={o}>
        Người đại diện
        <input id="tt-dai-dien" className="input" value={du.nguoiDaiDien} onChange={(e) => doi("nguoiDaiDien", e.target.value)} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={o}>
          Số tài khoản 1
          <input id="tt-stk-1" className="input" value={du.soTaiKhoan1} onChange={(e) => doi("soTaiKhoan1", e.target.value)} />
        </label>
        <label className={o}>
          Số tài khoản 2
          <input id="tt-stk-2" className="input" value={du.soTaiKhoan2} onChange={(e) => doi("soTaiKhoan2", e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <label className={o}>
          Giờ bắt đầu
          <input id="tt-gio-bat-dau" type="time" className="input" value={du.gioBatDau} onChange={(e) => doi("gioBatDau", e.target.value)} />
        </label>
        <label className={o}>
          Giờ kết thúc
          <input id="tt-gio-ket-thuc" type="time" className="input" value={du.gioKetThuc} onChange={(e) => doi("gioKetThuc", e.target.value)} />
        </label>
        <label className={o}>
          Nghỉ giữa buổi (giờ)
          <input id="tt-gio-nghi" inputMode="decimal" className="input" value={du.gioNghiGiuaBuoi} onChange={(e) => doi("gioNghiGiuaBuoi", e.target.value)} />
        </label>
        <label className={o}>
          Ngày công / tháng
          <input id="tt-ngay-cong" inputMode="numeric" className="input" value={du.ngayCongThang} onChange={(e) => doi("ngayCongThang", e.target.value)} />
        </label>
      </div>

      {/*
        HAI toạ độ, vì tiệm có hai cơ sở (thêm 13/11/2026 cho chấm công).
        Không phải đoán: gom cụm 6.114 lượt chấm bên AppSheet ra một cụm 1.248
        lượt cách Wedding House 411m — đó là Hami Baby. Chỉ khai một toạ độ thì
        mọi lượt chấm ở cơ sở kia đều bị bảng công gọi là "ngoài tiệm".
      */}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={o}>
          Toạ độ Wedding House — 377 (vĩ độ, kinh độ)
          <input id="tt-toa-do" className="input" placeholder="10.437096, 106.476095" value={du.toaDo} onChange={(e) => doi("toaDo", e.target.value)} />
          {/* Mở bản đồ ngay để quản lý tự nhìn thấy toạ độ có đúng là tiệm không. */}
          {toaDoDung && (
            <a href={linkBanDo(toaDoDung)} target="_blank" rel="noreferrer" className="justify-self-start underline underline-offset-2 hover:text-accent">
              Xem vị trí trên bản đồ ↗
            </a>
          )}
        </label>

        <label className={o}>
          Toạ độ Hami Baby — 337 (vĩ độ, kinh độ)
          <input id="tt-toa-do-2" className="input" placeholder="10.438454, 106.472579" value={du.toaDo2} onChange={(e) => doi("toaDo2", e.target.value)} />
          {toaDo2Dung && (
            <a href={linkBanDo(toaDo2Dung)} target="_blank" rel="noreferrer" className="justify-self-start underline underline-offset-2 hover:text-accent">
              Xem vị trí trên bản đồ ↗
            </a>
          )}
        </label>
      </div>

      {loi && <p className="text-sm text-red-700">{loi}</p>}
      {daLuu && !coDoi && <p className="text-sm text-emerald-700">Đã lưu.</p>}

      <div>
        <button type="button" className="btn-primary" disabled={!coDoi || dangLuu} onClick={luu}>
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
      </div>
    </div>
  );
}
