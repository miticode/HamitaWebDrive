"use client";

import { useState } from "react";

/**
 * Nút "Sao lưu ngay" ở trang quản lý.
 *
 * Tải bản sao lưu database về thẳng máy anh. Vercel có hệ thống tệp chỉ đọc
 * nên máy chủ không giữ lại bản nào — mà giữ ở đó cũng vô nghĩa, bản sao lưu
 * nằm cùng chỗ với thứ nó bảo vệ thì mất là mất cả hai.
 *
 * DÙNG fetch + blob CHỨ KHÔNG PHẢI một thẻ <a> trỏ thẳng vào đường API. Thẻ
 * <a> thì trình duyệt tự tải, nhưng suốt lúc máy chủ đang đọc database sẽ
 * không có gì nhúc nhích trên màn hình — anh tưởng hỏng rồi bấm thêm mấy lần,
 * mỗi lần lại là một lượt đọc cả database. Đi qua fetch thì hiện được "đang
 * sao lưu…", khoá nút lại, và báo lại đã lấy được bao nhiêu dòng.
 */

function docNgay(soNgay: number | null): string {
  if (soNgay === null) return "chưa sao lưu lần nào";
  if (soNgay === 0) return "vừa xong";
  if (soNgay === 1) return "hôm qua";
  return `${soNgay} ngày trước`;
}

export function NutSaoLuu({
  soNgayTruoc: soNgayBanDau,
}: {
  /** Lần sao lưu gần nhất cách đây bao nhiêu ngày. null = chưa lần nào. */
  soNgayTruoc: number | null;
}) {
  const [soNgay, setSoNgay] = useState(soNgayBanDau);
  const [dangChay, setDangChay] = useState(false);
  const [ketQua, setKetQua] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const saoLuu = async () => {
    setDangChay(true);
    setKetQua(null);
    setLoi(null);
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      // fetch không ném lỗi khi máy chủ trả về 4xx/5xx — phải tự kiểm res.ok,
      // bỏ qua là nút báo xong trong khi anh không nhận được tệp nào.
      if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);

      const chu = await res.text();

      /*
        Đọc lại số dòng từ chính tệp vừa nhận, không tin con số máy chủ nói
        riêng: nếu tệp hỏng giữa đường thì phép đọc này hỏng theo và anh biết
        ngay, thay vì cầm một tệp lỗi mà tưởng đã an toàn.
      */
      const ban = JSON.parse(chu) as { soLuong?: Record<string, number> };
      const so = ban.soLuong ?? {};

      // Lấy tên tệp máy chủ đặt, để tên trên máy anh khớp với tên lệnh db:backup tạo.
      const dat = res.headers.get("Content-Disposition") ?? "";
      const tenTep =
        /filename="([^"]+)"/.exec(dat)?.[1] ?? "hamita-sao-luu.json";

      const url = URL.createObjectURL(
        new Blob([chu], { type: "application/json" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = tenTep;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Thu hồi trễ một nhịp, thu hồi ngay thì trình duyệt chưa kịp đọc xong.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setSoNgay(0);
      setKetQua(
        `Đã tải về ${tenTep} · ${so.gallery ?? 0} album · ` +
          `${so.selection ?? 0} lựa chọn`
      );
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không sao lưu được");
    } finally {
      setDangChay(false);
    }
  };

  // Lâu quá rồi thì đổi màu, đừng để nó nằm im như một cái nút trang trí.
  const lauRoi = soNgay === null || soNgay >= 14;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <button
        type="button"
        onClick={saoLuu}
        disabled={dangChay}
        className="btn"
        title="Tải toàn bộ album, danh sách chọn và ghi chú của khách về máy này"
      >
        {dangChay ? "Đang sao lưu…" : "Sao lưu ngay"}
      </button>

      {!ketQua && !loi && (
        <span
          className={`text-xs ${lauRoi ? "text-amber-700" : "text-fg-muted"}`}
        >
          Lần cuối: {docNgay(soNgay)}
        </span>
      )}

      {ketQua && <span className="text-xs text-emerald-700">{ketQua}</span>}
      {loi && <span className="text-xs text-red-700">Hỏng: {loi}</span>}
    </div>
  );
}
