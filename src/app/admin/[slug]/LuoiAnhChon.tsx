"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnhChon = {
  id: string;
  driveFileId: string;
  fileName: string;
  note: string | null;
};

/**
 * Lưới ảnh khách đã chọn ở trang quản lý, bấm vào là xem to.
 *
 * Trước đây mỗi ô chỉ là một tấm 320px tĩnh, bấm vào không có gì xảy ra. Studio
 * muốn xem kỹ một tấm thì phải mở Drive tìm đúng tên file — mà đây lại là lúc
 * cần nhìn kỹ nhất: đối chiếu tấm khách chọn với lời họ dặn trước khi giao in.
 *
 * Giữ ĐÚNG bộ phím của khung xem ảnh phía khách (`PhotoGrid.tsx`): Esc đóng,
 * mũi tên trái/phải chuyển tấm, vuốt ngang trên điện thoại. Hai khung khác nhau
 * mà cùng một người dùng — studio xem thử album của khách rồi quay lại trang
 * này, tay quen phím nào thì phím đó phải chạy.
 */
export function LuoiAnhChon({ anh }: { anh: AnhChon[] }) {
  const [mo, setMo] = useState<number | null>(null);

  return (
    <>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {anh.map((row, i) => (
          <figure
            key={row.id}
            className="skeleton overflow-hidden rounded-sm bg-bg-raised"
          >
            {/*
              Nút bọc quanh ảnh chứ không gắn onClick thẳng lên thẻ ảnh: có nút
              thì bàn phím Tab tới được và Enter mở được, còn ảnh trần thì chỉ
              chuột mới bấm nổi.
            */}
            <button
              type="button"
              onClick={() => setMo(i)}
              className="block w-full cursor-zoom-in"
              title={`Xem to — ${row.fileName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/img/${row.driveFileId}?w=320`}
                alt={row.fileName}
                loading="lazy"
                className="aspect-[3/4] w-full object-cover transition duration-300 hover:opacity-85"
              />
            </button>

            {/*
              Lời dặn hiện ĐẦY ĐỦ, không cắt bớt bằng truncate như tên file. Tên
              file cắt mất một đoạn vẫn đoán được; lời dặn cắt mất một đoạn là
              đọc sai ý khách — "in cỡ 40x60" cắt còn "in cỡ 40..." thì bên in
              làm sao biết.

              Hiện ở CẢ HAI danh sách, không riêng "Ảnh in". Đơn giao in chỉ lấy
              danh sách trái tim (nguyên tắc 28) nên lời dặn khách ghi trên tấm
              giữ riêng trước đây không hiện ở đâu cả — gõ xong rồi không ai đọc.
            */}
            <figcaption className="px-1.5 py-1.5">
              <span className="block truncate text-[11px] text-fg-faint">
                {row.fileName}
              </span>
              {row.note && (
                <span className="mt-1 block rounded-sm bg-amber-100 px-1.5 py-1 text-[11px] leading-snug text-amber-900">
                  {row.note}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {mo !== null && (
        <KhungXem
          anh={anh}
          viTri={mo}
          /*
            Nhận HÀM tính vị trí mới từ vị trí cũ, không nhận thẳng con số. Xem
            chú thích ở `di()` trong KhungXem để biết vì sao.
          */
          doiViTri={(tinh) => setMo((cu) => (cu === null ? null : tinh(cu)))}
          dong={() => setMo(null)}
        />
      )}
    </>
  );
}

/**
 * Khung xem một tấm ảnh cỡ lớn.
 *
 * Nền đen cố định, không theo tông sáng/tối của trang quản lý — cùng lý do với
 * khung xem ảnh phía khách (nguyên tắc 12): nền kem hắt màu lên ảnh, nhìn một
 * tấm ảnh cưới trên nền đó không đánh giá được màu da và màu váy.
 */
function KhungXem({
  anh,
  viTri,
  doiViTri,
  dong,
}: {
  anh: AnhChon[];
  viTri: number;
  doiViTri: (tinh: (cu: number) => number) => void;
  dong: () => void;
}) {
  const tam = anh[viTri];

  /*
    Vị trí ngón tay lúc bắt đầu vuốt. Phải là ref của từng khung, không phải
    một biến dùng chung ngoài component: trang này có nhiều lưới (mỗi thư mục
    một cái), dùng chung một biến là hai lưới giẫm lên nhau.
  */
  const batDau = useRef<number | null>(null);

  /*
    Chạy vòng: hết tấm cuối thì về tấm đầu, khỏi phải bấm ngược cả lượt.

    Tính từ vị trí CŨ do React đưa vào, không đọc `viTri` trong closure — đây
    là bẫy "state cũ trong closure" đã ghi trong CLAUDE.md và ở đây nó lộ ra
    thật: giữ mũi tên cho phím tự lặp thì nhiều sự kiện rơi vào cùng một nhịp,
    React chưa kịp vẽ lại nên lần nào cũng tính từ đúng một vị trí. Đo trước
    khi sửa: đang ở tấm 2, bấm trái hai lần ra tấm 1 thay vì tấm 10 — nuốt mất
    một bước.

    Nhờ vậy `di` cũng không còn phụ thuộc `viTri`, nên effect gắn phím không
    phải tháo ra lắp lại mỗi lần đổi tấm.
  */
  const di = useCallback(
    (buoc: number) => doiViTri((cu) => (cu + buoc + anh.length) % anh.length),
    [anh.length, doiViTri],
  );

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
      if (e.key === "ArrowLeft") di(-1);
      if (e.key === "ArrowRight") di(1);
    };
    window.addEventListener("keydown", phim);

    // Khoá cuộn nền phía sau, không thì cuộn chuột làm trôi trang bên dưới.
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", phim);
      document.body.style.overflow = cu;
    };
  }, [di, dong]);

  /*
    Tải sẵn tấm kế bên. Studio hay bấm mũi tên lướt qua cả loạt để đối chiếu,
    đợi từng tấm tải mới thì lướt không nổi.
  */
  useEffect(() => {
    for (const ke of [viTri + 1, viTri - 1]) {
      const p = anh[(ke + anh.length) % anh.length];
      if (p) new window.Image().src = `/api/img/${p.driveFileId}?w=1440`;
    }
  }, [viTri, anh]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#0d0b0a] select-none"
      onTouchStart={(e) => {
        batDau.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (batDau.current === null) return;
        const dx = e.changedTouches[0].clientX - batDau.current;
        if (Math.abs(dx) > 45) di(dx < 0 ? 1 : -1);
        batDau.current = null;
      }}
    >
      <div className="flex items-start gap-3 px-4 py-3 text-white/80">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{tam.fileName}</p>
          <p className="mt-0.5 text-xs text-white/45">
            {viTri + 1}/{anh.length}
          </p>
        </div>
        <button
          type="button"
          onClick={dong}
          aria-label="Đóng"
          className="-my-1.5 grid size-11 shrink-0 place-items-center rounded-full text-xl text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/*
        Bấm vào khoảng trống hai bên ảnh thì đóng — thói quen ai cũng có. Bấm
        vào chính tấm ảnh thì KHÔNG đóng, nên thẻ ảnh chặn sự kiện lại.
      */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2"
        onClick={dong}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/img/${tam.driveFileId}?w=1440`}
          alt={tam.fileName}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full object-contain"
        />

        {anh.length > 1 && (
          <>
            <NutChuyen huong="trai" onClick={() => di(-1)} />
            <NutChuyen huong="phai" onClick={() => di(1)} />
          </>
        )}
      </div>

      {/*
        Lời dặn nằm dưới ảnh trong khung xem to. Đây mới là chỗ studio đọc nó:
        đang nhìn kỹ đúng tấm đó để quyết chỉnh sửa thế nào.
      */}
      {tam.note && (
        <div className="px-4 pb-4">
          <p className="mx-auto max-w-2xl rounded-md bg-amber-100 px-3.5 py-2.5 text-sm leading-relaxed text-amber-900">
            {tam.note}
          </p>
        </div>
      )}
    </div>
  );
}

function NutChuyen({
  huong,
  onClick,
}: {
  huong: "trai" | "phai";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={huong === "trai" ? "Tấm trước" : "Tấm sau"}
      className={`absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-lg text-white/80 transition hover:bg-black/60 hover:text-white ${
        huong === "trai" ? "left-2" : "right-2"
      }`}
    >
      {huong === "trai" ? "‹" : "›"}
    </button>
  );
}
