"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCoverAction } from "./actions";

type Photo = { id: string; name: string; album: string };

/**
 * Chọn ảnh bìa cho album.
 *
 * Ảnh lấy từ chính album đó, tải theo từng đợt 60 tấm — một album 2000 ảnh mà
 * đổ hết ra một lúc thì trình duyệt đứng hình.
 */
export function CoverPicker({
  galleryId,
  folderId,
  title,
  coverFileId,
  coverPinned,
  onClose,
}: {
  galleryId: string;
  folderId: string;
  title: string;
  coverFileId: string | null;
  coverPinned: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dangLuu, startLuu] = useTransition();

  /*
    Chi goi may chu va tra ve du lieu — KHONG dong vao state.

    Tach nhu vay vi effect ben duoi dung chung ham nay: neu ham tu doi state thi
    doi do chay dong bo ngay trong than effect, keo theo mot luot ve lai ngay sau
    luot vua xong. De ham thuan tuy thi moi noi goi tu quyet dinh luc nao bat den
    "dang tai", luc nao ghi ket qua.
  */
  const layAnh = useCallback(
    async (offset: number) => {
      const res = await fetch(
        `/api/admin/photos?folder=${encodeURIComponent(folderId)}&offset=${offset}`
      );
      const data = (await res.json()) as {
        photos?: Photo[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
      return { photos: data.photos ?? [], total: data.total ?? 0 };
    },
    [folderId]
  );

  useEffect(() => {
    // Co huy: anh dong hop thoai giua chung thi khong ghi ket qua vao mot
    // component da go khoi man hinh nua.
    let huy = false;

    layAnh(0)
      .then((data) => {
        if (huy) return;
        setTotal(data.total);
        setPhotos(data.photos);
      })
      .catch((err: unknown) => {
        if (!huy) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!huy) setLoading(false);
      });

    return () => {
      huy = true;
    };
  }, [layAnh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = cu;
    };
  }, [onClose]);

  /*
    Phải kiểm tra kết quả trả về. Nếu cứ đóng hộp thoại sau khi gọi, thì lúc
    server lỗi người dùng vẫn tưởng đã đổi xong — mở lại mới thấy ảnh bìa cũ
    mà không hiểu vì sao.
  */
  const chon = (fileId: string | null) =>
    startLuu(async () => {
      try {
        const ketQua = await setCoverAction(galleryId, fileId);
        if (ketQua?.error) {
          setError(ketQua.error);
          return;
        }
        router.refresh();
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Không lưu được ảnh bìa, thử lại giúp em."
        );
      }
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90svh] w-full max-w-3xl flex-col rounded-t-lg bg-bg shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="eyebrow">Chọn ảnh bìa</p>
            <p className="truncate font-display text-xl">{title}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="notice mb-3 bg-red-50 text-red-700">{error}</p>
          )}

          {photos.length === 0 && loading && (
            <p className="py-10 text-center text-sm text-fg-muted">Đang đọc ảnh…</p>
          )}

          {photos.length === 0 && !loading && !error && (
            <p className="py-10 text-center text-sm text-fg-muted">
              Album này chưa có ảnh nào.
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((p) => {
              const dangDung = p.id === coverFileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={dangLuu}
                  onClick={() => chon(p.id)}
                  title={`${p.name} · ${p.album}`}
                  className={`skeleton relative aspect-square overflow-hidden rounded-sm transition disabled:opacity-50 ${
                    dangDung ? "ring-2 ring-accent ring-offset-2" : "hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/img/${p.id}?w=320`}
                    alt={p.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  {dangDung && (
                    <span className="absolute inset-x-0 bottom-0 bg-accent py-0.5 text-[10px] tracking-wider text-white uppercase">
                      Đang dùng
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {photos.length < total && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  layAnh(photos.length)
                    .then((data) => {
                      setTotal(data.total);
                      setPhotos((cu) => [...cu, ...data.photos]);
                    })
                    .catch((err: unknown) => {
                      setError(err instanceof Error ? err.message : String(err));
                    })
                    .finally(() => setLoading(false));
                }}
                className="btn"
              >
                {loading ? "Đang tải…" : `Xem thêm (${photos.length}/${total})`}
              </button>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-xs text-fg-faint">
            {coverPinned
              ? "Đang dùng ảnh bìa anh tự chọn"
              : "Đang tự lấy tấm đầu tiên làm bìa"}
          </p>
          {coverPinned && (
            <button
              type="button"
              disabled={dangLuu}
              onClick={() => chon(null)}
              className="btn"
            >
              Trở lại tự động
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
