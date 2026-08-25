"use client";

import { useCallback, useRef, useState } from "react";
import { downloadZip } from "client-zip";
import { coKhayChiaSe, giaoTepChoKhach, laIOS } from "./taiAnh";

export type AnhTrongFolder = {
  id: string;
  name: string;
  /** Ten thu muc con chua anh — dung lam thu muc trong file nen. */
  section: string | null;
};

type TrangThai =
  | "san-sang"
  | "hoi-tai-lon"
  | "dang-tai"
  | "cho-cham"
  | "khong-ho-tro"
  | "loi";

/*
  So anh tai truoc mot luc.

  Tai tuan tu thi moi tam phai doi tam truoc xong han, 100 tam thanh vai phut
  chet. Tai het cung luc thi vua nang may chu vua phinh bo nho. Ba tam la muc
  vua: nhanh gap ba lan ma chi giu toi da ba tam trong bo nho.
*/
const SONG_SONG = 3;

/*
  Nguong canh bao truoc khi tai thu muc qua nang.

  Do that tren du lieu dang chay: album nang nhat co thu muc toi 1,6 GB. May
  khong ho tro ghi thang xuong dia (Safari, hau het dien thoai) phai gom het
  vao bo nho truoc khi luu — de treo may hoac trinh duyet tu dong. 400 MB la
  muc con nhe nhang tren dien thoai yeu, qua muc do moi dang canh bao.
*/
const NGUONG_CANH_BAO_BYTE = 400 * 1024 ** 2;

/** Ky tu Windows khong cho dat ten tep — thay bang gach ngang. */
function tenAnToan(ten: string): string {
  return ten.replace(/[\/:*?"<>|]/g, "-").trim() || "anh";
}

/**
 * Ten tam anh ben trong file nen. Giu nguyen cach chia thu muc con tren Drive
 * de khach mo ra thay dung nhu luc studio sap xep.
 */
function duongDanTrongZip(anh: AnhTrongFolder, daDung: Set<string>): string {
  const goc = anh.section
    ? `${tenAnToan(anh.section)}/${tenAnToan(anh.name)}`
    : tenAnToan(anh.name);

  let ten = goc;
  let lan = 2;
  // Hai thu muc con co the co tam anh trung ten; file nen khong chua noi hai
  // duong dan giong het nhau nen phai danh so.
  while (daDung.has(ten)) {
    const cham = goc.lastIndexOf(".");
    ten =
      cham > 0
        ? `${goc.slice(0, cham)} (${lan})${goc.slice(cham)}`
        : `${goc} (${lan})`;
    lan++;
  }
  daDung.add(ten);
  return ten;
}

function dungLuong(byte: number): string {
  if (byte >= 1024 ** 3) return `${(byte / 1024 ** 3).toFixed(1).replace(".", ",")} GB`;
  return `${Math.round(byte / 1024 ** 2)} MB`;
}

type LuuTep = (tuyChon: {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}) => Promise<{ createWritable: () => Promise<WritableStream<unknown>> }>;

export function NutTaiFolder({
  slug,
  ten,
  anh,
  tongByte,
}: {
  slug: string;
  ten: string;
  anh: AnhTrongFolder[];
  tongByte: number;
}) {
  const [trangThai, setTrangThai] = useState<TrangThai>("san-sang");
  const [xong, setXong] = useState(0);
  const huy = useRef<AbortController | null>(null);
  const tepSan = useRef<File | null>(null);

  const batDau = useCallback(async (boQuaCanhBao = false) => {
    if (trangThai === "dang-tai") return;

    /*
      Hoi cho luu TRUOC khi lam bat cu viec gi khac: trinh duyet chi cho mo hop
      thoai nay ngay sau cu bam cua khach, cham mot nhip la no tu choi.
    */
    const moHopThoai = (window as unknown as { showSaveFilePicker?: LuuTep })
      .showSaveFilePicker;

    /*
      May co the ghi thang xuong dia thi khong sao dau kich thuoc — khong bao
      gio giu ca goi trong bo nho. Chi may KHONG co API do (Safari, hau het
      dien thoai) moi that su rui ro, va chi hoi mot lan cho moi lan bam.
    */
    if (
      typeof moHopThoai !== "function" &&
      tongByte > NGUONG_CANH_BAO_BYTE &&
      !boQuaCanhBao
    ) {
      setTrangThai("hoi-tai-lon");
      return;
    }
    const tenTep = `${tenAnToan(ten)}.zip`;
    let noiLuu: Awaited<ReturnType<LuuTep>> | null = null;

    if (typeof moHopThoai === "function") {
      try {
        noiLuu = await moHopThoai({
          suggestedName: tenTep,
          types: [{ description: "File nén", accept: { "application/zip": [".zip"] } }],
        });
      } catch {
        // Khach bam Huy o hop thoai, hoac trinh duyet tu choi — im lang di tiep.
        return;
      }
    } else if (laIOS()) {
      /*
        Tren iOS the tai xuong khong chay, chi con duong khay chia se. Thu truoc
        bang mot tep gia: khong mo duoc thi bao ngay, khong bat khach doi vai
        phut tai xong roi moi vo mong.
      */
      const thu = new File([new Uint8Array(1)], "thu.zip", { type: "application/zip" });
      if (!coKhayChiaSe(thu)) {
        setTrangThai("khong-ho-tro");
        return;
      }
    }

    const boHuy = new AbortController();
    huy.current = boHuy;
    setXong(0);
    setTrangThai("dang-tai");

    async function* nguon() {
      const hangDoi: Promise<Response>[] = [];
      let ke = 0;
      const themVaoHang = () => {
        if (ke >= anh.length) return;
        const a = anh[ke++];
        hangDoi.push(
          fetch(`/api/download/${a.id}?slug=${encodeURIComponent(slug)}`, {
            signal: boHuy.signal,
          })
        );
      };
      for (let i = 0; i < SONG_SONG; i++) themVaoHang();

      const daDung = new Set<string>();
      for (let i = 0; i < anh.length; i++) {
        const res = await hangDoi[i];
        // fetch khong nem loi khi may chu tra ve 4xx/5xx — phai tu kiem tra,
        // bo qua la file nen co mot tam anh rong ma khach khong hay biet.
        if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
        themVaoHang();
        yield { name: duongDanTrongZip(anh[i], daDung), input: res };
        setXong(i + 1);
      }
    }

    try {
      const goi = downloadZip(nguon());

      if (noiLuu) {
        // Ghi thang xuong o dia theo dong chay, khong bao gio giu ca goi trong
        // bo nho — nho vay thu muc vai GB van tai duoc.
        const ghi = await noiLuu.createWritable();
        await goi.body!.pipeTo(ghi as WritableStream<Uint8Array>);
      } else {
        const blob = await goi.blob();
        const tep = new File([blob], tenTep, { type: "application/zip" });
        tepSan.current = tep;
        const cach = await giaoTepChoKhach(tep);
        if (cach !== "xong") {
          setTrangThai(cach === "cho-cham" ? "cho-cham" : "khong-ho-tro");
          return;
        }
      }
      setTrangThai("san-sang");
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setTrangThai("san-sang");
        return;
      }
      setTrangThai("loi");
    } finally {
      huy.current = null;
    }
  }, [trangThai, ten, anh, slug, tongByte]);

  /*
    Goi da nam san trong bo nho, chi con doi mot cu cham de mo khay chia se.
    Phai goi thang trong su kien bam, khong duoc chen await nao truoc do.
  */
  const luuLai = async () => {
    const tep = tepSan.current;
    if (!tep) return;
    const cach = await giaoTepChoKhach(tep);
    if (cach === "xong") setTrangThai("san-sang");
    else if (cach === "khong-ho-tro") setTrangThai("khong-ho-tro");
  };

  if (trangThai === "hoi-tai-lon") {
    return (
      <div className="mt-3 max-w-[15rem] rounded-md border border-amber-300 bg-amber-50 p-3 text-left">
        <p className="text-[0.8125rem] font-medium text-amber-900">
          Bộ này nặng những {dungLuong(tongByte)} lận
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          Máy này phải gom hết ảnh vào bộ nhớ rồi mới lưu được, nên có thể chậm
          hoặc đơ máy anh chị ạ. Nếu tiện, anh chị mở bằng Chrome hoặc Edge trên
          máy tính thì ảnh tải thẳng xuống ổ đĩa, nặng bao nhiêu cũng được.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setTrangThai("san-sang")} className="btn flex-1">
            Huỷ
          </button>
          <button
            onClick={() => batDau(true)}
            className="btn flex-1 border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
          >
            Vẫn tải
          </button>
        </div>
      </div>
    );
  }

  /*
    Nút này trước đây nhấp nháy để khách chú ý (gói ảnh đã tải xong, chỉ còn
    chờ một cú chạm nữa là mở được khay chia sẻ). Bỏ nhấp nháy theo yêu cầu,
    đổi sang kiểu nút chính: nền đậm nổi hẳn giữa các nút viền mảnh xung
    quanh, bắt mắt mà không phải nhúc nhích.
  */
  if (trangThai === "cho-cham") {
    return (
      <button onClick={luuLai} className="btn-primary mt-3">
        Lưu bộ ảnh · {dungLuong(tongByte)}
      </button>
    );
  }

  if (trangThai === "khong-ho-tro") {
    return (
      <p className="mt-3 text-xs leading-relaxed text-fg-muted">
        Trình duyệt này chưa lưu được cả bộ ảnh anh chị ạ.
        <br />
        Anh chị bấm ••• ở góc trên, chọn mở bằng Safari rồi tải lại giúp Hamita nhé.
      </p>
    );
  }

  if (trangThai === "dang-tai") {
    return (
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <button
          onClick={() => huy.current?.abort()}
          className="btn"
          title="Dừng tải"
        >
          Đang tải {xong}/{anh.length} — bấm để dừng
        </button>
        <span
          aria-hidden
          className="h-[2px] w-32 overflow-hidden rounded-full bg-line"
        >
          <span
            className="block h-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round((xong / anh.length) * 100)}%` }}
          />
        </span>
      </div>
    );
  }

  return (
    <button onClick={() => batDau()} className="btn mt-3">
      {trangThai === "loi" ? (
        <span className="text-red-600">Chưa tải được — bấm thử lại nhé</span>
      ) : (
        <>
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" />
          </svg>
          Tải tất cả · {dungLuong(tongByte)}
        </>
      )}
    </button>
  );
}
