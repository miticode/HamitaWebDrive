"use client";

import { useState } from "react";

/**
 * Sao lưu ở trang quản lý — hai đường:
 *
 * 1. "Sao lưu lên Drive ngay": chạy đúng việc mà lịch tự động làm mỗi đêm 3
 *    giờ (src/app/api/cron/sao-luu). Dùng để thử ngay sau khi kết nối lại
 *    Google, và để chắc chắn trước một thao tác lớn.
 * 2. "Tải về máy": bản JSON về thẳng máy anh, như trước.
 *
 * Tải về đi qua fetch + blob chứ không phải một thẻ <a> trỏ thẳng vào đường
 * API: thẻ <a> thì suốt lúc máy chủ đang đọc database không có gì nhúc nhích
 * trên màn hình — anh tưởng hỏng rồi bấm thêm mấy lần, mỗi lần lại là một
 * lượt đọc cả database.
 */

function docNgay(soNgay: number | null): string {
  if (soNgay === null) return "chưa lần nào";
  if (soNgay === 0) return "hôm nay";
  if (soNgay === 1) return "hôm qua";
  return `${soNgay} ngày trước`;
}

export function NutSaoLuu({
  soNgayTruoc: soNgayBanDau,
  tuDongCachDay: tuDongBanDau,
}: {
  /** Lần sao lưu gần nhất (bất kỳ đường nào) cách đây bao nhiêu ngày. null = chưa lần nào. */
  soNgayTruoc: number | null;
  /** Lần sao lưu lên Drive gần nhất. null = chưa lần nào. */
  tuDongCachDay: number | null;
}) {
  const [soNgay, setSoNgay] = useState(soNgayBanDau);
  const [tuDong, setTuDong] = useState(tuDongBanDau);
  const [dangChay, setDangChay] = useState<"drive" | "may" | null>(null);
  const [ketQua, setKetQua] = useState<string | null>(null);
  const [loi, setLoi] = useState<{ chu: string; canKetNoiLai: boolean } | null>(null);

  const batDau = (loai: "drive" | "may") => {
    setDangChay(loai);
    setKetQua(null);
    setLoi(null);
  };

  const lenDrive = async () => {
    batDau("drive");
    try {
      const res = await fetch("/api/cron/sao-luu", { cache: "no-store" });
      const kq = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        tenTep?: string;
        kb?: number;
        soLuong?: Record<string, number>;
        error?: string;
        canKetNoiLai?: boolean;
      };
      if (!res.ok || !kq.ok) {
        setLoi({ chu: kq.error ?? `Máy chủ trả về ${res.status}`, canKetNoiLai: !!kq.canKetNoiLai });
        return;
      }
      setSoNgay(0);
      setTuDong(0);
      setKetQua(
        `Đã lên Drive: ${kq.tenTep} · ${kq.kb} KB · ${kq.soLuong?.gallery ?? 0} album · ` +
          `${kq.soLuong?.nhanVien ?? 0} nhân viên`,
      );
    } catch (e) {
      setLoi({ chu: e instanceof Error ? e.message : "Không sao lưu được", canKetNoiLai: false });
    } finally {
      setDangChay(null);
    }
  };

  const veMay = async () => {
    batDau("may");
    try {
      const res = await fetch("/api/admin/backup", { cache: "no-store" });
      // fetch không ném lỗi khi máy chủ trả về 4xx/5xx — phải tự kiểm res.ok,
      // bỏ qua là nút báo xong trong khi anh không nhận được tệp nào.
      if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
      const chu = await res.text();

      /*
        Đọc lại số dòng từ chính tệp vừa nhận, không tin con số máy chủ nói
        riêng: tệp hỏng giữa đường thì phép đọc này hỏng theo và anh biết ngay.
      */
      const so = (JSON.parse(chu) as { soLuong?: Record<string, number> }).soLuong ?? {};
      const tenTep =
        /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ??
        "hamita-sao-luu.json";

      const url = URL.createObjectURL(new Blob([chu], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = tenTep;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Thu hồi trễ một nhịp, thu hồi ngay thì trình duyệt chưa kịp đọc xong.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      setSoNgay(0);
      setKetQua(`Đã tải về ${tenTep} · ${so.gallery ?? 0} album · ${so.selection ?? 0} lựa chọn`);
    } catch (e) {
      setLoi({ chu: e instanceof Error ? e.message : "Không sao lưu được", canKetNoiLai: false });
    } finally {
      setDangChay(null);
    }
  };

  /*
    Bản tự động quá hai ngày chưa có là lịch chạy đêm đang hỏng — tô cảnh báo.
    Chưa lần nào thì cũng cảnh báo: gần như chắc chắn là chưa cấp quyền ghi.
  */
  const tuDongHong = tuDong === null || tuDong >= 2;

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <button
          type="button"
          onClick={lenDrive}
          disabled={dangChay !== null}
          className="btn"
          title="Chụp toàn bộ database, cất vào thư mục “Hamita – Sao lưu tự động” trên Google Drive"
        >
          {dangChay === "drive" ? "Đang sao lưu…" : "Sao lưu lên Drive ngay"}
        </button>
        <button
          type="button"
          onClick={veMay}
          disabled={dangChay !== null}
          className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
        >
          {dangChay === "may" ? "Đang tải…" : "Tải về máy"}
        </button>
      </div>

      {ketQua && <span className="text-xs text-emerald-700">{ketQua}</span>}

      {loi && (
        <span className="max-w-sm text-xs text-red-700">
          Hỏng: {loi.chu}
          {loi.canKetNoiLai && (
            <>
              {" "}
              <a href="/api/google/connect" className="font-medium underline underline-offset-2">
                Kết nối lại Google
              </a>
            </>
          )}
        </span>
      )}

      {!ketQua && !loi && (
        <span className={`text-xs ${tuDongHong ? "text-amber-700" : "text-fg-muted"}`}>
          Tự động mỗi đêm 3 giờ · lên Drive: {docNgay(tuDong)}
          {soNgay !== tuDong && ` · tải về máy: ${docNgay(soNgay)}`}
        </span>
      )}
    </div>
  );
}
