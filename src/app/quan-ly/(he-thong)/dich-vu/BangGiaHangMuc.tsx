"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { datBangGiaAction, type DongGiaNhap } from "../../actionsDichVu";
import { tien } from "@/lib/constants";

/*
  BẢNG GIÁ HẠNG MỤC = ĐẦU VIỆC TỰ SINH — anh yêu cầu 20/11/2026.

  Mỗi dòng ở đây là một đầu việc sẽ tự mọc ra khi ai đó chọn dịch vụ này lúc
  lập hợp đồng, kèm sẵn tiền công người làm nhận. Trước 20/11 bảng này CHỈ
  XEM, nhập một lần từ AppSheet rồi thôi.

  Vì sao phải sửa được: 313 dòng chép từ AppSheet đặt tên đánh số — "Photo 1",
  "Photo 2", "makeup 1", "hoa cầm tay 2" — mà chính anh cũng không còn nhớ số
  đó là BUỔI thứ mấy hay NGƯỜI thứ mấy. Anh nói thẳng: "cái này là dữ liệu
  trong app sheet cũ nên không rõ ràng, a cần làm rõ lại ở web".

  CỘT BUỔI là thứ mới. Nó trả lời câu "việc này làm hôm nào" — nhờ đó lịch
  chụp chia được việc theo từng buổi, thay vì dồn cả hợp đồng vào một đống.

  SỬA TẠI CHỖ, LƯU MỘT LẦN: một gói có tới 13 hạng mục, lưu từng ô là 13 lần
  gọi máy chủ và hỏng nửa chừng thì bảng còn một nửa. Cùng lý do với ô buổi
  chụp bên cạnh (OBuoiChup).
*/

export type DongGia = {
  id: string;
  hangMuc: string;
  donGia: number;
  buoiThu: number | null;
};

/** Buổi mặc định của chính dịch vụ này, đúng thứ tự đã khai. */
export type BuoiGon = { thuTu: number; ten: string };

const TRONG: DongGiaNhap = { id: "", hangMuc: "", donGia: "", buoiThu: "" };

export function BangGiaHangMuc({
  dichVuId,
  banDau,
  dsBuoi,
}: {
  dichVuId: string;
  banDau: DongGia[];
  dsBuoi: BuoiGon[];
}) {
  const router = useRouter();
  const [dong, setDong] = useState<DongGiaNhap[]>(() =>
    banDau.map((d) => ({
      id: d.id,
      hangMuc: d.hangMuc,
      donGia: tien(d.donGia),
      buoiThu: d.buoiThu === null ? "" : String(d.buoiThu),
    })),
  );
  const [sua, setSua] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();

  const banDauNhap = () =>
    banDau.map((d) => ({
      id: d.id,
      hangMuc: d.hangMuc,
      donGia: tien(d.donGia),
      buoiThu: d.buoiThu === null ? "" : String(d.buoiThu),
    }));

  const doi = (i: number, phan: Partial<DongGiaNhap>) =>
    setDong((ds) => ds.map((d, j) => (i === j ? { ...d, ...phan } : d)));

  const tong = dong.reduce((s, d) => s + (Number(d.donGia.replace(/[.,\sđ]/gi, "")) || 0), 0);

  const luu = () =>
    batDau(async () => {
      setLoi(null);
      const kq = await datBangGiaAction(dichVuId, dong);
      if (kq.loi) {
        setLoi(kq.loi);
        return;
      }
      setSua(false);
      router.refresh();
    });

  const thoi = () => {
    setDong(banDauNhap());
    setLoi(null);
    setSua(false);
  };

  /*
    Gộp theo buổi khi CHỈ XEM — đây là câu hỏi người ta mở trang này để hỏi:
    "hôm nhà gái thì gói này cần những ai". Lúc sửa thì để nguyên danh sách
    phẳng, vì gộp xong mà kéo dòng sang buổi khác là nó nhảy chỗ ngay dưới tay.
  */
  const theoBuoi = new Map<string, DongGia[]>();
  for (const d of banDau) {
    const k = d.buoiThu === null ? "" : String(d.buoiThu);
    theoBuoi.set(k, [...(theoBuoi.get(k) ?? []), d]);
  }
  const tenBuoi = (n: number) => dsBuoi.find((b) => b.thuTu + 1 === n)?.ten;
  const nhanBuoi = (k: string) => {
    if (k === "") return "Làm sau, không ra buổi chụp nào · hậu kỳ";
    const n = Number(k);
    const t = tenBuoi(n);
    return t ? `Buổi ${n} · ${t}` : `Buổi ${n} · (gói chưa khai buổi này)`;
  };
  const thuTuKhoa = [...theoBuoi.keys()].sort((a, b) => {
    if (a === "") return 1; // hậu kỳ xuống cuối: nó không thuộc hôm nào cả
    if (b === "") return -1;
    return Number(a) - Number(b);
  });

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="eyebrow">Đầu việc &amp; tiền công</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-fg-faint">
            Mỗi dòng ở đây tự thành một đầu việc khi hợp đồng chọn dịch vụ này, kèm sẵn tiền công
            người làm nhận. Ô <b>“Làm ở buổi chụp nào”</b> không hỏi việc đó là việc gì — nó hỏi
            người làm việc đó phải có mặt ở <b>buổi chụp nào</b>. Makeup, stylist, thợ chụp đều có
            mặt cùng một buổi thì cùng chọn buổi ấy; Photoshop, Xưởng in làm sau nên chọn “làm
            sau”. Nhờ vậy lịch chụp chia được việc cho từng buổi. Chỉ quản lý thấy bảng này.
          </p>
        </div>
        {!sua && (
          <button type="button" className="btn btn-gon shrink-0" onClick={() => setSua(true)}>
            Sửa đầu việc
          </button>
        )}
      </div>

      {dsBuoi.length === 0 && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          Gói này chưa khai buổi chụp nào, nên chưa gắn việc vào buổi được. Gắn buổi ở cột “Buổi
          chụp” ngoài bảng Dịch vụ trước, rồi quay lại đây.
        </p>
      )}

      {sua ? (
        <div className="mt-3 space-y-2">
          {dong.map((d, i) => (
            <div
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-md border border-line bg-bg-raised p-2.5"
            >
              <label className="min-w-[9rem] flex-1">
                <span className="eyebrow block">Tên việc</span>
                <input
                  value={d.hangMuc}
                  onChange={(e) => doi(i, { hangMuc: e.target.value })}
                  placeholder="PHOTO, Makeup, Photoshop…"
                  className="input mt-1 py-1.5 text-sm"
                />
              </label>

              <label className="w-32">
                <span className="eyebrow block">Tiền công</span>
                <input
                  value={d.donGia}
                  onChange={(e) => doi(i, { donGia: e.target.value })}
                  inputMode="numeric"
                  placeholder="300.000"
                  className="input mt-1 py-1.5 text-right text-sm tabular-nums"
                />
              </label>

              <label className="w-60">
                <span className="eyebrow block">Làm ở buổi chụp nào</span>
                <select
                  value={d.buoiThu}
                  onChange={(e) => doi(i, { buoiThu: e.target.value })}
                  className="input mt-1 py-1.5 text-sm"
                >
                  {/* Hậu kỳ đứng đầu vì đó là mặc định của 313 dòng cũ. */}
                  <option value="">— Làm sau, không ra buổi —</option>
                  {dsBuoi.map((b) => (
                    <option key={b.thuTu} value={b.thuTu + 1}>
                      Có mặt buổi {b.thuTu + 1} · {b.ten}
                    </option>
                  ))}
                  {/*
                    Buổi đang gắn mà gói không còn khai nữa thì vẫn phải hiện,
                    kẻo mở ra sửa một ô khác là nó âm thầm tụt về "hậu kỳ".
                  */}
                  {d.buoiThu !== "" && !dsBuoi.some((b) => b.thuTu + 1 === Number(d.buoiThu)) && (
                    <option value={d.buoiThu}>Buổi {d.buoiThu} · (gói không còn buổi này)</option>
                  )}
                </select>
              </label>

              <button
                type="button"
                onClick={() => setDong((ds) => ds.filter((_, j) => j !== i))}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-line text-fg-faint transition hover:border-red-300 hover:text-red-700"
                aria-label={`Bỏ dòng ${i + 1}`}
                title="Bỏ dòng này"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-gon"
              onClick={() => setDong((ds) => [...ds, { ...TRONG }])}
            >
              + Thêm việc
            </button>
            <span className="text-xs text-fg-faint tabular-nums">
              {dong.length} việc · cộng {tien(tong)}đ
            </span>
          </div>

          {loi && (
            <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {loi}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" className="btn-primary" onClick={luu} disabled={dang}>
              {dang ? "Đang lưu…" : "Lưu bảng việc"}
            </button>
            <button type="button" className="btn" onClick={thoi} disabled={dang}>
              Thôi
            </button>
          </div>
        </div>
      ) : banDau.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-fg-faint">
          Chưa khai việc nào. Hợp đồng chọn dịch vụ này sẽ không tự sinh đầu việc nào cả.
        </p>
      ) : (
        /*
          BẢNG NÀY CỐ Ý KHÔNG DÙNG `Bang` — 22/11/2026.

          Hai mươi bảng còn lại của /quan-ly đã chuyển sang component chung,
          riêng cái này thì không: nó KHÔNG CÓ HÀNG TIÊU ĐỀ. Chỗ của tiêu đề
          là hàng nhóm buổi ("BUỔI 1 · NHÀ GÁI · 3 VIỆC"), chạy lại sau mỗi
          nhóm. Ép vào `Bang` là sinh ra một `<thead>` rỗng nằm trên cùng.

          Nó cũng không cần bản thẻ cho điện thoại: hai cột, cột sau là một con
          số ngắn — đo 20/11 trên màn 375px thì không tràn.
        */
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {thuTuKhoa.map((k) => (
                <TheoBuoi key={k} nhan={nhanBuoi(k)} ds={theoBuoi.get(k) ?? []} />
              ))}
              <tr className="bg-bg-soft font-medium">
                <td className="px-4 py-2">Cộng tiền công một hợp đồng</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {tien(banDau.reduce((s, c) => s + c.donGia, 0))}đ
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TheoBuoi({ nhan, ds }: { nhan: string; ds: DongGia[] }) {
  return (
    <>
      <tr className="bg-bg-soft">
        <td colSpan={2} className="px-4 py-1.5 text-[11px] tracking-wide text-fg-muted uppercase">
          {nhan} · {ds.length} việc
        </td>
      </tr>
      {ds.map((c) => (
        <tr key={c.id}>
          <td className="px-4 py-2">
            {c.hangMuc || <span className="text-fg-faint">(không ghi tên việc)</span>}
          </td>
          <td className="px-4 py-2 text-right tabular-nums">{tien(c.donGia)}đ</td>
        </tr>
      ))}
    </>
  );
}
