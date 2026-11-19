"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Một thư mục con trên trang "Ảnh khách chọn", THU GỌN ĐƯỢC — anh yêu cầu
 * 19/11/2026.
 *
 * Việc thật: nhà cưới chia hai ba thư mục, mỗi thư mục vài trăm tấm. Studio
 * xem xong "file gốc nhà trai" muốn sang "file gốc nhà gái" thì phải cuộn qua
 * 247 ô ảnh — mà cuộn nhanh thì trôi quá, cuộn chậm thì lâu.
 *
 * Bấm thu gọn là khối co lại và thư mục kế tiếp lộ ra ngay dưới đầu mục.
 *
 * ẨN BẰNG CSS, không gỡ khỏi cây: ảnh trong lưới mang `loading="lazy"` nên
 * tấm chưa hiện thì trình duyệt chưa tải. Mở lại không phải dựng lại gì, và
 * khung xem to (phím mũi tên, vuốt ngang) giữ nguyên trạng thái của nó.
 *
 * Mặc định MỞ. Studio vào trang này là để nhìn ảnh; đóng sẵn thì ai cũng phải
 * bấm thêm một cái trước khi làm được việc.
 */
export function KhoiMuc({
  thuTu,
  soAnh,
  dauMuc,
  children,
}: {
  /** Thư mục thứ mấy trên trang — cái đầu không có kẻ ngang phía trên. */
  thuTu: number;
  soAnh: number;
  /** Phần tiêu đề: tên thư mục, mốc khách chọn, hạn lấy hình, nút chép mã. */
  dauMuc: ReactNode;
  children: ReactNode;
}) {
  const [mo, setMo] = useState(true);
  const khung = useRef<HTMLDivElement>(null);
  const vuaDong = useRef(false);

  /*
    Thu gọn xong thì CUỘN VỀ ĐẦU KHỐI NÀY.

    Đây mới là thứ anh cần: bấm thu gọn ở giữa một lưới 247 tấm thì trang co
    lại hàng chục nghìn pixel, chỗ đang đứng biến mất và màn hình nhảy tới một
    quãng vô nghĩa. Kéo về đầu khối thì thư mục kế tiếp nằm ngay dưới — đúng
    câu "ấn vào sẽ thấy ảnh ở nhà tiếp theo".

    PHẢI LÀ `useEffect`, không phải `requestAnimationFrame` ngay trong tay
    bấm. Bản đầu em viết rAF và đo trên điện thoại thì cuộn KHÔNG chạy: rAF
    kịp chạy trước lúc React vẽ lại, nên `scrollIntoView` tính theo bố cục cũ
    rồi cuộn tới một chỗ sắp biến mất. Đo 19/11 ở ba vị trí (2.000, 8.000,
    20.000px): cả ba đều đứng yên tại chỗ. Lần đo đầu trên máy tính ra kết
    quả đúng chỉ là trùng hợp — trang co lại nên trình duyệt tự kẹp vị trí về
    gần đầu, không phải mã của em làm.

    `useEffect` chạy SAU khi React đã ghi xong DOM, lúc đó chiều cao mới là
    thật.

    Chỉ cuộn khi ĐÓNG, không cuộn khi mở: mở ra là người ta đang đứng sẵn ở
    đầu khối rồi, kéo thêm chỉ làm giật màn hình. Cờ `vuaDong` để lần dựng
    đầu tiên không cuộn gì cả.
  */
  useEffect(() => {
    if (!vuaDong.current) return;
    vuaDong.current = false;
    khung.current?.scrollIntoView({ block: "start" });
  }, [mo]);

  const doi = () => {
    if (mo) vuaDong.current = true;
    setMo(!mo);
  };

  return (
    <div
      ref={khung}
      className={thuTu === 0 ? "mt-6" : "mt-14 border-t border-line-strong pt-10"}
    >
      {/*
        Đầu mục DÍNH LẠI khi cuộn (`sticky top-0`).

        Đây là thứ trả lời đúng câu hỏi "đang xem thư mục nào" ở giữa một lưới
        trăm tấm: kẻ ngang chỉ nói được chỗ giáp ranh, cuộn qua rồi thì không
        còn gì trên màn hình nhắc nữa.

        Nền phải ĐẶC (`bg-bg`), không để trong suốt: ảnh chạy phía dưới sẽ lộ
        qua và chữ không đọc nổi. Kéo rộng ra hai bên bằng lề âm rồi bù lại
        bằng padding, để dải nền che trọn bề ngang chứ không để ảnh ló ra ở mép.
      */}
      <div className="sticky top-0 z-10 -mx-5 bg-bg px-5 py-3 sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{dauMuc}</div>

          {/*
            Nút đứng TRONG đầu mục dính, nên nó đi theo màn hình suốt lúc đang
            cuộn giữa lưới — xem được nửa thư mục mà muốn bỏ qua phần còn lại
            thì bấm ngay tại chỗ, không phải cuộn ngược lên tìm nút.

            Cao 44px trên điện thoại (`min-h-11`) rồi thu lại ở màn hình lớn,
            cùng cỡ với nút "Chép mã số" bên cạnh.
          */}
          <button
            type="button"
            onClick={doi}
            aria-expanded={mo}
            className="btn btn-gon min-h-11 shrink-0 gap-1.5 px-3 sm:min-h-8 sm:px-2.5 sm:py-1"
            title={
              mo
                ? `Thu gọn “${soAnh} ảnh” để xem thư mục tiếp theo`
                : "Mở lại thư mục này"
            }
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className={`size-3.5 shrink-0 transition-transform ${mo ? "" : "-rotate-90"}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
            {mo ? "Thu gọn" : "Mở ra"}
          </button>
        </div>
      </div>

      {/*
        `hidden` chứ không phải bỏ hẳn — xem chú thích đầu tệp. Khi đóng vẫn
        để lại một dòng nói còn bao nhiêu tấm, kẻo nhìn vào tưởng thư mục rỗng.
      */}
      <div className={mo ? "" : "hidden"}>{children}</div>
      {!mo && (
        <button
          type="button"
          onClick={doi}
          className="mt-1 w-full rounded-md border border-dashed border-line py-3 text-sm text-fg-muted transition hover:border-line-strong hover:text-fg"
        >
          Đang thu gọn {soAnh} ảnh — bấm để mở lại
        </button>
      )}
    </div>
  );
}
