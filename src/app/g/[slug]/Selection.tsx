"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ClientList = { id: string; name: string; icon: "heart" | "check" };

type Photo = { id: string; name: string; album: string };

type Ctx = {
  lists: ClientList[];
  isSelected: (listId: string, fileId: string) => boolean;
  countFor: (listId: string) => number;
  toggle: (listId: string, photo: Photo) => void;
  allowDownload: boolean;
  slug: string;
  /** Co request nao that bai khong — de bao cho khach biet thay vi im lang. */
  failed: boolean;
  /** Dang loc theo danh sach nao (null = xem tat ca). */
  filter: string | null;
  setFilter: (listId: string | null) => void;
  selectedIdsOf: (listId: string) => Set<string>;

  /** Ghi chu rieng cho anh nay trong danh sach nay, vi du "in co 40x60". */
  noteOf: (listId: string, fileId: string) => string | null;
  /** Ghi lai ghi chu — chi co tac dung khi anh da nam trong danh sach do. */
  guiGhiChu: (listId: string, photo: Photo, note: string) => void;

  /** Tong so anh da chon, gop ca gallery — khong rieng thu muc dang xem. */
  tongSoDaChon: number;
  /** Khach da bao "chon xong" chua. */
  daBaoXong: boolean;
  /** Luc bao, dang ISO — null neu chua bao. */
  baoXongLuc: string | null;
  /** Bao hoac huy bao da chon xong. */
  baoDaXong: (xong: boolean) => void;

  /** Da nhap dung ma chua. */
  unlocked: boolean;
  askingCode: boolean;
  openCode: () => void;
  closeCode: () => void;
  /** Goi sau khi nhap dung ma; chay tiep thao tac dang cho. */
  onUnlocked: () => void;
};

const SelectionContext = createContext<Ctx | null>(null);

function key(listId: string, fileId: string): string {
  return `${listId}:${fileId}`;
}

export function SelectionProvider({
  slug,
  lists,
  allowDownload,
  unlocked: unlockedBanDau,
  mucDangXem,
  mucXongLuc,
  anhTrongMuc,
  children,
}: {
  slug: string;
  lists: ClientList[];
  allowDownload: boolean;
  unlocked: boolean;
  /** Khach da bao "chon xong" luc nao — null neu chua bao. */
  /**
   * Thu muc dang mo. Trang thai "da chon xong" tinh rieng cho tung thu muc,
   * nen moi thao tac bao xong deu phai kem theo no.
   */
  mucDangXem: { id: string; ten: string };
  /** Khach da bao xong THU MUC NAY luc nao — null neu chua bao. */
  mucXongLuc: string | null;
  /** Anh cua muc dang mo — dung de dem cho dung pham vi. */
  anhTrongMuc: { id: string }[];
  children: ReactNode;
}) {
  /*
    key la "listId:fileId", gia tri la ghi chu (hoac null neu chua ghi gi).
    Dung Map thay vi Set de mang theo ca ghi chu ma khong can them mot bang
    trang thai rieng.
  */
  const [selected, setSelected] = useState<Map<string, string | null>>(new Map());
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(unlockedBanDau);
  const [baoXongLuc, setBaoXongLuc] = useState(mucXongLuc);

  /*
    Con so tren the loc phai dem DUNG nhung tam bo loc se hien ra.
    Truoc day dem ca album nen mo mot thu muc chua chon tam nao van thay
    "Anh in 3", bam vao loc thi trong tron — ba tam do nam o thu muc khac.
  */
  const idTrongMuc = useMemo(
    () => new Set(anhTrongMuc.map((a) => a.id)),
    [anhTrongMuc]
  );
  const [askingCode, setAsking] = useState(false);

  /*
    Thao tac khach vua bam nhung chua chay duoc vi chua nhap ma.
    Giu lai de nhap ma xong la chay tiep, khong bat khach bam lai tam anh do.
  */
  const dangCho = useRef<null | (() => void)>(null);

  /*
    Ca nha dung chung mot ma nen lua chon cung la mot danh sach chung.
    Nho vay co dau va chu re cung tim mot tam thi trong bang chi co mot dong —
    khong con chuyen mot tam anh bi dem hai lan roi in du.
  */
  useEffect(() => {
    fetch(`/api/selections?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then(
        (data: {
          selections?: { listId: string; driveFileId: string; note: string | null }[];
        }) => {
          setSelected(
            new Map(
              (data.selections ?? []).map((s) => [
                key(s.listId, s.driveFileId),
                s.note,
              ])
            )
          );
        }
      )
      .catch(() => {});
  }, [slug]);

  const guiToggle = useCallback(
    (listId: string, photo: Photo) => {
      const k = key(listId, photo.id);
      const ghiChuCu = selected.get(k) ?? null;

      const flip = () =>
        setSelected((prev) => {
          const next = new Map(prev);
          if (next.has(k)) next.delete(k);
          else next.set(k, null);
          return next;
        });

      // Doi giao dien truoc cho muot, roi moi goi may chu.
      flip();

      const gui = () =>
        fetch("/api/selections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            listId,
            driveFileId: photo.id,
            fileName: photo.name,
            albumName: photo.album,
          }),
        });

      /*
        Thu lai mot lan khi bi tu choi vi thieu ma.
        Tam anh khach bam TRUOC luc nhap ma se duoc gui ngay sau khi nhap xong,
        va co luc no chay nhanh hon buoc trinh duyet ghi nhan phieu mo khoa —
        khi do may chu tra ve 403 du ma da dung. Doi mot nhip roi gui lai la vua.
      */
      gui()
        .then(async (res) => {
          if (res.status === 403) {
            await new Promise((r) => setTimeout(r, 600));
            return gui();
          }
          return res;
        })
        .then((res) => {
          // Phai kiem tra res.ok: fetch chi bao loi khi dut mang, con may chu
          // tra ve 400/403 thi van coi la thanh cong. Neu bo qua, giao dien se
          // hien la da chon trong khi may chu khong luu gi ca.
          if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
        })
        .catch(() => {
          setFailed(true);
          flip();
          // Khoi phuc dung ghi chu cu neu vua bo chon (flip lai thanh da chon).
          setSelected((prev) => {
            if (!prev.has(k)) return prev;
            const next = new Map(prev);
            next.set(k, ghiChuCu);
            return next;
          });
        });
    },
    [slug, selected]
  );

  const guiGhiChuThat = useCallback(
    (listId: string, photo: Photo, note: string) => {
      const k = key(listId, photo.id);
      if (!selected.has(k)) return; // Chi ghi chu duoc khi anh da nam trong danh sach.

      const sach = note.trim();
      const truoc = selected.get(k) ?? null;
      setSelected((prev) => {
        const next = new Map(prev);
        next.set(k, sach || null);
        return next;
      });

      fetch("/api/selections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, listId, driveFileId: photo.id, note: sach }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
        })
        .catch(() => {
          setFailed(true);
          setSelected((prev) => {
            const next = new Map(prev);
            next.set(k, truoc);
            return next;
          });
        });
    },
    [slug, selected]
  );

  const toggle = useCallback(
    (listId: string, photo: Photo) => {
      if (!unlocked) {
        dangCho.current = () => guiToggle(listId, photo);
        setAsking(true);
        return;
      }
      guiToggle(listId, photo);
    },
    [unlocked, guiToggle]
  );

  const baoDaXongThat = useCallback(
    (xong: boolean) => {
      const truoc = baoXongLuc;
      setBaoXongLuc(xong ? new Date().toISOString() : null);

      // Kèm thư mục đang mở: trạng thái xong tính riêng cho từng thư mục.
      fetch("/api/gallery-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          albumId: mucDangXem.id,
          tenMuc: mucDangXem.ten,
          xong,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
        })
        .catch(() => {
          setFailed(true);
          setBaoXongLuc(truoc);
        });
    },
    [slug, baoXongLuc, mucDangXem]
  );

  const baoDaXong = useCallback(
    (xong: boolean) => {
      if (!unlocked) {
        dangCho.current = () => baoDaXongThat(xong);
        setAsking(true);
        return;
      }
      baoDaXongThat(xong);
    },
    [unlocked, baoDaXongThat]
  );

  const guiGhiChu = useCallback(
    (listId: string, photo: Photo, note: string) => {
      if (!unlocked) {
        dangCho.current = () => guiGhiChuThat(listId, photo, note);
        setAsking(true);
        return;
      }
      guiGhiChuThat(listId, photo, note);
    },
    [unlocked, guiGhiChuThat]
  );

  const value = useMemo<Ctx>(
    () => ({
      lists,
      allowDownload,
      slug,
      failed,
      filter,
      setFilter,
      unlocked,
      askingCode,
      openCode: () => setAsking(true),
      closeCode: () => {
        dangCho.current = null;
        setAsking(false);
      },
      onUnlocked: () => {
        setUnlocked(true);
        setAsking(false);
        const cho = dangCho.current;
        dangCho.current = null;
        cho?.();
      },
      selectedIdsOf: (listId) => {
        const ids = new Set<string>();
        const prefix = `${listId}:`;
        for (const k of selected.keys()) {
          if (k.startsWith(prefix)) ids.add(k.slice(prefix.length));
        }
        return ids;
      },
      isSelected: (listId, fileId) => selected.has(key(listId, fileId)),
      noteOf: (listId, fileId) => selected.get(key(listId, fileId)) ?? null,
      countFor: (listId) => {
        const prefix = `${listId}:`;
        let n = 0;
        for (const k of selected.keys()) {
          if (!k.startsWith(prefix)) continue;
          if (idTrongMuc.has(k.slice(prefix.length))) n++;
        }
        return n;
      },
      toggle,
      guiGhiChu,
      /*
        Đếm số TẤM riêng biệt khách đã chọn TRONG THƯ MỤC ĐANG MỞ.

        Trước đây lấy thẳng selected.size, tức là đếm cả album và đếm cả những
        dòng trùng — một tấm vừa thả tim vừa tick sẽ tính thành hai. Từ khi
        trạng thái "chọn xong" tính riêng từng thư mục, con số hỏi khách
        ("chọn xong N tấm rồi phải không ạ?") cũng phải là của đúng thư mục họ
        đang xem, không thì hỏi một đằng làm một nẻo.
      */
      tongSoDaChon: (() => {
        const anh = new Set<string>();
        for (const k of selected.keys()) {
          const fileId = k.slice(k.indexOf(":") + 1);
          if (idTrongMuc.has(fileId)) anh.add(fileId);
        }
        return anh.size;
      })(),
      daBaoXong: baoXongLuc !== null,
      baoXongLuc,
      baoDaXong,
    }),
    [
      lists,
      allowDownload,
      slug,
      selected,
      toggle,
      guiGhiChu,
      failed,
      filter,
      unlocked,
      askingCode,
      idTrongMuc,
      baoXongLuc,
      baoDaXong,
    ]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection phải nằm trong SelectionProvider");
  return ctx;
}
