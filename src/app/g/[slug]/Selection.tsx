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

/**
 * Bao lau hoi lai danh sach da chon mot lan, khi tab dang mo.
 *
 * 15 giay: du nhanh de vo chong ngoi canh nhau moi nguoi mot may khong thay
 * kho chiu, du thua de khong lam phien may chu — moi lan hoi chi 1,3 KB.
 */
const NHIP_DONG_BO = 15_000;

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
    Dem so cu bam dang tren duong toi may chu.
    Nhip dong bo phia duoi doc con so nay de khong dap ban tra ve cu len thao
    tac khach vua lam. Dung ref chu khong phai state: no chi de doi chieu,
    doi no khong can ve lai gi.
  */
  const dangGhi = useRef(0);

  /*
    Ca nha dung chung mot ma nen lua chon cung la mot danh sach chung.
    Nho vay co dau va chu re cung tim mot tam thi trong bang chi co mot dong —
    khong con chuyen mot tam anh bi dem hai lan roi in du.

    Hoi lai deu dan chu khong chi tai mot lan luc mo trang. Truoc day chi tai
    mot lan, nen co dau chon tren dien thoai thi chu re dang mo laptop khong
    thay gi cho toi khi tu tai lai trang — hai may lech nhau ca buoi ma khong
    ai biet. Do that: danh sach nay nang 1.329 byte, ve trong 0,25 giay, nen
    hoi moi 15 giay gan nhu khong ton gi.
  */
  useEffect(() => {
    let con = true;

    const tai = async () => {
      try {
        const res = await fetch(
          `/api/selections?slug=${encodeURIComponent(slug)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          selections?: { listId: string; driveFileId: string; note: string | null }[];
        };
        if (!con) return;

        /*
          Dang co cu bam chua kip ve thi bo qua lot nay.
          Khong co chot nay thi khach bam tim dung luc sap toi nhip hoi se thay
          tim hien roi bien mat roi hien lai — vi ban tra ve duoc chup TRUOC
          khi cu bam cua ho kip ghi vao database.
        */
        if (dangGhi.current > 0) return;

        setSelected(
          new Map(
            (data.selections ?? []).map((s) => [
              key(s.listId, s.driveFileId),
              s.note,
            ])
          )
        );
      } catch {
        // Mang truc trac thi thoi, nhip sau hoi lai.
      }
    };

    void tai();

    /*
      Chi hoi khi tab dang mo. Khach de album trong tab nen ca buoi thi khong
      co ly do gi phai hoi may chu — vua ton pin vua ton han muc.
    */
    const nhip = setInterval(() => {
      if (document.visibilityState === "visible") void tai();
    }, NHIP_DONG_BO);

    // Quay lai tab la lay ngay, khong bat doi het mot nhip.
    const khiQuayLai = () => {
      if (document.visibilityState === "visible") void tai();
    };
    document.addEventListener("visibilitychange", khiQuayLai);

    return () => {
      con = false;
      clearInterval(nhip);
      document.removeEventListener("visibilitychange", khiQuayLai);
    };
  }, [slug]);

  const guiToggle = useCallback(
    (listId: string, photo: Photo) => {
      const k = key(listId, photo.id);
      const ghiChuCu = selected.get(k) ?? null;

      /*
        Trang thai khach MUON sau cu bam nay. Gui thang y dinh nay len may chu
        thay vi de may chu tu lat nguoc — xem ToggleSelectionInput.muon. Day la
        nua dau cua viec va lo hong "hai may lam mat lua chon cua nhau".
      */
      const muon = !selected.has(k);

      const datVe = (co: boolean, ghiChu: string | null) =>
        setSelected((prev) => {
          if (prev.has(k) === co) return prev;
          const next = new Map(prev);
          if (co) next.set(k, ghiChu);
          else next.delete(k);
          return next;
        });

      // Doi giao dien truoc cho muot, roi moi goi may chu.
      datVe(muon, ghiChuCu);

      dangGhi.current++;

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
            muon,
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
        .then(async (res) => {
          // Phai kiem tra res.ok: fetch chi bao loi khi dut mang, con may chu
          // tra ve 400/403 thi van coi la thanh cong. Neu bo qua, giao dien se
          // hien la da chon trong khi may chu khong luu gi ca.
          if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);

          /*
            Lay trang thai THAT trong database lam chuan, thay vi tin cu lat
            phia trinh duyet. Day la nua sau cua viec va: truoc day cho nay chi
            xem res.ok roi thoi, nen khi may chu tra ve mot ket qua khac voi
            thu giao dien dang hien, khong ai biet — man hinh bao da chon trong
            khi database trong ron.
          */
          const data = (await res.json().catch(() => null)) as {
            selected?: boolean;
          } | null;
          if (typeof data?.selected === "boolean") datVe(data.selected, ghiChuCu);
        })
        .catch(() => {
          setFailed(true);
          // Tra giao dien ve dung trang thai truoc cu bam, kem ghi chu cu.
          datVe(!muon, ghiChuCu);
        })
        .finally(() => {
          dangGhi.current--;
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

      // Cung ly do voi cu bam chon: nhip dong bo khong duoc dap len ghi chu
      // khach vua go ma may chu chua kip nhan.
      dangGhi.current++;

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
        })
        .finally(() => {
          dangGhi.current--;
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
