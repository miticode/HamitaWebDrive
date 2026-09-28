"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { doiBiaGioiThieuAction } from "../actionsGioiThieu";
import { duongDanAnh } from "@/lib/anhXem";

type Photo = { id: string; name: string };

/**
 * Chọn ảnh bìa cho một thư mục trên trang Ảnh cưới (anh yêu cầu 17/09/2026).
 *
 * Chỉ liệt kê ảnh CỦA THƯ MỤC ĐÓ, qua cùng đường /api/admin/photos mà ô chọn
 * bìa album đang dùng (lọc bằng ?muc=), 60 tấm mỗi đợt — thư mục file gốc cả
 * nghìn tấm mà đổ ra một lúc thì trình duyệt đứng hình.
 */
export function DoiBiaThuMuc({
  id,
  driveFolderId,
  albumId,
  ten,
  anhBia,
  dong,
}: {
  id: string;
  driveFolderId: string;
  albumId: string;
  ten: string;
  anhBia: string | null;
  dong: () => void;
}) {
  const router = useRouter();
  const [anh, setAnh] = useState<Photo[]>([]);
  const [tong, setTong] = useState(0);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, startLuu] = useTransition();

  /* Thuần tuý: chỉ gọi máy chủ và trả dữ liệu, không đụng state (xem CoverPicker). */
  const layAnh = async (offset: number) => {
    const res = await fetch(
      `/api/admin/photos?folder=${encodeURIComponent(driveFolderId)}&muc=${encodeURIComponent(albumId)}&offset=${offset}`,
    );
    const data = (await res.json()) as { photos?: Photo[]; total?: number; error?: string };
    if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
    return { photos: data.photos ?? [], total: data.total ?? 0 };
  };

  useEffect(() => {
    let huy = false;
    fetch(
      `/api/admin/photos?folder=${encodeURIComponent(driveFolderId)}&muc=${encodeURIComponent(albumId)}&offset=0`,
    )
      .then(async (res) => {
        const data = (await res.json()) as { photos?: Photo[]; total?: number; error?: string };
        if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
        if (huy) return;
        setAnh(data.photos ?? []);
        setTong(data.total ?? 0);
      })
      .catch((e: unknown) => {
        if (!huy) setLoi(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!huy) setDangTai(false);
      });
    return () => {
      huy = true;
    };
  }, [driveFolderId, albumId]);

  useEffect(() => {
    const phim = (e: KeyboardEvent) => e.key === "Escape" && dong();
    window.addEventListener("keydown", phim);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", phim);
      document.body.style.overflow = cu;
    };
  }, [dong]);

  const xemThem = async () => {
    setDangTai(true);
    try {
      const kq = await layAnh(anh.length);
      setAnh((cu) => [...cu, ...kq.photos]);
    } catch (e) {
      setLoi(e instanceof Error ? e.message : String(e));
    } finally {
      setDangTai(false);
    }
  };

  // Kiểm kết quả trước khi đóng: máy chủ từ chối mà vẫn đóng thì studio tưởng đã đổi.
  const chon = (fileId: string) =>
    startLuu(async () => {
      setLoi(null);
      const kq = await doiBiaGioiThieuAction(id, fileId);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      router.refresh();
      dong();
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Đổi ảnh bìa — ${ten}`}
      onClick={dong}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90svh] w-full max-w-3xl flex-col rounded-t-lg bg-bg shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Đổi ảnh bìa</p>
            <p className="truncate font-display text-xl" title={ten}>{ten}</p>
          </div>
          <button
            type="button"
            onClick={dong}
            aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loi && <p className="mb-3 text-sm text-red-700">{loi}</p>}
          {anh.length === 0 && dangTai && <p className="text-sm text-fg-muted">Đang tải ảnh trong thư mục…</p>}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {anh.map((p) => {
              const dangDung = p.id === anhBia;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={dangLuu}
                    onClick={() => chon(p.id)}
                    title={p.name}
                    className={`skeleton relative block aspect-square w-full overflow-hidden rounded-md outline-offset-2 transition hover:opacity-85 ${
                      dangDung ? "outline-2 outline-accent" : ""
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={duongDanAnh(p.id, 320)} alt={p.name} loading="lazy" className="size-full object-cover" />
                    {dangDung && (
                      <span className="absolute inset-x-1 bottom-1 rounded bg-black/60 px-1.5 py-0.5 text-center text-[11px] text-white">
                        Đang dùng
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {anh.length > 0 && anh.length < tong && (
            <div className="mt-4 text-center">
              <button type="button" onClick={xemThem} disabled={dangTai} className="btn">
                {dangTai ? "Đang tải…" : `Xem thêm (${anh.length}/${tong})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
