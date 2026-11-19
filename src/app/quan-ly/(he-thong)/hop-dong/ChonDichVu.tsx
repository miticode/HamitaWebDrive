"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { boDau, tien } from "@/lib/constants";
import { LOAI_DICH_VU, TEN_LOAI, laLoaiDichVu, type LoaiDichVu } from "@/lib/dichVuChung";
import { themDichVuAction } from "../../actionsDichVu";

export type DichVuGon = {
  id: string;
  maDV: string;
  ten: string;
  loai: string;
  nhom: string | null;
  donGia: number;
  donVi: string | null;
  /** Mô tả gói trong bảng — chảy thẳng vào ô Chi tiết của dòng hợp đồng. */
  chiTiet: string | null;
  /**
   * Buổi chụp mặc định, đúng thứ tự (anh yêu cầu 18/11/2026).
   *
   * Chọn dịch vụ này là lịch chụp tự có đủ dòng với loại đã đặt sẵn, người
   * lập chỉ còn điền ngày giờ. Lặp tên là có thật: gói hai ngày có thể là
   * hai buổi cùng loại.
   */
  buoi?: readonly string[];
};

export type GiaGon = { dichVuId: string; hangMuc: string | null; donGia: number };

/** Bao nhiêu mục hiện mỗi lần khi đang DUYỆT; bấm "Xem thêm" là cộng thêm bấy nhiêu. */
const MOI_LAN = 24;

/**
 * Ô chọn dịch vụ, dùng chung cho form LẬP và form SỬA hợp đồng.
 *
 * Lọc NGAY TRONG MÁY trên bảng đã tải sẵn (1.020 mục) — gõ tới đâu ra tới đó
 * mà không tốn lượt hỏi database nào (nguyên tắc 53).
 *
 * Tìm không dấu: nhân viên gõ "vay cuoi" phải ra "Váy cưới". Mã dịch vụ cũng
 * tìm được vì nhiều người thuộc mã hơn thuộc tên.
 *
 * ━━ Hai chế độ, tách theo việc ô tìm có chữ hay không (anh hỏi 14/11/2026) ━━
 *
 * Trước đây ô này chỉ hiện gì đó khi đã gõ đủ 2 ký tự. Mở form ra là một ô
 * trắng — người mới không biết tiệm có những gì, phải sang trang Dịch vụ xem
 * rồi quay lại gõ.
 *
 * - **Ô trống → DUYỆT.** Chip loại và chip nhóm, danh sách xếp theo số lần đã
 *   dùng trong hợp đồng thật (xem `demLuotDung`). Đo 7.251 dòng chi tiết: 20
 *   mã dịch vụ hay nhất chiếm 69% lượt, 20 mã sản phẩm chiếm 92% — nên hai
 *   chục dòng đầu đã trúng gần hết việc hằng ngày.
 * - **Ô có chữ → TÌM, bỏ qua mọi chip.** Người gõ "ADQ07" thường không nhớ mã
 *   đó thuộc loại nào; để chip chặn lại là tìm không ra thứ đang có thật.
 *   Đây cũng đúng là hành vi cũ, nên cách làm mới không lấy mất gì.
 */
export function ChonDichVu({
  dichVu,
  luotDung,
  onChon,
}: {
  dichVu: DichVuGon[];
  /** maDV → số lần đã dùng trong hợp đồng. Thiếu thì danh sách xếp theo tên. */
  luotDung?: Record<string, number>;
  onChon: (dv: DichVuGon | null) => void;
}) {
  const [mo, setMo] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMo(true)}
          className="btn flex-1 justify-start text-left text-fg-muted sm:flex-none sm:min-w-[22rem]"
        >
          + Chọn dịch vụ, trang phục, sản phẩm…
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onChon(null)}
          title="Một dòng không mã, chỉ dùng cho khoản lẻ không cần lưu vào bảng"
        >
          Dòng gõ tay
        </button>
      </div>

      {mo && (
        <CuaSoChon
          dichVu={dichVu}
          luotDung={luotDung}
          onDong={() => setMo(false)}
          onChon={(dv) => {
            onChon(dv);
            setMo(false);
          }}
        />
      )}
    </>
  );
}

/**
 * Cửa sổ chọn mục — anh yêu cầu 14/11/2026.
 *
 * Trước đó danh sách nằm thẳng trong form. Chọn xong nó KHÔNG TẮT, mà dòng
 * vừa thêm lại nằm phía dưới cả danh sách dài, nên phải cuộn xuống mới thấy
 * thứ mình vừa bấm — đúng chỗ anh chỉ ra.
 *
 * Cửa sổ sửa cả hai cùng lúc: danh sách chiếm chỗ riêng, bấm một cái là đóng
 * và dòng mới hiện ngay tại chỗ nút bấm. Số lần bấm không tăng: vẫn một cái
 * để mở, một cái để chọn.
 *
 * ━━ Hai cái bẫy của cửa sổ lồng trong cửa sổ ━━
 *
 * Form hợp đồng thường đã nằm trong cửa sổ `NutLapHopDong` (`z-[60]`), nên:
 *
 * 1. **Escape.** Cửa sổ ngoài nghe phím trên `document`. Nếu cửa sổ này chỉ
 *    nghe bình thường thì một lần bấm Escape đóng cả hai — mất luôn hợp đồng
 *    đang gõ dở. Nên ở đây nghe tại GIAI ĐOẠN CAPTURE rồi
 *    `stopImmediatePropagation`: phím tới tay cửa sổ trong trước, và không đi
 *    tiếp ra ngoài.
 * 2. **Bấm ra nền.** Cửa sổ ngoài đóng khi bấm nền của nó. Nền cửa sổ này
 *    phải chặn sự kiện lại, nếu không bấm hụt ra ngoài danh sách là mất cả
 *    form đang gõ dở.
 */
function CuaSoChon({
  dichVu,
  luotDung,
  onChon,
  onDong,
}: {
  dichVu: DichVuGon[];
  luotDung?: Record<string, number>;
  onChon: (dv: DichVuGon | null) => void;
  onDong: () => void;
}) {
  const [q, setQ] = useState("");
  const [taoMoi, setTaoMoi] = useState(false);
  const [loai, setLoai] = useState<LoaiDichVu>("dich-vu");
  const [nhom, setNhom] = useState<string | null>(null);
  const [hien, setHien] = useState(MOI_LAN);
  const oTim = useRef<HTMLInputElement>(null);

  useEffect(() => {
    oTim.current?.focus();
    const phim = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onDong();
    };
    document.addEventListener("keydown", phim, true);

    /*
      Khoá cuộn nền. Cửa sổ ngoài có thể đã khoá rồi — lưu lại giá trị cũ rồi
      trả về đúng nó, chứ không trả về chuỗi rỗng, nếu không đóng cửa sổ trong
      là nền sau lưng cuộn lại được trong khi form vẫn đang mở.
    */
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", phim, true);
      document.body.style.overflow = cu;
    };
  }, [onDong]);

  const dangTim = q.trim().length >= 2;

  /** Mục của loại đang chọn, hay dùng đứng trước. */
  const cuaLoai = useMemo(() => {
    const d = dichVu.filter((x) => x.loai === loai);
    return d.sort(
      (a, b) =>
        ((luotDung?.[b.maDV] ?? 0) - (luotDung?.[a.maDV] ?? 0)) || a.ten.localeCompare(b.ten, "vi"),
    );
  }, [dichVu, loai, luotDung]);

  /** Nhóm trong loại đang chọn, nhóm đông đứng trước. */
  const cacNhom = useMemo(() => {
    const dem = new Map<string, number>();
    for (const d of cuaLoai) {
      const n = d.nhom?.trim();
      if (n) dem.set(n, (dem.get(n) ?? 0) + 1);
    }
    return [...dem].sort((a, b) => b[1] - a[1]);
  }, [cuaLoai]);

  const dangDuyet = useMemo(
    () => (nhom ? cuaLoai.filter((d) => d.nhom?.trim() === nhom) : cuaLoai),
    [cuaLoai, nhom],
  );

  const ketQua = useMemo(() => {
    const k = boDau(q.trim());
    if (k.length < 2) return [];
    return dichVu.filter((d) => boDau(`${d.maDV} ${d.ten} ${d.nhom ?? ""}`).includes(k)).slice(0, 40);
  }, [q, dichVu]);

  const doiLoai = (l: LoaiDichVu) => {
    setLoai(l);
    setNhom(null);
    setHien(MOI_LAN);
  };

  const chipNhom = (bat: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-xs transition ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-faint hover:border-line-strong"
    }`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => {
        e.stopPropagation();
        onDong();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Chọn dịch vụ, trang phục, sản phẩm"
        className="flex max-h-[94dvh] w-full max-w-3xl flex-col rounded-t-lg bg-bg shadow-[var(--shadow-lift)] sm:max-h-[86dvh] sm:rounded-lg"
      >
        {/* Đầu cửa sổ đứng yên: ô tìm và chip luôn trong tầm tay dù danh sách dài. */}
        <div className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">Thêm vào hợp đồng</p>
              <h3 className="mt-1 font-display text-xl leading-snug font-light">
                Dịch vụ, trang phục, sản phẩm
              </h3>
            </div>
            <button
              type="button"
              onClick={onDong}
              aria-label="Đóng"
              className="grid size-9 shrink-0 place-items-center rounded-full text-fg-faint transition hover:bg-bg-soft hover:text-fg"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={oTim}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Gõ mã hoặc tên dịch vụ, trang phục, sản phẩm…"
              aria-label="Tìm dịch vụ"
              autoComplete="off"
              className="input flex-1"
            />
            {/*
              TẠO MỤC MỚI ngay tại đây — anh yêu cầu 14/11/2026, đối chiếu với
              AppSheet (ô "Mã DV" bên đó có sẵn mục "Tạo mới").

              Vì sao quan trọng: tiệm làm việc bằng MÃ, không phải tên tự do.
              Đo 7.251 dòng chi tiết thật thì chỉ 2 dòng không có mã. Dòng gõ
              tay không mã thì không ghép được với bảng Dịch vụ, nên không có
              bảng giá hạng mục và KHÔNG SINH ĐẦU VIỆC nào — hợp đồng lập xong
              mà không ai biết phải làm gì.

              Quyền khớp sẵn: `loaiDuocSua` cho quản trị và sale sửa cả ba
              loại, mà đó cũng đúng là nhóm được lập hợp đồng.
            */}
            <button type="button" className="btn" onClick={() => setTaoMoi(true)}>
              Tạo mục mới
            </button>
          </div>

          {/* Chip chỉ có nghĩa khi đang DUYỆT; đang tìm thì tìm khắp cả ba loại. */}
          {!dangTim && (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {LOAI_DICH_VU.map((l) => {
                  const soMuc = dichVu.filter((d) => d.loai === l).length;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => doiLoai(l)}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        loai === l
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line text-fg-muted hover:border-line-strong"
                      }`}
                    >
                      {TEN_LOAI[l]} <span className="tabular-nums opacity-70">{soMuc}</span>
                    </button>
                  );
                })}
              </div>

              {cacNhom.length > 1 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setNhom(null); setHien(MOI_LAN); }}
                    className={chipNhom(nhom === null)}
                  >
                    Mọi nhóm
                  </button>
                  {cacNhom.map(([n, c]) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { setNhom(n); setHien(MOI_LAN); }}
                      className={chipNhom(nhom === n)}
                    >
                      {n} <span className="tabular-nums opacity-70">{c}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {taoMoi && (
            <KhungTaoMuc
              goiY={q.trim()}
              onThoi={() => setTaoMoi(false)}
              onXong={(dv) => {
                setTaoMoi(false);
                onChon(dv);
              }}
            />
          )}
        </div>

        {/* Ruột cuộn riêng, để đầu cửa sổ không trôi đi mất. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-1.5">
            {(dangTim ? ketQua : dangDuyet.slice(0, hien)).map((d) => (
              <DongMuc key={d.id} d={d} luot={luotDung?.[d.maDV] ?? 0} onChon={() => onChon(d)} />
            ))}
          </div>

          {dangTim && ketQua.length === 0 && (
            <p className="rounded-md border border-line px-3 py-2 text-sm text-fg-muted">
              Không có mục nào khớp “{q.trim()}”. Bấm <b className="text-fg">Tạo mục mới</b> để thêm
              vào bảng, hoặc đóng cửa sổ rồi chọn <b className="text-fg">Dòng gõ tay</b> cho khoản lẻ
              không cần lưu.
            </p>
          )}

          {!dangTim && dangDuyet.length > hien && (
            <button
              type="button"
              onClick={() => setHien((h) => h + MOI_LAN)}
              className="mt-3 text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
            >
              Xem thêm {Math.min(MOI_LAN, dangDuyet.length - hien)} mục nữa
              <span className="ml-1 tabular-nums opacity-70">(còn {dangDuyet.length - hien})</span>
            </button>
          )}

          {!dangTim && dangDuyet.length === 0 && (
            <p className="text-sm text-fg-muted">Nhóm này chưa có mục nào đang dùng.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Một mục trong danh sách, dùng chung cho cả tìm lẫn duyệt.
 *
 * "đã dùng N lần" là thứ nói hộ người mới biết đâu là gói chính của tiệm và
 * đâu là mục lẻ — con số đếm từ hợp đồng thật, không phải ai đó đánh dấu tay.
 */
function DongMuc({ d, luot, onChon }: { d: DichVuGon; luot: number; onChon: () => void }) {
  return (
    <button
      type="button"
      onClick={onChon}
      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-sm transition hover:border-accent"
    >
      <span className="min-w-0">
        <b className="font-medium">{d.ten}</b>
        <span className="ml-2 text-xs text-fg-faint">
          {d.maDV}
          {laLoaiDichVu(d.loai) ? ` · ${TEN_LOAI[d.loai]}` : ""}
          {d.nhom ? ` · ${d.nhom}` : ""}
          {luot > 0 ? ` · đã dùng ${luot} lần` : ""}
        </span>
      </span>
      <span className="tabular-nums text-fg-muted">{tien(d.donGia)}</span>
    </button>
  );
}

/** Ô nhập có nhãn — dùng chung giữa form lập và form sửa. */
export function O({
  nhan,
  chu,
  children,
}: {
  nhan: string;
  chu?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow block">{nhan}</span>
      <div className="mt-1.5">{children}</div>
      {chu && <span className="mt-1 block text-[11px] text-fg-faint">{chu}</span>}
    </label>
  );
}

/** Một khung có tiêu đề nhỏ — dùng chung giữa form lập và form sửa. */
export function Khung({
  ten,
  chu,
  children,
}: {
  ten: string;
  chu?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-bg-raised p-4">
      <h2 className="eyebrow">{ten}</h2>
      {chu && <p className="mt-1 text-xs text-fg-faint">{chu}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Một dòng "tên — số tiền" trong bảng tổng kết. */
export function Hang({ ten, gia, dam }: { ten: string; gia: number; dam?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{ten}</span>
      <span className={`tabular-nums ${dam ? "font-medium text-fg" : ""}`}>{tien(gia)}</span>
    </div>
  );
}

/**
 * Tạo một mục mới trong bảng Dịch vụ & trang phục rồi dùng luôn cho hợp đồng
 * đang lập.
 *
 * Dùng lại `themDichVuAction` chứ không mở đường ghi mới: phép kiểm quyền
 * theo loại, phép chặn trùng mã (kể cả khác hoa thường) và dòng nhật ký đều
 * giữ nguyên. Mục tạo ở đây hiện luôn trong trang Dịch vụ & trang phục, không
 * phải một bảng riêng.
 */
function KhungTaoMuc({
  goiY,
  onThoi,
  onXong,
}: {
  /** Chữ người đang gõ ở ô tìm — điền sẵn vào ô Tên cho đỡ gõ lại. */
  goiY: string;
  onThoi: () => void;
  onXong: (dv: DichVuGon) => void;
}) {
  const [maDV, setMaDV] = useState("");
  const [ten, setTen] = useState(goiY);
  const [loai, setLoai] = useState<LoaiDichVu>("dich-vu");
  const [nhom, setNhom] = useState("");
  const [donGia, setDonGia] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const luu = () =>
    batDau(async () => {
      setLoi(null);
      const gia = Number(donGia.replace(/\D/g, "")) || 0;
      const kq = await themDichVuAction({
        maDV, loai, ten, nhom, chiTiet: "", donGia: String(gia), donVi: "", dangDung: true,
      });
      if (kq.loi || !kq.id) {
        setLoi(kq.loi ?? "Chưa tạo được mục này.");
        return;
      }
      onXong({
        id: kq.id,
        maDV: maDV.trim(),
        ten: ten.trim(),
        loai,
        nhom: nhom.trim() || null,
        donGia: gia,
        donVi: null,
        chiTiet: null,
      });
    });

  return (
    <div className="mt-2 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <p className="eyebrow">Mục mới trong bảng Dịch vụ &amp; trang phục</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {LOAI_DICH_VU.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLoai(l)}
            className={`rounded-full border px-2.5 py-1 text-xs transition ${
              loai === l ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
            }`}
          >
            {TEN_LOAI[l]}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-4">
        <O nhan="Mã">
          <input
            value={maDV}
            onChange={(e) => setMaDV(e.target.value)}
            placeholder="VD: ADQ07"
            autoComplete="off"
            className="input"
          />
        </O>
        <O nhan="Tên">
          <input value={ten} onChange={(e) => setTen(e.target.value)} autoComplete="off" className="input" />
        </O>
        <O nhan="Nhóm">
          <input
            value={nhom}
            onChange={(e) => setNhom(e.target.value)}
            placeholder="Cưới, Baby, Thuê lẻ…"
            autoComplete="off"
            className="input"
          />
        </O>
        <O nhan="Đơn giá">
          <input
            value={donGia ? Number(donGia.replace(/\D/g, "")).toLocaleString("vi-VN") : ""}
            onChange={(e) => setDonGia(e.target.value)}
            inputMode="numeric"
            className="input tabular-nums"
          />
        </O>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Mục này vào thẳng bảng Dịch vụ &amp; trang phục, lần sau gõ mã là ra. Mã đã có thì web báo
        lại — <span className="text-fg-muted">không ghi đè mục cũ</span>.
      </p>

      {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={luu} disabled={dang} className="btn-primary disabled:opacity-50">
          {dang ? "Đang tạo…" : "Tạo và dùng cho dòng này"}
        </button>
        <button type="button" onClick={onThoi} disabled={dang} className="btn">Thôi</button>
      </div>
    </div>
  );
}
