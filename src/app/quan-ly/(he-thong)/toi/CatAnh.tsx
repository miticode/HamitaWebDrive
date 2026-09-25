"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tự căn khung ảnh đại diện trước khi lưu — anh yêu cầu 25/09/2026.
 *
 * Bản đầu cắt cứng phần giữa ảnh, mà ảnh chụp người ít khi đứng giữa khung:
 * cắt giữa là mất nửa cái đầu hoặc lấy trúng cái bàn phía sau.
 *
 * Cách dùng: kéo ảnh để chọn phần muốn giữ, thanh trượt để phóng to. Khung
 * tròn hiện đúng thứ khách sẽ thấy ngoài trang.
 *
 * VẼ BẰNG CANVAS chứ không phải thẻ <img> với địa chỉ blob tạm: React chạy
 * effect hai lần ở chế độ phát triển, lần dọn thứ nhất thu hồi địa chỉ đang
 * tải dở và ảnh hỏng ngay ("không đọc được ảnh này"). `createImageBitmap`
 * không cần địa chỉ tạm nên không dính bẫy đó, và cùng một mạch vẽ dùng được
 * cho cả xem trước lẫn lúc xuất ảnh.
 *
 * Toán chỉ có một phép: `tiLe` là số pixel ảnh gốc ứng với một pixel trên
 * khung. Kéo bao nhiêu pixel màn hình thì dịch bấy nhiêu nhân `tiLe`.
 */
const KHUNG = 288; // cạnh khung xem trước, pixel
const CANH_RA = 320; // cạnh ảnh lưu vào database

export function CatAnh({
  file,
  dangLuu,
  onXong,
  onThoi,
}: {
  file: File;
  dangLuu: boolean;
  onXong: (base64: string) => void;
  onThoi: () => void;
}) {
  const [anh, setAnh] = useState<ImageBitmap | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  /** Tâm vùng cắt, tính bằng pixel của ẢNH GỐC. */
  const [tam, setTam] = useState({ x: 0, y: 0 });
  const keo = useRef<{ x: number; y: number } | null>(null);
  const oVe = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let huy = false;
    createImageBitmap(file)
      .then((bm) => {
        if (huy) {
          bm.close();
          return;
        }
        setAnh(bm);
        setTam({ x: bm.width / 2, y: bm.height / 2 });
        setZoom(1);
      })
      .catch(() => {
        if (!huy) setLoi("Không đọc được ảnh này, anh chị thử tấm khác giúp em.");
      });
    return () => {
      huy = true;
    };
  }, [file]);

  /*
    Cạnh vùng cắt trên ảnh gốc. Zoom 1 = lấy trọn cạnh ngắn (thấy nhiều nhất),
    zoom 3 = lấy một phần ba cạnh đó.
  */
  const canhNgan = anh ? Math.min(anh.width, anh.height) : 1;
  const vung = canhNgan / zoom;
  const tiLe = vung / KHUNG;

  /* Giữ vùng cắt nằm trọn trong ảnh: kéo mấy cũng không lòi mép trắng. */
  const ghim = (t: { x: number; y: number }) =>
    anh
      ? {
          x: Math.min(Math.max(t.x, vung / 2), anh.width - vung / 2),
          y: Math.min(Math.max(t.y, vung / 2), anh.height - vung / 2),
        }
      : t;
  const tamGhim = ghim(tam);

  /* Vẽ lại khung xem trước mỗi khi kéo hoặc đổi mức phóng. */
  useEffect(() => {
    const c = oVe.current;
    if (!c || !anh) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.clearRect(0, 0, KHUNG, KHUNG);
    ctx.drawImage(anh, tamGhim.x - vung / 2, tamGhim.y - vung / 2, vung, vung, 0, 0, KHUNG, KHUNG);
  }, [anh, tamGhim.x, tamGhim.y, vung]);

  if (loi) {
    return (
      <div className="rounded-md border border-line bg-bg-raised p-5">
        <p className="text-sm text-red-700">{loi}</p>
        <button type="button" onClick={onThoi} className="btn mt-3 min-h-10 px-4">
          Đóng
        </button>
      </div>
    );
  }
  if (!anh) return <p className="text-sm text-fg-muted">Đang mở ảnh…</p>;

  const batDauKeo = (e: React.PointerEvent) => {
    keo.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dangKeo = (e: React.PointerEvent) => {
    if (!keo.current) return;
    const dx = e.clientX - keo.current.x;
    const dy = e.clientY - keo.current.y;
    keo.current = { x: e.clientX, y: e.clientY };
    setTam((t) => ghim({ x: t.x - dx * tiLe, y: t.y - dy * tiLe }));
  };
  const thoiKeo = () => {
    keo.current = null;
  };

  const xuat = () => {
    const canvas = document.createElement("canvas");
    canvas.width = CANH_RA;
    canvas.height = CANH_RA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(anh, tamGhim.x - vung / 2, tamGhim.y - vung / 2, vung, vung, 0, 0, CANH_RA, CANH_RA);
    onXong(canvas.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "");
  };

  return (
    <div className="rounded-md border border-line bg-bg-raised p-5">
      <p className="text-sm text-fg-muted">Kéo ảnh để chọn phần muốn giữ, gạt thanh dưới để phóng to.</p>

      <canvas
        ref={oVe}
        width={KHUNG}
        height={KHUNG}
        onPointerDown={batDauKeo}
        onPointerMove={dangKeo}
        onPointerUp={thoiKeo}
        onPointerCancel={thoiKeo}
        aria-label="Khung cắt ảnh đại diện"
        className="mt-4 max-w-full cursor-grab touch-none rounded-full border border-line bg-bg-soft active:cursor-grabbing"
      />

      <label className="mt-4 flex items-center gap-3 text-xs text-fg-muted">
        Thu nhỏ
        <input
          type="range"
          min={1}
          max={3}
          step={0.02}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="min-w-0 flex-1"
          aria-label="Phóng to ảnh"
        />
        Phóng to
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={dangLuu} onClick={xuat} className="btn-primary min-h-10 px-4">
          {dangLuu ? "Đang lưu…" : "Lưu ảnh này"}
        </button>
        <button type="button" disabled={dangLuu} onClick={onThoi} className="btn min-h-10 px-4">
          Thôi
        </button>
      </div>
    </div>
  );
}
