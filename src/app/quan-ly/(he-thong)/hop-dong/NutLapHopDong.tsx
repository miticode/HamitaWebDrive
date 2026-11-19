"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { duLieuFormHopDongAction, type DuLieuFormHopDong } from "../../actionsHopDong";
import { FormHopDongMoi } from "./moi/FormHopDongMoi";

/**
 * Nút "Lập hợp đồng" mở một CỬA SỔ ngay trên trang danh sách — anh yêu cầu
 * 23/09/2026: "ấn lập hợp đồng thì hiện lên popup mượt mà chứ không nhảy sang
 * trang khác".
 *
 * Trang riêng `/quan-ly/hop-dong/moi` VẪN GIỮ: đó là đường vào khi ai đó dán
 * thẳng địa chỉ, và là chỗ chạy được cả khi trình duyệt chặn JavaScript. Cửa
 * sổ này chỉ là lối đi nhanh hơn cho cùng một form, không phải bản sao thứ hai
 * — hai bản form sẽ lệch nhau ngay lần sửa đầu tiên.
 *
 * Bảng dịch vụ tải KHI BẤM NÚT, không tải sẵn lúc mở trang (xem
 * `duLieuFormHopDongAction`). Nên cửa sổ hiện ra ngay với dòng "Đang mở…" rồi
 * form thế chỗ khi dữ liệu về; chờ đủ dữ liệu mới mở thì bấm xong phải đợi một
 * nhịp không biết chuyện gì đang xảy ra.
 */
export function NutLapHopDong() {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [dangTat, setDangTat] = useState(false);
  const [du, setDu] = useState<DuLieuFormHopDong | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangTai, start] = useTransition();

  /* Đóng: chạy hết animation rồi mới gỡ — 170ms khớp `.hop-tat` trong globals.css. */
  const dong = useCallback(() => {
    setDangTat(true);
    setTimeout(() => {
      setMo(false);
      setDangTat(false);
    }, 170);
  }, []);

  useEffect(() => {
    if (!mo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [mo, dong]);

  const moCuaSo = () => {
    setMo(true);
    setLoi(null);
    // Tải một lần cho cả phiên: mở lại cửa sổ không phải hỏi database lần nữa.
    if (du) return;
    start(async () => {
      const kq = await duLieuFormHopDongAction();
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setDu(kq);
    });
  };

  return (
    <>
      <button type="button" className="btn-primary" onClick={moCuaSo}>
        Lập hợp đồng
      </button>

      {mo && (
        <div
          className={`fixed inset-0 z-[60] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6 ${
            dangTat ? "nen-tat" : "nen-hien"
          }`}
          onClick={dong}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Lập hợp đồng"
            className={`flex max-h-[94dvh] w-full max-w-4xl flex-col rounded-t-lg bg-bg shadow-[var(--shadow-lift)] sm:max-h-[88dvh] sm:rounded-lg ${
              dangTat ? "hop-tat" : "hop-hien"
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div>
                <p className="eyebrow">Hợp đồng mới</p>
                <h2 className="mt-1 font-display text-xl leading-snug font-light">Lập hợp đồng</h2>
              </div>
              <button
                type="button"
                onClick={dong}
                aria-label="Đóng"
                className="grid size-9 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
              >
                ✕
              </button>
            </div>

            {/* Ruột cuộn riêng: form dài hơn màn hình, nền phía sau đã khoá cuộn. */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {loi && (
                <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {loi}
                </p>
              )}

              {!du && !loi && (
                <p className="py-10 text-center text-sm text-fg-muted">
                  {dangTai ? "Đang mở bảng dịch vụ…" : "Đang mở…"}
                </p>
              )}

              {du && (
                <FormHopDongMoi
                  dichVu={du.dichVu}
                  giaHangMuc={du.giaHangMuc}
                  luotDung={du.luotDung}
                  homNay={du.homNay}
                  laQuanLy={du.laQuanLy}
                  tenNguoiLap={du.tenNguoiLap}
                  cacBuoc={du.cacBuoc}
                  loaiBuoi={du.loaiBuoi}
                  danhMuc={du.danhMuc}
                  boMa={du.boMa}
                  onThoi={dong}
                  onXong={(id) => {
                    dong();
                    router.push(`/quan-ly/hop-dong/${id}`);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
