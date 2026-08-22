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

  /** Da nhap dung ma chua. */
  unlocked: boolean;
  askingCode: boolean;
  openCode: () => void;
  closeCode: () => void;
  /** Goi sau khi nhap dung ma; chay tiep thao tac dang cho. */
  onUnlocked: () => void;
};

const SelectionContext = createContext<Ctx | null>(null);

export function SelectionProvider({
  slug,
  lists,
  allowDownload,
  unlocked: unlockedBanDau,
  anhTrongMuc,
  children,
}: {
  slug: string;
  lists: ClientList[];
  allowDownload: boolean;
  unlocked: boolean;
  /** Anh cua muc dang mo — dung de dem cho dung pham vi. */
  anhTrongMuc: { id: string }[];
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(unlockedBanDau);

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
      .then((data: { selections?: { listId: string; driveFileId: string }[] }) => {
        setSelected(
          new Set((data.selections ?? []).map((s) => `${s.listId}:${s.driveFileId}`))
        );
      })
      .catch(() => {});
  }, [slug]);

  const guiToggle = useCallback(
    (listId: string, photo: Photo) => {
      const key = `${listId}:${photo.id}`;

      const flip = () =>
        setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(key)) next.delete(key);
          else next.add(key);
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
        });
    },
    [slug]
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
        for (const key of selected) {
          if (key.startsWith(prefix)) ids.add(key.slice(prefix.length));
        }
        return ids;
      },
      isSelected: (listId, fileId) => selected.has(`${listId}:${fileId}`),
      countFor: (listId) => {
        const prefix = `${listId}:`;
        let n = 0;
        for (const key of selected) {
          if (!key.startsWith(prefix)) continue;
          if (idTrongMuc.has(key.slice(prefix.length))) n++;
        }
        return n;
      },
      toggle,
    }),
    [
      lists,
      allowDownload,
      slug,
      selected,
      toggle,
      failed,
      filter,
      unlocked,
      askingCode,
      idTrongMuc,
    ]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection phải nằm trong SelectionProvider");
  return ctx;
}
