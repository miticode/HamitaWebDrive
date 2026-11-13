"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { raCaAction, vaoCaAction } from "../../actionsChamCong";

/**
 * Nút vào ca / ra ca.
 *
 * Làm cho ĐIỆN THOẠI trước: cả tiệm bấm cái này hai lần mỗi ngày, và gần như
 * ai cũng bấm bằng điện thoại. Nút to, một thao tác, không có gì phải điền.
 *
 * Nếu màn này khó dùng hơn AppSheet thì cả đợt chuyển hỏng — ngày nào cả tiệm
 * còn mở AppSheet để chấm công thì ngày đó họ còn ở bên kia
 * (xem `KE-HOACH-CRM.md` đợt 4).
 */

/** Chờ vị trí tối đa chừng này rồi thôi, chấm công vẫn chạy tiếp. */
const CHO_VI_TRI_MS = 8000;

/**
 * Hỏi vị trí, KHÔNG BAO GIỜ ném lỗi ra ngoài.
 *
 * Máy từ chối quyền, không bắt được GPS, hay quá 8 giây thì trả null và lượt
 * chấm vẫn được ghi. Bên AppSheet có 334/6.114 lượt mang toạ độ "0,0" — tức
 * chuyện này xảy ra thật, và chặn người ta chấm công vì nó là sai hẳn.
 */
function hoiViTri(): Promise<string | null> {
  return new Promise((xong) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return xong(null);
    let daXong = false;
    const chot = (v: string | null) => {
      if (!daXong) {
        daXong = true;
        xong(v);
      }
    };
    const hen = setTimeout(() => chot(null), CHO_VI_TRI_MS);
    navigator.geolocation.getCurrentPosition(
      (v) => {
        clearTimeout(hen);
        chot(`${v.coords.latitude.toFixed(6)}, ${v.coords.longitude.toFixed(6)}`);
      },
      () => {
        clearTimeout(hen);
        chot(null);
      },
      { enableHighAccuracy: true, timeout: CHO_VI_TRI_MS, maximumAge: 60_000 },
    );
  });
}

export function BamCham({ daVao, daRa }: { daVao: boolean; daRa: boolean }) {
  const router = useRouter();
  const [dang, batDau] = useTransition();
  const [buoc, setBuoc] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [bao, setBao] = useState<string | null>(null);
  const oAnh = useRef<HTMLInputElement>(null);

  function cham(kieu: "vao" | "ra") {
    setLoi(null);
    setBao(null);
    batDau(async () => {
      setBuoc("Đang lấy vị trí…");
      const viTri = await hoiViTri();

      setBuoc("Đang ghi…");
      const anh = oAnh.current?.files?.[0] ?? null;
      const kq = kieu === "vao" ? await vaoCaAction(viTri, anh) : await raCaAction(viTri);
      setBuoc(null);

      if ("loi" in kq) {
        setLoi(kq.loi);
        return;
      }
      if (kieu === "vao" && "daCham" in kq && kq.daCham) {
        setBao("Hôm nay đã chấm vào ca rồi — giữ nguyên giờ vào đầu tiên.");
      }
      if (oAnh.current) oAnh.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="mt-5">
      {!daVao && (
        <label className="mb-3 block">
          <span className="eyebrow">Ảnh (không bắt buộc)</span>
          <input
            ref={oAnh}
            type="file"
            accept="image/*"
            capture="user"
            className="mt-1.5 w-full text-sm text-fg-muted file:mr-3 file:rounded-[3px] file:border file:border-line-strong file:bg-bg-raised file:px-3 file:py-2 file:text-sm"
          />
        </label>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={dang || daVao}
          onClick={() => cham("vao")}
          className="btn-primary min-h-14 text-base disabled:cursor-not-allowed disabled:opacity-40"
        >
          {daVao ? "Đã vào ca" : "Vào ca"}
        </button>
        <button
          type="button"
          disabled={dang || !daVao}
          onClick={() => cham("ra")}
          className="btn min-h-14 text-base disabled:cursor-not-allowed disabled:opacity-40"
        >
          {daRa ? "Bấm lại giờ ra" : "Ra ca"}
        </button>
      </div>

      {buoc && <p className="mt-3 text-sm text-fg-muted">{buoc}</p>}
      {bao && <p className="mt-3 text-sm text-fg-muted">{bao}</p>}
      {loi && (
        <p className="mt-3 rounded-[3px] border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {loi}
        </p>
      )}

      {/*
        Nói trước rằng không có vị trí vẫn chấm được. Không nói thì người bị
        máy từ chối quyền sẽ ngồi loay hoay bật GPS, hoặc tệ hơn là tưởng mình
        chưa chấm được rồi bấm đi bấm lại.
      */}
      <p className="mt-3 text-xs text-fg-faint">
        Máy không lấy được vị trí thì vẫn chấm được bình thường, chỉ là bảng công
        ghi &ldquo;không rõ vị trí&rdquo;.
      </p>
    </div>
  );
}
