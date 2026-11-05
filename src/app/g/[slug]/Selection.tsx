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
/*
  Nhap tu `store/shared` chu khong tu `@/lib/store`: tep nay chay o MAY KHACH,
  ma index cua kho nhap `getPrisma` (nguyen tac 43). `import type` bi xoa han
  luc bien dich nen khong keo gi sang goi phia khach, nhung tro thang vao tep
  type thuan thi khong co duong nao vap lai cai bay do.
*/
import type { LoaiBaoXong } from "@/lib/store/shared";

export type ClientList = { id: string; name: string; icon: "heart" };

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

  /**
   * So tam da chon TRONG THU MUC DANG MO, dem theo tam rieng biet — mot tam
   * co hai dong (hai nguoi cung tha tim) van chi la mot.
   *
   * Chu thich cu o day ghi nguoc han ("gop ca gallery"), trong khi ma ben duoi
   * van loc theo idTrongMuc tu dau. Sua lai cho khoi ai tin nham: con so nay
   * di thang vao cau hoi khach doc ("Anh chị chọn xong N tấm..."), ma trang
   * thai bao xong lai tinh rieng tung thu muc (nguyen tac 20) — dem ca gallery
   * o day la hoi mot dang, ghi nhan mot neo.
   */
  tongSoDaChon: number;
  /**
   * So tam TRONG THU MUC DANG XEM co loi dan cua khach.
   *
   * Dung de nhac truoc khi khach bam "can chinh lai": bao can sua ma khong ghi
   * gi thi Media mo ra khong biet sua cai gi (anh chot 08/10/2026 — van cho
   * bam, nhung phai nhac).
   */
  soLoiDan: number;
  /** Khach da bao gi chua (xong hoac can sua). */
  daBaoXong: boolean;
  /** Luc bao, dang ISO — null neu chua bao. */
  baoXongLuc: string | null;
  /**
   * Khach bao LOAI gi — null neu chua bao.
   *
   * "xong"    = duyet xong, Hamita dem di in.
   * "can-sua" = muon Media chinh lai (anh yeu cau 08/10/2026).
   */
  loaiBao: LoaiBaoXong | null;
  /** Bao, hoac huy bao. Truyen null de go trang thai. */
  baoDaXong: (loai: LoaiBaoXong | null) => void;

  /**
   * Ngay khach hen lay hinh ("yyyy-mm-dd"), null = chua hen hoac khong hoi.
   */
  hanLay: string | null;
  /** Dang mo cua so hoi ngay lay hinh. */
  hoiNgay: boolean;
  /** Dong cua so hoi ngay ma KHONG bao gi ca (khach bam X hoac bam ra ngoai). */
  dongHoiNgay: () => void;
  /**
   * Chot ngay roi bao xong luon. `null` = khach bam "chua biet" — van bao
   * xong, chi la khong kem han.
   */
  chotNgayLay: (ngay: string | null) => void;

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
 * Bao lau hoi lai danh sach da chon mot lan, khi tab dang mo VA khach con dang
 * xem that.
 *
 * Noi tu 15 len 30 giay ngay 21/09/2026 (anh dong y), sau khi database Neon het
 * han muc goi mien phi va ca web sap. Neon tinh tien theo THOI GIAN DATABASE
 * THUC, moi lan bi goi la thuc them it nhat 5 phut — nen thu ton tien la co cai
 * gi goi deu dan suot ngay hay khong, khong phai cau lenh nang hay nhe.
 *
 * Van du nhanh cho canh vo chong ngoi canh nhau moi nguoi mot may: cu bam cua
 * chinh minh hien ngay (khong doi nhip nao), va quay lai tab la hoi lien.
 */
const NHIP_DONG_BO = 30_000;

/**
 * Khach khong dong vao trang lau hon chung nay thi NGUNG hoi.
 *
 * Truoc day chi cang tab dang hien la cu hoi mai — khach mo album roi di an com,
 * de may do ca tieng, database khong bao gio duoc ngu. Cham vao man hinh, cuon,
 * bam phim hay quay lai tab deu tinh la dang xem, va luc do hoi lai ngay.
 */
const NGHI_SAU = 5 * 60_000;

export function SelectionProvider({
  slug,
  lists,
  allowDownload,
  unlocked: unlockedBanDau,
  mucDangXem,
  mucXongLoai,
  mucXongLuc,
  mucXongHanLay,
  hoiHanLay,
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
  mucXongLoai: LoaiBaoXong | null;
  /** Ngay khach da hen lay hinh ("yyyy-mm-dd") — null neu chua hen. */
  mucXongHanLay: string | null;
  /**
   * Thu muc nay co hoi NGAY CAN LAY HINH khong (anh yeu cau 05/11/2026).
   *
   * Tinh o may chu bang `laMucHoiHanLay` roi truyen xuong, giong cach
   * `hoanThien` di: hai noi tu doan lay theo ten la co ngay mot noi doi luat
   * ma noi kia khong.
   */
  hoiHanLay: boolean;
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
  const [loaiBao, setLoaiBao] = useState<LoaiBaoXong | null>(mucXongLoai);
  const [hanLay, setHanLay] = useState(mucXongHanLay);
  const [hoiNgay, setHoiNgay] = useState(false);

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
    /*
      CHƯA NHẬP MÃ THÌ KHÔNG HỎI GÌ CẢ (30/09/2026).

      Máy chủ đòi mã mới cho đọc danh sách (nguyên tắc 3), nên khách chưa nhập
      mã thì mọi nhịp đều bị từ chối 403 và `tai()` chỉ `return` — hỏi bao
      nhiêu lần cũng không được gì.

      Nhưng nó KHÔNG hề miễn phí: mỗi lượt vẫn là một lần chạy hàm và một lần
      đọc database, mà Neon tính tiền theo THỜI GIAN DATABASE THỨC (nguyên tắc
      53) — mỗi lần gọi giữ nó thức thêm 5 phút. Một khách mở album ra ngắm
      rồi để đó là đủ giữ database thức vô hạn.

      Soi nhật ký Vercel ngày 30/09 thấy rõ: 403 đều tăm tắp 30 giây một lượt,
      suốt cả nửa tiếng, cho một khách không định chọn tấm nào.

      Nhập mã xong thì `unlocked` đổi, effect này chạy lại và tải NGAY — khách
      không phải đợi hết một nhịp.
    */
    if (!unlocked) return;

    let con = true;
    let chamCuoi = Date.now();

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
      Chi hoi khi tab dang mo VA khach vua dong vao trang trong NGHI_SAU gan
      day. Khach de album trong tab nen ca buoi thi khong co ly do gi phai hoi
      may chu — vua ton pin vua ton han muc database.
    */
    const dangXem = () =>
      document.visibilityState === "visible" && Date.now() - chamCuoi < NGHI_SAU;

    const nhip = setInterval(() => {
      if (dangXem()) void tai();
    }, NHIP_DONG_BO);

    /*
      Dong vao trang tro lai: lay ngay mot lan roi moi tinh nhip tiep. Neu chi
      ghi lai moc ma khong tai, khach nghi mot lat roi cham vao se phai doi them
      30 giay moi thay tam ca nha vua chon.
    */
    const daCham = () => {
      const nghiLau = Date.now() - chamCuoi >= NGHI_SAU;
      chamCuoi = Date.now();
      if (nghiLau && document.visibilityState === "visible") void tai();
    };
    const khiQuayLai = () => {
      if (document.visibilityState === "visible") {
        chamCuoi = Date.now();
        void tai();
      }
    };
    document.addEventListener("visibilitychange", khiQuayLai);
    for (const ten of ["pointerdown", "keydown", "scroll"] as const) {
      window.addEventListener(ten, daCham, { passive: true });
    }

    return () => {
      con = false;
      clearInterval(nhip);
      document.removeEventListener("visibilitychange", khiQuayLai);
      for (const ten of ["pointerdown", "keydown", "scroll"] as const) {
        window.removeEventListener(ten, daCham);
      }
    };
    /*
      Co "unlocked" trong day phu thuoc vi may chu gio doi ma moi cho doc danh
      sach. Khach chua nhap ma thi moi nhip deu bi tu choi; nhap xong phai tai
      lai NGAY, khong thi ho ngoi nhin mot man hinh trong toi 15 giay roi tuong
      la nhung tam ca nha da chon truoc do bi mat.
    */
  }, [slug, unlocked]);

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
    (loai: LoaiBaoXong | null, ngay?: string | null) => {
      const truoc = baoXongLuc;
      const truocLoai = loaiBao;
      const truocHan = hanLay;
      setBaoXongLuc(loai ? new Date().toISOString() : null);
      setLoaiBao(loai);
      // Go trang thai thi bo luon han: khach quay lai chon them nghia la lan
      // bao truoc khong con hieu luc, de han cu nam lai la Media doc nham.
      if (!loai) setHanLay(null);
      else if (ngay !== undefined) setHanLay(ngay);

      // Kèm thư mục đang mở: trạng thái xong tính riêng cho từng thư mục.
      fetch("/api/gallery-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          albumId: mucDangXem.id,
          tenMuc: mucDangXem.ten,
          loai,
          // Chi gui khi that su co y dinh dat/xoa han — khong gui thi may chu
          // giu nguyen han cu (xem chu thich trong setMucXong).
          ...(ngay === undefined ? {} : { hanLay: ngay }),
          /*
            Gui kem dang CU cho may chu ban truoc 08/10/2026 van hieu — ban do
            chi doc `xong`. Bo di thi trong vai phut Vercel dang doi ban moi,
            khach bam bao xong se roi vao ham cu va bi coi la "go trang thai".
          */
          xong: loai !== null,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
        })
        .catch(() => {
          setFailed(true);
          setBaoXongLuc(truoc);
          setLoaiBao(truocLoai);
          setHanLay(truocHan);
        });
    },
    [slug, baoXongLuc, loaiBao, hanLay, mucDangXem]
  );

  /*
    Hai cua phai qua truoc khi bao xong, theo dung thu tu nay:

    1. CHUA NHAP MA — hoi ma truoc. Bao xong cung la mot phan cua viec chon.
    2. THU MUC FILE GOC HINH CONG / ALBUM ma chua hen ngay — hoi ngay lay hinh
       (anh yeu cau 05/11/2026). Chi chan dung nut "da chon xong"; nut "chon
       them" (go trang thai) va "can chinh lai" di thang, khong hoi gi.

    Dat cua o DAY chu khong o tung nut: co HAI noi bam bao xong — thanh tren
    cung va khoi cuoi trang (XacNhanXong) — de moi noi tu gac mot cua la som
    muon hai noi lech nhau.
  */
  const baoDaXong = useCallback(
    (loai: LoaiBaoXong | null) => {
      if (!unlocked) {
        dangCho.current = () => baoDaXong(loai);
        setAsking(true);
        return;
      }
      if (loai === "xong" && hoiHanLay && !hanLay) {
        setHoiNgay(true);
        return;
      }
      baoDaXongThat(loai);
    },
    [unlocked, hoiHanLay, hanLay, baoDaXongThat]
  );

  const chotNgayLay = useCallback(
    (ngay: string | null) => {
      setHoiNgay(false);
      baoDaXongThat("xong", ngay);
    },
    [baoDaXongThat]
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
        dòng trùng — một tấm có hai dòng sẽ tính thành hai. Từ khi
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
      /*
        Dem theo TAM, khong theo luot: mot tam nam o hai danh sach van chi la
        mot loi dan can doc. Cung cach `tongSoDaChon` dem, va cung chi tinh
        trong thu muc dang xem.
      */
      soLoiDan: (() => {
        const anh = new Set<string>();
        for (const [k, ghiChu] of selected) {
          if (!ghiChu?.trim()) continue;
          const fileId = k.slice(k.indexOf(":") + 1);
          if (idTrongMuc.has(fileId)) anh.add(fileId);
        }
        return anh.size;
      })(),
      daBaoXong: baoXongLuc !== null,
      loaiBao,
      baoXongLuc,
      baoDaXong,
      hanLay,
      hoiNgay,
      dongHoiNgay: () => setHoiNgay(false),
      chotNgayLay,
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
      loaiBao,
      baoDaXong,
      hanLay,
      hoiNgay,
      chotNgayLay,
    ]
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection(): Ctx {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection phải nằm trong SelectionProvider");
  return ctx;
}
