"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { Gallery, ListCount } from "@/lib/store";
import { GalleryCard } from "./GalleryCard";

/** Bo ma nhan hay dung o dau ten album — bam mot cai la loc ngay. */
const NHAN = ["HC", "AB", "HER", "HIS", "ĐH", "DN", "TET"];

/** Hien bao nhieu the truoc khi phai bam "xem them". */
const TRANG = 24;

/**
 * Bo dau tieng Viet de go khong dau van tim ra.
 * Khong co buoc nay thi go "ngoc tho" se khong khop voi "Ngọc Thơ" — ma nhan
 * vien go dau du thi rat it.
 */
function bo_dau(s: string): string {
  return s
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Chuoi de doi chieu cho mot album: ten khach, ten thu muc goc, duong dan, ten cac thu muc con. */
function kho_chu(g: Gallery): string {
  return bo_dau(
    [g.clientName ?? "", g.title, g.slug, ...g.subfolders].join(" ")
  );
}

/**
 * Cac tu roi trong TEN album — chi dung cho viec loc theo ma nhan.
 *
 * Co tinh khong lay ten thu muc con: nhieu album co thu muc "file hoàn thiện HC",
 * neu tinh ca do thi bam ma "HC" se ra ca nhung album khong he mang ma do.
 * Rieng o go chu van tim ca trong ten thu muc con, vi do la tim tu do.
 */
function cac_tu(g: Gallery): string[] {
  return bo_dau([g.clientName ?? "", g.title].join(" "))
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function AlbumList({
  galleries,
  counts,
}: {
  galleries: Gallery[];
  counts: ListCount[];
}) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [nhan, setNhan] = useState<string | null>(null);
  const [hienBaoNhieu, setHienBaoNhieu] = useState(TRANG);

  // Go nhanh tren danh sach dai thi de giat; deferred cho phan go muot truoc,
  // danh sach cap nhat sau mot nhip.
  const tuKhoaCho = useDeferredValue(tuKhoa);

  const chiMuc = useMemo(
    () => galleries.map((g) => ({ g, chu: kho_chu(g), tu: cac_tu(g) })),
    [galleries]
  );

  // Chi hien nhung ma nhan that su co album, kem so luong.
  const nhanCoDung = useMemo(
    () =>
      NHAN.map((ma) => {
        const key = bo_dau(ma);
        return { ma, key, so: chiMuc.filter((m) => m.tu.some((t) => t.startsWith(key))).length };
      }).filter((n) => n.so > 0),
    [chiMuc]
  );

  const ketQua = useMemo(() => {
    let ds = chiMuc;

    if (nhan) {
      // So khop theo dau tu, khong phai chuoi con: "hc" khop "hc Ngọc Thơ"
      // nhung khong khop "thach" — tranh ket qua thua.
      ds = ds.filter((m) => m.tu.some((t) => t.startsWith(nhan)));
    }

    const q = bo_dau(tuKhoaCho.trim());
    if (q) {
      // Moi tu trong o tim deu phai co mat, khong cần đúng thứ tự.
      const phan = q.split(/\s+/).filter(Boolean);
      ds = ds.filter((m) => phan.every((p) => m.chu.includes(p)));
    }

    return ds.map((m) => m.g);
  }, [chiMuc, nhan, tuKhoaCho]);

  const countsOf = (galleryId: string) => counts.filter((c) => c.galleryId === galleryId);
  const dangLoc = Boolean(nhan) || tuKhoa.trim().length > 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">
          Album đã tạo · {dangLoc ? `${ketQua.length}/${galleries.length}` : galleries.length}
        </h2>
      </div>

      <div className="relative mt-3">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-fg-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          value={tuKhoa}
          onChange={(e) => {
            setTuKhoa(e.target.value);
            setHienBaoNhieu(TRANG);
          }}
          placeholder="Tìm theo tên cô dâu chú rể, hoặc mã HC, ĐH…"
          aria-label="Tìm album"
          className="input pl-10"
        />
        {tuKhoa && (
          <button
            type="button"
            onClick={() => setTuKhoa("")}
            aria-label="Xoá ô tìm"
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
        )}
      </div>

      {nhanCoDung.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {nhanCoDung.map((n) => {
            const dang = nhan === n.key;
            return (
              <button
                key={n.ma}
                type="button"
                onClick={() => {
                  setNhan(dang ? null : n.key);
                  setHienBaoNhieu(TRANG);
                }}
                className={`min-h-8 rounded-full border px-3 text-xs tracking-wide transition ${
                  dang
                    ? "border-transparent bg-fg text-bg"
                    : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
                }`}
              >
                {n.ma} <span className="opacity-60">{n.so}</span>
              </button>
            );
          })}
          {dangLoc && (
            <button
              type="button"
              onClick={() => {
                setNhan(null);
                setTuKhoa("");
              }}
              className="min-h-8 px-2 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
            >
              bỏ lọc
            </button>
          )}
        </div>
      )}

      {ketQua.length === 0 ? (
        <div className="mt-10 text-center">
          <p className="font-display text-2xl">Không tìm thấy album nào</p>
          <p className="mt-2 text-sm text-fg-muted">
            Thử gõ ít chữ hơn, hoặc bỏ mã lọc. Ô tìm không cần gõ dấu.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {ketQua.slice(0, hienBaoNhieu).map((g) => (
              <GalleryCard key={g.id} gallery={g} counts={countsOf(g.id)} />
            ))}
          </div>

          {ketQua.length > hienBaoNhieu && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setHienBaoNhieu((n) => n + TRANG)}
                className="btn"
              >
                Xem thêm {ketQua.length - hienBaoNhieu} album
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
