"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ngayVN } from "@/lib/hopDongChung";
import { LOP_NHOM, TEN_NHOM, THU_TU_NHOM, nhomCuaBuoi, type BuoiLich } from "@/lib/lichChung";
import { NutSuaViecLich, NutThemViecLich } from "./NutViecLich";
import { NutViec, type NhanVienGon } from "../cong-viec/NutViec";
import { tien } from "@/lib/constants";

const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/** Bao nhiêu chip hiện trong một ô trước khi gom phần còn lại vào "+N". */
const CHIP_MOI_O = 3;

/*
  LƯỚI LỊCH KIỂU LARK — anh yêu cầu 15/11/2026.

  Khác bản cũ ở ba chỗ, đều là chỗ anh chỉ trong ảnh Lark:

    1. Chip có MÀU theo loại buổi, nhìn một cái biết hôm đó makeup hay chụp.
    2. BẤM VÀO NGÀY thì danh sách buổi hôm đó hiện ngay dưới lưới. Trước đây
       ô chỉ hiện được ba dòng chữ cắt cụt, buổi thứ tư trở đi không có cách
       nào đọc.
    3. Lưới chạy CẢ TRÊN ĐIỆN THOẠI. Bản cũ giấu lưới dưới 768px vì "mỗi ô
       còn 40px, đọc không ra chữ nào" — đúng, nhưng Lark giải chuyện đó bằng
       chính mục 2: ô nhỏ chỉ để NHÌN ra ngày nào dày, còn đọc thì ở panel.

  CHẠY Ở TRÌNH DUYỆT, không phải máy chủ. Cả tháng đã tải sẵn trong một lần
  truy vấn rồi, nên bấm ngày chỉ là lọc lại mảng có sẵn: đổi ngày là tức thì,
  và không đánh thức database thêm lần nào (nguyên tắc 53 — Neon tính tiền
  theo thời gian database thức).
*/
export function LuoiLich({
  ds,
  thang,
  nay,
  moHopDong,
  laQuanLy,
  nhanVien,
  quanTri,
  maToi,
}: {
  ds: BuoiLich[];
  /** "YYYY-MM" đang xem. */
  thang: string;
  /** Hôm nay theo giờ studio, "YYYY-MM-DD". */
  nay: string;
  /** Người này có được mở hợp đồng không — không thì tên khách là chữ trơn. */
  moHopDong: boolean;
  /** Quản lý mới thêm/sửa được việc tự tay ghi vào lịch (anh chốt 20/11/2026). */
  laQuanLy: boolean;
  /** Nhân viên còn làm, để ô chọn người của từng đầu việc có cái mà bày. */
  nhanVien: NhanVienGon[];
  quanTri: boolean;
  /** Mã của chính người đang xem — người thường chỉ nhận việc về mình. */
  maToi: string | null;
}) {
  /*
    Mặc định mở ngày hôm nay, nhưng chỉ khi hôm nay nằm trong tháng đang xem.
    Lật sang tháng khác mà vẫn mở một ngày của tháng cũ thì panel nói một
    đằng, lưới nói một nẻo.
  */
  const [ngayChon, setNgayChon] = useState<string | null>(() => (nay.startsWith(thang) ? nay : null));

  /*
    Đổi tháng thì chọn lại — `thang` là prop, không tự reset theo state.

    Chỉnh NGAY TRONG RENDER theo mẫu "chỉnh state khi prop đổi" của React chứ
    không qua `useEffect`: effect thì lưới vẽ xong một lượt với ngày của tháng
    cũ rồi mới vẽ lại đúng, người dùng thấy một nhịp nháy. Mốc so là một chuỗi
    ghép nên so theo GIÁ TRỊ, không lo mỗi render một tham chiếu mới.
  */
  const moc = `${thang}|${nay}`;
  const [mocTruoc, setMocTruoc] = useState(moc);
  if (moc !== mocTruoc) {
    setMocTruoc(moc);
    setNgayChon(nay.startsWith(thang) ? nay : null);
  }

  const theoNgay = useMemo(() => {
    const m = new Map<string, BuoiLich[]>();
    for (const l of ds) {
      if (!l.ngay) continue;
      const co = m.get(l.ngay);
      if (co) co.push(l);
      else m.set(l.ngay, [l]);
    }
    return m;
  }, [ds]);

  const [nam, thangSo] = thang.split("-").map(Number);
  const soNgay = new Date(Date.UTC(nam, thangSo, 0)).getUTCDate();
  /* Thứ Hai đứng đầu tuần như lịch Việt Nam: Chủ nhật (0) đẩy xuống cuối. */
  const troTruoc = (new Date(Date.UTC(nam, thangSo - 1, 1)).getUTCDay() + 6) % 7;

  const cuaNgay = ngayChon ? (theoNgay.get(ngayChon) ?? []) : [];

  /*
    Bao nhiêu đầu việc của buổi này chưa có người.

    Con số này mới là thứ quản lý mở lịch ra để tìm — danh sách việc thì dài,
    mà câu hỏi của họ chỉ là "nhà này đủ người chưa". In nó ngay cạnh tiêu đề
    khối, trước khi phải đọc từng dòng.
  */
  const chuaGiao = (l: BuoiLich) => l.viec.filter((v) => !v.nguoiPhuTrachMaNV).length;
  const panel = useRef<HTMLDivElement>(null);

  /*
    Bấm ngày thì kéo panel vào tầm nhìn — trên điện thoại panel nằm dưới cả
    lưới sáu hàng, không kéo thì bấm xong tưởng như không có gì xảy ra.
    `block: "nearest"` nên panel đang thấy rồi thì màn hình đứng yên.
  */
  const chonNgay = (ngay: string) => {
    setNgayChon(ngay);
    requestAnimationFrame(() => panel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  return (
    <>
      <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-md border border-line bg-line">
        {THU.map((t) => (
          <div key={t} className="bg-bg-soft px-1 py-1.5 text-center text-[11px] text-fg-muted sm:text-xs">
            {t}
          </div>
        ))}
        {Array.from({ length: troTruoc }).map((_, i) => (
          <div key={`trong-${i}`} className="min-h-20 bg-bg-raised sm:min-h-24" />
        ))}
        {Array.from({ length: soNgay }).map((_, i) => {
          const ngay = `${thang}-${String(i + 1).padStart(2, "0")}`;
          const cua = theoNgay.get(ngay) ?? [];
          const laNay = ngay === nay;
          const dangChon = ngay === ngayChon;
          return (
            <button
              key={ngay}
              type="button"
              onClick={() => chonNgay(ngay)}
              aria-pressed={dangChon}
              className={`min-h-20 cursor-pointer p-1 text-left transition sm:min-h-24 sm:p-1.5 ${
                dangChon ? "bg-accent-soft ring-2 ring-accent ring-inset" : "bg-bg-raised hover:bg-bg-soft"
              }`}
            >
              <span className="flex items-center justify-between gap-1">
                <span
                  className={`text-[11px] tabular-nums sm:text-xs ${
                    laNay
                      ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent font-medium text-white"
                      : dangChon
                        ? "font-medium text-accent"
                        : "text-fg-faint"
                  }`}
                >
                  {i + 1}
                </span>
                {/*
                  Badge "+N" nằm CẠNH SỐ NGÀY chứ không ở cuối danh sách chip
                  (bản cũ để ở cuối). Ngày dày việc thì ô đã kín chip, một dòng
                  "+5 nữa" ở dưới cùng bị đẩy khuất; ở trên này thì luôn thấy.
                */}
                {cua.length > CHIP_MOI_O && (
                  <span className="rounded bg-bg-soft px-1 text-[10px] text-fg-muted tabular-nums">
                    +{cua.length - CHIP_MOI_O}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block space-y-0.5">
                {cua.slice(0, CHIP_MOI_O).map((l) => (
                  <span key={l.id} className={`chip-lich ${LOP_NHOM[nhomCuaBuoi(l)]}`}>
                    {l.tieuDe || l.tenKhach || l.loai || "—"}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Chú giải màu — không có nó thì tám màu kia chỉ là màu. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {THU_TU_NHOM.map((n) => (
          <span key={n} className={`inline-flex items-center gap-1.5 text-[11px] text-fg-muted ${LOP_NHOM[n]}`}>
            <span className="cham-lich" aria-hidden />
            {TEN_NHOM[n]}
          </span>
        ))}
      </div>

      <div ref={panel} className="mt-4 scroll-mt-4 rounded-md border border-line bg-bg-raised">
        {ngayChon ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-4 py-2.5">
              <h2 className="font-medium">
                {ngayVN(ngayChon)}
                {ngayChon === nay && <span className="ml-2 text-xs text-accent">hôm nay</span>}
              </h2>
              <span className="flex items-center gap-3">
                <span className="text-xs text-fg-muted tabular-nums">{cuaNgay.length} buổi</span>
                {/*
                  Nút nằm TRONG panel ngày, không ở đầu trang: bấm nó là thêm
                  việc vào đúng ngày đang mở, khỏi phải chọn lại ngày trong form.
                */}
                {laQuanLy && ngayChon && (
                  <NutThemViecLich ngayGoiY={ngayChon} lop="btn btn-gon px-2.5 py-1 text-xs" />
                )}
              </span>
            </div>
            {cuaNgay.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-fg-muted">Ngày này chưa có buổi nào.</p>
            ) : (
              <ul className="divide-y divide-line">
                {cuaNgay.map((l) => (
                  <li key={l.id} className={`flex flex-wrap items-start gap-x-3 gap-y-1 px-4 py-2.5 ${LOP_NHOM[nhomCuaBuoi(l)]}`}>
                    <span className="mt-1.5 cham-lich" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        {l.gio && <span className="font-medium tabular-nums">{l.gio}</span>}
                        {l.tuThem ? (
                          <span className="font-medium">{l.tieuDe ?? "Việc của tiệm"}</span>
                        ) : l.hopDongId && l.tenKhach ? (
                          moHopDong ? (
                            <Link href={`/quan-ly/hop-dong/${l.hopDongId}`} className="font-medium hover:text-accent">
                              {l.tenKhach}
                            </Link>
                          ) : (
                            <span className="font-medium">{l.tenKhach}</span>
                          )
                        ) : (
                          <span className="text-fg-muted">Không gắn hợp đồng</span>
                        )}
                        {l.tuThem && laQuanLy && (
                          <NutSuaViecLich
                            viec={{ id: l.id, ngay: l.ngay, gio: l.gio, tieuDe: l.tieuDe, ghiChu: l.ghiChu }}
                          />
                        )}
                        {l.soDienThoai && (
                          <a href={`tel:${l.soDienThoai}`} className="text-xs text-fg-muted tabular-nums hover:text-accent">
                            {l.soDienThoai}
                          </a>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                        <span>{l.tuThem ? "Việc của tiệm" : (l.loai ?? "—")}</span>
                        {l.trangThai && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{l.trangThai}</span>
                          </>
                        )}
                      </span>
                      {l.ghiChu && <span className="mt-0.5 block text-xs text-fg-muted">{l.ghiChu}</span>}

                      {/*
                        ĐẦU VIỆC CỦA BUỔI NÀY — anh yêu cầu 19/11/2026, để
                        quản lý chia người ngay trên lịch thay vì mở sang
                        trang Đầu việc rồi dò lại ngày.

                        Đã bỏ việc hậu kỳ ở máy chủ (`laViecHauKy`): anh chốt
                        "chỉ hiện những việc hôm đó làm".

                        Dùng lại `NutViec` của trang Đầu việc, không dựng ô
                        chọn riêng: hai chỗ cùng gọi `giaoViecAction`, mà cái
                        action đó còn kiểm quyền và ghi nhật ký. Chép ra một
                        bản thứ hai là sớm muộn một bên quên mất một phép kiểm.
                      */}
                      {l.viec.length > 0 && (
                        <div className="mt-2 grid gap-1.5 rounded-md border border-line bg-bg px-3 py-2.5">
                          <p className="eyebrow">
                            Đầu việc <span className="tabular-nums opacity-70">{l.viec.length}</span>
                            {chuaGiao(l) > 0 && (
                              <span className="ml-2 font-medium text-amber-800">
                                {chuaGiao(l)} chưa có người
                              </span>
                            )}
                          </p>
                          {l.viec.map((v) => (
                            <div
                              key={v.id}
                              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-1.5 first:border-0 first:pt-0"
                            >
                              <span className="min-w-28 text-sm font-medium">{v.loai ?? "—"}</span>
                              {v.tienCong !== null && (
                                <span className="text-xs text-fg-muted tabular-nums">
                                  {tien(v.tienCong)}đ
                                </span>
                              )}
                              <span className="ml-auto flex flex-wrap items-center gap-2">
                                <NutViec
                                  id={v.id}
                                  nguoiPhuTrachMaNV={v.nguoiPhuTrachMaNV}
                                  tenNguoiLam={v.tenNguoiLam}
                                  trangThai={v.trangThai}
                                  nhanVien={nhanVien}
                                  quanTri={quanTri}
                                  maToi={maToi}
                                />
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">Bấm một ngày trên lưới để xem các buổi hôm đó.</p>
        )}
      </div>
    </>
  );
}
