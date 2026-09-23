"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { boDau } from "@/lib/constants";
import { NHOM_GIOI_THIEU, coMa, type MucGioiThieu, type NhomGioiThieu } from "@/lib/nhomGioiThieu";
import type { ThuMucGioiThieu } from "@/lib/anhGioiThieu";
import {
  datTenCanhAction,
  docLaiCanhAction,
  docThuMucAlbumAction,
  doiThuTuCanhAction,
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
                <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {ds.map((d, i) => (
                    <TheDaChon
                      key={d.id}
                      d={d}
                      dauDanh={i === 0}
                      cuoiDanh={i === ds.length - 1}
                    />
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

/**
 * Một cảnh đã đưa lên trang: ảnh bìa, tên hiện cho khách, một dòng mô tả, và
 * mấy nút để studio tự lo về sau — anh yêu cầu 23/09/2026 cho Hamita Garden,
 * nơi mỗi thư mục trên Drive là một cảnh chụp.
 *
 * Tên và mô tả lưu khi RỜI Ô (blur), không có nút "Lưu": lưới này có cả chục
 * thẻ, mỗi thẻ một nút lưu thì không ai bấm đúng thẻ. Gõ xong bấm ra ngoài là
 * xong, và dòng "Đã lưu ✓" nói cho biết nó đã xong thật.
 */
function TheDaChon({ d, dauDanh, cuoiDanh }: { d: ThuMucGioiThieu; dauDanh: boolean; cuoiDanh: boolean }) {
  const router = useRouter();
  const [dangXoa, start] = useTransition();
  const [dangLuu, luuBatDau] = useTransition();
  const [moBia, setMoBia] = useState(false);
  const [ten, setTen] = useState(d.tenHien ?? "");
  const [moTa, setMoTa] = useState(d.moTa ?? "");
  const [bao, setBao] = useState<string | null>(null);

  /* Chỉ gọi máy chủ khi thật sự có gì đổi — rời ô mà không sửa gì thì thôi. */
  const luuNeuDoi = () => {
    if (ten === (d.tenHien ?? "") && moTa === (d.moTa ?? "")) return;
    luuBatDau(async () => {
      const kq = await datTenCanhAction(d.id, ten, moTa);
      setBao(kq.loi ?? "Đã lưu ✓");
      setTimeout(() => setBao(null), 2200);
      if (!kq.loi) router.refresh();
    });
  };

  const chay = (viec: () => Promise<{ loi?: string }>) =>
    luuBatDau(async () => {
      const kq = await viec();
      setBao(kq.loi ?? null);
      if (kq.loi) setTimeout(() => setBao(null), 2600);
      else router.refresh();
    });

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

        {/* Kéo thứ tự: cảnh đẹp nhất lên đầu lưới bên trang khách. */}
        <div className="absolute top-2 left-2 flex gap-1">
          <button
            type="button"
            disabled={dauDanh || dangLuu}
            onClick={() => chay(() => doiThuTuCanhAction(d.id, true))}
            title="Đưa lên trước"
            className="grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-35"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={cuoiDanh || dangLuu}
            onClick={() => chay(() => doiThuTuCanhAction(d.id, false))}
            title="Đẩy xuống sau"
            className="grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-35"
          >
            ↓
          </button>
        </div>
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
        <label className="block">
          <span className="eyebrow block">Tên cảnh</span>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            onBlur={luuNeuDoi}
            placeholder={d.tenAlbum}
            className="input mt-1 text-sm"
          />
        </label>
        <label className="mt-2 block">
          <span className="eyebrow block">Mô tả ngắn</span>
          <input
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            onBlur={luuNeuDoi}
            placeholder="ví dụ: bối cảnh châu Âu, đẹp nhất buổi chiều"
            className="input mt-1 text-sm"
          />
        </label>

        <p className="mt-2 truncate text-xs text-fg-faint" title={`${d.tenAlbum} · ${d.tenMuc}`}>
          Thư mục Drive: {d.tenMuc} · {d.soAnh} ảnh
        </p>
        {bao && <p className="mt-1 text-xs text-accent">{bao}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/*
            Số ảnh là con số chụp lúc thêm thư mục vào trang. Up thêm ảnh lên
            Drive thì con số cũ vẫn nằm đó — nút này đọc lại cho đúng, khỏi
            phải gỡ ra thêm lại (và gỡ ra thêm lại thì mất luôn tên, mô tả).
          */}
          <button
            type="button"
            disabled={dangLuu}
            onClick={() => chay(() => docLaiCanhAction(d.id))}
            className="text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
          >
            {dangLuu ? "Đang đọc…" : "Đọc lại từ Drive"}
          </button>
          <button
            type="button"
            disabled={dangXoa}
            onClick={() =>
              start(async () => {
                await xoaAnhGioiThieuAction(d.id);
                router.refresh();
              })
            }
            className="text-xs text-fg-faint underline underline-offset-2 hover:text-red-700"
          >
            {dangXoa ? "Đang gỡ…" : "Gỡ khỏi trang"}
          </button>
        </div>
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
  /** Những thư mục đang tick để đưa lên một lượt. */
  const [dangTick, setDangTick] = useState<Set<string>>(new Set());

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

  /*
    Thêm NHIỀU thư mục một lượt — anh yêu cầu 23/09/2026: chia Hamita Garden
    thành mười cảnh mà bấm từng cái là mười lần bấm, mười lần đợi Drive.

    Chạy TUẦN TỰ chứ không bắn song song: mỗi lượt là một lần đọc Drive, bắn
    cùng lúc mười lượt thì dễ dính hạn mức của Drive, lúc đó thêm được nửa
    chừng mà không biết nửa nào. Gặp lỗi thì dừng ngay và giữ lại những cái đã
    thêm được.
  */
  const themNhieu = (ds: ThuMucChon[]) => {
    if (!albumMo || ds.length === 0) return;
    setLoi(null);
    start(async () => {
      for (const t of ds) {
        const kq = await themAnhGioiThieuAction(nhom.key, muc.key, albumMo.id, t.id);
        if (kq.loi) {
          setLoi(kq.loi);
          break;
        }
        setVuaThem((s) => new Set(s).add(`${albumMo.id}/${t.id}`));
      }
      setDangTick(new Set());
      router.refresh();
    });
  };

  const them = (t: ThuMucChon) => themNhieu([t]);

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
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        {/* Tick để gom nhiều thư mục rồi đưa lên một lượt. */}
                        <input
                          type="checkbox"
                          className="size-4 shrink-0"
                          disabled={co || dangLam}
                          checked={dangTick.has(t.id)}
                          onChange={(e) =>
                            setDangTick((s) => {
                              const m = new Set(s);
                              if (e.target.checked) m.add(t.id);
                              else m.delete(t.id);
                              return m;
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.ten}</span>
                          <span className="text-xs text-fg-muted">{t.soAnh} ảnh</span>
                        </span>
                      </label>
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
                {/*
                  Thanh này chỉ hiện khi đã tick ít nhất một thư mục — không
                  tick thì nó là một nút chết chiếm chỗ.
                */}
                {dangTick.size > 0 && (
                  <li className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-bg-raised py-3">
                    <span className="text-sm text-fg-muted">Đã chọn {dangTick.size} thư mục</span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        className="btn"
                        disabled={dangLam}
                        onClick={() => setDangTick(new Set())}
                      >
                        Bỏ chọn
                      </button>
                      <button
                        type="button"
                        className="btn-primary px-4"
                        disabled={dangLam}
                        onClick={() => themNhieu(thuMuc.filter((t) => dangTick.has(t.id)))}
                      >
                        {dangLam ? "Đang đưa lên…" : `Đưa lên ${dangTick.size} thư mục`}
                      </button>
                    </span>
                  </li>
                )}
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
