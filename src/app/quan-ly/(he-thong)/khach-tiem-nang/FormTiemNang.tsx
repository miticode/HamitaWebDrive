"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suaTiemNangAction, themTiemNangAction } from "../../actionsKhach";
import {
  KHA_NANG,
  LOAI_CSKH,
  NGUON_KHACH,
  TINH_TRANG,
} from "@/lib/khachTiemNangChung";

/**
 * Thêm và sửa khách tiềm năng — đợt 6 (13/11/2026).
 *
 * MỘT form cho cả hai việc, cùng nếp `FormKhach.tsx`.
 *
 * Nhật ký chăm sóc hiện ra để ĐỌC nhưng không cho sửa: ô "Thêm một dòng" chỉ
 * nối thêm vào đầu. Cho sửa cả nhật ký là mời người ta xoá mất một lần gọi
 * điện của đồng nghiệp, mà sau đó không ai biết nó từng có.
 */

type TiemNang = {
  id: string;
  tenNguoi: string;
  soDienThoai: string | null;
  nguon: string | null;
  nhuCau: string | null;
  diaChi: string | null;
  phuTrachMaNV: string | null;
  khaNang: string;
  tinhTrang: string | null;
  ghiChu: string | null;
  loaiCskh: string | null;
  ngayLienHeLai: string | null;
  lichSuCskh: string | null;
};

const O_NHAP =
  "mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm";

function Chon({
  ten,
  nhan,
  dm,
  giaTri,
  trong,
}: {
  ten: string;
  nhan: string;
  dm: readonly string[];
  giaTri?: string | null;
  /** Chữ cho mục "chưa chọn". Bỏ trống = bắt buộc chọn. */
  trong?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="eyebrow">{nhan}</span>
      <select name={ten} defaultValue={giaTri ?? ""} className={O_NHAP}>
        {trong && <option value="">{trong}</option>}
        {dm.map((x) => (
          <option key={x} value={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}

function Khung({ khach, dong }: { khach: TiemNang | null; dong: () => void }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function gui(fd: FormData) {
    setLoi(null);
    batDau(async () => {
      const o = (k: string) => String(fd.get(k) ?? "");
      const du = {
        tenNguoi: o("tenNguoi"),
        soDienThoai: o("soDienThoai"),
        nguon: o("nguon"),
        nhuCau: o("nhuCau"),
        diaChi: o("diaChi"),
        phuTrachMaNV: o("phuTrachMaNV"),
        khaNang: o("khaNang"),
        tinhTrang: o("tinhTrang"),
        ghiChu: o("ghiChu"),
        loaiCskh: o("loaiCskh"),
        ngayLienHeLai: o("ngayLienHeLai"),
        themLichSu: o("themLichSu"),
      };
      const kq = khach ? await suaTiemNangAction(khach.id, du) : await themTiemNangAction(du);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      form.current?.reset();
      dong();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dang && dong()}
    >
      <form
        ref={form}
        action={gui}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Tư vấn – Chăm sóc khách hàng</p>
        <h2 className="mt-1.5 font-display text-2xl font-light">
          {khach ? "Sửa khách tiềm năng" : "Thêm khách tiềm năng"}
        </h2>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <label className="mt-4 block">
            <span className="eyebrow">Người liên hệ</span>
            <input
              name="tenNguoi"
              defaultValue={khach?.tenNguoi ?? ""}
              required
              maxLength={120}
              autoFocus
              /* Dữ liệu của khách, không phải của người đang gõ — xem FormKhach.tsx. */
              autoComplete="off"
              className={O_NHAP}
            />
          </label>
          <label className="mt-4 block">
            <span className="eyebrow">Số điện thoại</span>
            <input
              name="soDienThoai"
              defaultValue={khach?.soDienThoai ?? ""}
              inputMode="tel"
              autoComplete="off"
              className={`${O_NHAP} tabular-nums`}
            />
          </label>

          <Chon ten="nguon" nhan="Nguồn" dm={NGUON_KHACH} giaTri={khach?.nguon} trong="— chưa rõ —" />
          <Chon ten="loaiCskh" nhan="Liên lạc bằng" dm={LOAI_CSKH} giaTri={khach?.loaiCskh} trong="— chưa rõ —" />

          <label className="mt-4 block">
            <span className="eyebrow">Nhu cầu</span>
            <input name="nhuCau" defaultValue={khach?.nhuCau ?? ""} maxLength={200} className={O_NHAP} />
          </label>
          <label className="mt-4 block">
            <span className="eyebrow">Địa chỉ</span>
            <input name="diaChi" defaultValue={khach?.diaChi ?? ""} maxLength={120} className={O_NHAP} />
          </label>

          <Chon ten="khaNang" nhan="Khả năng chốt" dm={KHA_NANG} giaTri={khach?.khaNang ?? KHA_NANG[1]} />
          <Chon ten="tinhTrang" nhan="Tình trạng" dm={TINH_TRANG} giaTri={khach?.tinhTrang} trong="— chưa rõ —" />

          <label className="mt-4 block">
            <span className="eyebrow">Hẹn liên hệ lại</span>
            <input
              type="date"
              name="ngayLienHeLai"
              defaultValue={khach?.ngayLienHeLai ?? ""}
              className={O_NHAP}
            />
          </label>
          <label className="mt-4 block">
            <span className="eyebrow">Mã NV phụ trách</span>
            <input
              name="phuTrachMaNV"
              defaultValue={khach?.phuTrachMaNV ?? ""}
              maxLength={20}
              placeholder={khach ? "" : "để trống = mình"}
              className={O_NHAP}
            />
          </label>
        </div>

        <label className="mt-4 block">
          <span className="eyebrow">Ghi chú</span>
          <textarea
            name="ghiChu"
            defaultValue={khach?.ghiChu ?? ""}
            rows={2}
            maxLength={2000}
            className="mt-1.5 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block">
          <span className="eyebrow">Thêm một dòng vào nhật ký chăm sóc</span>
          <textarea
            name="themLichSu"
            rows={2}
            maxLength={1000}
            placeholder="Gọi lúc nào, khách nói gì…"
            className="mt-1.5 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs text-fg-faint">
            Web tự ghi ngày trước dòng này và đặt lên đầu nhật ký. Dòng cũ không bị xoá.
          </span>
        </label>

        {khach?.lichSuCskh && (
          <div className="mt-4">
            <p className="eyebrow">Nhật ký chăm sóc</p>
            <p className="mt-1.5 max-h-40 overflow-y-auto rounded-[3px] border border-line bg-bg-soft px-3 py-2 text-xs whitespace-pre-line text-fg-muted">
              {khach.lichSuCskh}
            </p>
          </div>
        )}

        {loi && (
          <p className="mt-4 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loi}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={dang} className="btn-primary flex-1 disabled:opacity-50">
            {dang ? "Đang lưu…" : khach ? "Lưu" : "Thêm"}
          </button>
          <button type="button" disabled={dang} onClick={dong} className="btn">
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

export function NutThemTiemNang() {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setMo(true)}>
        Thêm khách tiềm năng
      </button>
      {mo && <Khung khach={null} dong={() => setMo(false)} />}
    </>
  );
}

export function NutSuaTiemNang({ khach }: { khach: TiemNang }) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className="btn px-3 py-1 text-xs" onClick={() => setMo(true)}>
        Sửa
      </button>
      {mo && <Khung khach={khach} dong={() => setMo(false)} />}
    </>
  );
}
