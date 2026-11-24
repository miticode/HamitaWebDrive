"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HINH_THUC_THU, NOI_DUNG_THU } from "@/lib/hopDongChung";
import { docTien } from "@/lib/studioNoiBo";
import {
  duyetPhieuThuAction,
  themPhieuThuAction,
  xoaHopDongAction,
  xoaPhieuThuAction,
} from "../../../actionsHopDong";

/**
 * Mấy nút đụng tới dữ liệu ở trang một hợp đồng: thêm phiếu thu, duyệt phiếu,
 * xoá phiếu, xoá cả hợp đồng.
 *
 * Anh chốt 23/09/2026 — trước đó web lập được hợp đồng nhưng không sửa được gì
 * nữa, mà AppSheet thì không còn là nơi sửa (nguyên tắc 52).
 *
 * Mọi nút ở đây chỉ là nút: quyền kiểm lại trong từng server action, vì server
 * action là một đường mạng công khai (nguyên tắc 3).
 */

/** Ô thêm phiếu thu — mở ra từ nút, đóng lại sau khi lưu. */
export function ThemPhieuThu({
  hopDongId,
  homNay,
  laQuanLy,
}: {
  hopDongId: string;
  homNay: string;
  /** Quản lý thu thì ghi thẳng "đã thu"; sale thì phiếu nằm chờ duyệt. */
  laQuanLy: boolean;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [dangLuu, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [du, setDu] = useState({
    soTien: 0,
    hinhThuc: HINH_THUC_THU[0] as string,
    noiDung: NOI_DUNG_THU[3] as string,
    ngayThu: homNay,
    ghiChu: "",
  });

  const luu = () =>
    start(async () => {
      setLoi(null);
      const kq = await themPhieuThuAction(hopDongId, du);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setMo(false);
      setDu((c) => ({ ...c, soTien: 0, ghiChu: "" }));
      router.refresh();
    });

  if (!mo) {
    return (
      <button type="button" className="btn" onClick={() => setMo(true)}>
        Thêm phiếu thu
      </button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        luu();
      }}
      className="mt-3 grid gap-3 rounded-md border border-line bg-bg-raised p-4"
    >
      <div className="grid gap-3 sm:grid-cols-5">
        <label className="block">
          <span className="eyebrow block">Số tiền</span>
          <input
            autoFocus
            value={du.soTien ? du.soTien.toLocaleString("vi-VN") : ""}
            onChange={(e) => setDu((c) => ({ ...c, soTien: docTien(e.target.value) ?? 0 }))}
            inputMode="numeric"
            className="input mt-1.5 tabular-nums"
          />
        </label>
        <label className="block">
          <span className="eyebrow block">Hình thức</span>
          <select
            value={du.hinhThuc}
            onChange={(e) => setDu((c) => ({ ...c, hinhThuc: e.target.value }))}
            className="input mt-1.5"
          >
            {HINH_THUC_THU.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="eyebrow block">Nội dung</span>
          <select
            value={du.noiDung}
            onChange={(e) => setDu((c) => ({ ...c, noiDung: e.target.value }))}
            className="input mt-1.5"
          >
            {NOI_DUNG_THU.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="eyebrow block">Ngày thu</span>
          <input
            type="date"
            value={du.ngayThu}
            onChange={(e) => setDu((c) => ({ ...c, ngayThu: e.target.value }))}
            className="input mt-1.5"
          />
        </label>
        <label className="block">
          <span className="eyebrow block">Ghi chú</span>
          <input
            value={du.ghiChu}
            onChange={(e) => setDu((c) => ({ ...c, ghiChu: e.target.value }))}
            className="input mt-1.5"
          />
        </label>
      </div>

      {loi && <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{loi}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary px-4" disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lưu phiếu thu"}
        </button>
        <button type="button" className="btn" onClick={() => setMo(false)} disabled={dangLuu}>
          Thôi
        </button>
        <span className="text-xs text-fg-faint">
          {laQuanLy
            ? "Phiếu ghi thẳng là đã thu."
            : "Phiếu sẽ nằm ở “Chờ duyệt” cho tới khi quản lý duyệt."}
        </span>
      </div>
    </form>
  );
}

/** Hai nút của một phiếu thu: duyệt và xoá. Chỉ dựng cho quản lý. */
export function NutPhieuThu({ id, choDuyet }: { id: string; choDuyet: boolean }) {
  const router = useRouter();
  const [dangChay, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [hoiXoa, setHoiXoa] = useState(false);

  const chay = (viec: () => Promise<{ loi: string } | { ok: true }>) =>
    start(async () => {
      setLoi(null);
      const kq = await viec();
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setHoiXoa(false);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {choDuyet && (
        <button
          type="button"
          className="btn-gon btn"
          disabled={dangChay}
          onClick={() => chay(() => duyetPhieuThuAction(id))}
          title="Xác nhận tiền này đã vào két"
        >
          Duyệt
        </button>
      )}
      {hoiXoa ? (
        <>
          <button
            type="button"
            className="btn-gon btn btn-danger"
            disabled={dangChay}
            onClick={() => chay(() => xoaPhieuThuAction(id))}
          >
            {dangChay ? "Đang xoá…" : "Xoá thật"}
          </button>
          <button type="button" className="btn-gon btn" onClick={() => setHoiXoa(false)} disabled={dangChay}>
            Thôi
          </button>
        </>
      ) : (
        <button type="button" className="btn-gon btn" onClick={() => setHoiXoa(true)} title="Xoá phiếu lập nhầm">
          Xoá
        </button>
      )}
      {loi && <span className="text-xs text-red-700">{loi}</span>}
    </div>
  );
}

/**
 * Xoá cả hợp đồng — phải GÕ LẠI ĐÚNG MÃ mới bấm được.
 *
 * Thao tác này kéo theo phiếu thu, lịch chụp và đầu việc của hợp đồng, không
 * lấy lại được, nên một cú bấm nhầm không được phép đủ để xoá. Cùng tinh thần
 * với hộp xoá album bên trang ảnh.
 */
/** Bấm lần đầu rồi có bấy nhiêu giây để bấm lần hai, hết thì nút về như cũ. */
const GIAY_CHO = 5;

export function NutXoaHopDong({ id, maHD, tenKhach }: { id: string; maHD: string; tenKhach: string }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  /** Đã bấm lần một; đếm ngược số giây còn lại để bấm lần hai. 0 = chưa bấm. */
  const [conLai, setConLai] = useState(0);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangXoa, start] = useTransition();

  useEffect(() => {
    if (!mo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !dangXoa) setMo(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mo, dangXoa]);

  /*
    XOÁ BẰNG HAI LẦN BẤM, không gõ lại mã nữa — anh chốt 14/11/2026.

    Mã hợp đồng dài trung vị 28 ký tự ("STT_26.1100-60_TTT142_21-37"), gõ lại
    bằng tay là một cực hình, nhất là trên điện thoại. Đo 2.405 hợp đồng:
    gõ tên khách cũng không nhẹ hơn mấy (835 hợp đồng có tên dài hơn 25 ký
    tự) và còn tệ hơn ở chỗ 195 tên bị nhiều hợp đồng dùng chung — một nhà
    thường có hai hợp đồng, một chụp một tiệc, nên tên không tách được đúng
    cái cần tách.

    Đổi lại điều gì, nói thẳng: hai lần bấm chặn được BẤM VỘI, nhưng không
    chặn được MỞ NHẦM hợp đồng rồi xoá rất dứt khoát. Nên tên khách in to
    trong câu hỏi vẫn là chỗ dựa duy nhất — đó là lý do nó nằm ở cỡ chữ lớn
    nhất của hộp này.

    Đồng hồ đếm ngược dọn sạch khi hộp đóng hoặc khi hết giờ: để sót một
    `setInterval` chạy ngầm là React cảnh báo cập nhật trên component đã gỡ.
  */
  useEffect(() => {
    if (conLai <= 0) return;
    const h = setTimeout(() => setConLai((c) => c - 1), 1000);
    return () => clearTimeout(h);
  }, [conLai]);

  /*
    Hộp đóng thì đồng hồ về 0, để lần mở sau nút lại là "Xoá hợp đồng" chứ
    không phải đang đếm dở.

    Chỉnh ngay trong render theo mẫu "chỉnh state khi thứ khác đổi" của React.
    Đặt ở đây chứ không rải `setConLai(0)` vào từng chỗ đóng hộp — có bốn chỗ
    (phím Esc, nút Thôi, bấm ra ngoài, xoá xong), rải ra là sớm muộn sót một.
  */
  const [moTruoc, setMoTruoc] = useState(mo);
  if (mo !== moTruoc) {
    setMoTruoc(mo);
    if (!mo) setConLai(0);
  }

  const xoa = () =>
    start(async () => {
      setLoi(null);
      /*
        Vẫn gửi mã lên máy chủ vì `xoaHopDongAction` nhận hai tham số và kiểm
        khớp. Phép kiểm đó GIỜ KHÔNG CÒN là rào chắn người dùng nữa — giao
        diện tự điền — mà chỉ còn chặn trường hợp id và mã lệch nhau, tức gọi
        nhầm hợp đồng. Rào chắn người dùng nằm ở hai lần bấm phía trên. Nói rõ
        ra đây để sau này không ai đọc hàm máy chủ rồi tưởng người dùng vẫn
        phải gõ gì.
      */
      const kq = await xoaHopDongAction(id, maHD);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      router.push("/quan-ly/hop-dong");
      router.refresh();
    });

  return (
    <>
      <button type="button" className="btn btn-danger" onClick={() => setMo(true)}>
        Xoá hợp đồng
      </button>

      {mo && (
        <div
          className="nen-hien fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => !dangXoa && setMo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="hop-hien w-full max-w-md rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
          >
            <p className="eyebrow text-red-700">Xoá hợp đồng</p>
            <h2 className="mt-1.5 font-display text-2xl leading-snug font-light text-balance">
              Xoá hợp đồng của “{tenKhach || maHD}”?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Xoá luôn các dòng dịch vụ, <b className="text-fg">phiếu thu</b>, lịch chụp và đầu việc của
              hợp đồng này. Không lấy lại được.
            </p>

            <p className="mt-3 text-xs text-fg-faint tabular-nums">{maHD}</p>

            {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                autoFocus
                className="btn btn-danger"
                disabled={dangXoa}
                onClick={() => (conLai > 0 ? xoa() : setConLai(GIAY_CHO))}
              >
                {dangXoa
                  ? "Đang xoá…"
                  : conLai > 0
                    ? `Bấm lần nữa để xoá hẳn (${conLai})`
                    : "Xoá hợp đồng"}
              </button>
              <button type="button" className="btn" onClick={() => setMo(false)} disabled={dangXoa}>
                Thôi
              </button>
            </div>

            {conLai > 0 && !dangXoa && (
              <p className="mt-2 text-xs text-red-700">
                Đọc lại tên phía trên cho chắc. Hết {conLai} giây nữa nút về như cũ.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
