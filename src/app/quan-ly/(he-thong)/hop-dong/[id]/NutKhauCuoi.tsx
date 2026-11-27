"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GIAO_KHACH_HIEN_O, NHAN_HINH_HIEN_O } from "@/lib/buocAnhGoc";
import { xacNhanKhauCuoiAction } from "../../../actionsHopDong";

/**
 * Hai nút của HAI KHÂU CUỐI — anh yêu cầu 27/11/2026 sau bản rà soát nghiệp vụ.
 *
 * Bản rà soát chỉ ra: trong mười bốn mối nối của hệ mười tám bước, năm cái
 * không có đường nào đẩy. Bốn trong số đó nằm ở hai khâu cuối, và hậu quả đo
 * được là 21 hợp đồng đứng ở bước 8 cùng 7 cái ở bước 17 — hình in đã về tiệm
 * mà hệ thống không có cách nào nói đã giao khách chưa.
 *
 * VÌ SAO LÀ NÚT CHỨ KHÔNG TỰ NHẢY: hai việc này xảy ra NGOÀI WEB. "Hình in về
 * tới tiệm" là một thùng hàng xưởng giao; "đã giao hình cho khách" là lúc
 * khách tới tiệm nhận. Không dấu nào trong database suy ra được, nên tự động
 * hoá chỉ còn cách đoán theo thời gian — mà đoán sai ở đây là báo hợp đồng
 * hoàn thành trong khi khách còn chưa cầm hình.
 *
 * MỘT NÚT, ĐỔI CHỮ THEO BƯỚC, không phải hai nút cạnh nhau: hai việc loại trừ
 * nhau theo bước, ở bước 7 thì "đã giao khách" vô nghĩa và ngược lại. Bày cả
 * hai là mời người ta bấm nhầm đúng vào hai bước cuối.
 *
 * KHÔNG CÓ HỘP HỎI LẠI, cùng lẽ với nút "Đã gửi file gốc": nút này không chạm
 * tới khách, và bước đổi sai thì mở ô trạng thái sửa lại được. Hộp hỏi lại chỉ
 * dành cho thứ không rút lại được, như gửi thông báo.
 *
 * Trang hợp đồng quyết có hiện nút hay không — xem `NHAN_HINH_HIEN_O` và
 * `GIAO_KHACH_HIEN_O`. Hỏi chính hai hằng số ấy chứ không chép lại danh sách
 * bước, để nút và máy chủ không bao giờ lệch nhau.
 */
export function NutKhauCuoi({ hopDongId, buoc }: { hopDongId: string; buoc: number | null }) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [xong, setXong] = useState<string | null>(null);
  const [dangChay, start] = useTransition();

  const laNhanHinh = buoc !== null && (NHAN_HINH_HIEN_O as readonly number[]).includes(buoc);
  const laGiaoKhach = buoc !== null && (GIAO_KHACH_HIEN_O as readonly number[]).includes(buoc);
  if (!laNhanHinh && !laGiaoKhach) return null;

  const viec = laNhanHinh ? "nhan-hinh" : "giao-khach";

  const bam = () =>
    start(async () => {
      setLoi(null);
      const kq = await xacNhanKhauCuoiAction(hopDongId, viec);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setXong(`Hợp đồng chuyển sang “${kq.den}”`);
      router.refresh();
    });

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={bam}
        disabled={dangChay}
        className="btn"
        title={
          laNhanHinh
            ? "Xưởng đã giao hình in về tiệm. Bấm đây để chuyển hợp đồng sang bước “Đã nhận hình in”."
            : "Khách đã nhận hình. Bấm đây để chuyển hợp đồng sang bước “Hoàn thành”."
        }
      >
        {dangChay ? "Đang ghi…" : laNhanHinh ? "Đã nhận hình in về tiệm" : "Đã giao hình cho khách"}
      </button>

      {/* Báo kết quả ngay cạnh nút — làm xong mà im lặng thì lần sau không ai dám bấm. */}
      {xong && <span className="self-center text-xs text-emerald-700">{xong}</span>}
      {loi && <span className="self-center text-xs text-red-700">{loi}</span>}
    </div>
  );
}
