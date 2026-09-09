"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { setGoiAnhAction } from "./actions";

/**
 * Số ảnh in đã bao gồm trong gói khách mua.
 *
 * Hiện ở phần hướng dẫn chọn ảnh phía khách, bước "thả tim ảnh muốn in". Mỗi
 * gói mỗi khác nên phải đặt riêng từng album; để trống thì phần hướng dẫn bỏ
 * hẳn đoạn giá cả, chỉ nói cách chọn — hợp với album studio không tính theo gói.
 *
 * Giá mỗi tấm vượt gói KHÔNG sửa ở đây: đó là con số cố định của studio, giống
 * nhau ở mọi gói. Cho sửa riêng từng album chỉ thêm một ô để gõ nhầm mà không
 * được lợi gì — muốn đổi giá thì sửa GIA_ANH_THEM_MAC_DINH trong constants.ts,
 * một chỗ đổi là cả hệ thống đổi theo.
 */
export function GoiAnh({
  galleryId,
  soAnhTrongGoi,
  giaAnhThem,
}: {
  galleryId: string;
  soAnhTrongGoi: number | null;
  /** Chỉ để hiển thị — ô này không sửa được giá. */
  giaAnhThem: number;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [soAnh, setSoAnh] = useState(soAnhTrongGoi?.toString() ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setGoiAnhAction(galleryId, soAnh);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      setLoi(null);
      router.refresh();
    });

  const huy = () => {
    setMo(false);
    setLoi(null);
    setSoAnh(soAnhTrongGoi?.toString() ?? "");
  };

  if (!mo) {
    return (
      <div className="flex items-baseline gap-2 py-2 text-xs">
        <span className="w-24 shrink-0 text-fg-muted">Gói ảnh</span>
        {/*
          Cho chữ XUỐNG DÒNG, bỏ hẳn `truncate`.

          Ô này chỉ rộng 150px trong thẻ album — đo thật — nên cả hai dòng đều
          không vừa, và cắt đi thì mất đúng phần quan trọng:

          - Chưa đặt: "chưa đặt — không nói giá với khách" cụt thành "chưa đặt —
            không nó…", mất vế nói rõ hậu quả. Studio đọc dòng đó rồi vẫn đi tìm
            khối gói ảnh trên điện thoại khách, không hiểu vì sao không thấy
            (03/09/2026). Câu cũng viết lại cho nói thẳng vào thứ nhìn thấy được.
          - Đã đặt: "33 ảnh · thêm 12.000đ/ảnh" cụt mất đuôi giá. Cắt cụt một
            con số tiền là chuyện không nên làm, dù đọc lướt vẫn đoán ra.

          Đổi lại thẻ album cao thêm một dòng. Đáng — thẻ này vốn đã dài, thêm
          16px không đổi gì, còn đọc nhầm giá thì đổi.
        */}
        <span
          className={`min-w-0 flex-1 leading-relaxed ${
            soAnhTrongGoi === null ? "text-fg-faint" : ""
          }`}
        >
          {/*
            BA trạng thái, không phải hai. Phải so với null chứ không dùng
            `soAnhTrongGoi ? …` như trước: số 0 cũng là giá trị "sai" trong
            JavaScript nên gói 0 tấm sẽ bị đọc nhầm thành chưa đặt.
          */}
          {soAnhTrongGoi === null ? (
            "chưa đặt — khách không thấy khối gói ảnh"
          ) : soAnhTrongGoi === 0 ? (
            <>
              <b>chỉ lấy file</b> · in thêm {tien(giaAnhThem)}đ/ảnh
            </>
          ) : (
            <>
              <b>{soAnhTrongGoi}</b> ảnh · thêm {tien(giaAnhThem)}đ/ảnh
            </>
          )}
        </span>
        <button
          type="button"
          onClick={() => setMo(true)}
          className="shrink-0 text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          sửa
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-line-strong bg-bg-soft p-3">
      <label className="eyebrow block">Số ảnh in có sẵn trong gói</label>
      <input
        type="number"
        min={0}
        value={soAnh}
        autoFocus
        onChange={(e) => setSoAnh(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") luu();
          if (e.key === "Escape") huy();
        }}
        placeholder="0 = chỉ lấy file · để trống = không tính theo gói"
        className="input mt-1.5"
      />

      {/*
        Cho xem trước ĐÚNG câu khách sẽ đọc, theo cả ba trạng thái.

        So bằng chuỗi rỗng chứ không viết `soAnh ? …`: gõ "0" vào ô thì `soAnh`
        là chuỗi "0" — vẫn là chuỗi có nội dung nên nhánh này chạy đúng, nhưng
        nếu ai đó đổi sang so với số thì 0 sẽ rơi nhầm sang nhánh "để trống".
        Ba trạng thái viết rõ ba nhánh cho khỏi vấp.
      */}
      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        {soAnh.trim() === ""
          ? "Để trống thì phần hướng dẫn cho khách bỏ hẳn đoạn giá cả, chỉ nói cách chọn ảnh."
          : soAnh.trim() === "0"
            ? `Khách sẽ đọc: "Gói của anh chị là gói chỉ lấy file ảnh, không kèm ảnh in. Tấm nào anh chị muốn Hamita in ra thì mỗi tấm ${tien(giaAnhThem)}đ, đã gồm cả chỉnh sửa và in ạ."`
            : `Khách sẽ đọc 3 dòng: "Gói của anh chị cần tim ${soAnh} tấm." · "Ghi chú vào ảnh: ảnh cổng, ảnh bàn, ảnh bìa,…" · "Chi phí phát sinh thêm trên mỗi tấm ảnh là ${tien(giaAnhThem)}đ đã gồm chỉnh sửa và in ạ."`}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
        Giá ảnh thêm cố định {tien(giaAnhThem)}đ/ảnh cho mọi gói. Muốn đổi giá
        thì báo em sửa trong mã nguồn, đổi một lần áp dụng cho tất cả album.
      </p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={huy} className="btn">
          Huỷ
        </button>
      </div>
    </div>
  );
}
