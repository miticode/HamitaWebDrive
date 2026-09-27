"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { setGoiAnhAction, setGoiMucAction } from "./actions";

type Muc = { id: string; ten: string; soAnh: number };

/**
 * Số ảnh in đã bao gồm trong gói khách mua.
 *
 * Hiện ở phần hướng dẫn chọn ảnh phía khách, bước "thả tim ảnh muốn in". Mỗi
 * gói mỗi khác nên phải đặt riêng từng album; để trống thì phần hướng dẫn bỏ
 * hẳn đoạn giá cả, chỉ nói cách chọn — hợp với album studio không tính theo gói.
 *
 * Từ 10/09/2026 đặt được RIÊNG TỪNG THƯ MỤC nữa. Lý do studio đưa ra: một nhà
 * khách có thể chụp làm nhiều đợt cách nhau cả tháng — chụp cổng trước, ít lâu
 * sau mới chụp cưới — và mỗi đợt là một gói với số tấm in khác nhau. Con số
 * chung ở trên vẫn là mặc định cho những thư mục không đặt riêng, nên album
 * chỉ có một gói duy nhất (phần lớn) không phải đụng gì tới phần đó.
 *
 * Giá mỗi tấm vượt gói KHÔNG sửa ở đây: đó là con số cố định của studio, giống
 * nhau ở mọi gói. Cho sửa riêng từng album chỉ thêm một ô để gõ nhầm mà không
 * được lợi gì — muốn đổi giá thì sửa GIA_ANH_THEM_MAC_DINH trong constants.ts,
 * một chỗ đổi là cả hệ thống đổi theo.
 */
export function GoiAnh({
  galleryId,
  folderId,
  soAnhTrongGoi,
  giaAnhThem,
  goiMuc,
}: {
  galleryId: string;
  /** Mã thư mục trên Drive — để đọc danh sách thư mục con khi mở ô sửa. */
  folderId: string;
  soAnhTrongGoi: number | null;
  /** Chỉ để hiển thị — ô này không sửa được giá. */
  giaAnhThem: number;
  /** Thư mục nào đã đặt gói riêng. Rỗng = cả album dùng chung một con số. */
  goiMuc: { albumId: string; tenMuc: string; soAnh: number }[];
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [soAnh, setSoAnh] = useState(soAnhTrongGoi?.toString() ?? "");
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLuu, start] = useTransition();

  const luu = () =>
    start(async () => {
      const kq = await setGoiAnhAction(galleryId, soAnh);
      if (kq?.error) {
        setLoi(kq.error);
        return;
      }
      setMo(false);
      setLoi(null);
      router.refresh();
    });

  const huy = () => {
    setMo(false);
    setLoi(null);
    setSoAnh(soAnhTrongGoi?.toString() ?? "");
  };

  if (!mo) {
    return (
      <div className="flex items-baseline gap-2 py-2 text-xs">
        <span className="w-24 shrink-0 text-fg-muted">Gói ảnh</span>
        {/*
          Cho chữ XUỐNG DÒNG, bỏ hẳn `truncate`.

          Ô này chỉ rộng 150px trong thẻ album — đo thật — nên cả hai dòng đều
          không vừa, và cắt đi thì mất đúng phần quan trọng:

          - Chưa đặt: "chưa đặt — không nói giá với khách" cụt thành "chưa đặt —
            không nó…", mất vế nói rõ hậu quả. Studio đọc dòng đó rồi vẫn đi tìm
            khối gói ảnh trên điện thoại khách, không hiểu vì sao không thấy
            (03/09/2026). Câu cũng viết lại cho nói thẳng vào thứ nhìn thấy được.
          - Đã đặt: "33 ảnh · thêm 10.000đ/ảnh" cụt mất đuôi giá. Cắt cụt một
            con số tiền là chuyện không nên làm, dù đọc lướt vẫn đoán ra.

          Đổi lại thẻ album cao thêm một dòng. Đáng — thẻ này vốn đã dài, thêm
          16px không đổi gì, còn đọc nhầm giá thì đổi.
        */}
        <span
          className={`min-w-0 flex-1 leading-relaxed ${
            soAnhTrongGoi === null ? "text-fg-faint" : ""
          }`}
        >
          {/*
            BA trạng thái, không phải hai. Phải so với null chứ không dùng
            `soAnhTrongGoi ? …` như trước: số 0 cũng là giá trị "sai" trong
            JavaScript nên gói 0 tấm sẽ bị đọc nhầm thành chưa đặt.
          */}
          {soAnhTrongGoi === null ? (
            "chưa đặt — khách không thấy khối gói ảnh"
          ) : soAnhTrongGoi === 0 ? (
            <>
              <b>chỉ lấy file</b> · in thêm {tien(giaAnhThem)}đ/ảnh
            </>
          ) : (
            <>
              <b>{soAnhTrongGoi}</b> ảnh · thêm {tien(giaAnhThem)}đ/ảnh
            </>
          )}

          {/*
            Nói rõ có thư mục đang chạy gói riêng, ngay ở dòng thu gọn.

            Thiếu dòng này thì con số ở trên nói dối: thẻ ghi "110 ảnh" trong
            khi thư mục khách đang mở lại là gói 30 tấm. Studio nhìn thẻ để trả
            lời khách qua điện thoại — đọc nhầm một lần là báo sai giá.
          */}
          {goiMuc.length > 0 && (
            <span className="mt-0.5 block text-fg-faint">
              {goiMuc.length} thư mục đặt gói riêng
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setMo(true)}
          className="shrink-0 text-fg-faint underline underline-offset-2 hover:text-accent"
        >
          sửa
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border border-line-strong bg-bg-soft p-3">
      <label className="eyebrow block">Số ảnh in có sẵn trong gói</label>
      <input
        type="number"
        min={0}
        value={soAnh}
        autoFocus
        onChange={(e) => setSoAnh(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") luu();
          if (e.key === "Escape") huy();
        }}
        placeholder="0 = chỉ lấy file · để trống = không tính theo gói"
        className="input mt-1.5"
      />

      {/*
        Cho xem trước ĐÚNG câu khách sẽ đọc, theo cả ba trạng thái.

        So bằng chuỗi rỗng chứ không viết `soAnh ? …`: gõ "0" vào ô thì `soAnh`
        là chuỗi "0" — vẫn là chuỗi có nội dung nên nhánh này chạy đúng, nhưng
        nếu ai đó đổi sang so với số thì 0 sẽ rơi nhầm sang nhánh "để trống".
        Ba trạng thái viết rõ ba nhánh cho khỏi vấp.
      */}
      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        {soAnh.trim() === ""
          ? "Để trống thì phần hướng dẫn cho khách bỏ hẳn đoạn giá cả, chỉ nói cách chọn ảnh."
          : soAnh.trim() === "0"
            ? `Khách sẽ đọc: "Gói của anh chị là gói chỉ lấy file ảnh, không kèm ảnh in. Tấm nào anh chị muốn Hamita in ra thì mỗi tấm ${tien(giaAnhThem)}đ ạ."`
            : `Khách sẽ đọc 3 dòng: "Gói của anh chị cần tim ${soAnh} tấm." · "Ghi chú vào ảnh: ảnh cổng, ảnh bàn, ảnh bìa,…" · "Chi phí phát sinh thêm trên mỗi tấm ảnh là ${tien(giaAnhThem)}đ."`}
      </p>

      <p className="mt-2 text-[11px] leading-relaxed text-fg-faint">
        Giá ảnh thêm cố định {tien(giaAnhThem)}đ/ảnh cho mọi gói. Muốn đổi giá
        thì báo em sửa trong mã nguồn, đổi một lần áp dụng cho tất cả album.
      </p>

      {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={luu} disabled={dangLuu} className="btn">
          {dangLuu ? "Đang lưu…" : "Lưu"}
        </button>
        <button type="button" onClick={huy} className="btn">
          Huỷ
        </button>
      </div>

      <GoiTungMuc
        galleryId={galleryId}
        folderId={folderId}
        goiChung={soAnhTrongGoi}
        giaAnhThem={giaAnhThem}
        goiMuc={goiMuc}
      />
    </div>
  );
}

/**
 * Phần đặt gói riêng cho từng thư mục con.
 *
 * Nằm DƯỚI con số chung chứ không thay nó: thứ tự trên màn hình theo đúng thứ
 * tự trong đầu studio — gói của nhà này là bao nhiêu, rồi mới tới "riêng đợt
 * chụp cổng thì khác".
 *
 * Danh sách thư mục đọc từ /api/admin/photos vì cột `subfolders` trong database
 * chỉ lưu TÊN chứ không lưu mã, mà gói riêng phải gắn theo mã — gắn theo tên
 * thì studio đổi tên thư mục trên Drive là đứt ngay (cùng lý do với ảnh bìa
 * từng thư mục, xem chú thích trong route đó).
 */
function GoiTungMuc({
  galleryId,
  folderId,
  goiChung,
  giaAnhThem,
  goiMuc,
}: {
  galleryId: string;
  folderId: string;
  goiChung: number | null;
  giaAnhThem: number;
  goiMuc: { albumId: string; tenMuc: string; soAnh: number }[];
}) {
  const router = useRouter();
  const [mucs, setMucs] = useState<Muc[] | null>(null);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  /** Mã thư mục đang lưu — để chỉ khoá đúng một dòng, không khoá cả bảng. */
  const [dangLuu, setDangLuu] = useState<string | null>(null);
  const [loiLuu, setLoiLuu] = useState<string | null>(null);

  useEffect(() => {
    let boQua = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/photos?folder=${encodeURIComponent(folderId)}`,
        );
        const data = await res.json();
        if (boQua) return;
        if (!res.ok) {
          setLoiTai(data.error ?? "Không đọc được danh sách thư mục.");
          return;
        }
        setMucs(data.mucs ?? []);
      } catch {
        if (!boQua) setLoiTai("Không đọc được danh sách thư mục.");
      }
    })();
    return () => {
      boQua = true;
    };
  }, [folderId]);

  const luuMuc = async (muc: Muc, giaTri: string) => {
    setDangLuu(muc.id);
    setLoiLuu(null);
    const kq = await setGoiMucAction(galleryId, muc.id, muc.ten, giaTri);
    setDangLuu(null);
    if (kq?.error) {
      setLoiLuu(kq.error);
      return;
    }
    router.refresh();
  };

  if (loiTai) {
    return <p className="mt-4 text-xs text-red-700">{loiTai}</p>;
  }
  if (mucs === null) {
    return (
      <p className="mt-4 text-xs text-fg-faint">Đang đọc danh sách thư mục…</p>
    );
  }

  /*
    Chỉ hiện phần này khi album THẬT SỰ có nhiều hơn một thư mục.

    Album một thư mục thì "gói riêng của thư mục" và "gói chung" là cùng một
    con số; bày ra hai ô cho cùng một thứ chỉ tạo cơ hội đặt lệch nhau rồi ngồi
    tìm xem cái nào đang thắng.
  */
  if (mucs.length < 2) return null;

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="eyebrow">Gói riêng từng thư mục</p>
      <p className="mt-1 text-[11px] leading-relaxed text-fg-faint">
        Dùng khi nhà này chụp nhiều đợt, mỗi đợt một gói khác nhau. Để trống thì
        thư mục đó theo gói chung ở trên.
      </p>

      <div className="mt-2.5 flex flex-col gap-2.5">
        {mucs.map((muc) => (
          <DongMuc
            key={muc.id || "goc"}
            muc={muc}
            soDaDat={goiMuc.find((g) => g.albumId === muc.id)?.soAnh ?? null}
            goiChung={goiChung}
            dangLuu={dangLuu === muc.id}
            onLuu={(giaTri) => luuMuc(muc, giaTri)}
          />
        ))}
      </div>

      {loiLuu && <p className="mt-2 text-xs text-red-700">{loiLuu}</p>}

      <p className="mt-2.5 text-[11px] leading-relaxed text-fg-faint">
        Đơn giao in tính tiền theo đúng gói của từng thư mục, giá vượt gói vẫn
        là {tien(giaAnhThem)}đ/ảnh cho mọi thư mục.
      </p>
    </div>
  );
}

/** Một dòng thư mục trong phần gói riêng. */
function DongMuc({
  muc,
  soDaDat,
  goiChung,
  dangLuu,
  onLuu,
}: {
  muc: Muc;
  /** Số đã đặt riêng cho thư mục này. null = đang theo gói chung. */
  soDaDat: number | null;
  goiChung: number | null;
  dangLuu: boolean;
  onLuu: (giaTri: string) => void;
}) {
  const banDau = soDaDat === null ? "" : String(soDaDat);
  const [giaTri, setGiaTri] = useState(banDau);

  /*
    Số ở máy chủ đổi (vừa lưu xong, hoặc mở lại thẻ) thì ô nhập phải theo.

    So với lượt trước NGAY TRONG THÂN component thay vì dùng useEffect — đây là
    cách React khuyên cho việc "đặt lại state khi một giá trị đầu vào đổi", và
    ESLint của React 19 chặn kiểu viết bằng effect. CoverPicker đang làm y hệt.
  */
  const [banDauTruoc, setBanDauTruoc] = useState(banDau);
  if (banDau !== banDauTruoc) {
    setBanDauTruoc(banDau);
    setGiaTri(banDau);
  }

  const doi = giaTri.trim() !== banDau;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        {/*
          Tên thư mục xuống dòng chứ không cắt cụt: tên do studio đặt trên
          Drive, có cái dài ("hami5 album20x20 lụa cán m"), mà cắt đi thì hai
          thư mục khác nhau nhìn giống hệt nhau — đúng lúc đang gán tiền cho
          từng cái.
        */}
        <span className="min-w-0 flex-1 text-xs leading-snug break-words">
          {muc.ten || "(ảnh ngoài thư mục con)"}
        </span>
        <span className="shrink-0 text-[11px] text-fg-faint">
          {muc.soAnh} ảnh
        </span>
      </div>

      <div className="mt-1 flex items-center gap-1.5">
        <input
          type="number"
          min={0}
          value={giaTri}
          disabled={dangLuu}
          onChange={(e) => setGiaTri(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && doi) onLuu(giaTri);
          }}
          placeholder={
            goiChung === null ? "theo gói chung" : `theo gói chung (${goiChung})`
          }
          className="input"
        />
        {/*
          Nút chỉ hiện khi con số đã đổi. Lúc chưa đổi thì bấm nó không làm gì —
          một nút không làm gì đứng cạnh ô nhập chỉ khiến người ta bấm thử rồi
          phân vân không biết đã lưu chưa.
        */}
        {doi && (
          <button
            type="button"
            onClick={() => onLuu(giaTri)}
            disabled={dangLuu}
            className="btn shrink-0"
          >
            {dangLuu ? "…" : "Lưu"}
          </button>
        )}
      </div>
    </div>
  );
}
