"use client";

import type { Dispatch, SetStateAction } from "react";
import type { DongLichMoi } from "@/lib/hopDongChung";
import { Khung, O } from "../ChonDichVu";

/*
  KHỐI LỊCH CHỤP trong form lập hợp đồng — tách khỏi FormHopDongMoi 22/11/2026.

  Khối sạch nhất của bước ba: chỉ sáu thứ từ cha, và cả sáu đều là dữ liệu
  của chính nó. Không chạm tới khách, dịch vụ, tiền hay đầu việc.

  KHÔNG đổi một dòng logic nào — mã, lớp CSS, chữ, thứ tự y nguyên.
*/
export function KhoiLichChup({
  lich,
  setLich,
  dsLoai,
  dsLyDo,
  loaiDau,
  ngayChupChuaCoLich,
}: {
  lich: DongLichMoi[];
  setLich: Dispatch<SetStateAction<DongLichMoi[]>>;
  /** Loại buổi để đổ vào ô chọn, đọc từ bảng LoaiBuoi. */
  dsLoai: readonly { ten: string; maAlbum: string | null }[];
  /** Lý do một buổi chưa có ngày — "Khách chưa chốt ngày", "Đã hoãn"… */
  dsLyDo: string[];
  /** Loại buổi mặc định cho dòng mới. */
  loaiDau: string;
  /** Ngày chụp đã gõ ở dòng dịch vụ mà lịch chưa có — để bấm lấy sang một lượt. */
  ngayChupChuaCoLich: string[];
}) {
  return (
        <Khung
          ten="Lịch chụp"
          chu="Mỗi buổi quay/chụp một dòng. Chưa biết ngày thì cứ chọn loại buổi và để trống ngày — buổi vẫn được lưu."
        >
          {ngayChupChuaCoLich.length > 0 && (
            <button
              type="button"
              className="btn mb-3"
              onClick={() =>
                setLich((ds) => [
                  ...ds,
                  ...ngayChupChuaCoLich.map((ngay) => ({ ngay, gio: "", loai: loaiDau, lyDoTrong: "", ghiChu: "", hienThi: "" })),
                ])
              }
            >
              Lấy {ngayChupChuaCoLich.length} ngày chụp ở trên vào lịch
            </button>
          )}

          <div className="grid gap-3">
            {lich.map((l, i) => (
              <div
                key={i}
                className={`grid gap-3 rounded-lg ${
                  l.ngay ? "" : "border border-amber-300 bg-amber-50/60 p-3"
                }`}
              >
              <div className="grid gap-3 sm:grid-cols-[9rem_6rem_11rem_1fr_auto]">
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
                    {dsLoai.map(({ ten: x }) => (
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

              {/*
                Buổi ĐÃ CHỌN LOẠI mà chưa có ngày thì vẫn lưu (anh chốt
                19/11/2026) — ba tình huống: gói prewedding đặt trước chưa chốt
                ngày, trọn gói mà chưa chụp prewedding, và hoãn ngày cưới.

                Ô lý do chỉ hiện khi ngày trống, vì nó chỉ có nghĩa lúc đó. Hai
                lý do khác nhau ở việc phải làm: chưa chốt thì gọi nhắc, còn đã
                hoãn thì phải báo lại ekip đã xếp người và váy.
              */}
              {!l.ngay && (
                <div className="grid gap-3 sm:grid-cols-[1fr_15rem] sm:items-end">
                  <p className="text-xs text-amber-900">
                    Buổi này sẽ lưu là <strong>chưa có ngày</strong>. Nó đứng ở khu “Chờ xếp ngày” của
                    trang Lịch chụp cho tới khi ai đó điền ngày.
                  </p>
                  <O nhan="Vì sao chưa có ngày">
                    <select
                      value={l.lyDoTrong || dsLyDo[0]}
                      onChange={(e) =>
                        setLich((ds) => ds.map((x, j) => (i === j ? { ...x, lyDoTrong: e.target.value } : x)))
                      }
                      className="input"
                    >
                      {dsLyDo.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </O>
                </div>
              )}
              </div>
            ))}
          </div>

          <button
            type="button"
            className="btn mt-3"
            onClick={() => setLich((ds) => [...ds, { ngay: "", gio: "", loai: loaiDau, lyDoTrong: "", ghiChu: "", hienThi: "" }])}
          >
            Thêm dòng lịch
          </button>
        </Khung>
  );
}
