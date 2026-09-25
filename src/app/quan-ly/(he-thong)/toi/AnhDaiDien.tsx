"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { luuAnhAction, luuGioiThieuAction, xoaAnhAction } from "./actionsAnh";
import { CatAnh } from "./CatAnh";

/**
 * Ảnh đại diện và dòng tự giới thiệu của chính người đang đăng nhập — dùng
 * cho khu "Đội ngũ" trên trang giới thiệu (anh yêu cầu 25/09/2026).
 *
 * Chọn ảnh xong KHÔNG lưu ngay mà mở khung cắt: ảnh chụp người ít khi đứng
 * giữa khung, cắt cứng phần giữa là mất nửa cái đầu. Ảnh chỉ thu nhỏ và gửi
 * lên sau khi người ta ưng bố cục — nhờ vậy ảnh máy ảnh 8 MB cũng chỉ còn
 * vài chục KB đi qua mạng.
 */
export function AnhDaiDien({
  nhanVienId,
  anhLuc,
  gioiThieuSan,
}: {
  nhanVienId: string;
  /** Lúc ảnh được cập nhật (mili giây), null = chưa có ảnh. */
  anhLuc: number | null;
  gioiThieuSan: string;
}) {
  const router = useRouter();
  const oFile = useRef<HTMLInputElement>(null);
  const [dangLam, batDau] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);
  const [dangCat, setDangCat] = useState<File | null>(null);
  const [luc, setLuc] = useState<number | null>(anhLuc);

  const [gioiThieu, setGioiThieu] = useState(gioiThieuSan);
  const [baoChu, setBaoChu] = useState<string | null>(null);

  const luuAnh = (base64: string) => {
    setLoi(null);
    batDau(async () => {
      const kq = await luuAnhAction(base64);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setDangCat(null);
      setLuc(Date.now());
      router.refresh();
    });
  };

  const luuChuNeuDoi = () => {
    if (gioiThieu.trim() === gioiThieuSan.trim()) return;
    batDau(async () => {
      const kq = await luuGioiThieuAction(gioiThieu);
      setBaoChu(kq.loi ?? "Đã lưu ✓");
      setTimeout(() => setBaoChu(null), 2400);
      if (!kq.loi) router.refresh();
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-full border border-line bg-bg-soft">
          {luc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/anh-nv/${nhanVienId}?v=${luc}`} alt="" className="size-full object-cover" />
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
              e.target.value = "";
              if (!f) return;
              if (!f.type.startsWith("image/")) {
                setLoi("Tệp này không phải ảnh.");
                return;
              }
              setLoi(null);
              setDangCat(f);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={dangLam} onClick={() => oFile.current?.click()} className="btn min-h-10 px-4">
              {luc ? "Đổi ảnh" : "Chọn ảnh"}
            </button>
            {luc && (
              <button
                type="button"
                disabled={dangLam}
                onClick={() =>
                  batDau(async () => {
                    await xoaAnhAction();
                    setDangCat(null);
                    setLuc(null);
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

      {dangCat && (
        <CatAnh file={dangCat} dangLuu={dangLam} onXong={luuAnh} onThoi={() => setDangCat(null)} />
      )}

      <label className="block">
        <span className="eyebrow block">Một dòng giới thiệu</span>
        <input
          value={gioiThieu}
          onChange={(e) => setGioiThieu(e.target.value)}
          onBlur={luuChuNeuDoi}
          maxLength={120}
          placeholder="ví dụ: chụp ngày cưới, mê ảnh ngoài trời"
          className="input mt-1 text-sm"
        />
        <span className="mt-1 block text-xs text-fg-faint">
          Hiện dưới tên anh chị ở khu Đội ngũ. Gõ xong bấm ra ngoài ô là web tự lưu.
        </span>
        {baoChu && <span className="mt-1 block text-xs text-accent">{baoChu}</span>}
      </label>
    </div>
  );
}
