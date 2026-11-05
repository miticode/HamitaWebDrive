"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { goCanSuaAction } from "./actions";

/**
 * Mục trong bảng "…" của thẻ album: Media sửa xong một thư mục thì bấm đây để
 * gỡ nhãn "Khách cần chỉnh lại".
 *
 * Anh chốt 08/10/2026 rằng studio tự bấm dẹp chứ không đợi khách bấm "đã ok":
 * Media sửa xong là đang up ảnh mới lên Drive ngay lúc đó, nên họ ở sẵn trước
 * máy và dẹp được liền — còn chờ khách vào bấm thì có nhà quên, và cái nhãn
 * vàng nằm lại mãi trên thẻ.
 *
 * MỖI THƯ MỤC MỘT MỤC RIÊNG, có tên thư mục trong nhãn: một nhà có thể vừa
 * nhờ sửa "file hoàn thiện HC" vừa nhờ sửa "file hoàn thiện AB", mà Media
 * thường chỉ xong một cái trước. Gộp thành một nút "đã sửa xong tất cả" là
 * bắt họ gỡ cả cái chưa làm.
 *
 * Không có bước hỏi lại: bấm nhầm thì khách báo lại được, và đây là việc
 * studio làm mỗi lần sửa xong nên một bước hỏi chỉ làm chậm (cùng lý do với
 * nút "Tải ảnh" ở nguyên tắc 60).
 */
export function NutDaSuaXong({
  galleryId,
  albumId,
  tenMuc,
  nhieuThuMuc,
}: {
  galleryId: string;
  albumId: string;
  tenMuc: string;
  /** Album nhiều thư mục thì nhãn phải kèm tên, không thì nói trống cũng đủ. */
  nhieuThuMuc: boolean;
}) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dangChay, start] = useTransition();

  const bam = () =>
    start(async () => {
      setLoi(null);
      const kq = await goCanSuaAction(galleryId, albumId, tenMuc);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={bam}
        disabled={dangChay}
        className="muc-menu"
        title={`Gỡ nhãn “Khách cần chỉnh lại” của thư mục “${tenMuc}”. Bấm sau khi Media đã sửa và up ảnh mới lên Drive.`}
      >
        {dangChay
          ? "Đang gỡ…"
          : nhieuThuMuc
            ? `Đã sửa xong · ${tenMuc}`
            : "Đã sửa xong"}
      </button>
      {loi && <span className="block px-3 py-1 text-xs text-red-700">{loi}</span>}
    </>
  );
}
