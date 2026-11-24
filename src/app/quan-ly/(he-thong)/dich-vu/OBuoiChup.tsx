"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { datBuoiDichVuAction } from "../../actionsDichVu";

export type LoaiChon = { id: string; ten: string };

/*
  Ô BUỔI CHỤP MẶC ĐỊNH CỦA DỊCH VỤ — anh yêu cầu 18/11/2026.

  "Mỗi dịch vụ đều đi kèm loại buổi chụp, để khi lập hợp đồng chọn dịch vụ là
  có sẵn lịch chụp và loại buổi luôn, người lập chỉ chọn ngày giờ thôi."

  Gắn ngay trên bảng chứ không bắt vào trang chi tiết — bài học 18/11 khi anh
  bảo "làm nút gắn tag nhanh ở ngoài để k phải đi vô chi tiết để sửa". Bảng có
  95 dịch vụ, vào ra từng trang là 95 lần tải.

  Khác ô mã album ở một chỗ: đây chọn NHIỀU và CÓ THỨ TỰ, lặp lại được. Nên
  không lưu ngay mỗi lần bấm — bấm xong cả danh sách rồi mới Lưu, nếu không
  một gói hai buổi phải gọi máy chủ hai lần và nửa chừng hỏng là hỏng nửa.
*/
export function OBuoiChup({
  dichVuId,
  banDau,
  dsLoai,
  suaDuoc,
}: {
  dichVuId: string;
  /** Danh sách đang có, đúng thứ tự. Lặp tên là có thật. */
  banDau: LoaiChon[];
  /** Mọi loại buổi đang dùng, để chọn. */
  dsLoai: LoaiChon[];
  suaDuoc: boolean;
}) {
  const router = useRouter();
  const [chon, setChon] = useState<LoaiChon[]>(banDau);
  const [mo, setMo] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const khung = useRef<HTMLDivElement>(null);
  const nut = useRef<HTMLButtonElement>(null);
  const [viTri, setViTri] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => setChon(banDau), [banDau]);

  /*
    TOẠ ĐỘ CỦA BẢNG CHỌN, TÍNH BẰNG TAY — sửa 24/11/2026.

    Trước đây nó là `absolute` trong ô bảng. Từ lúc bảng dịch vụ dùng chung
    `Bang`, khung bảng mang `overflow-x: auto` (để bảng rộng cuộn ngang trên
    màn hẹp), mà một phần tử có `overflow` thì CẮT mọi con `absolute` của nó —
    và vì bảng chọn cao hơn hàng nên khung còn mọc thêm thanh cuộn dọc.

    Đo được ở máy 24/11: bảng chọn cao 378px, đáy ở y=533, trong khi khung bảng
    kết thúc ở y=246; `scrollHeight` 452 so với `clientHeight` 164.

    `fixed` không bị `overflow` của tổ tiên cắt (chỉ `transform`, `filter`,
    `perspective` hay `contain` mới tạo khung chứa mới — khung bảng không có
    thứ nào), nên đổi sang `fixed` là thoát hẳn, đổi lại phải tự tính toạ độ.
  */
  const doViTri = useCallback(() => {
    const n = nut.current;
    if (!n) return;
    const r = n.getBoundingClientRect();
    const RONG = 288; /* w-72 */
    const LE = 8;
    /* Chiều cao thật nếu đã render, chưa thì ước chừng cho lần mở đầu. */
    const cao = Math.min(khung.current?.querySelector("[data-bang-chon]")?.getBoundingClientRect().height ?? 320, window.innerHeight * 0.7);
    /* Dưới nút không đủ chỗ thì lật lên trên; vẫn không đủ thì ghìm trong màn. */
    const duoi = r.bottom + 4;
    const top = duoi + cao <= window.innerHeight - LE ? duoi : Math.max(LE, Math.min(r.top - cao - 4, window.innerHeight - cao - LE));
    const left = Math.min(Math.max(LE, r.left), window.innerWidth - RONG - LE);
    setViTri({ top, left });
  }, []);

  useEffect(() => {
    if (!mo) return;
    doViTri();
    /*
      Trang cuộn hay đổi cỡ thì toạ độ cũ sai ngay. Nghe ở pha BẮT (`true`) để
      nhận cả cú cuộn trong khung bảng, không chỉ cuộn cả trang.
    */
    const lai = () => doViTri();
    window.addEventListener("scroll", lai, true);
    window.addEventListener("resize", lai);
    return () => {
      window.removeEventListener("scroll", lai, true);
      window.removeEventListener("resize", lai);
    };
  }, [mo, doViTri, chon.length]);

  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => {
      if (khung.current && !khung.current.contains(e.target as Node)) {
        setMo(false);
        setChon(banDau);
      }
    };
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMo(false);
        setChon(banDau);
      }
    };
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", phim);
    return () => {
      document.removeEventListener("mousedown", ngoai);
      document.removeEventListener("keydown", phim);
    };
  }, [mo, banDau]);

  const luu = () =>
    batDau(async () => {
      setLoi(null);
      const kq = await datBuoiDichVuAction(
        dichVuId,
        chon.map((x) => x.id),
      );
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setMo(false);
      router.refresh();
    });

  if (!suaDuoc) return <ChipBuoi ds={chon} />;

  return (
    <div ref={khung} className="relative inline-block">
      <button
        ref={nut}
        type="button"
        onClick={() => setMo((x) => !x)}
        disabled={dang}
        aria-expanded={mo}
        className="text-left"
        title={chon.length ? chon.map((x) => x.ten).join(" → ") : "Chưa gắn buổi chụp nào"}
      >
        {chon.length > 0 ? (
          <ChipBuoi ds={chon} />
        ) : (
          <span className="rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[11px] text-fg-faint transition hover:border-accent hover:text-accent">
            + buổi
          </span>
        )}
      </button>

      {mo && (
        <div
          data-bang-chon
          style={viTri ?? { top: -9999, left: -9999 }}
          className="fixed z-30 max-h-[70vh] w-72 overflow-y-auto rounded-md border border-line bg-bg-raised p-2.5 shadow-lift"
        >
          <p className="eyebrow">Buổi chụp sẽ tự sinh</p>
          {chon.length === 0 ? (
            <p className="mt-1.5 text-xs text-fg-faint">Chưa chọn buổi nào.</p>
          ) : (
            <ol className="mt-1.5 space-y-1">
              {chon.map((x, i) => (
                <li key={`${x.id}-${i}`} className="flex items-center justify-between gap-2 text-xs">
                  <span>
                    <span className="text-fg-faint tabular-nums">{i + 1}.</span> {x.ten}
                  </span>
                  <button
                    type="button"
                    onClick={() => setChon((ds) => ds.filter((_, j) => j !== i))}
                    className="text-fg-faint transition hover:text-red-700"
                    aria-label={`Bỏ buổi ${i + 1}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}

          <p className="eyebrow mt-3">Thêm buổi</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {dsLoai.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setChon((ds) => [...ds, l])}
                className="min-h-7 rounded-full border border-line-strong bg-bg px-2 text-[11px] text-fg-muted transition hover:border-accent hover:text-fg"
              >
                {l.ten}
              </button>
            ))}
          </div>
          {/* Bấm một loại hai lần là hai buổi cùng loại — có thật với gói hai ngày. */}
          <p className="mt-1.5 text-[11px] text-fg-faint">
            Bấm hai lần cùng một loại nếu cần hai buổi giống nhau.
          </p>

          {loi && <p className="mt-2 text-xs text-red-700">{loi}</p>}

          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary px-3 py-1 text-xs" onClick={luu} disabled={dang}>
              {dang ? "Đang lưu…" : "Lưu"}
            </button>
            <button
              type="button"
              className="btn px-3 py-1 text-xs"
              onClick={() => {
                setChon(banDau);
                setMo(false);
              }}
              disabled={dang}
            >
              Thôi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipBuoi({ ds }: { ds: LoaiChon[] }) {
  if (ds.length === 0) return <span className="text-fg-faint">—</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {ds.map((x, i) => (
        <span
          key={`${x.id}-${i}`}
          className="rounded-full border border-line-strong bg-bg-soft px-2 py-0.5 text-[11px] text-fg-muted"
        >
          {x.ten}
        </span>
      ))}
    </span>
  );
}
