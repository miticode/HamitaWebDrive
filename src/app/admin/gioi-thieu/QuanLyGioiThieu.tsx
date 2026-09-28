"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { boDau } from "@/lib/constants";
import { coMa, type MucGioiThieu, type NhomGioiThieu } from "@/lib/nhomGioiThieu";
import type { ThuMucGioiThieu } from "@/lib/anhGioiThieu";
import {
  datTenCanhAction,
  docLaiCanhAction,
  docLaiMucAction,
  docThuMucAlbumAction,
  doiThuTuCanhAction,
  doiThuTuMucAction,
  suaMucAction,
  themAnhGioiThieuAction,
  themMucAction,
  xoaAnhGioiThieuAction,
  xoaMucAction,
  type ThuMucChon,
} from "../actionsGioiThieu";
import { DoiBiaThuMuc } from "./DoiBiaThuMuc";
import { duongDanAnh } from "@/lib/anhXem";

type AlbumGon = { id: string; ten: string; bia: string | null; soThuMuc: number; ngayTao: string };
type Muc = MucGioiThieu;

/** Đường dẫn công khai của một mục. Nhóm một mục thì không có đoạn mục. */
function duongMuc(nhom: NhomGioiThieu, muc: Muc) {
  return nhom.muc.length > 1 ? `/dich-vu/${nhom.key}/${muc.key}` : `/dich-vu/${nhom.key}`;
}

export function QuanLyGioiThieu({
  albums,
  daChon,
  nhomDs,
  nhomBanDau,
}: {
  albums: AlbumGon[];
  daChon: ThuMucGioiThieu[];
  nhomDs: NhomGioiThieu[];
  nhomBanDau?: string;
}) {
  const [nhomKey, setNhomKey] = useState<string>(
    nhomBanDau && nhomDs.some((n) => n.key === nhomBanDau) ? nhomBanDau : nhomDs[0].key,
  );
  const nhom = nhomDs.find((n) => n.key === nhomKey) ?? nhomDs[0];

  /*
    Ghi nhóm đang xem vào địa chỉ trang bằng `history.replaceState`, KHÔNG dùng
    router.replace: router.replace bắt máy chủ dựng lại trang mỗi lần bấm tab,
    vừa chậm vừa tốn một lượt hỏi database. Cái mình cần chỉ là để lại dấu
    trong địa chỉ, phòng khi trang tải lại (anh báo 25/09/2026: đang ở tab Bé &
    gia đình, bấm đọc lại Drive là nhảy về tab đầu).
  */
  const doiNhom = (key: string) => {
    setNhomKey(key);
    const dc = key === nhomDs[0].key ? window.location.pathname : `?nhom=${encodeURIComponent(key)}`;
    window.history.replaceState(null, "", dc);
  };
  const [dangMo, setDangMo] = useState<Muc | null>(null);

  return (
    <>
      {/*
        Mỗi nhóm một tab, khớp từng thẻ trong lưới "Hamita chụp gì?" ở trang
        chủ. Số bên cạnh là số thư mục đã chọn — nhìn là biết nhóm nào còn trống.
      */}
      <nav aria-label="Nhóm dịch vụ" className="mt-6 flex flex-wrap gap-2">
        {nhomDs.map((n) => {
          const dang = n.key === nhom.key;
          const so = daChon.filter((d) => d.nhom === n.key).length;
          return (
            <button
              key={n.key}
              type="button"
              aria-pressed={dang}
              onClick={() => doiNhom(n.key)}
              className={`min-h-10 rounded-full border px-4 text-sm transition ${
                dang
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
              }`}
            >
              {n.ten} <span className="opacity-60">{so}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-6 grid gap-6">
        {nhom.muc.map((m, iMuc) => {
          const ds = daChon.filter((d) => d.nhom === nhom.key && d.muc === m.key);
          return (
            <section key={m.key} className="card p-4 sm:p-5">
              <DauMuc
                nhom={nhom}
                m={m}
                soThuMuc={ds.length}
                dauDanh={iMuc === 0}
                cuoiDanh={iMuc === nhom.muc.length - 1}
                onThem={() => setDangMo(m)}
              />

              {ds.length === 0 ? (
                /* Mục trống chỉ còn một dòng mảnh — trước đây nó chiếm nguyên
                   một khối to bằng mục có ảnh, cuộn mãi mới hết. */
                <p className="mt-3 border-t border-line pt-3 text-sm text-fg-muted">
                  Chưa có thư mục nào — mục này đang ẩn trên trang giới thiệu.
                </p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {ds.map((d, i) => (
                    <TheDaChon
                      key={d.id}
                      d={d}
                      dauDanh={i === 0}
                      cuoiDanh={i === ds.length - 1}
                    />
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        <TaoMucMoi nhom={nhom} />
      </div>

      {dangMo && (
        <OChon
          nhom={nhom}
          muc={dangMo}
          albums={albums}
          daChon={daChon.filter((d) => d.nhom === nhom.key && d.muc === dangMo.key)}
          dong={() => setDangMo(null)}
        />
      )}
    </>
  );
}

/**
 * Bảng "⋯" dùng chung cho đầu mục và cho từng thẻ cảnh.
 *
 * Gom những việc ÍT LÀM và việc NGUY HIỂM vào đây (anh yêu cầu xem lại giao
 * diện 25/09/2026). Trước đó năm việc — đọc lại Drive, sửa tên, lên trước,
 * xuống sau, xoá mục — nằm thành một hàng chữ gạch chân xám giống hệt nhau,
 * nút xoá trông y như nút đổi thứ tự.
 */
function MenuGon({ nhan, children }: { nhan: string; children: ReactNode }) {
  const [mo, setMo] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={nhan}
        aria-expanded={mo}
        onClick={() => setMo((v) => !v)}
        className="grid size-9 place-items-center rounded-full border border-line-strong bg-bg-raised text-fg-muted transition hover:border-accent hover:text-fg"
      >
        <span aria-hidden className="-mt-1 text-lg leading-none">⋯</span>
      </button>
      {mo && (
        <>
          {/* Tấm phủ trong suốt: bấm ra ngoài là đóng, khỏi cần nghe sự kiện toàn trang. */}
          <button type="button" tabIndex={-1} aria-hidden onClick={() => setMo(false)} className="fixed inset-0 z-40 cursor-default" />
          <div
            onClick={() => setMo(false)}
            /* Hẹp lại trên điện thoại: bảng 224px mà cột thẻ chỉ 160px thì nó
               thò hẳn ra ngoài mép trái màn hình, chữ bị cắt mất. */
            className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-line bg-bg-raised p-1 shadow-lg sm:w-56"
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Đầu một mục: tên, số thư mục, mã gợi ý, và các việc studio làm với mục đó.
 *
 * Bày theo tần suất dùng (xem lại giao diện 25/09/2026): "Thêm thư mục" là
 * việc chính nên là nút đậm; "Đọc lại Drive" hay bấm lúc vừa up ảnh nên để
 * ngoài; còn sửa tên, đổi thứ tự, xoá mục thì nằm trong bảng "⋯".
 *
 * ĐỊA CHỈ TRANG KHÔNG ĐỔI THEO TÊN. Key sinh ra lúc tạo và giữ nguyên mãi —
 * đổi tên "Dạm ngõ" thành "Lễ dạm ngõ" thì link đã gửi khách vẫn sống, và các
 * thư mục đã chọn vẫn nằm đúng chỗ.
 *
 * Xoá đi hai nhịp (bấm lần nữa để chắc) thay vì hộp thoại hỏi lại: mục rỗng
 * xoá nhầm cũng chỉ mất một cái tên, còn mục còn thư mục thì máy chủ đã chặn.
 */
function DauMuc({
  nhom,
  m,
  soThuMuc,
  dauDanh,
  cuoiDanh,
  onThem,
}: {
  nhom: NhomGioiThieu;
  m: Muc;
  soThuMuc: number;
  dauDanh: boolean;
  cuoiDanh: boolean;
  onThem: () => void;
}) {
  const router = useRouter();
  const [dangChay, batDau] = useTransition();
  const [sua, setSua] = useState(false);
  const [ten, setTen] = useState(m.ten);
  const [ma, setMa] = useState(m.ma.join(", "));
  const [hoiXoa, setHoiXoa] = useState(false);
  const [bao, setBao] = useState<string | null>(null);
  /** Tin vui (không phải lỗi): kết quả lượt đọc lại Drive. */
  const [tin, setTin] = useState<string | null>(null);

  const chay = (viec: () => Promise<{ loi?: string }>, xong?: () => void) =>
    batDau(async () => {
      const kq = await viec();
      if (kq.loi) {
        setBao(kq.loi);
        setTimeout(() => setBao(null), 5000);
        return;
      }
      setBao(null);
      xong?.();
      router.refresh();
    });

  if (sua) {
    return (
      <div className="w-full max-w-md">
        <label className="block">
          <span className="eyebrow block">Tên mục</span>
          <input value={ten} onChange={(e) => setTen(e.target.value)} className="input mt-1" autoFocus />
        </label>
        <label className="mt-2 block">
          <span className="eyebrow block">Mã album gợi ý</span>
          <input
            value={ma}
            onChange={(e) => setMa(e.target.value)}
            placeholder="ví dụ: DN, ĐH — để trống thì hiện mọi album"
            className="input mt-1"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={dangChay}
            onClick={() => chay(() => suaMucAction(m.id, ten, ma), () => setSua(false))}
            className="btn-primary min-h-10 px-4"
          >
            {dangChay ? "Đang lưu…" : "Lưu"}
          </button>
          <button
            type="button"
            onClick={() => {
              setTen(m.ten);
              setMa(m.ma.join(", "));
              setSua(false);
              setBao(null);
            }}
            className="btn min-h-10 px-4"
          >
            Thôi
          </button>
          <span className="text-xs text-fg-faint">Địa chỉ trang giữ nguyên: /{m.key}</span>
        </div>
        {bao && <p className="mt-2 text-xs text-red-700">{bao}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl leading-none">{m.ten}</h2>
        {/* Con số nằm trong viên tròn: nhìn lướt là biết mục nào còn trống. */}
        <span
          className={`grid min-h-6 min-w-6 place-items-center rounded-full px-2 text-xs font-medium ${
            soThuMuc > 0 ? "bg-fg text-bg" : "border border-line-strong text-fg-faint"
          }`}
        >
          {soThuMuc}
        </span>

        <div className="ms-auto flex items-center gap-2">
          {/*
            Mục chưa có thư mục nào thì giấu nút đọc lại: nó chỉ đọc Drive của
            những album ĐÃ chọn, mục trống bấm vào chẳng ra gì — bày một cái
            nút không làm gì chỉ tổ làm người dùng nghi web hỏng.
          */}
          {soThuMuc > 0 && (
          <button
            type="button"
            disabled={dangChay}
            onClick={() =>
              batDau(async () => {
                const kq = await docLaiMucAction(nhom.key, m.key);
                if (kq.loi) {
                  setBao(kq.loi);
                  setTimeout(() => setBao(null), 5000);
                  return;
                }
                setBao(null);
                setTin(
                  kq.soMoi
                    ? `Drive có ${kq.soMoi} thư mục chưa đưa lên trang — bấm “Thêm thư mục”.`
                    : kq.capNhat
                      ? `Đã cập nhật ${kq.capNhat} thẻ theo Drive.`
                      : "Drive chưa có gì mới.",
                );
                setTimeout(() => setTin(null), 6000);
                router.refresh();
              })
            }
            className="btn min-h-9 gap-1.5 px-3 text-sm"
          >
            <span aria-hidden>↻</span>
            {dangChay ? "Đang đọc…" : "Đọc lại Drive"}
          </button>
          )}
          <button type="button" onClick={onThem} className="btn-primary min-h-9 gap-1.5 px-4 text-sm">
            <span aria-hidden className="text-base leading-none">+</span>
            Thêm thư mục
          </button>

          <MenuGon nhan={`Việc khác với mục ${m.ten}`}>
            <button type="button" onClick={() => setSua(true)} className="muc-menu hover:bg-bg-soft">
              Sửa tên, mã gợi ý
            </button>
            <button
              type="button"
              disabled={dauDanh || dangChay}
              onClick={() => chay(() => doiThuTuMucAction(m.id, true))}
              className="muc-menu hover:bg-bg-soft disabled:opacity-35"
            >
              Đưa lên trước
            </button>
            <button
              type="button"
              disabled={cuoiDanh || dangChay}
              onClick={() => chay(() => doiThuTuMucAction(m.id, false))}
              className="muc-menu hover:bg-bg-soft disabled:opacity-35"
            >
              Đẩy xuống sau
            </button>
            <button
              type="button"
              disabled={dangChay}
              onClick={(e) => {
                // Lần bấm đầu chỉ đổi chữ; bảng đóng lại thì coi như thôi.
                if (!hoiXoa) {
                  e.stopPropagation();
                  setHoiXoa(true);
                  setTimeout(() => setHoiXoa(false), 4000);
                  return;
                }
                chay(() => xoaMucAction(m.id), () => setHoiXoa(false));
              }}
              className={`muc-menu ${hoiXoa ? "font-medium text-red-700" : "text-red-700/80"} hover:bg-red-50`}
            >
              {hoiXoa ? "Bấm lần nữa để xoá" : "Xoá mục này"}
            </button>
          </MenuGon>
        </div>
      </div>

      <p className="mt-1.5 text-xs text-fg-faint">
        {m.ma.length ? `Gợi ý album có mã ${m.ma.join(", ")}` : "Chưa có mã riêng — chọn trong mọi album"}
        {soThuMuc > 0 && (
          <>
            {" · "}
            <a href={duongMuc(nhom, m)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-accent">
              xem trang khách thấy
            </a>
          </>
        )}
      </p>
      {bao && <p className="mt-2 text-xs text-red-700">{bao}</p>}
      {tin && <p className="mt-2 text-xs text-accent">{tin}</p>}
    </div>
  );
}

/**
 * Tạo mục mới trong nhóm đang xem — anh yêu cầu 25/09/2026 (trước đó thêm
 * "Dạm ngõ" hay "Đính hôn" phải sửa mã nguồn rồi đưa bản mới lên mạng).
 *
 * Địa chỉ trang tự sinh từ tên, không bắt studio nghĩ thêm; trùng thì máy chủ
 * tự thêm số vào đuôi.
 */
function TaoMucMoi({ nhom }: { nhom: NhomGioiThieu }) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [ten, setTen] = useState("");
  const [ma, setMa] = useState("");
  const [bao, setBao] = useState<string | null>(null);
  const [dangChay, batDau] = useTransition();

  const tao = () =>
    batDau(async () => {
      const kq = await themMucAction(nhom.key, ten, ma);
      if (kq.loi) {
        setBao(kq.loi);
        return;
      }
      setTen("");
      setMa("");
      setBao(null);
      setMo(false);
      router.refresh();
    });

  if (!mo) {
    return (
      <button
        type="button"
        onClick={() => setMo(true)}
        className="rounded-lg border border-dashed border-line-strong bg-bg-raised/50 px-5 py-6 text-sm text-fg-muted transition hover:border-accent hover:text-fg"
      >
        <span aria-hidden className="mr-2 text-lg leading-none">+</span>
        Tạo mục mới trong “{nhom.ten}”
      </button>
    );
  }

  return (
    <section className="card border-dashed p-5 sm:p-6">
      <p className="eyebrow">{nhom.ten}</p>
      <h2 className="mt-1 font-display text-2xl">Mục mới</h2>
      <div className="mt-4 grid max-w-md gap-3">
        <label className="block">
          <span className="eyebrow block">Tên mục</span>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ten.trim() && tao()}
            placeholder="ví dụ: Lễ vu quy"
            className="input mt-1"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="eyebrow block">Mã album gợi ý</span>
          <input
            value={ma}
            onChange={(e) => setMa(e.target.value)}
            placeholder="ví dụ: VQ — để trống thì ô chọn hiện mọi album"
            className="input mt-1"
          />
          <span className="mt-1 block text-xs text-fg-faint">
            Mã là mấy chữ đầu tên album trên Drive, dùng để lọc sẵn album cho anh chị đỡ phải tìm.
          </span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={dangChay || !ten.trim()} onClick={tao} className="btn-primary min-h-11 px-5">
            {dangChay ? "Đang tạo…" : "Tạo mục"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMo(false);
              setBao(null);
            }}
            className="btn min-h-11 px-4"
          >
            Thôi
          </button>
        </div>
        {bao && <p className="text-xs text-red-700">{bao}</p>}
      </div>
    </section>
  );
}

/**
 * Một cảnh đã đưa lên trang: ảnh bìa, tên hiện cho khách, một dòng mô tả, và
 * mấy việc để studio tự lo về sau — anh yêu cầu 23/09/2026 cho Hamita Garden,
 * nơi mỗi thư mục trên Drive là một cảnh chụp.
 *
 * Tên và mô tả lưu khi RỜI Ô (blur), không có nút "Lưu": lưới này có cả chục
 * thẻ, mỗi thẻ một nút lưu thì không ai bấm đúng thẻ. Gõ xong bấm ra ngoài là
 * xong, và dòng "Đã lưu ✓" nói cho biết nó đã xong thật.
 *
 * GỌN LẠI 25/09/2026 (anh bảo xem lại giao diện): thẻ cũ cao 478px vì mang hai
 * ô nhập có nhãn riêng, một dòng thông tin và hai đường dẫn chữ nhỏ — bốn thẻ
 * là hết ba màn hình. Nay nhãn ô bỏ đi (chữ mờ trong ô đã nói rõ), ô mô tả chỉ
 * mở khi cần, còn "Đổi bìa / Đọc lại / Gỡ" gom vào bảng "⋯" ngay trên ảnh.
 */
function TheDaChon({ d, dauDanh, cuoiDanh }: { d: ThuMucGioiThieu; dauDanh: boolean; cuoiDanh: boolean }) {
  const router = useRouter();
  const [dangXoa, start] = useTransition();
  const [dangLuu, luuBatDau] = useTransition();
  const [moBia, setMoBia] = useState(false);
  const [ten, setTen] = useState(d.tenHien ?? "");
  const [moTa, setMoTa] = useState(d.moTa ?? "");
  const [moOMoTa, setMoOMoTa] = useState(!!d.moTa);
  const [bao, setBao] = useState<string | null>(null);

  /* Chỉ gọi máy chủ khi thật sự có gì đổi — rời ô mà không sửa gì thì thôi. */
  const luuNeuDoi = () => {
    if (ten === (d.tenHien ?? "") && moTa === (d.moTa ?? "")) return;
    luuBatDau(async () => {
      const kq = await datTenCanhAction(d.id, ten, moTa);
      setBao(kq.loi ?? "Đã lưu ✓");
      setTimeout(() => setBao(null), 2200);
      if (!kq.loi) router.refresh();
    });
  };

  const chay = (viec: () => Promise<{ loi?: string }>) =>
    luuBatDau(async () => {
      const kq = await viec();
      setBao(kq.loi ?? null);
      if (kq.loi) setTimeout(() => setBao(null), 2600);
      else router.refresh();
    });

  return (
    <li className={`overflow-hidden rounded-lg border border-line bg-bg-raised ${dangXoa ? "opacity-50" : ""}`}>
      <div className="skeleton relative aspect-[4/5] bg-bg-soft">
        {d.anhBia && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={duongDanAnh(d.anhBia, 640)} alt="" loading="lazy" className="size-full object-cover" />
        )}

        {/* Sắp thứ tự: cảnh đẹp nhất lên đầu lưới bên trang khách. */}
        <div className="absolute top-2 left-2 flex gap-1">
          <button
            type="button"
            disabled={dauDanh || dangLuu}
            onClick={() => chay(() => doiThuTuCanhAction(d.id, true))}
            title="Đưa lên trước"
            className="grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-35"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={cuoiDanh || dangLuu}
            onClick={() => chay(() => doiThuTuCanhAction(d.id, false))}
            title="Đẩy xuống sau"
            className="grid size-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-35"
          >
            ↓
          </button>
        </div>

        {/* Ba việc ít làm gom vào một bảng, khỏi chiếm hai dòng chữ dưới thẻ. */}
        <div className="absolute top-2 right-2">
          <MenuGon nhan={`Việc khác với ${d.tenHien || d.tenMuc}`}>
            <button type="button" onClick={() => setMoBia(true)} className="muc-menu hover:bg-bg-soft">
              Đổi ảnh bìa
            </button>
            {/*
              Số ảnh là con số chụp lúc thêm thư mục vào trang. Up thêm ảnh lên
              Drive thì con số cũ vẫn nằm đó — nút này đọc lại cho đúng, khỏi
              phải gỡ ra thêm lại (và gỡ ra thêm lại thì mất luôn tên, mô tả).
            */}
            <button
              type="button"
              disabled={dangLuu}
              onClick={() => chay(() => docLaiCanhAction(d.id))}
              className="muc-menu hover:bg-bg-soft disabled:opacity-35"
            >
              {dangLuu ? "Đang đọc…" : "Đọc lại từ Drive"}
            </button>
            <button
              type="button"
              disabled={dangXoa}
              onClick={() =>
                start(async () => {
                  await xoaAnhGioiThieuAction(d.id);
                  router.refresh();
                })
              }
              className="muc-menu text-red-700/80 hover:bg-red-50"
            >
              {dangXoa ? "Đang gỡ…" : "Gỡ khỏi trang"}
            </button>
          </MenuGon>
        </div>
      </div>

      {moBia && (
        <DoiBiaThuMuc
          id={d.id}
          driveFolderId={d.driveFolderId}
          albumId={d.albumId}
          ten={`${d.tenAlbum} · ${d.tenMuc}`}
          anhBia={d.anhBia}
          dong={() => setMoBia(false)}
        />
      )}

      <div className="p-2.5">
        {/*
          Ô tên không còn nhãn "TÊN CẢNH" phía trên: chữ mờ trong ô đã là tên
          thư mục Drive — tức đúng cái tên khách sẽ đọc nếu để trống.
        */}
        <input
          value={ten}
          onChange={(e) => setTen(e.target.value)}
          onBlur={luuNeuDoi}
          placeholder={d.tenMuc || d.tenAlbum}
          aria-label="Tên cảnh khách đọc"
          className="input text-sm"
        />

        {moOMoTa ? (
          <input
            value={moTa}
            onChange={(e) => setMoTa(e.target.value)}
            onBlur={luuNeuDoi}
            placeholder="mô tả ngắn, ví dụ: đẹp nhất buổi chiều"
            aria-label="Mô tả ngắn"
            className="input mt-1.5 text-sm"
            autoFocus={!d.moTa}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMoOMoTa(true)}
            className="mt-1.5 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
          >
            + Thêm mô tả
          </button>
        )}

        <p className="mt-2 truncate text-xs text-fg-faint" title={`${d.tenAlbum} · ${d.tenMuc}`}>
          {d.soAnh} ảnh · {d.tenMuc || d.tenAlbum}
        </p>
        {bao && <p className="mt-1 text-xs text-accent">{bao}</p>}
      </div>
    </li>
  );
}

/** Khung chọn: danh sách album (lọc theo mã của mục) → bấm album → chọn thư mục con. */
function OChon({
  nhom,
  muc,
  albums,
  daChon,
  dong,
}: {
  nhom: NhomGioiThieu;
  muc: Muc;
  albums: AlbumGon[];
  daChon: ThuMucGioiThieu[];
  dong: () => void;
}) {
  const router = useRouter();
  const [tuKhoa, setTuKhoa] = useState("");
  const [chiTheoMa, setChiTheoMa] = useState(muc.ma.length > 0);
  const [albumMo, setAlbumMo] = useState<AlbumGon | null>(null);
  const [thuMuc, setThuMuc] = useState<ThuMucChon[] | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangLam, start] = useTransition();
  const [vuaThem, setVuaThem] = useState<Set<string>>(new Set());
  /** Những thư mục đang tick để đưa lên một lượt. */
  const [dangTick, setDangTick] = useState<Set<string>>(new Set());

  useEffect(() => {
    const phim = (e: KeyboardEvent) => {
      if (e.key === "Escape") dong();
    };
    window.addEventListener("keydown", phim);
    const cu = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", phim);
      document.body.style.overflow = cu;
    };
  }, [dong]);

  /*
    Mục chưa có mã thì LẤY TÊN MỤC LÀM GỢI Ý (anh yêu cầu 25/09/2026): mở
    "Hamita Garden" ra mà phải gõ "ham" để tìm đúng album cùng tên là thừa một
    nhịp. Khớp theo chuỗi con chứ không theo từ như mã, vì tên mục có nhiều
    chữ: "Hamita Garden" nằm trong "Hamita Garden - All View".
  */
  const hopTen = useMemo(() => {
    if (muc.ma.length > 0) return [];
    const q = boDau(muc.ten.trim());
    return q ? albums.filter((a) => boDau(a.ten).includes(q)) : [];
  }, [albums, muc.ma, muc.ten]);
  const [locTen, setLocTen] = useState(true);

  const ds = useMemo(() => {
    const q = boDau(tuKhoa.trim());
    return albums.filter(
      (a) =>
        (!chiTheoMa || muc.ma.length === 0 || muc.ma.some((ma) => coMa(a.ten, ma))) &&
        (!locTen || hopTen.length === 0 || hopTen.some((h) => h.id === a.id)) &&
        (!q || q.split(/\s+/).every((p) => boDau(a.ten).includes(p))),
    );
  }, [albums, chiTheoMa, hopTen, locTen, muc.ma, tuKhoa]);

  const moAlbum = (a: AlbumGon, docLai = false) => {
    setAlbumMo(a);
    setThuMuc(null);
    setLoi(null);
    start(async () => {
      const kq = await docThuMucAlbumAction(a.id, docLai);
      if (kq.loi) setLoi(kq.loi);
      else setThuMuc(kq.thuMuc ?? []);
    });
  };

  /*
    Đúng MỘT album mang tên mục thì mở thẳng nó ra, hộp hiện luôn danh sách
    thư mục con — khỏi bắt bấm thêm một nhịp chỉ để chọn cái duy nhất. Bấm
    "← Chọn album khác" vẫn quay ra được, và `daTuMo` giữ cho nó không tự mở
    lại đè lên lựa chọn đó.
  */
  const daTuMo = useRef(false);
  useEffect(() => {
    if (daTuMo.current || hopTen.length !== 1) return;
    daTuMo.current = true;
    moAlbum(hopTen[0]);
  }, [hopTen]);

  const daCo = (albumId: string) =>
    !!albumMo &&
    (vuaThem.has(`${albumMo.id}/${albumId}`) ||
      daChon.some((d) => d.galleryId === albumMo.id && d.albumId === albumId));

  /*
    Thêm NHIỀU thư mục một lượt — anh yêu cầu 23/09/2026: chia Hamita Garden
    thành mười cảnh mà bấm từng cái là mười lần bấm, mười lần đợi Drive.

    Chạy TUẦN TỰ chứ không bắn song song: mỗi lượt là một lần đọc Drive, bắn
    cùng lúc mười lượt thì dễ dính hạn mức của Drive, lúc đó thêm được nửa
    chừng mà không biết nửa nào. Gặp lỗi thì dừng ngay và giữ lại những cái đã
    thêm được.
  */
  const themNhieu = (ds: ThuMucChon[]) => {
    if (!albumMo || ds.length === 0) return;
    setLoi(null);
    start(async () => {
      for (const t of ds) {
        const kq = await themAnhGioiThieuAction(nhom.key, muc.key, albumMo.id, t.id);
        if (kq.loi) {
          setLoi(kq.loi);
          break;
        }
        setVuaThem((s) => new Set(s).add(`${albumMo.id}/${t.id}`));
      }
      setDangTick(new Set());
      router.refresh();
    });
  };

  const them = (t: ThuMucChon) => themNhieu([t]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thêm vào mục ${muc.ten}`}
      onClick={dong}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card relative flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden"
      >
        <div className="border-b border-line p-5">
          <button
            type="button"
            onClick={dong}
            aria-label="Đóng"
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-fg-muted transition hover:bg-bg-soft hover:text-fg"
          >
            ✕
          </button>
          {albumMo ? (
            <>
              <button type="button" onClick={() => setAlbumMo(null)} className="eyebrow transition hover:text-accent">
                ← Chọn album khác
              </button>
              <h2 className="mt-2 pr-10 font-display text-2xl">{albumMo.ten}</h2>
              <p className="mt-1 text-sm text-fg-muted">
                Chọn thư mục đưa lên mục <strong className="font-medium text-fg">{muc.ten}</strong>.{" "}
                {/*
                  Danh sách này đọc từ cache 5 phút cho nhẹ Drive; vừa tạo thư
                  mục xong mà chưa thấy thì bấm đây để đọc thẳng từ Drive (anh
                  yêu cầu 25/09/2026).
                */}
                <button
                  type="button"
                  disabled={dangLam}
                  onClick={() => moAlbum(albumMo, true)}
                  className="underline underline-offset-2 transition hover:text-accent disabled:opacity-40"
                >
                  {dangLam ? "Đang đọc Drive…" : "↻ Đọc lại Drive"}
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="eyebrow">Thêm vào mục</p>
              <h2 className="mt-1 pr-10 font-display text-2xl">{muc.ten}</h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input
                  value={tuKhoa}
                  onChange={(e) => setTuKhoa(e.target.value)}
                  placeholder="Tìm tên album…"
                  aria-label="Tìm album"
                  className="input min-w-0 flex-1"
                  autoFocus
                />
                {muc.ma.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-fg-muted">
                    <input type="checkbox" checked={chiTheoMa} onChange={(e) => setChiTheoMa(e.target.checked)} />
                    Chỉ album mã {muc.ma.join(", ")}
                  </label>
                )}
                {hopTen.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-fg-muted">
                    <input type="checkbox" checked={locTen} onChange={(e) => setLocTen(e.target.checked)} />
                    Chỉ album tên “{muc.ten}”
                  </label>
                )}
              </div>
            </>
          )}
          {loi && <p className="mt-3 text-sm text-red-700">{loi}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {albumMo ? (
            thuMuc === null ? (
              <p className="text-sm text-fg-muted">{dangLam ? "Đang đọc thư mục trên Drive…" : ""}</p>
            ) : thuMuc.length === 0 ? (
              <p className="text-sm text-fg-muted">Album này chưa có thư mục nào có ảnh.</p>
            ) : (
              <ul className="divide-y divide-line">
                {thuMuc.map((t) => {
                  const co = daCo(t.id);
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                      <label className="flex min-w-0 flex-1 items-center gap-3">
                        {/* Tick để gom nhiều thư mục rồi đưa lên một lượt. */}
                        <input
                          type="checkbox"
                          className="size-4 shrink-0"
                          disabled={co || dangLam}
                          checked={dangTick.has(t.id)}
                          onChange={(e) =>
                            setDangTick((s) => {
                              const m = new Set(s);
                              if (e.target.checked) m.add(t.id);
                              else m.delete(t.id);
                              return m;
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{t.ten}</span>
                          <span className="text-xs text-fg-muted">{t.soAnh} ảnh</span>
                        </span>
                      </label>
                      {co ? (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                          ✓ Đã đưa lên
                        </span>
                      ) : (
                        <button type="button" disabled={dangLam} onClick={() => them(t)} className="btn shrink-0">
                          Đưa lên
                        </button>
                      )}
                    </li>
                  );
                })}
                {/*
                  Thanh này chỉ hiện khi đã tick ít nhất một thư mục — không
                  tick thì nó là một nút chết chiếm chỗ.
                */}
                {dangTick.size > 0 && (
                  <li className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-bg-raised py-3">
                    <span className="text-sm text-fg-muted">Đã chọn {dangTick.size} thư mục</span>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        className="btn"
                        disabled={dangLam}
                        onClick={() => setDangTick(new Set())}
                      >
                        Bỏ chọn
                      </button>
                      <button
                        type="button"
                        className="btn-primary px-4"
                        disabled={dangLam}
                        onClick={() => themNhieu(thuMuc.filter((t) => dangTick.has(t.id)))}
                      >
                        {dangLam ? "Đang đưa lên…" : `Đưa lên ${dangTick.size} thư mục`}
                      </button>
                    </span>
                  </li>
                )}
              </ul>
            )
          ) : ds.length === 0 ? (
            <p className="text-sm text-fg-muted">
              {muc.ma.length > 0 && chiTheoMa
                ? `Không có album nào mang mã ${muc.ma.join(", ")}. Bỏ tích "Chỉ album mã ${muc.ma.join(", ")}" để chọn trong mọi album.`
                : "Không tìm thấy album nào."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ds.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => moAlbum(a)}
                    className="group block w-full overflow-hidden rounded-lg border border-line bg-bg-raised text-left transition hover:border-accent"
                  >
                    <span className="skeleton block aspect-[3/2] bg-bg-soft">
                      {a.bia && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={duongDanAnh(a.bia, 320)} alt="" loading="lazy" className="size-full object-cover" />
                      )}
                    </span>
                    <span className="block p-2.5">
                      <span className="block truncate text-sm font-medium group-hover:text-accent" title={a.ten}>
                        {a.ten}
                      </span>
                      <span className="text-xs text-fg-muted">{a.soThuMuc} thư mục</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
