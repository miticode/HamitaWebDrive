"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { suaKhachAction, themKhachAction } from "../../actionsKhach";

/**
 * Thêm khách mới và sửa khách đã có — đợt 6 (13/11/2026).
 *
 * MỘT form cho cả hai việc: các ô giống hệt nhau, chỉ khác chỗ gửi đi đâu và
 * câu nói ở trên. Tách hai component là tự tạo ra chỗ để chúng lệch nhau.
 */

type Khach = { id: string; ten: string; soDienThoai: string | null; tinh: string | null; ghiChu: string | null };

function O({
  ten,
  nhan,
  giaTri,
  ...them
}: { ten: string; nhan: string; giaTri?: string | null } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mt-4 block">
      <span className="eyebrow">{nhan}</span>
      <input
        name={ten}
        defaultValue={giaTri ?? ""}
        className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm"
        {...them}
      />
    </label>
  );
}

function KhungKhach({
  khach,
  chepTuAppSheet,
  dong,
}: {
  /** Có khách = đang SỬA; không có = đang THÊM. */
  khach: Khach | null;
  chepTuAppSheet?: boolean;
  dong: () => void;
}) {
  const router = useRouter();
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, batDau] = useTransition();
  const form = useRef<HTMLFormElement>(null);

  function gui(fd: FormData) {
    setLoi(null);
    batDau(async () => {
      const du = {
        ten: String(fd.get("ten") ?? ""),
        soDienThoai: String(fd.get("soDienThoai") ?? ""),
        tinh: String(fd.get("tinh") ?? ""),
        ghiChu: String(fd.get("ghiChu") ?? ""),
      };
      const kq = khach ? await suaKhachAction(khach.id, du) : await themKhachAction(du);
      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      form.current?.reset();
      dong();
      /* Thêm xong thì mở luôn hồ sơ vừa tạo — người ta vừa gõ số, giờ muốn xem nó nằm đâu. */
      if (!khach && "id" in kq) router.push(`/quan-ly/khach-hang/${kq.id}`);
      else router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => !dang && dong()}
    >
      <form
        ref={form}
        action={gui}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-lg bg-bg p-6 shadow-[var(--shadow-lift)] sm:rounded-lg"
      >
        <p className="eyebrow">Tư vấn – Chăm sóc khách hàng</p>
        <h2 className="mt-1.5 font-display text-2xl font-light">
          {khach ? "Sửa thông tin khách" : "Thêm khách mới"}
        </h2>

        <O ten="ten" nhan="Tên khách" giaTri={khach?.ten} required maxLength={120} autoFocus />
        <O
          ten="soDienThoai"
          nhan="Số điện thoại"
          giaTri={khach?.soDienThoai}
          required
          inputMode="tel"
          className="mt-1.5 min-h-11 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 text-sm tabular-nums"
        />
        <O ten="tinh" nhan="Tỉnh" giaTri={khach?.tinh} maxLength={80} />

        <label className="mt-4 block">
          <span className="eyebrow">Ghi chú</span>
          <textarea
            name="ghiChu"
            defaultValue={khach?.ghiChu ?? ""}
            rows={3}
            maxLength={2000}
            className="mt-1.5 w-full rounded-[3px] border border-line-strong bg-bg-raised px-3 py-2 text-sm"
          />
        </label>

        {/*
          Số điện thoại CHÍNH LÀ mã khách — mọi hợp đồng của nhà này bám vào nó.
          Nói trước ở đây, đừng để người ta đổi xong mới phát hiện.
        */}
        <p className="mt-4 text-xs leading-relaxed text-fg-faint">
          Số điện thoại cũng là <span className="text-fg-muted">mã khách</span>. Đổi số là đổi mã —
          mọi hợp đồng của nhà này vẫn giữ nguyên, nhưng số mới không được trùng với nhà khác.
          {/*
            Nhà CHÉP TỪ AppSheet: sửa trên web giữ được, vì lượt đồng bộ sau chỉ
            ghi đè những dòng mà bên AppSheet vừa đổi. Nhưng ai đó sửa đúng nhà
            này bên kia thì bản của họ thắng. Nói thẳng, đừng để người ta tưởng
            web nuốt mất dữ liệu.
          */}
          {chepTuAppSheet && (
            <>
              {" "}Nhà này <span className="text-fg-muted">chép từ AppSheet</span> — sửa ở đây giữ
              được, nhưng nếu bên AppSheet cũng sửa nhà này thì lần bấm “Đồng bộ ngay” sau sẽ lấy
              bản bên đó.
            </>
          )}
        </p>

        {loi && (
          <p className="mt-4 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {loi}
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" disabled={dang} className="btn-primary flex-1 disabled:opacity-50">
            {dang ? "Đang lưu…" : khach ? "Lưu" : "Thêm khách"}
          </button>
          <button type="button" disabled={dang} onClick={dong} className="btn">
            Thôi
          </button>
        </div>
      </form>
    </div>
  );
}

export function NutThemKhach() {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setMo(true)}>
        Thêm khách
      </button>
      {mo && <KhungKhach khach={null} dong={() => setMo(false)} />}
    </>
  );
}

export function NutSuaKhach({ khach, chepTuAppSheet }: { khach: Khach; chepTuAppSheet: boolean }) {
  const [mo, setMo] = useState(false);
  return (
    <>
      <button type="button" className="btn" onClick={() => setMo(true)}>
        Sửa
      </button>
      {mo && <KhungKhach khach={khach} chepTuAppSheet={chepTuAppSheet} dong={() => setMo(false)} />}
    </>
  );
}
