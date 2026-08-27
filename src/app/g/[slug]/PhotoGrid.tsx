"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelection, type ClientList } from "./Selection";
import { coKhayChiaSe, luuQuaThe, moKhayChiaSe, taiTep } from "./taiAnh";

export type ClientPhoto = {
  id: string;
  name: string;
  width: number | null;
  height: number | null;
};

/** So anh hien them moi lan cuon toi cuoi — bo 765 anh thi dung ve het mot luc. */
const PAGE = 60;

/**
 * Kich thuoc anh khi xem to, tinh theo canh dai.
 *
 * Dien thoai chi hien anh trong khung khoang 400x800 diem anh CSS nen 1440 la
 * du sac net, ma nhe hon 2048 gan mot nua — quan trong khi khach xem bang 4G.
 */
function useViewerSize(): number {
  const [size] = useState(() => {
    if (typeof window === "undefined") return 1440;
    return Math.max(window.innerWidth, window.innerHeight) > 900 ? 2048 : 1440;
  });
  return size;
}

/**
 * Hình dạng biểu tượng KHÔNG đổi giữa hai trạng thái — trái tim luôn là trái
 * tim, dấu tick luôn là dấu tick. Chỉ độ đậm và màu nền nút thay đổi.
 *
 * Trước đây nút thứ hai hiện ô vuông khi chưa chọn rồi mới thành dấu tick,
 * khiến khách không đoán được bấm vào sẽ ra gì.
 */
function Icon({ kind, filled }: { kind: ClientList["icon"]; filled: boolean }) {
  if (kind === "heart") {
    return (
      <svg
        viewBox="0 0 24 24"
        className="size-[19px]"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 1 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[19px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={filled ? 3.2 : 2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6.5 9.2 17.3 4 12.1" />
    </svg>
  );
}

/**
 * O ghi chu rieng cho mot tam anh trong mot danh sach da chon, vi du
 * "in cỡ 40x60". Chi hien khi anh dang nam trong danh sach do — ghi chu la
 * mot phan cua lua chon, khong co lua chon thi khong co gi de ghi chu vao.
 *
 * Luu luc roi khoi o nhap (blur) hoac bam Enter, khong luu tren tung phim go
 * — tranh goi may chu lien tuc trong luc khach dang go.
 */
function OGhiChu({
  photo,
  album,
  list,
}: {
  photo: ClientPhoto;
  album: string;
  list: ClientList;
}) {
  const { noteOf, guiGhiChu } = useSelection();
  const [nhap, setNhap] = useState(() => noteOf(list.id, photo.id) ?? "");

  const luu = () => guiGhiChu(list.id, { id: photo.id, name: photo.name, album }, nhap);

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 truncate text-[11px] text-white/45">{list.name}</span>
      <input
        value={nhap}
        onChange={(e) => setNhap(e.target.value)}
        onBlur={luu}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          luu();
          (e.target as HTMLInputElement).blur();
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder="Dặn Hamita điều gì không ạ? Ví dụ: in cỡ 40x60"
        maxLength={300}
        className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white outline-none transition placeholder:text-white/40 focus:border-white/45 focus:bg-white/15"
      />
    </div>
  );
}

function GhiChuAnh({ photo, album }: { photo: ClientPhoto; album: string }) {
  const { lists, isSelected } = useSelection();
  const coChon = lists.filter((l) => isSelected(l.id, photo.id));

  if (coChon.length === 0) return null;

  return (
    <div className="mb-3 flex w-full max-w-xs flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      {coChon.map((list) => (
        <OGhiChu key={`${photo.id}:${list.id}`} photo={photo} album={album} list={list} />
      ))}
    </div>
  );
}

function SelectButtons({
  photo,
  album,
  size = "sm",
}: {
  photo: ClientPhoto;
  album: string;
  size?: "sm" | "lg";
}) {
  const { lists, isSelected, toggle } = useSelection();

  return (
    /*
      Khoang cach giua hai nut la chuyen AN TOAN, khong phai chuyen tham my.
      Tim = "in ra", tick = "giu rieng" — hai y nghia nguoc nhau ma dat sat
      nhau thi bam nham la tam khach muon in roi vao danh sach giu rieng, toi
      ngay giao anh moi phat hien thieu. Do that ngay 27/08/2026 tren man hinh
      375px: hai nut 40px cach nhau dung 6px, trong khi dau ngon tay nguoi lon
      rong 45-57px. Gio moi nut 44px (muc toi thieu cua ca Apple lan Google) va
      cach nhau 12px.
    */
    <div className={size === "lg" ? "flex gap-4" : "flex gap-3"}>
      {lists.map((list) => {
        const on = isSelected(list.id, photo.id);
        return (
          <button
            key={list.id}
            type="button"
            title={list.name}
            aria-label={`${list.name}: ${photo.name}`}
            aria-pressed={on}
            onClick={(e) => {
              e.stopPropagation();
              toggle(list.id, { id: photo.id, name: photo.name, album });
            }}
            className={[
              "grid place-items-center rounded-full backdrop-blur-sm transition duration-200 active:scale-90",
              size === "lg" ? "size-14" : "size-11",
              on
                ? list.icon === "heart"
                  ? "bg-rose-500 text-white shadow-lg"
                  : "bg-[#9c7c4f] text-white shadow-lg"
                : "bg-black/35 text-white/90 hover:bg-black/65 hover:text-white",
            ].join(" ")}
          >
            <Icon kind={list.icon} filled={on} />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Mot o anh trong luoi.
 * Tach rieng va boc memo de khi mo/dong anh to hay cuon them, ca tram o con lai
 * khong phai ve lai.
 */
const GridPhoto = memo(function GridPhoto({
  photo,
  album,
  chosen,
  onOpen,
}: {
  photo: ClientPhoto;
  album: string;
  chosen: boolean;
  onOpen: (photo: ClientPhoto) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <figure
      className={`group relative mb-2 break-inside-avoid overflow-hidden rounded-sm sm:mb-3 ${
        loaded ? "" : "skeleton"
      }`}
      style={{ aspectRatio: photo.width && photo.height ? `${photo.width}/${photo.height}` : "3/4" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/img/${photo.id}?w=640`}
        alt={photo.name}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onClick={() => onOpen(photo)}
        className={`size-full cursor-zoom-in object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Vien danh dau anh da chon — luot qua luoi la biet ngay da tim tam nao. */}
      {chosen && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-accent ring-inset"
        />
      )}

      {/* Phu mo dan tu duoi len de nut nut noi ro tren anh sang mau. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-sm:opacity-100" />

      <div className="absolute right-2 bottom-2 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        <SelectButtons photo={photo} album={album} />
      </div>
    </figure>
  );
});

export function PhotoGrid({ photos, album }: { photos: ClientPhoto[]; album: string }) {
  const { filter, selectedIdsOf, lists, isSelected } = useSelection();

  const visible = useMemo(() => {
    if (!filter) return photos;
    const ids = selectedIdsOf(filter);
    return photos.filter((p) => ids.has(p.id));
  }, [photos, filter, selectedIdsOf]);

  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const [openPhoto, setOpenPhoto] = useState<ClientPhoto | null>(null);

  /*
    Doi bo loc thi dem lai tu dau, khong thi dang loc 12 anh ma van bao "tai them".

    Chinh thang trong luot ve chu khong qua useEffect: lam bang effect thi khach
    thay mot nhip luoi cu (so anh cua bo loc truoc) roi moi nhay ve dung, va
    React phai ve lai hai lan cho mot cu bam. So voi lan ve truoc la cach React
    khuyen dung cho viec "dat lai state khi mot gia tri dau vao doi".
  */
  const [locTruoc, setLocTruoc] = useState(filter);
  if (filter !== locTruoc) {
    setLocTruoc(filter);
    setShown(PAGE);
  }

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShown((n) => n + PAGE);
      },
      { rootMargin: "600px" } // tai truoc khi khach cuon toi, cho lien mach
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible.length]);

  const openIndex = openPhoto ? visible.findIndex((p) => p.id === openPhoto.id) : -1;
  const onOpen = useCallback((photo: ClientPhoto) => setOpenPhoto(photo), []);

  if (visible.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-display text-2xl">Ở đây chưa có tấm nào ạ</p>
        <p className="mt-2 text-sm text-fg-muted">
          {filter
            ? "Anh chị bỏ bộ lọc ở trên để xem lại trọn bộ nhé."
            : "Hamita sẽ thả ảnh vào đây sớm thôi ạ."}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="columns-2 gap-2 sm:columns-3 sm:gap-3 lg:columns-4 2xl:columns-5">
        {visible.slice(0, shown).map((p) => (
          <GridPhoto
            key={p.id}
            photo={p}
            album={album}
            chosen={lists.some((l) => isSelected(l.id, p.id))}
            onOpen={onOpen}
          />
        ))}
      </div>

      {shown < visible.length && (
        <div ref={sentinel} className="eyebrow py-12 text-center">
          Đang tải thêm… {shown}/{visible.length}
        </div>
      )}

      <ScrollTop />

      {openIndex >= 0 && (
        <Lightbox
          photos={visible}
          album={album}
          index={openIndex}
          onIndex={(i) => setOpenPhoto(visible[i] ?? null)}
          onClose={() => setOpenPhoto(null)}
        />
      )}
    </>
  );
}

/** Nut ve dau trang — bo 700 anh cuon xuong sau thi vuot len rat met. */
function ScrollTop() {
  const [hien, setHien] = useState(false);

  useEffect(() => {
    const onScroll = () => setHien(window.scrollY > 1600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!hien) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Về đầu trang"
      className="fixed right-4 bottom-4 z-20 grid size-11 place-items-center rounded-full border border-line-strong bg-bg-raised/90 text-fg-muted shadow-[var(--shadow-soft)] backdrop-blur transition hover:text-accent sm:right-6 sm:bottom-6"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5m0 0-6 6m6-6 6 6" />
      </svg>
    </button>
  );
}

function Lightbox({
  photos,
  album,
  index,
  onIndex,
  onClose,
}: {
  photos: ClientPhoto[];
  album: string;
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { allowDownload } = useSelection();
  const photo = photos[index];
  const touchX = useRef<number | null>(null);
  const size = useViewerSize();

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const ready = loadedId === photo.id;

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onIndex(next);
    },
    [index, photos.length, onIndex]
  );

  /*
    Tải trước tấm kế tiếp và tấm trước đó.
    Đây là thứ quyết định cảm giác nhanh chậm: khách bấm sang ảnh sau thì ảnh
    đã tải xong từ lúc họ còn đang xem ảnh này, hiện ra tức thì.
  */
  useEffect(() => {
    for (const near of [index + 1, index - 1, index + 2]) {
      const p = photos[near];
      if (!p) continue;
      const img = new window.Image();
      img.src = `/api/img/${p.id}?w=${size}`;
    }
  }, [index, photos, size]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);

    // Khoá cuộn nền phía sau khi đang xem ảnh to.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0d0b0a] select-none"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm text-white/85 tabular-nums">
            {index + 1} <span className="text-white/35">/ {photos.length}</span>
          </p>
          <p className="truncate text-[11px] tracking-wider text-white/35 uppercase">
            {photo.name}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="grid size-10 shrink-0 place-items-center rounded-full text-xl text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={onClose}>
        {/* Ảnh nhỏ của lưới đã nằm sẵn trong bộ nhớ trình duyệt — hiện tức khắc
            làm nền tạm, khách không phải nhìn màn hình đen. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/img/${photo.id}?w=640`}
          alt=""
          aria-hidden
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-0 size-full object-contain blur-[6px] transition-opacity duration-300 ${
            ready ? "opacity-0" : "opacity-100"
          }`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={`/api/img/${photo.id}?w=${size}`}
          alt={photo.name}
          onLoad={() => setLoadedId(photo.id)}
          onClick={(e) => e.stopPropagation()}
          className={`absolute inset-0 size-full object-contain transition-opacity duration-200 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        />

        {index > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Ảnh trước"
            className="absolute left-1 grid size-12 place-items-center rounded-full text-3xl text-white/50 transition hover:bg-white/10 hover:text-white sm:left-6"
          >
            ‹
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Ảnh sau"
            className="absolute right-1 grid size-12 place-items-center rounded-full text-3xl text-white/50 transition hover:bg-white/10 hover:text-white sm:right-6"
          >
            ›
          </button>
        )}
      </div>

      <footer className="flex flex-col items-center px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <GhiChuAnh photo={photo} album={album} />
        <div className="flex items-center justify-center gap-4">
          <SelectButtons photo={photo} album={album} size="lg" />
          {allowDownload && <NutTai key={photo.id} photo={photo} />}
        </div>
      </footer>
    </div>
  );
}

type TrangThaiTai = "san-sang" | "dang-tai" | "cho-cham" | "loi";

/**
 * Nút tải ảnh.
 *
 * Trên iPhone, trang web không có quyền ghi thẳng vào app Ảnh. Thứ gần nhất là
 * mở khay chia sẻ của máy để khách bấm "Lưu vào Ảnh" — một chạm, thay vì phải
 * mở ảnh ra rồi nhấn giữ như trước.
 *
 * Máy tính và Android không dùng khay chia sẻ thì rơi xuống cách tải thường,
 * ảnh vào thẳng thư mục Tải xuống.
 */
function NutTai({ photo }: { photo: ClientPhoto }) {
  const { slug } = useSelection();
  const [trangThai, setTrangThai] = useState<TrangThaiTai>("san-sang");
  const tepSan = useRef<File | null>(null);

  const giaoTep = useCallback(async (file: File) => {
    if (coKhayChiaSe(file)) {
      const kq = await moKhayChiaSe(file);
      if (kq === "het-han-cham") {
        setTrangThai("cho-cham");
        return;
      }
      if (kq !== "khong-ho-tro") {
        setTrangThai("san-sang");
        return;
      }
    }
    luuQuaThe(file);
    setTrangThai("san-sang");
  }, []);

  const xuLy = useCallback(async () => {
    if (trangThai === "dang-tai") return;

    /*
      Tệp đã tải rồi thì mở khay ngay trong cú chạm này, không chèn thêm await
      nào ở giữa — Safari chỉ chấp nhận khay chia sẻ khi nó mở liền sau cú chạm.
    */
    if (tepSan.current) {
      await giaoTep(tepSan.current);
      return;
    }

    setTrangThai("dang-tai");
    try {
      const file = await taiTep(photo.id, photo.name, slug);
      tepSan.current = file;
      await giaoTep(file);
    } catch {
      setTrangThai("loi");
      setTimeout(() => setTrangThai("san-sang"), 3000);
    }
  }, [trangThai, photo.id, photo.name, slug, giaoTep]);

  if (trangThai === "cho-cham") {
    return (
      <button
        onClick={xuLy}
        /*
          Truoc day nut nay nhap nhay de goi chu y (anh da tai xong, chi cho
          them mot cu cham de mo khay chia se). Bo nhap nhay theo yeu cau —
          nut trang giua khung xem anh nen den von da noi san, khong can
          nhuc nhich; them vong sang mong cho chac.
        */
        className="flex h-14 items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-neutral-900 ring-2 ring-white/40 transition active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
        </svg>
        Lưu ảnh
      </button>
    );
  }

  if (trangThai === "loi") {
    return (
      <button
        onClick={xuLy}
        className="flex h-14 items-center gap-2 rounded-full bg-red-500/20 px-5 text-sm font-medium text-red-200 transition active:scale-95"
      >
        Chưa tải được — bấm thử lại nhé
      </button>
    );
  }

  const dangTai = trangThai === "dang-tai";

  return (
    <button
      onClick={xuLy}
      disabled={dangTai}
      title="Tải ảnh này"
      aria-label="Tải ảnh này"
      className="grid size-14 place-items-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white active:scale-90 disabled:active:scale-100"
    >
      {dangTai ? (
        <svg viewBox="0 0 24 24" className="size-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
        </svg>
      )}
    </button>
  );
}
