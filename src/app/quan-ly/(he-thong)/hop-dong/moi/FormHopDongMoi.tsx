"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { docTien } from "@/lib/studioNoiBo";
import { TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import {
  BUOC_MOI_LAP,
  CAC_BUOC,
  HINH_THUC_THU,
  LOAI_DV_HD,
  LOAI_LICH,
  NOI_DUNG_THU,
  ngayVN,
  type DongDichVuMoi,
  type DongLichMoi,
  type DongThuMoi,
} from "@/lib/hopDongChung";
import { lapHopDongAction, timKhachAction, type KhachTim } from "../../../actionsHopDong";
import { ChonDichVu, Hang, Khung, O, type DichVuGon, type GiaGon } from "../ChonDichVu";

/**
 * Form lập hợp đồng — một trang đi từ khách tới đầu việc, đúng thứ tự nhân
 * viên vẫn làm bên AppSheet: chọn khách → loại hợp đồng → các dòng dịch vụ →
 * cọc → lịch chụp → đầu việc.
 *
 * Tiền hiện ở đây chỉ để NGƯỜI LẬP nhìn. Con số ghi vào database do máy chủ
 * cộng lại trong `kiemHopDongMoi` — hai bên dùng chung một hàm nên không lệch,
 * mà máy chủ vẫn không phải tin con số trình duyệt gửi lên.
 */
export function FormHopDongMoi({
  dichVu,
  giaHangMuc,
  homNay,
  laQuanLy,
  tenNguoiLap,
  cacBuoc = CAC_BUOC,
  onThoi,
  onXong,
}: {
  dichVu: DichVuGon[];
  giaHangMuc: GiaGon[];
  homNay: string;
  /**
   * Mười tám bước, đọc từ bảng `BuocHopDong` (đợt 6). Mặc định là bảng cứng
   * `CAC_BUOC` — ô chọn không được phép rỗng dù bảng kia chưa chép.
   */
  cacBuoc?: readonly string[];
  /** Quản lý lập phiếu thu thì ghi thẳng "đã thu"; sale thì phiếu nằm chờ duyệt. */
  laQuanLy: boolean;
  tenNguoiLap: string;
  /**
   * Bấm "Thôi" thì làm gì. Để trống = quay về danh sách hợp đồng (trang riêng);
   * trong cửa sổ bật lên thì truyền hàm đóng cửa sổ vào đây.
   */
  onThoi?: () => void;
  /**
   * Lưu xong thì làm gì. Để trống = đi thẳng sang trang hợp đồng vừa lập;
   * trong cửa sổ bật lên thì đóng cửa sổ trước rồi mới đi.
   */
  onXong?: (id: string) => void;
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  // ── Khách ───────────────────────────────────────────────────────────────
  const [khachCu, setKhachCu] = useState<KhachTim | null>(null);
  const [tuKhoa, setTuKhoa] = useState("");
  const [ketQua, setKetQua] = useState<KhachTim[] | null>(null);
  const [dangTim, batDauTim] = useTransition();
  const [khachMoi, setKhachMoi] = useState({ ten: "", soDienThoai: "", tinh: "", ghiChu: "" });

  // ── Hợp đồng ────────────────────────────────────────────────────────────
  const [tenKhach, setTenKhach] = useState("");
  const [loaiDV, setLoaiDV] = useState<string>(LOAI_DV_HD[1]);
  const [ngayDat, setNgayDat] = useState(homNay);
  const [diaChi, setDiaChi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [khuyenMai, setKhuyenMai] = useState(0);
  /** null = chưa ai đụng vào ô trạng thái, để web tự đoán theo ngày chụp. */
  const [ttTuChon, setTtTuChon] = useState<string | null>(null);
  const [moHetBuoc, setMoHetBuoc] = useState(false);

  // ── Các dòng ────────────────────────────────────────────────────────────
  const [dong, setDong] = useState<DongDichVuMoi[]>([]);
  const [thu, setThu] = useState<DongThuMoi[]>([
    { soTien: 0, hinhThuc: HINH_THUC_THU[0], noiDung: NOI_DUNG_THU[0], ngayThu: homNay, ghiChu: "" },
  ]);
  const [lich, setLich] = useState<DongLichMoi[]>([]);
  /** Đầu việc người lập bỏ tick — lưu theo khoá dòng|tên việc. */
  const [boViec, setBoViec] = useState<Set<string>>(new Set());

  const giaTheoDV = useMemo(() => {
    const m = new Map<string, GiaGon[]>();
    for (const g of giaHangMuc) m.set(g.dichVuId, [...(m.get(g.dichVuId) ?? []), g]);
    return m;
  }, [giaHangMuc]);

  /*
    Đầu việc gợi ý theo BẢNG GIÁ HẠNG MỤC của từng dịch vụ — đúng cách AppSheet
    sinh việc khi lập hợp đồng. Chỉ 96/1.018 dịch vụ có bảng giá này, nên dòng
    nào không có thì đơn giản là không sinh việc, không phải lỗi.

    Tên việc lấy thẳng tên hạng mục ("PHOTO", "Makeup", "Photoshop"…). Bên
    AppSheet tên việc đôi khi khác tên hạng mục ("CHỤP TIỆC" cho hạng mục
    "PHOTO") — quy tắc đổi tên đó không đoán ra được từ dữ liệu (đo 21/09: chỉ
    121/380 việc trùng tên hạng mục), nên web ghi tên hạng mục và để người lập
    sửa nếu muốn.
  */
  const viecGoiY = useMemo(
    () =>
      dong.flatMap((d, i) =>
        (d.dichVuId ? (giaTheoDV.get(d.dichVuId) ?? []) : []).map((g) => ({
          khoa: `${i}|${g.hangMuc ?? ""}|${g.donGia}`,
          dong: i,
          loai: g.hangMuc?.trim() || "Việc",
          donGia: g.donGia,
          soLuong: d.soLuong,
          thoiHan: d.ngayChup,
          tenDV: d.tenDV,
        })),
      ),
    [dong, giaTheoDV],
  );

  /*
    Trạng thái tự nhảy theo việc ĐÃ CÓ NGÀY CHỤP hay chưa — đúng hai bước hợp
    đồng mới lập hay đứng bên AppSheet. Người lập chọn tay một lần thì từ đó
    web thôi đoán, không giật lại lựa chọn của họ mỗi lần thêm dòng.
  */
  const coNgayChup = dong.some((d) => d.ngayChup);
  const trangThai = ttTuChon ?? (coNgayChup ? BUOC_MOI_LAP[1] : BUOC_MOI_LAP[0]);

  const thanhTien = dong.reduce((s, d) => s + Math.round(d.donGia * d.soLuong), 0);
  const tongTien = Math.max(0, thanhTien - khuyenMai);
  const daThu = thu.reduce((s, t) => s + (t.soTien || 0), 0);

  const ngayChupChuaCoLich = useMemo(() => {
    const daCo = new Set(lich.map((l) => l.ngay));
    return [...new Set(dong.map((d) => d.ngayChup).filter((n) => n && !daCo.has(n)))].sort();
  }, [dong, lich]);

  const timKhach = () =>
    batDauTim(async () => {
      setKetQua(await timKhachAction(tuKhoa));
    });

  const chonKhach = (k: KhachTim) => {
    setKhachCu(k);
    setKetQua(null);
    setTuKhoa("");
    if (!tenKhach.trim()) setTenKhach(k.ten);
  };

  const doiDong = (i: number, sua: Partial<DongDichVuMoi>) =>
    setDong((ds) => ds.map((d, j) => (i === j ? { ...d, ...sua } : d)));

  const themDong = (dv: DichVuGon | null) =>
    setDong((ds) => [
      ...ds,
      {
        dichVuId: dv?.id ?? null,
        maDV: dv?.maDV ?? "",
        tenDV: dv?.ten ?? "",
        loai: dv && laLoaiDichVu(dv.loai) ? dv.loai : "",
        donGia: dv?.donGia ?? 0,
        soLuong: 1,
        ngayChup: "",
        chiTiet: "",
        ghiChu: "",
      },
    ]);

  const luu = () =>
    start(async () => {
      setLoi(null);
      const kq = await lapHopDongAction({
        khachHangId: khachCu?.id ?? null,
        khachMoi: khachCu ? null : khachMoi,
        tenKhach,
        loaiDV,
        ngayDat,
        diaChi,
        ghiChu,
        khuyenMai,
        trangThai,
        dong,
        thu,
        lich,
        viec: viecGoiY
          .filter((v) => !boViec.has(v.khoa))
          .map((v) => ({ dong: v.dong, loai: v.loai, donGia: v.donGia, soLuong: v.soLuong, thoiHan: v.thoiHan })),
      });
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      if (onXong) onXong(kq.id);
      else router.push(`/quan-ly/hop-dong/${kq.id}`);
    });

  return (
    <form
      className="mt-5 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        luu();
      }}
    >
      {/* ── Khách ─────────────────────────────────────────────────────── */}
      <Khung ten="Khách hàng">
        {khachCu ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-bg-soft px-3.5 py-3 text-sm">
            <span>
              <b>{khachCu.ten}</b>
              {khachCu.soDienThoai && <span className="ml-2 tabular-nums text-fg-muted">{khachCu.soDienThoai}</span>}
              {khachCu.soHopDong > 0 && (
                <span className="ml-2 text-fg-faint">· đã có {khachCu.soHopDong} hợp đồng</span>
              )}
            </span>
            <button type="button" className="btn" onClick={() => setKhachCu(null)}>
              Chọn khách khác
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    timKhach();
                  }
                }}
                placeholder="Tìm khách cũ theo tên hoặc số điện thoại"
                aria-label="Tìm khách cũ"
                className="input flex-1"
              />
              <button type="button" className="btn" onClick={timKhach} disabled={dangTim || tuKhoa.trim().length < 3}>
                {dangTim ? "Đang tìm…" : "Tìm"}
              </button>
            </div>

            {ketQua && (
              <div className="mt-2 grid gap-1.5">
                {ketQua.length === 0 ? (
                  <p className="text-sm text-fg-muted">
                    Không thấy nhà nào. Nhà mới thì điền thẳng bên dưới — mã khách chính là số điện thoại.
                  </p>
                ) : (
                  ketQua.map((k) => (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => chonKhach(k)}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 text-left text-sm transition hover:border-accent"
                    >
                      <span>
                        {k.ten}
                        {k.tinh && <span className="ml-2 text-fg-faint">{k.tinh}</span>}
                      </span>
                      <span className="tabular-nums text-fg-muted">{k.soDienThoai ?? "—"}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <O nhan="Tên khách (nhà mới)">
                <input
                  value={khachMoi.ten}
                  onChange={(e) => {
                    setKhachMoi((k) => ({ ...k, ten: e.target.value }));
                    if (!tenKhach.trim()) setTenKhach(e.target.value);
                  }}
                  className="input"
                />
              </O>
              <O nhan="Số điện thoại" chu="Mã khách chính là số này, đúng như bên AppSheet.">
                <input
                  value={khachMoi.soDienThoai}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, soDienThoai: e.target.value }))}
                  inputMode="tel"
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Tỉnh">
                <input
                  value={khachMoi.tinh}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, tinh: e.target.value }))}
                  className="input"
                />
              </O>
              <O nhan="Ghi chú về khách">
                <input
                  value={khachMoi.ghiChu}
                  onChange={(e) => setKhachMoi((k) => ({ ...k, ghiChu: e.target.value }))}
                  className="input"
                />
              </O>
            </div>
          </>
        )}
      </Khung>

      {/* ── Hợp đồng ──────────────────────────────────────────────────── */}
      <Khung ten="Hợp đồng">
        <div className="grid gap-3 sm:grid-cols-2">
          <O nhan="Tên ghi trên hợp đồng" chu="Thường là tên cô dâu & chú rể.">
            <input value={tenKhach} onChange={(e) => setTenKhach(e.target.value)} className="input" />
          </O>
          <O nhan="Loại hợp đồng">
            <select value={loaiDV} onChange={(e) => setLoaiDV(e.target.value)} className="input">
              {LOAI_DV_HD.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </O>
          <O nhan="Ngày đặt">
            <input type="date" value={ngayDat} onChange={(e) => setNgayDat(e.target.value)} className="input" />
          </O>
          <O nhan="Trạng thái">
            <select value={trangThai} onChange={(e) => setTtTuChon(e.target.value)} className="input">
              {(moHetBuoc ? cacBuoc : BUOC_MOI_LAP).map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {!moHetBuoc && (
              <button
                type="button"
                onClick={() => setMoHetBuoc(true)}
                className="mt-1 text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
              >
                hiện đủ 18 bước
              </button>
            )}
          </O>
          <O nhan="Địa chỉ">
            <input value={diaChi} onChange={(e) => setDiaChi(e.target.value)} className="input" />
          </O>
          <O nhan="Ghi chú">
            <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className="input" />
          </O>
        </div>
      </Khung>

      {/* ── Dịch vụ ───────────────────────────────────────────────────── */}
      <Khung ten="Dịch vụ, trang phục, sản phẩm">
        <ChonDichVu dichVu={dichVu} onChon={themDong} />

        {dong.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">Chưa có dòng nào. Gõ mã hoặc tên dịch vụ ở ô trên để thêm.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {dong.map((d, i) => (
              <div key={i} className="rounded-md border border-line p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/*
                    TÊN DÒNG phải SỬA ĐƯỢC — thử trên giao diện 14/11/2026 mới lộ.

                    Trước đó tên chỉ là một dòng chữ tĩnh, trong khi máy chủ bắt
                    buộc mỗi dòng phải có tên (`kiemHopDongMoi`). Nghĩa là nút
                    "Thêm một dòng trống để gõ tay" tạo ra một dòng KHÔNG BAO
                    GIỜ lưu được: bấm Lập hợp đồng là báo "Dòng 1 chưa có tên
                    dịch vụ", mà không có chỗ nào gõ tên vào.

                    Form SỬA hợp đồng vốn đã có ô này; chỉ form lập mới thiếu —
                    hai form lệch nhau, và cái hỏng lại là cái dùng nhiều hơn.
                  */}
                  <div className="min-w-0">
                    <input
                      value={d.tenDV}
                      onChange={(e) => doiDong(i, { tenDV: e.target.value })}
                      aria-label={`Tên dòng ${i + 1}`}
                      placeholder="Tên dịch vụ, trang phục hoặc sản phẩm…"
                      className="input font-medium"
                    />
                    <p className="mt-1 text-xs text-fg-faint">
                      {d.maDV || "gõ tay"}
                      {d.loai && laLoaiDichVu(d.loai) ? ` · ${TEN_LOAI[d.loai]}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setDong((ds) => ds.filter((_, j) => j !== i))}
                  >
                    Bỏ dòng
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <O nhan="Đơn giá">
                    <input
                      value={d.donGia ? d.donGia.toLocaleString("vi-VN") : ""}
                      onChange={(e) => doiDong(i, { donGia: docTien(e.target.value) ?? 0 })}
                      inputMode="numeric"
                      className="input tabular-nums"
                    />
                  </O>
                  <O nhan="Số lượng">
                    <input
                      value={String(d.soLuong)}
                      onChange={(e) => doiDong(i, { soLuong: Number(e.target.value.replace(",", ".")) || 0 })}
                      inputMode="decimal"
                      className="input tabular-nums"
                    />
                  </O>
                  <O nhan="Ngày chụp">
                    <input
                      type="date"
                      value={d.ngayChup}
                      onChange={(e) => doiDong(i, { ngayChup: e.target.value })}
                      className="input"
                    />
                  </O>
                  <O nhan="Thành tiền">
                    <p className="input flex items-center tabular-nums">{tien(Math.round(d.donGia * d.soLuong))}</p>
                  </O>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <O nhan="Chi tiết">
                    <input value={d.chiTiet} onChange={(e) => doiDong(i, { chiTiet: e.target.value })} className="input" />
                  </O>
                  <O nhan="Ghi chú dòng">
                    <input value={d.ghiChu} onChange={(e) => doiDong(i, { ghiChu: e.target.value })} className="input" />
                  </O>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-2 border-t border-line pt-3 text-sm sm:max-w-sm">
          <Hang ten="Tiền hàng" gia={thanhTien} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-fg-muted">Khuyến mãi</span>
            <input
              value={khuyenMai ? khuyenMai.toLocaleString("vi-VN") : ""}
              onChange={(e) => setKhuyenMai(docTien(e.target.value) ?? 0)}
              inputMode="numeric"
              aria-label="Khuyến mãi"
              className="input w-40 text-right tabular-nums"
            />
          </div>
          <Hang ten="Tổng tiền" gia={tongTien} dam />
          <Hang ten="Đã thu" gia={daThu} />
          <Hang ten="Còn lại" gia={tongTien - daThu} dam />
        </div>
      </Khung>

      {/* ── Cọc ───────────────────────────────────────────────────────── */}
      <Khung
        ten="Tiền cọc"
        chu={
          laQuanLy
            ? "Anh chị là quản lý nên phiếu ghi thẳng là đã thu."
            : "Phiếu sẽ nằm ở trạng thái “Chờ duyệt” cho tới khi quản lý duyệt, đúng như bên AppSheet."
        }
      >
        <div className="grid gap-3">
          {thu.map((t, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-5">
              <O nhan="Số tiền">
                <input
                  value={t.soTien ? t.soTien.toLocaleString("vi-VN") : ""}
                  onChange={(e) =>
                    setThu((ds) => ds.map((x, j) => (i === j ? { ...x, soTien: docTien(e.target.value) ?? 0 } : x)))
                  }
                  inputMode="numeric"
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Hình thức">
                <select
                  value={t.hinhThuc}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, hinhThuc: e.target.value } : x)))}
                  className="input"
                >
                  {HINH_THUC_THU.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Nội dung">
                <select
                  value={t.noiDung}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, noiDung: e.target.value } : x)))}
                  className="input"
                >
                  {NOI_DUNG_THU.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Ngày thu">
                <input
                  type="date"
                  value={t.ngayThu}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, ngayThu: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <O nhan="Ghi chú">
                <input
                  value={t.ghiChu}
                  onChange={(e) => setThu((ds) => ds.map((x, j) => (i === j ? { ...x, ghiChu: e.target.value } : x)))}
                  className="input"
                />
              </O>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn mt-3"
          onClick={() =>
            setThu((ds) => [
              ...ds,
              { soTien: 0, hinhThuc: HINH_THUC_THU[0], noiDung: NOI_DUNG_THU[1], ngayThu: ngayDat, ghiChu: "" },
            ])
          }
        >
          Thêm phiếu thu
        </button>
        <p className="mt-2 text-xs text-fg-faint">Để trống số tiền thì không tạo phiếu nào.</p>
      </Khung>

      {/* ── Lịch ──────────────────────────────────────────────────────── */}
      <Khung ten="Lịch chụp" chu="Mỗi ngày quay/chụp một dòng — đúng như bảng Lịch bên AppSheet.">
        {ngayChupChuaCoLich.length > 0 && (
          <button
            type="button"
            className="btn mb-3"
            onClick={() =>
              setLich((ds) => [
                ...ds,
                ...ngayChupChuaCoLich.map((ngay) => ({ ngay, gio: "", loai: LOAI_LICH[0], ghiChu: "", hienThi: "" })),
              ])
            }
          >
            Lấy {ngayChupChuaCoLich.length} ngày chụp ở trên vào lịch
          </button>
        )}

        <div className="grid gap-3">
          {lich.map((l, i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-[9rem_6rem_11rem_1fr_auto]">
              <O nhan="Ngày">
                <input
                  type="date"
                  value={l.ngay}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, ngay: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <O nhan="Giờ">
                <input
                  type="time"
                  value={l.gio}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, gio: e.target.value } : x)))}
                  className="input tabular-nums"
                />
              </O>
              <O nhan="Loại">
                <select
                  value={l.loai}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, loai: e.target.value } : x)))}
                  className="input"
                >
                  {LOAI_LICH.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </O>
              <O nhan="Ghi chú">
                <input
                  value={l.ghiChu}
                  onChange={(e) => setLich((ds) => ds.map((x, j) => (i === j ? { ...x, ghiChu: e.target.value } : x)))}
                  className="input"
                />
              </O>
              <div className="flex items-end">
                <button type="button" className="btn btn-danger" onClick={() => setLich((ds) => ds.filter((_, j) => j !== i))}>
                  Bỏ
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn mt-3"
          onClick={() => setLich((ds) => [...ds, { ngay: "", gio: "", loai: LOAI_LICH[0], ghiChu: "", hienThi: "" }])}
        >
          Thêm dòng lịch
        </button>
      </Khung>

      {/* ── Đầu việc ──────────────────────────────────────────────────── */}
      <Khung
        ten="Đầu việc tự sinh"
        chu="Theo bảng giá hạng mục của từng dịch vụ. Bỏ tick dòng nào thì dòng đó không được tạo."
      >
        {viecGoiY.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Những dịch vụ đã chọn chưa có bảng giá hạng mục nên chưa sinh đầu việc nào. Thêm hạng mục ở
            trang Dịch vụ thì lần sau tự có.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {viecGoiY.map((v) => {
              const bo = boViec.has(v.khoa);
              return (
                <label
                  key={v.khoa}
                  className={`flex flex-wrap items-center gap-3 rounded-md border border-line px-3 py-2 text-sm ${bo ? "opacity-50" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={!bo}
                    onChange={() =>
                      setBoViec((cu) => {
                        const m = new Set(cu);
                        if (m.has(v.khoa)) m.delete(v.khoa);
                        else m.add(v.khoa);
                        return m;
                      })
                    }
                    className="size-4"
                  />
                  <span className="font-medium">{v.loai}</span>
                  <span className="text-fg-faint">{v.tenDV}</span>
                  <span className="ml-auto tabular-nums text-fg-muted">
                    {tien(Math.round(v.donGia * v.soLuong))}
                    {v.thoiHan && <span className="ml-2 text-fg-faint">hạn {ngayVN(v.thoiHan)}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Khung>

      {loi && <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{loi}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lập hợp đồng"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => (onThoi ? onThoi() : router.push("/quan-ly/hop-dong"))}
          disabled={dangLuu}
        >
          Thôi
        </button>
        <span className="text-xs text-fg-faint">Người lập: {tenNguoiLap}</span>
      </div>
    </form>
  );
}
