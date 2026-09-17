"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { boDau } from "@/lib/constants";
import { NHOM_GIOI_THIEU, coMa, type MucGioiThieu, type NhomGioiThieu } from "@/lib/nhomGioiThieu";
import type { ThuMucGioiThieu } from "@/lib/anhGioiThieu";
import {
  docThuMucAlbumAction,
  themAnhGioiThieuAction,
  xoaAnhGioiThieuAction,
  type ThuMucChon,
} from "../actionsGioiThieu";
import { DoiBiaThuMuc } from "./DoiBiaThuMuc";

type AlbumGon = { id: string; ten: string; bia: string | null; soThuMuc: number; ngayTao: string };
type Muc = MucGioiThieu;

/** Đường dẫn công khai của một mục. Nhóm một mục thì không có đoạn mục. */
function duongMuc(nhom: NhomGioiThieu, muc: Muc) {
  return nhom.muc.length > 1 ? `/dich-vu/${nhom.key}/${muc.key}` : `/dich-vu/${nhom.key}`;
}

export function QuanLyGioiThieu({ albums, daChon }: { albums: AlbumGon[]; daChon: ThuMucGioiThieu[] }) {
  const [nhomKey, setNhomKey] = useState<string>(NHOM_GIOI_THIEU[0].key);
  const nhom = NHOM_GIOI_THIEU.find((n) => n.key === nhomKey) ?? NHOM_GIOI_THIEU[0];
  const [dangMo, setDangMo] = useState<Muc | null>(null);

  return (
    <>
      {/*
        Mỗi nhóm một tab, khớp từng thẻ trong lưới "Hamita chụp gì?" ở trang
        chủ. Số bên cạnh là số thư mục đã chọn — nhìn là biết nhóm nào còn trống.
      */}
      <nav aria-label="Nhóm dịch vụ" className="mt-6 flex flex-wrap gap-2">
        {NHOM_GIOI_THIEU.map((n) => {
          const dang = n.key === nhom.key;
          const so = daChon.filter((d) => d.nhom === n.key).length;
          return (
            <button
              key={n.key}
              type="button"
              aria-pressed={dang}
              onClick={() => setNhomKey(n.key)}
              className={`min-h-10 rounded-full border px-4 text-sm transition ${
                dang
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
              }`}
            >
              {n.ten} <span className="opacity-60">{so}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-6">
        {(nhom.muc as readonly Muc[]).map((m) => {
          const ds = daChon.filter((d) => d.nhom === nhom.key && d.muc === m.key);
          return (
            <section key={m.key} className="card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">{nhom.ten}</p>
                  <h2 className="mt-1 font-display text-2xl">
                    {m.ten}
                    <span className="ml-2 text-base text-fg-muted">{ds.length} thư mục</span>
                  </h2>
                  <p className="mt-1 text-xs text-fg-faint">
                    {m.ma.length ? `Gợi ý album có mã ${m.ma.join(", ")}` : "Chưa có mã riêng — chọn trong mọi album"}
                    {ds.length > 0 && (
                      <>
                        {" · "}
                        <a href={duongMuc(nhom, m)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-accent">
                          xem trang
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <button type="button" onClick={() => setDangMo(m)} className="btn-primary min-h-11 gap-2 px-5">
                  <span aria-hidden className="text-lg leading-none">+</span>
                  Thêm vào trang giới thiệu
                </button>
              </div>

              {ds.length === 0 ? (
                <p className="mt-4 text-sm text-fg-muted">
                  Chưa có thư mục nào — mục này đang ẩn trên trang giới thiệu.
                </p>
              ) : (
                <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {ds.map((d) => (
                    <TheDaChon key={d.id} d={d} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {dangMo && (
        <OChon
          nhom={nhom}
          muc={dangMo}
          albums={albums}
          daChon={daChon.filter((d) => d.nhom === nhom.key && d.muc === dangMo.key)}
          dong={() => setDangMo(null)}
        />
      )}
    </>
  );
}

function TheDaChon({ d }: { d: ThuMucGioiThieu }) {
  const router = useRouter();
  const [dangXoa, start] = useTransition();
  const [moBia, setMoBia] = useState(false);
  return (
    <li className={`overflow-hidden rounded-lg border border-line bg-bg-raised ${dangXoa ? "opacity-50" : ""}`}>
      <div className="skeleton relative aspect-[4/5] bg-bg-soft">
        {d.anhBia && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/img/${d.anhBia}?w=640`} alt="" loading="lazy" className="size-full object-cover" />
        )}
        {/* Cùng kiểu nút "Đổi bìa" đè góc ảnh như thẻ album ở trang quản lý album. */}
        <button
          type="button"
          onClick={() => setMoBia(true)}
          className="absolute top-2 right-2 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/70"
        >
          Đổi bìa
        </button>
      </div>
      {moBia && (
        <DoiBiaThuMuc
          id={d.id}
          driveFolderId={d.driveFolderId}
          albumId={d.albumId}
          ten={`${d.tenAlbum} · ${d.tenMuc}`}
          anhBia={d.anhBia}
          dong={() => setMoBia(false)}
        />
      )}
      <div className="p-3">
        <p className="truncate text-sm font-medium" title={d.tenAlbum}>{d.tenAlbum}</p>
        <p className="truncate text-xs text-fg-muted" title={d.tenMuc}>
          {d.tenMuc} · {d.soAnh} ảnh
        </p>
        <button
          type="button"
          disabled={dangXoa}
          onClick={() =>
            start(async () => {
              await xoaAnhGioiThieuAction(d.id);
              router.refresh();
            })
          }
          className="mt-2 text-xs text-fg-faint underline underline-offset-2 hover:text-red-700"
        >
          {dangXoa ? "Đang gỡ…" : "Gỡ khỏi trang"}
        </button>
      </div>
    </li>
  );
}

/** Khung chọn: danh sách album (lọc theo mã của mục) → bấm album → chọn thư mục con. */
function OChon({
  nhom,
  muc,
  albums,
  daChon,
  dong,
}: {
  nhom: NhomGioiThieu;
  muc: Muc;
  albums: AlbumGon[];
  daChon: ThuMucGioiThieu[];
  dong: () => void;
}) {
  const router = useRouter();
  const [tuKhoa, setTuKhoa] = useState("");
  const [chiTheoMa, setChiTheoMa] = useState(muc.ma.length > 0);
  const [albumMo, setAlbumMo] = useState<AlbumGon | null>(null);
  const [thuMuc, setThuMuc] = useState<ThuMucChon[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLam, start] = useTransition();
  const [vuaThem, setVuaThem] = useState<Set<string>>(new Set());

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", phim);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", phim);
      document.body.style.overflow = cu;
    };
  }, [dong]);

  const ds = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    return albums.filter(
      (a) =>
        (!chiTheoMa || muc.ma.length === 0 || muc.ma.some((ma) => coMa(a.ten, ma))) &&
        (!q || q.split(/\s+/).every((p) => boDau(a.ten).includes(p))),
    );
  }, [albums, chiTheoMa, muc.ma, tuKhoa]);

  const moAlbum = (a: AlbumGon) => {
    setAlbumMo(a);
    setThuMuc(null);
    setLoi(null);
    start(async () => {
      const kq = await docThuMucAlbumAction(a.id);
      if (kq.loi) setLoi(kq.loi);
      else setThuMuc(kq.thuMuc ?? []);
    });
  };

  const daCo = (albumId: string) =>
    !!albumMo &&
    (vuaThem.has(`${albumMo.id}/${albumId}`) ||
      daChon.some((d) => d.galleryId === albumMo.id && d.albumId === albumId));

  const them = (t: ThuMucChon) => {
    if (!albumMo) return;
    setLoi(null);
    start(async () => {
      const kq = await themAnhGioiThieuAction(nhom.key, muc.key, albumMo.id, t.id);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setVuaThem((s) => new Set(s).add(`${albumMo.id}/${t.id}`));
      router.refresh();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thêm vào mục ${muc.ten}`}
      onClick={dong}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden"
      >
        <div className="border-b border-line p-5">
          <button
            type="button"
            onClick={dong}
            aria-label="Đóng"
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
          {albumMo ? (
            <>
              <button type="button" onClick={() => setAlbumMo(null)} className="eyebrow transition hover:text-accent">
                ← Chọn album khác
              </button>
              <h2 className="mt-2 pr-10 font-display text-2xl">{albumMo.ten}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Chọn thư mục đưa lên mục <strong className="font-medium text-fg">{muc.ten}</strong>.
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Thêm vào mục</p>
              <h2 className="mt-1 pr-10 font-display text-2xl">{muc.ten}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  value={tuKhoa}
                  onChange={(e) => setTuKhoa(e.target.value)}
                  placeholder="Tìm tên album…"
                  aria-label="Tìm album"
                  className="input min-w-0 flex-1"
                  autoFocus
                />
                {muc.ma.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-fg-muted">
                    <input type="checkbox" checked={chiTheoMa} onChange={(e) => setChiTheoMa(e.target.checked)} />
                    Chỉ album mã {muc.ma.join(", ")}
                  </label>
                )}
              </div>
            </>
          )}
          {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {albumMo ? (
            thuMuc === null ? (
              <p className="text-sm text-fg-muted">{dangLam ? "Đang đọc thư mục trên Drive…" : ""}</p>
            ) : thuMuc.length === 0 ? (
              <p className="text-sm text-fg-muted">Album này chưa có thư mục nào có ảnh.</p>
            ) : (
              <ul className="divide-y divide-line">
                {thuMuc.map((t) => {
                  const co = daCo(t.id);
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{t.ten}</span>
                        <span className="text-xs text-fg-muted">{t.soAnh} ảnh</span>
                      </span>
                      {co ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                          ✓ Đã đưa lên
                        </span>
                      ) : (
                        <button type="button" disabled={dangLam} onClick={() => them(t)} className="btn shrink-0">
                          Đưa lên
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )
          ) : ds.length === 0 ? (
            <p className="text-sm text-fg-muted">
              {muc.ma.length > 0 && chiTheoMa
                ? `Không có album nào mang mã ${muc.ma.join(", ")}. Bỏ tích "Chỉ album mã ${muc.ma.join(", ")}" để chọn trong mọi album.`
                : "Không tìm thấy album nào."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ds.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => moAlbum(a)}
                    className="group block w-full overflow-hidden rounded-lg border border-line bg-bg-raised text-left transition hover:border-accent"
                  >
                    <span className="skeleton block aspect-[3/2] bg-bg-soft">
                      {a.bia && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/img/${a.bia}?w=320`} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="block p-2.5">
                      <span className="block truncate text-sm font-medium group-hover:text-accent" title={a.ten}>
                        {a.ten}
                      </span>
                      <span className="text-xs text-fg-muted">{a.soThuMuc} thư mục</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
