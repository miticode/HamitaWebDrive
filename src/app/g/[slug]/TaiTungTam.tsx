"use client";

import { useState } from "react";
import {
  coKhayChiaSeNhieu,
  dungLuong,
  luuQuaThe,
  moKhayChiaSeNhieu,
  taiTep,
  type AnhTrongFolder,
  type KetQuaChiaSe,
} from "./taiAnh";

/*
  Tải cả thư mục về ĐIỆN THOẠI: từng tấm ảnh rời, không phải file nén.

  Vì sao không dùng file nén trên điện thoại: phần lớn khách của Hamita chỉ có
  điện thoại và chưa từng giải nén bao giờ. Tải về một tệp .zip là họ nhận được
  một thứ mở ra không xem được, phải đi tìm app giải nén — mà đích đến họ muốn
  chỉ đơn giản là ảnh nằm trong app Ảnh của máy. Studio yêu cầu 07/09/2026: mọi
  thứ phải đơn giản cho khách.

  Hai hệ điều hành đi hai đường khác nhau, vì khả năng của chúng khác nhau
  thật, không phải do chọn cho vui:

  - ANDROID: thẻ tải xuống chạy đúng. Ảnh rơi vào thư mục Tải về, và các app
    xem ảnh (Google Photos, Thư viện) đều liệt kê thư mục đó thành một album.
    Nên cứ tải lần lượt từng tấm, khách không phải chạm thêm cái nào.

  - iPHONE: KHÔNG có API nào cho trang web ghi vào app Ảnh, và thẻ tải xuống
    cũng không chạy — đây là giới hạn của iOS chứ không phải chỗ chưa làm.
    Đường duy nhất tới app Ảnh là khay chia sẻ của hệ điều hành kèm tệp: khách
    bấm "Lưu N ảnh" một cái là cả chụm vào thẳng app Ảnh.

    Khay chia sẻ không ôm nổi vài trăm tấm một lần, và Safari chỉ cho mở khay
    trong vài giây kể từ cú chạm của khách — tải xong vài chục MB thì đã quá
    hạn. Nên chia thành từng ĐỢT: mỗi đợt tải trước vào bộ nhớ rồi mời khách
    chạm một cái để lưu. Đó cũng là "chia tiến độ ra nhiều giai đoạn" mà studio
    yêu cầu.
*/

/** Số ảnh nhiều nhất trong một đợt gửi sang khay chia sẻ của iPhone. */
const TRAN_MOT_DOT_TAM = 20;

/*
  Trần dung lượng một đợt.

  Cả đợt phải nằm trong bộ nhớ cùng lúc thì mới gửi sang khay chia sẻ được.
  100 MB là mức điện thoại đời cũ vẫn kham được; ảnh gốc ở đây trung bình
  1–2 MB nên thường chạm trần số tấm trước, trần này chỉ để chặn những thư mục
  toàn ảnh in khổ lớn vài chục MB một tấm.
*/
const TRAN_MOT_DOT_BYTE = 100 * 1024 ** 2;

/*
  Số tấm tải cùng lúc trong một đợt. Giống lý do ở phần tải file nén: tuần tự
  thì chậm gấp ba, tải hết cùng lúc thì phình bộ nhớ.
*/
const SONG_SONG = 3;

/*
  Nghỉ giữa hai tấm trên Android.

  Không nghỉ thì trình duyệt xếp hàng chục lượt tải chồng lên nhau trong một
  nhịp, máy yếu dễ bỏ sót. 250ms cũng là khoảng đủ để trình quản lý tải kịp
  nhận từng tấm thành một mục riêng.
*/
const NGHI_GIUA_HAI_TAM = 250;

/*
  Giữ đường dẫn tạm ngắn hơn tấm lẻ (4 giây thay vì 10).

  Ảnh đã nằm sẵn trong bộ nhớ nên trình duyệt lưu xuống gần như tức thì; giữ
  lâu chỉ khiến hàng chục tấm cùng tồn tại trong bộ nhớ điện thoại một lúc.
*/
const GIU_DUONG_DAN_MS = 4000;

/** Từ mức này trở lên thì mời khách chuyển sang máy tính. */
const NANG_BYTE = 300 * 1024 ** 2;

type Trang =
  | "san-sang"
  | "hoi-nang"
  | "dang-tai"
  | "cho-cham"
  | "xong"
  | "khong-ho-tro"
  | "loi";

function nghi(ms: number): Promise<void> {
  return new Promise((xong) => setTimeout(xong, ms));
}

export function TaiTungTam({
  slug,
  anh,
  tongByte,
  may,
}: {
  slug: string;
  anh: AnhTrongFolder[];
  tongByte: number;
  may: "ios" | "android";
}) {
  const [trang, setTrang] = useState<Trang>("san-sang");
  /** Số tấm đã xong tính từ đầu thư mục — dùng cho cả thanh tiến độ. */
  const [xong, setXong] = useState(0);
  const [dot, setDot] = useState(0);
  const [boHuy, setBoHuy] = useState<AbortController | null>(null);
  const [tepSan, setTepSan] = useState<File[]>([]);

  /*
    Chia đợt theo CẢ số tấm lẫn dung lượng, lấy cái nào chặt hơn. Dung lượng
    trung bình suy từ tổng của thư mục — không có số đo từng tấm ở đây, nhưng
    trung bình đã đủ để chặn những thư mục ảnh in khổ lớn.
  */
  const trungBinhByte = anh.length > 0 ? tongByte / anh.length : 0;
  const soMoiDot = Math.max(
    1,
    Math.min(
      TRAN_MOT_DOT_TAM,
      trungBinhByte > 0
        ? Math.floor(TRAN_MOT_DOT_BYTE / trungBinhByte) || 1
        : TRAN_MOT_DOT_TAM
    )
  );
  const soDot = Math.max(1, Math.ceil(anh.length / soMoiDot));
  const nang = tongByte >= NANG_BYTE;

  /** Tải một chụm ảnh về bộ nhớ, tối đa SONG_SONG tấm cùng lúc. */
  async function taiChum(
    phan: AnhTrongFolder[],
    batDau: number,
    signal: AbortSignal
  ): Promise<File[]> {
    const tep: File[] = new Array(phan.length);
    let ke = 0;
    let daXong = 0;

    async function tho() {
      while (true) {
        const i = ke++;
        if (i >= phan.length) return;
        tep[i] = await taiTep(phan[i].id, phan[i].name, slug, signal);
        daXong++;
        setXong(batDau + daXong);
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(SONG_SONG, phan.length) }, tho)
    );
    return tep;
  }

  /** Android: tải lần lượt, mỗi tấm rơi thẳng vào thư mục Tải về của máy. */
  async function chayAndroid(dieuKhien: AbortController) {
    for (let i = 0; i < anh.length; i++) {
      const tep = await taiTep(anh[i].id, anh[i].name, slug, dieuKhien.signal);
      if (dieuKhien.signal.aborted) return;
      luuQuaThe(tep, GIU_DUONG_DAN_MS);
      setXong(i + 1);
      if (i < anh.length - 1) await nghi(NGHI_GIUA_HAI_TAM);
      if (dieuKhien.signal.aborted) return;
    }
    setTrang("xong");
  }

  /*
    Sau khi khay chia sẻ đóng lại: còn đợt thì đi tiếp, hết đợt thì báo xong.

    Khách bấm Huỷ trong khay cũng quay về "cho-cham" chứ không bỏ cuộc — tệp
    vẫn nằm sẵn trong bộ nhớ, chạm lại là mở khay ngay, không phải tải lại.
  */
  async function tiepSauKhiChiaSe(
    kq: KetQuaChiaSe,
    dotNay: number,
    dieuKhien: AbortController
  ) {
    if (kq === "xong") {
      if (dotNay + 1 < soDot) {
        await chayIOS(dotNay + 1, dieuKhien);
      } else {
        setTepSan([]);
        setTrang("xong");
      }
      return;
    }
    if (kq === "het-han-cham" || kq === "khach-huy") {
      setTrang("cho-cham");
      return;
    }
    setTrang("khong-ho-tro");
  }

  /** iPhone: tải trước một đợt rồi mời khách chạm để đẩy sang app Ảnh. */
  async function chayIOS(chiSo: number, dieuKhien: AbortController) {
    setDot(chiSo);
    setTrang("dang-tai");

    const batDau = chiSo * soMoiDot;
    const tep = await taiChum(
      anh.slice(batDau, batDau + soMoiDot),
      batDau,
      dieuKhien.signal
    );
    if (dieuKhien.signal.aborted) return;

    if (!coKhayChiaSeNhieu(tep)) {
      setTrang("khong-ho-tro");
      return;
    }
    setTepSan(tep);

    /*
      Thử mở khay ngay trong nhịp này: mạng nhanh thì Safari còn nhận, khách
      đỡ được một cú chạm. Quá hạn thì rơi vào "cho-cham" — tệp đã sẵn sàng.
    */
    await tiepSauKhiChiaSe(await moKhayChiaSeNhieu(tep), chiSo, dieuKhien);
  }

  async function batDau(boQuaCanhBao = false) {
    if (trang === "dang-tai") return;
    if (nang && !boQuaCanhBao) {
      setTrang("hoi-nang");
      return;
    }

    const dieuKhien = new AbortController();
    setBoHuy(dieuKhien);
    setXong(0);
    setTrang("dang-tai");

    try {
      if (may === "android") await chayAndroid(dieuKhien);
      else await chayIOS(0, dieuKhien);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") setTrang("san-sang");
      else setTrang("loi");
    }
  }

  /*
    Đợt đã nằm sẵn trong bộ nhớ, chỉ chờ một cú chạm để mở khay. Phải gọi khay
    NGAY trong sự kiện bấm, không được chèn await nào trước đó.
  */
  async function luuDotDaSan() {
    if (tepSan.length === 0) return;
    const dieuKhien = boHuy ?? new AbortController();
    try {
      await tiepSauKhiChiaSe(
        await moKhayChiaSeNhieu(tepSan),
        dot,
        dieuKhien
      );
    } catch {
      setTrang("loi");
    }
  }

  if (trang === "hoi-nang") {
    return (
      <div className="mt-3 max-w-[15rem] rounded-md border border-amber-300 bg-amber-50 p-3 text-left">
        <p className="text-[0.8125rem] font-medium text-amber-900">
          Bộ này có {anh.length} tấm, nặng {dungLuong(tongByte)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-amber-800">
          {may === "ios"
            ? `Điện thoại lưu được mỗi lần ${soMoiDot} tấm, nên sẽ chia thành ${soDot} đợt, mỗi đợt anh chị chạm "Lưu" một cái.`
            : "Máy sẽ tải lần lượt từng tấm vào thư mục Tải về, mất một lúc và anh chị nên cắm sạc, đừng tắt màn hình ạ."}{" "}
          Nếu tiện, anh chị mở link này trên máy tính thì tải một lần là xong.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={() => setTrang("san-sang")} className="btn flex-1">
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

  if (trang === "cho-cham") {
    return (
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <button onClick={luuDotDaSan} className="btn-primary">
          Lưu {tepSan.length} tấm vào Ảnh
        </button>
        <span className="text-[11px] leading-relaxed text-fg-muted">
          Đợt {dot + 1}/{soDot} · bảng hiện ra anh chị chọn “Lưu {tepSan.length}{" "}
          ảnh” nhé
        </span>
      </div>
    );
  }

  if (trang === "dang-tai") {
    const trongDot = xong - dot * soMoiDot;
    return (
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <button
          onClick={() => {
            boHuy?.abort();
            setTrang("san-sang");
          }}
          className="btn"
          title="Dừng tải"
        >
          {may === "ios"
            ? `Đang lấy đợt ${dot + 1}/${soDot} · ${trongDot}/${Math.min(soMoiDot, anh.length - dot * soMoiDot)} tấm`
            : `Đang lưu ${xong}/${anh.length} tấm — bấm để dừng`}
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
        {may === "android" && (
          <span className="max-w-[13rem] text-[11px] leading-relaxed text-fg-muted">
            Máy hỏi “Tải nhiều tệp?” thì anh chị chọn Cho phép giúp Hamita nhé.
          </span>
        )}
      </div>
    );
  }

  if (trang === "xong") {
    return (
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <p className="text-[0.8125rem] font-medium text-accent">
          Đã lưu xong {anh.length} tấm ạ
        </p>
        <span className="max-w-[13rem] text-[11px] leading-relaxed text-fg-muted">
          {/*
            iPhone nói "mở app Ảnh xem giúp" chứ không khẳng định "ảnh đã nằm
            trong app Ảnh": khay chia sẻ đóng lại là hệ điều hành báo xong, còn
            khách bấm "Lưu ảnh" hay bấm gửi đi đâu khác thì trang web không hề
            biết. Nói chắc điều mình không đo được là nói sai với khách.
          */}
          {may === "ios"
            ? "Anh chị mở app Ảnh xem lại giúp Hamita nhé."
            : "Ảnh nằm trong thư mục Tải về, mở app Thư viện là thấy ạ."}
        </span>
        <button onClick={() => setTrang("san-sang")} className="btn mt-1">
          Tải lại bộ này
        </button>
      </div>
    );
  }

  if (trang === "khong-ho-tro") {
    return (
      <p className="mt-3 max-w-[15rem] text-xs leading-relaxed text-fg-muted">
        Trình duyệt này chưa lưu được cả bộ ảnh anh chị ạ.
        <br />
        Anh chị bấm ••• ở góc trên, chọn mở bằng {may === "ios"
          ? "Safari"
          : "Chrome"}{" "}
        rồi tải lại giúp Hamita nhé.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-col items-center gap-1.5">
      <button onClick={() => batDau()} className="btn">
        {trang === "loi" ? (
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

      {/*
        Lời mời chuyển sang máy tính, đứng sẵn chứ không đợi khách bấm mới hiện
        (studio yêu cầu 07/09/2026). Khách đọc trước khi bấm thì còn kịp đổi ý;
        đọc sau khi đã bấm thì họ đã bắt đầu chờ rồi.
      */}
      {nang && (
        <span className="max-w-[13rem] text-[11px] leading-relaxed text-fg-muted">
          Bộ này nặng {dungLuong(tongByte)} — nếu tiện, anh chị mở link trên máy
          tính rồi tải sẽ nhanh và chắc hơn ạ.
        </span>
      )}
    </div>
  );
}
