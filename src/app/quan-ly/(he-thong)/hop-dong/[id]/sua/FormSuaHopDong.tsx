"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { tien } from "@/lib/constants";
import { docTien } from "@/lib/studioNoiBo";
import { LOAI_DICH_VU, TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import { CAC_BUOC, LOAI_DV_HD, ngayVN, type DongDichVuMoi } from "@/lib/hopDongChung";
import { suaHopDongAction } from "../../../../actionsHopDong";
import { ChonDichVu, Hang, Khung, O, type DichVuGon } from "../../ChonDichVu";

/**
 * Sửa một hợp đồng đã lập — anh chốt 23/09/2026.
 *
 * Form này CHỈ đụng tới thông tin hợp đồng và các dòng dịch vụ. Phiếu thu,
 * lịch chụp và đầu việc có chỗ sửa riêng: gộp hết vào một trang thì mỗi lần
 * đổi một con số lại phải nhìn cả trang, và dễ sửa nhầm thứ không định sửa.
 *
 * Dòng cũ mang theo `id` để máy chủ biết là CẬP NHẬT chứ không thêm mới — mã
 * dòng (`_1`, `_2`…) nhờ vậy giữ nguyên, vì mã đó đã in trên đơn giao in.
 */
export function FormSuaHopDong({
  id,
  maHD,
  dichVu,
  luotDung,
  banDau,
  cacBuoc = CAC_BUOC,
  chepTuAppSheet = false,
}: {
  id: string;
  maHD: string;
  dichVu: DichVuGon[];
  /** maDV → số lần đã dùng trong hợp đồng; để danh sách bày sẵn xếp hay-dùng-trước. */
  luotDung?: Record<string, number>;

  /**
   * Hợp đồng này có dấu vân tay AppSheet không (đợt soát UX, mục P0-1).
   *
   * Câu cảnh báo ghi đè trước đây nằm ở dải báo đầu BẢY trang danh sách — chỗ
   * người ta chỉ đang xem, nên không ai đọc, và nó còn nói sai một ngày trời
   * sau khi lịch đêm bị bỏ. Chuyển về đây: đúng lúc sắp sửa thật, đúng những
   * hợp đồng thật sự có thể bị đè.
   */
  chepTuAppSheet?: boolean;
  /** Mười tám bước đọc từ bảng `BuocHopDong` (đợt 6); mặc định là bảng cứng. */
  cacBuoc?: readonly string[];
  banDau: {
    tenKhach: string;
    loaiDV: string;
    ngayDat: string;
    diaChi: string;
    ghiChu: string;
    khuyenMai: number;
    trangThai: string;
    dong: DongDichVuMoi[];
  };
}) {
  const router = useRouter();
  const [dangLuu, start] = useTransition();
  const [loi, setLoi] = useState<string | null>(null);

  const [tenKhach, setTenKhach] = useState(banDau.tenKhach);
  const [loaiDV, setLoaiDV] = useState(banDau.loaiDV);
  const [diaChi, setDiaChi] = useState(banDau.diaChi);
  const [ghiChu, setGhiChu] = useState(banDau.ghiChu);
  const [khuyenMai, setKhuyenMai] = useState(banDau.khuyenMai);
  const [trangThai, setTrangThai] = useState(banDau.trangThai);
  const [dong, setDong] = useState<DongDichVuMoi[]>(banDau.dong);

  const thanhTien = dong.reduce((s, d) => s + Math.round(d.donGia * d.soLuong), 0);
  const tongTien = Math.max(0, thanhTien - khuyenMai);

  const doiDong = (i: number, sua: Partial<DongDichVuMoi>) =>
    setDong((ds) => ds.map((d, j) => (i === j ? { ...d, ...sua } : d)));

  /*
    CUỘN TỚI DÒNG VỪA THÊM — anh chỉ ra 14/11/2026 ("kéo xuống dưới mới thấy
    cái đã chọn").

    Cửa sổ chọn đóng lại đã giải quyết phần lớn, nhưng hợp đồng cưới hay có
    năm bảy dòng; dòng mới luôn nằm cuối, nên vẫn khuất dưới màn hình. Đây là
    lần DUY NHẤT web tự cuộn giùm — và chỉ khi số dòng TĂNG, để bỏ một dòng
    không giật người ta đi đâu cả.
  */
  const soDongCu = useRef(0);
  const dongCuoi = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dong.length > soDongCu.current) {
      dongCuoi.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    soDongCu.current = dong.length;
  }, [dong.length]);

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
      const kq = await suaHopDongAction(id, {
        tenKhach,
        loaiDV,
        diaChi,
        ghiChu,
        khuyenMai,
        trangThai,
        dong,
      });
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      router.push(`/quan-ly/hop-dong/${id}`);
      router.refresh();
    });

  return (
    <form
      className="mt-6 grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        luu();
      }}
    >
      {chepTuAppSheet && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          Hợp đồng này <b>chép từ AppSheet</b>. Sửa ở đây giữ được — trừ khi bên AppSheet cũng sửa
          đúng hợp đồng này, rồi có người bấm “Đồng bộ ngay”: lúc đó bản bên kia thắng.
        </p>
      )}

      <Khung ten="Hợp đồng" chu={maHD}>
        <div className="grid gap-3 sm:grid-cols-2">
          <O nhan="Tên ghi trên hợp đồng">
            <input value={tenKhach} onChange={(e) => setTenKhach(e.target.value)} className="input" />
          </O>
          <O nhan="Loại hợp đồng">
            <select value={loaiDV} onChange={(e) => setLoaiDV(e.target.value)} className="input">
              {/* Loại cũ lạ (hợp đồng chép từ AppSheet) vẫn phải chọn lại được. */}
              {[...new Set([loaiDV, ...LOAI_DV_HD])].filter(Boolean).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </O>
          <O nhan="Ngày lập hợp đồng">
            <p className="input flex items-center bg-bg-sunken text-fg-muted tabular-nums">
              {banDau.ngayDat ? ngayVN(banDau.ngayDat) : "—"}
            </p>
            <p className="mt-1 text-xs text-fg-faint">Ghi lúc lập hợp đồng, không sửa được.</p>
          </O>
          <O nhan="Trạng thái" chu={`Đủ ${cacBuoc.length} bước như bên AppSheet.`}>
            <select value={trangThai} onChange={(e) => setTrangThai(e.target.value)} className="input">
              {cacBuoc.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </O>
          <O nhan="Địa chỉ">
            <input value={diaChi} onChange={(e) => setDiaChi(e.target.value)} className="input" />
          </O>
          <O nhan="Ghi chú">
            <input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} className="input" />
          </O>
        </div>
      </Khung>

      <Khung
        ten="Dịch vụ, trang phục, sản phẩm"
        chu="Bỏ một dòng thì đầu việc CHƯA AI LÀM của dòng đó cũng bỏ theo; việc đã giao hay đã xong thì giữ lại."
      >
        <ChonDichVu dichVu={dichVu} luotDung={luotDung} onChon={themDong} />

        {dong.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">Hợp đồng đang không còn dòng nào — thêm ít nhất một dòng mới lưu được.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {dong.map((d, i) => (
              <div
                key={d.id ?? `moi-${i}`}
                ref={i === dong.length - 1 ? dongCuoi : null}
                className="rounded-md border border-line p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <input
                      value={d.tenDV}
                      onChange={(e) => doiDong(i, { tenDV: e.target.value })}
                      aria-label={`Tên dòng ${i + 1}`}
                      className="input font-medium"
                    />
                    {/* Loại dòng — giống hệt form lập mới, xem chú thích ở đó. */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {d.dichVuId && laLoaiDichVu(d.loai) ? (
                        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-muted">
                          {TEN_LOAI[d.loai]}
                        </span>
                      ) : (
                        LOAI_DICH_VU.map((l) => (
                          <button
                            key={l}
                            type="button"
                            onClick={() => doiDong(i, { loai: l })}
                            className={`rounded-full border px-2 py-0.5 text-[11px] transition ${
                              d.loai === l
                                ? "border-accent bg-accent-soft text-accent"
                                : "border-line text-fg-muted hover:border-line-strong"
                            }`}
                          >
                            {TEN_LOAI[l]}
                          </button>
                        ))
                      )}
                      <span className="text-xs text-fg-faint">
                        {d.maDV || "gõ tay"}
                        {d.id ? "" : " · dòng mới"}
                      </span>
                    </div>
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
                  {/* Nhãn đổi theo loại — xem chú thích ở form lập mới. */}
                  <O nhan={d.loai === "trang-phuc" ? "Ngày thuê" : d.loai === "san-pham" ? "Ngày giao" : "Ngày chụp"}>
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
          <p className="text-xs text-fg-faint">
            Đã thu và còn lại do phiếu thu quyết định — web cộng lại ngay sau khi lưu.
          </p>
        </div>
      </Khung>

      {loi && <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{loi}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-primary" disabled={dangLuu}>
          {dangLuu ? "Đang lưu…" : "Lưu hợp đồng"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => router.push(`/quan-ly/hop-dong/${id}`)}
          disabled={dangLuu}
        >
          Thôi
        </button>
      </div>
    </form>
  );
}
