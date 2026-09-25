"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { luuAnhAction, xoaAnhAction } from "./actionsAnh";

/**
 * Ảnh đại diện của chính người đang đăng nhập (anh yêu cầu 25/09/2026) — dùng
 * cho khu "Đội ngũ" trên trang giới thiệu.
 *
 * NÉN NGAY Ở TRÌNH DUYỆT trước khi gửi: ảnh máy ảnh bây giờ 5–10 MB, gửi
 * nguyên lên vừa lâu vừa phình database, mà khung hiện ra chỉ 160px. Canvas
 * cắt vuông giữa ảnh rồi xuất JPEG 320×320, còn chừng 20–40 KB.
 */
export function AnhDaiDien({ nhanVienId, coAnhSan }: { nhanVienId: string; coAnhSan: boolean }) {
  const router = useRouter();
  const oFile = useRef<HTMLInputElement>(null);
  const [dangLam, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [xem, setXem] = useState<string | null>(null);
  const [coAnh, setCoAnh] = useState(coAnhSan);
  /* Đổi ảnh xong phải ép trình duyệt tải lại đúng địa chỉ cũ — tăng số này
     thay vì gọi Date.now() lúc vẽ (vẽ lại là ra số khác, React cấm). */
  const [phienBan, setPhienBan] = useState(0);

  const chon = async (file: File) => {
    setLoi(null);
    if (!file.type.startsWith("image/")) {
      setLoi("Tệp này không phải ảnh.");
      return;
    }
    try {
      const nho = await nenVuong(file, 320);
      setXem(nho);
      batDau(async () => {
        const kq = await luuAnhAction(nho.split(",")[1] ?? "");
        if (kq.loi) {
          setLoi(kq.loi);
          setXem(null);
          return;
        }
        setCoAnh(true);
        setPhienBan((v) => v + 1);
        router.refresh();
      });
    } catch {
      setLoi("Không đọc được ảnh này, anh chị thử tấm khác giúp em.");
    }
  };

  const nguon = xem ?? (coAnh ? `/api/anh-nv/${nhanVienId}?v=${phienBan}` : null);

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="size-20 shrink-0 overflow-hidden rounded-full border border-line bg-bg-soft">
        {nguon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nguon} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-xs text-fg-faint">Chưa có</span>
        )}
      </div>

      <div className="min-w-0">
        <input
          ref={oFile}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void chon(f);
            e.target.value = "";
          }}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={dangLam} onClick={() => oFile.current?.click()} className="btn min-h-10 px-4">
            {dangLam ? "Đang lưu…" : coAnh ? "Đổi ảnh" : "Chọn ảnh"}
          </button>
          {coAnh && (
            <button
              type="button"
              disabled={dangLam}
              onClick={() =>
                batDau(async () => {
                  await xoaAnhAction();
                  setXem(null);
                  setCoAnh(false);
                  router.refresh();
                })
              }
              className="btn min-h-10 px-4 text-red-700"
            >
              Gỡ ảnh
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-fg-faint">
          Ảnh chỉ hiện cho khách khi quản lý bật anh chị lên trang giới thiệu.
        </p>
        {loi && <p className="mt-1 text-xs text-red-700">{loi}</p>}
      </div>
    </div>
  );
}

/**
 * Cắt vuông phần giữa ảnh rồi thu về `canh` pixel, trả về data URL JPEG.
 *
 * Cắt giữa chứ không bóp méo: khung tròn ngoài kia hiện phần giữa, mà mặt
 * người thường nằm ở giữa khung hình.
 */
async function nenVuong(file: File, canh: number): Promise<string> {
  const anh = await new Promise<HTMLImageElement>((ok, hong) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      URL.revokeObjectURL(url);
      ok(im);
    };
    im.onerror = () => {
      URL.revokeObjectURL(url);
      hong(new Error("không đọc được ảnh"));
    };
    im.src = url;
  });

  const nho = Math.min(anh.naturalWidth, anh.naturalHeight);
  const x = (anh.naturalWidth - nho) / 2;
  const y = (anh.naturalHeight - nho) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = canh;
  canvas.height = canh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("không dựng được canvas");
  ctx.drawImage(anh, x, y, nho, nho, 0, 0, canh, canh);
  return canvas.toDataURL("image/jpeg", 0.82);
}
