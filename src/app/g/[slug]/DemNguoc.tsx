"use client";

import { useEffect, useState } from "react";

/**
 * Thanh đếm ngược tới ngày studio dự định xoá ảnh khỏi Drive.
 *
 * Chỉ là lời nhắc để khách tranh thủ tải ảnh về — hết hạn KHÔNG tự chặn link,
 * vì ảnh nằm trên Drive, xoá hay không là do studio. Nếu studio chưa xoá thì
 * khách vẫn xem được, chỉ là quá ngày nhắc.
 */
export function DemNguoc({
  expiresAt,
  allowDownload,
}: {
  expiresAt: string | null;
  allowDownload: boolean;
}) {
  /*
    Tính ở phía khách, cập nhật mỗi phút. Trang có thể được CDN lưu lại nên nếu
    tính sẵn ở máy chủ thì con số sẽ đứng im theo bản cache — tính ở đây thì lúc
    nào cũng đúng theo đồng hồ của khách.
  */
  const [bayGio, setBayGio] = useState<number | null>(null);
  useEffect(() => {
    // Lan dau qua setTimeout(0) thay vi goi thang trong effect — tranh setState
    // dong bo (React canh bao) va tranh lech giua may chu voi may khach.
    const cap = () => setBayGio(Date.now());
    const dau = setTimeout(cap, 0);
    const id = setInterval(cap, 60_000);
    return () => {
      clearTimeout(dau);
      clearInterval(id);
    };
  }, []);

  if (!expiresAt) return null;

  const han = Date.parse(expiresAt);
  if (Number.isNaN(han)) return null;

  // Chua tinh xong o phia khach thi chua ve gi, tranh nhap nhay sai so.
  if (bayGio === null) return null;

  const conLaiMs = han - bayGio;
  const ngayHan = new Date(han).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Da qua han: van cho xem (neu studio chua xoa) nhung nhac ro.
  if (conLaiMs <= 0) {
    return (
      <Khung mau="het">
        <b>Link ảnh đã quá hạn lưu giữ ({ngayHan}).</b>{" "}
        {allowDownload
          ? "Nếu ảnh vẫn còn xem được, anh chị tải ngay giúp studio nhé — ảnh có thể bị dọn bất cứ lúc nào."
          : "Anh chị liên hệ studio nếu cần lấy lại ảnh nhé."}
      </Khung>
    );
  }

  const soNgay = Math.ceil(conLaiMs / 86_400_000);
  const soGio = Math.ceil(conLaiMs / 3_600_000);
  const gap = soNgay <= 14; // sap het thi doi mau canh bao

  const conLai =
    soNgay >= 1 ? (
      <>
        còn <b>{soNgay}</b> ngày
      </>
    ) : (
      <>
        còn <b>{soGio}</b> giờ
      </>
    );

  return (
    <Khung mau={gap ? "gap" : "thuong"}>
      Link xem ảnh {conLai} nữa sẽ hết hạn{" "}
      <span className="whitespace-nowrap">(ngày {ngayHan})</span>.{" "}
      {allowDownload
        ? "Anh chị nhớ tải hết ảnh về máy trước ngày này nhé."
        : "Anh chị lưu ý thời gian để không lỡ mất bộ ảnh nhé."}
    </Khung>
  );
}

function Khung({
  mau,
  children,
}: {
  mau: "thuong" | "gap" | "het";
  children: React.ReactNode;
}) {
  const tone =
    mau === "het"
      ? "border-red-200 bg-red-50 text-red-800"
      : mau === "gap"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-line-strong bg-bg-soft text-fg";

  return (
    <div className="mx-auto max-w-2xl px-5">
      <p
        className={`flex items-start gap-2.5 rounded-md border px-4 py-3 text-center text-sm leading-relaxed ${tone}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 2h12M6 22h12M8 2c0 5 8 5 8 10s-8 5-8 10M16 2c0 5-8 5-8 10s8 5 8 10" />
        </svg>
        <span className="flex-1 text-left">{children}</span>
      </p>
    </div>
  );
}
