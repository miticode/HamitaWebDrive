"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setBiaMucAction, setCoverAction } from "./actions";
import { duongDanAnh } from "@/lib/anhXem";

type Photo = { id: string; name: string; album: string };
type Muc = { id: string; ten: string; soAnh: number };

/** Gia tri cua o "dat bia cho" khi dang dat cho CA ALBUM, khong phai thu muc. */
const CA_ALBUM = "ca-album";

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
  biaMuc,
  onClose,
}: {
  galleryId: string;
  folderId: string;
  title: string;
  coverFileId: string | null;
  coverPinned: boolean;
  /** Bia rieng tung thu muc da chon truoc do — de danh dau "Đang dùng". */
  biaMuc: { albumId: string; fileId: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [mucs, setMucs] = useState<Muc[]>([]);
  /*
    Dang dat bia cho cai gi: ca album, hay mot thu muc con cu the.

    Gop hai viec vao MOT hop thay vi lam them mot nut nua tren the album: the
    do da chat, ma hai viec nay giong het nhau tu goc nhin cua studio — "chon
    mot tam lam mat tien". Chi khac o cho no dai dien cho ai.
  */
  const [datCho, setDatCho] = useState<string>(CA_ALBUM);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dangLuu, startLuu] = useTransition();

  /*
    Doi "dat bia cho" thi phai xoa luoi anh cu va bat den "dang tai" — nhung
    lam viec do trong than useEffect thi ESLint cua React 19 chan, va no chan
    dung: mot luot ve lai chay ngay sau luot vua xong.

    Cach React khuyen cho viec "dat lai state khi mot gia tri dau vao doi" la
    so voi luot truoc NGAY TRONG THAN component, giong PhotoGrid dang lam khi
    khach doi bo loc.
  */
  const [datChoTruoc, setDatChoTruoc] = useState(datCho);
  if (datCho !== datChoTruoc) {
    setDatChoTruoc(datCho);
    setPhotos([]);
    setLoading(true);
  }

  /*
    Chi goi may chu va tra ve du lieu — KHONG dong vao state.

    Tach nhu vay vi effect ben duoi dung chung ham nay: neu ham tu doi state thi
    doi do chay dong bo ngay trong than effect, keo theo mot luot ve lai ngay sau
    luot vua xong. De ham thuan tuy thi moi noi goi tu quyet dinh luc nao bat den
    "dang tai", luc nao ghi ket qua.
  */
  const layAnh = useCallback(
    async (offset: number) => {
      /*
        Dat bia cho mot thu muc thi chi lay anh CUA THU MUC DO. Van de nguoi
        dung tu loc trong dong anh cua ca album thi album 1.350 tam se phai bam
        "xem them" hai muoi lan moi toi thu muc cuoi.
      */
      const loc = datCho === CA_ALBUM ? "" : `&muc=${encodeURIComponent(datCho)}`;
      const res = await fetch(
        `/api/admin/photos?folder=${encodeURIComponent(folderId)}&offset=${offset}${loc}`
      );
      const data = (await res.json()) as {
        photos?: Photo[];
        total?: number;
        mucs?: Muc[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? `Lỗi ${res.status}`);
      return {
        photos: data.photos ?? [],
        total: data.total ?? 0,
        mucs: data.mucs ?? [],
      };
    },
    [folderId, datCho]
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
        if (data.mucs.length) setMucs(data.mucs);
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
        const ketQua =
          datCho === CA_ALBUM
            ? await setCoverAction(galleryId, fileId)
            : await setBiaMucAction(galleryId, datCho, fileId);
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

        {/*
          Hang chon "dat bia cho cai gi". Hien ngay ca khi album chi co MOT
          thu muc.

          Ban dau em chan lai o `> 1` voi ly do "mot thu muc thi bia album va
          bia thu muc la mot" — suy luan the la sai, anh phat hien ngay
          28/08/2026. Khach nhin thay CA HAI tren trang bia: anh bia lon o dau
          trang, va the thu muc ngay ben duoi. Hai cho khac nhau, hoan toan co
          the muon hai tam khac nhau — nhat la khi anh bia lon nen la tam dep
          nhat con the thu muc nen la tam noi ro thu muc do chup gi.

          Cuon ngang trong chinh no: album 8 thu muc ten dai thi hang nay rong
          hon ca hop thoai.
        */}
        {mucs.length > 0 && (
          <div className="overflow-x-auto border-b border-line px-5 py-3">
            <div className="flex w-max items-center gap-2">
              <span className="shrink-0 pr-1 text-xs text-fg-muted">Đặt bìa cho</span>
              {[{ id: CA_ALBUM, ten: "Cả album", soAnh: total }, ...mucs].map((m) => {
                const dang = m.id === datCho;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDatCho(m.id)}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs transition ${
                      dang
                        ? "border-transparent bg-fg text-bg"
                        : "border-line-strong bg-bg-raised hover:border-accent"
                    }`}
                  >
                    <span className="max-w-[10rem] truncate">{m.ten}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
              /*
                "Dang dung" phai doi theo o "dat bia cho": dat cho ca album thi
                so voi bia album, dat cho mot thu muc thi so voi bia CUA THU MUC
                DO. Neu cu so voi bia album thi chon bia cho thu muc xong khong
                thay dau gi, tuong minh bam hut.
              */
              const dangDung =
                datCho === CA_ALBUM
                  ? p.id === coverFileId
                  : p.id === biaMuc.find((b) => b.albumId === datCho)?.fileId;
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
                    src={duongDanAnh(p.id, 320)}
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
            {(datCho === CA_ALBUM
              ? coverPinned
              : biaMuc.some((b) => b.albumId === datCho))
              ? "Đang dùng ảnh bìa anh tự chọn"
              : "Đang tự lấy tấm đầu tiên làm bìa"}
          </p>
          {(datCho === CA_ALBUM
            ? coverPinned
            : biaMuc.some((b) => b.albumId === datCho)) && (
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
