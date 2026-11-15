"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MA_ALBUM, ganMa, laMa } from "@/lib/maAlbum";
import { taoThuMucAlbumAction } from "../../../actionsHopDong";

/**
 * Tạo thư mục Drive và album cho một hợp đồng chưa có — thêm 14/11/2026.
 *
 * Hai việc cùng một nút:
 *
 * 1. **Đường lui của việc chạy nền.** Lập hợp đồng xong web tự tạo, nhưng
 *    việc đó chạy nền và có thể hỏng (Drive rớt mạng, kết nối hết hạn). Hỏng
 *    thì vẫn còn đường đi bộ, thay vì phải vào Drive tạo tay rồi quay ra dán
 *    link rồi lại bấm Gắn hợp đồng.
 * 2. **Dùng cho 2.400 hợp đồng cũ** lập từ trước ngày có tính năng này.
 *
 * ━━ Vì sao hỏi tên thay vì lấy thẳng tên trên hợp đồng ━━
 *
 * Album của tiệm đặt tên kèm MÃ ở đầu — "HIS - Minh Ngọc & Công Khoa",
 * "HC - Trúc Hà & Hữu Lợi". Mã đó nói buổi chụp nào, thứ hợp đồng không biết:
 * một hợp đồng CƯỚI có thể là hình cổng, là nhà trai, là album, mà `loaiDV`
 * không suy ra nổi. Đoán bừa thì bộ lọc theo mã ở trang quản lý album bắt
 * trượt, nên để người bấm chọn — một cú bấm, y như lúc tạo link bên `/admin`.
 *
 * Tên này đặt cho CẢ thư mục Drive lẫn album, nên hai bên không lệch nhau.
 */
export function NutTaoThuMuc({
  hopDongId,
  tenKhach,
}: {
  hopDongId: string;
  /** Tên khách trên hợp đồng — điền sẵn để khỏi gõ lại. */
  tenKhach: string;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [ten, setTen] = useState(tenKhach);
  const [loi, setLoi] = useState<string | null>(null);
  /*
    Tên những album hợp đồng này ĐÃ CÓ, do máy chủ trả về khi từ chối lần bấm
    đầu. null = chưa hỏi gì.

    Thêm 15/11/2026: anh gặp hợp đồng ra hai album trùng nhau. Nhật ký cho
    thấy web tạo một cái lúc lập, người lập bấm nút tạo cái nữa hai mươi giây
    sau — việc tự tạo chạy nền nên trang vẫn đang hiện "Chưa có album nào".
    Giờ bấm lần đầu là máy chủ kể ra album đang có, muốn tạo tiếp thì bấm lại.
  */
  const [daCo, setDaCo] = useState<string[] | null>(null);
  const [dang, batDau] = useTransition();

  const tao = () =>
    batDau(async () => {
      setLoi(null);
      /* Lần bấm thứ hai (đã thấy danh sách) mới gửi kèm cái gật đầu. */
      const kq = await taoThuMucAlbumAction(hopDongId, ten, daCo !== null);
      if ("daCo" in kq) {
        setDaCo(kq.daCo);
        return;
      }
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      setMo(false);
      setDaCo(null);
      router.refresh();
    });

  if (!mo) {
    return (
      <button type="button" onClick={() => setMo(true)} className="btn mt-3">
        Tạo thư mục Drive &amp; album
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-accent/40 bg-accent-soft/20 p-3">
      <p className="eyebrow">Tên hiện trên album và trên thư mục Drive</p>

      <input
        value={ten}
        onChange={(e) => setTen(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && ten.trim() && tao()}
        placeholder="VD: HIS - Minh Ngọc & Công Khoa"
        aria-label="Tên album"
        autoComplete="off"
        className="input mt-2 w-full"
      />

      {/* Đủ bộ mã, kể cả mã chưa album nào dùng — giống hệt form tạo link bên
          `/admin`, vì hai chỗ cùng trả lời câu "được phép đặt mã nào". */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {MA_ALBUM.map((m) => {
          const dangCo = laMa(ten, m.ma);
          return (
            <button
              key={m.ma}
              type="button"
              onClick={() => setTen((t) => ganMa(t, m.ma))}
              title={m.nghia ? `${m.ma} — ${m.nghia}` : m.ma}
              className={`min-h-8 rounded-full border px-2.5 text-xs tracking-wide transition ${
                dangCo
                  ? "border-transparent bg-fg text-bg"
                  : "border-line-strong bg-bg-raised text-fg-muted hover:border-accent hover:text-fg"
              }`}
            >
              {m.ma}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-fg-faint">
        Bấm một mã để thêm vào đầu tên, bấm lại để bỏ. Thư mục vào đúng{" "}
        <b className="text-fg-muted">năm / tháng chụp</b> như tiệm vẫn xếp, và album gắn sẵn hợp
        đồng này.
      </p>

      {daCo && (
        <div className="mt-2.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <p>
            Hợp đồng này đã có {daCo.length} album rồi:{" "}
            <b>{daCo.join(" · ")}</b>
          </p>
          <p className="mt-1 text-xs">
            Gói cưới hai ngày thì hai album (HER và HIS) là đúng. Còn nếu chỉ là tạo lại vì chưa
            thấy, thì bấm Thôi — album kia đã có sẵn rồi. Muốn tạo thêm thì bấm lần nữa.
          </p>
        </div>
      )}

      {loi && <p className="mt-2 text-sm text-red-700">{loi}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={tao}
          disabled={dang || !ten.trim()}
          className="btn-primary disabled:opacity-50"
        >
          {dang ? "Đang tạo trên Drive…" : daCo ? "Vẫn tạo thêm" : "Tạo thư mục & album"}
        </button>
        <button type="button" onClick={() => setMo(false)} disabled={dang} className="btn">
          Thôi
        </button>
      </div>
    </div>
  );
}
