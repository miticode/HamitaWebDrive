"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ThongBao as Tin } from "@/lib/thongBao";
import { danhDauDaDocAction } from "./actions";

/**
 * Khung thông báo trên trang quản lý — những việc studio phải tự làm.
 *
 * Đặt ở cột phải, ngay dưới ô "Tạo link mới": chỗ đó vốn để trống, mà đây lại
 * là thứ nên đập vào mắt ngay khi mở trang chứ không phải cuộn mới thấy.
 *
 * KHÔNG tự ẩn khi không có việc gì. Một khung lặng lẽ biến mất thì studio
 * không phân biệt được "hôm nay không có việc" với "cái khung đó hỏng rồi" —
 * đúng cái bẫy đã ghi ở nguyên tắc 27 với khung kho ảnh. Trống thì nói rõ là
 * đã kiểm và không có gì.
 *
 * Cũng KHÔNG nhắc lại những gì chỗ khác đã báo: Drive sắp đầy và album quá hạn
 * đã có khung kho ảnh ở đầu trang, lần sao lưu gần nhất đã nằm ngay cạnh nút
 * "Sao lưu ngay", còn việc nhắc khách thì thuộc trang thống kê. Gom hết vào
 * đây chỉ làm cùng một tin hiện hai chỗ.
 */
export function ThongBao({ tin }: { tin: Tin[] }) {
  /*
    Danh sách giữ ở phía trình duyệt để bỏ dòng ra NGAY khi bấm, không đợi máy
    chủ trả lời. Đánh dấu đã đọc là việc không thể sai — cùng lắm là ghi hụt
    một dấu tích và thông báo hiện lại ở lần tải sau, nên bắt studio ngồi nhìn
    một vòng xoay chỉ để chờ xác nhận là thừa.
  */
  const [conLai, setConLai] = useState(tin);
  const [, start] = useTransition();

  const daDoc = (id: string) => {
    setConLai((ds) => ds.filter((t) => t.id !== id));
    start(async () => {
      await danhDauDaDocAction(id).catch(() => ({}));
    });
  };

  const soGap = conLai.filter((t) => t.mucDo === "gap").length;

  return (
    <section className="card mt-6 p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className={`size-[18px] shrink-0 ${soGap > 0 ? "text-accent" : "text-fg-faint"}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
          <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
        </svg>
        <h2 className="font-display text-xl font-light">Thông báo</h2>
        {conLai.length > 0 && (
          <span
            className={`ml-auto grid min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-medium ${
              soGap > 0 ? "bg-accent text-white" : "bg-bg-soft text-fg-muted"
            }`}
          >
            {conLai.length}
          </span>
        )}
      </div>

      {conLai.length === 0 ? (
        <div className="mt-4">
          <p className="text-sm text-fg-muted">
            {tin.length > 0
              ? "Đã xem hết. Tải lại trang nếu có việc mới."
              : "Không có việc nào cần để ý."}
          </p>
          {/*
            Nói rõ khung này canh những gì. Không có nó thì studio nhìn dòng
            trống ở trên và không biết nó đang canh cái gì để mà tin.
          */}
          <p className="mt-2 text-xs leading-relaxed text-fg-faint">
            Đang canh: album chưa đặt gói ảnh, khách chọn thêm sau khi đã báo
            xong, album mất mã bảo vệ.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-2.5">
            {conLai.map((t) => (
              <li key={t.id} className="relative">
                {/*
                  CẢ DÒNG là nút "đã đọc" — bấm vào đâu cũng được, dòng biến
                  mất ngay. Studio đọc xong là muốn dẹp nó đi, không phải đi tìm
                  một dấu ✕ bé tí ở góc.

                  Trước đây cả dòng là liên kết tới album. Đổi vì cái studio làm
                  nhiều nhất là ĐỌC RỒI DẸP, chứ không phải mở album ra ngay —
                  ba trong năm thông báo hiện tại là "chưa đặt gói ảnh" cho
                  album của chính studio, đọc xong biết là bỏ qua được.
                */}
                <button
                  type="button"
                  onClick={() => daDoc(t.id)}
                  title="Bấm để đánh dấu đã đọc"
                  className={`block w-full rounded-md border px-3.5 py-3 text-left transition hover:border-accent ${
                    t.mucDo === "gap"
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-bg-soft"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    {/* Chấm màu thay cho chữ "gấp/nên": đọc nhanh hơn, và không
                        chiếm mất chỗ của tên khách trên cột hẹp 340px. */}
                    <span
                      aria-hidden
                      className={`mt-1 size-1.5 shrink-0 rounded-full ${
                        t.mucDo === "gap" ? "bg-accent" : "bg-fg-faint"
                      }`}
                    />
                    <p className="min-w-0 flex-1 text-sm font-medium">
                      {t.tieuDe}
                    </p>
                  </div>
                  {t.tenAlbum && (
                    <p className="mt-1 ml-3.5 truncate text-xs text-fg-muted">
                      {t.tenAlbum}
                    </p>
                  )}
                  <p className="mt-1.5 ml-3.5 pr-16 text-xs leading-relaxed text-fg-muted">
                    {t.chiTiet}
                  </p>
                </button>

                {/*
                  Đường sang album nằm ĐÈ LÊN nút, ở góc dưới bên phải.

                  Phải là hai thẻ anh em chứ không lồng nhau: thẻ `a` nằm trong
                  `button` là HTML sai và trình duyệt xử lý mỗi nơi một kiểu.
                  Đặt tuyệt đối lên trên thì bấm vào nó không chạm tới nút bên
                  dưới, nên "mở album" và "đã đọc" không giẫm chân nhau.
                */}
                {t.slug && (
                  <Link
                    href={`/admin/${t.slug}`}
                    className="absolute right-3 bottom-2.5 rounded px-1.5 py-1 text-xs text-fg-faint underline underline-offset-2 transition hover:text-accent"
                  >
                    mở album
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <p className="mt-3 text-xs text-fg-faint">
            Bấm vào một thông báo để đánh dấu đã đọc.
          </p>
        </>
      )}
    </section>
  );
}
