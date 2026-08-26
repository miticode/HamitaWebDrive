"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { KhoAnh as SoLieuKho } from "@/app/api/admin/kho-anh/route";

/**
 * Khung "Kho ảnh" ở đầu trang quản lý.
 *
 * Lý do nó tồn tại: hạn giữ ảnh trước đây chỉ là một dòng đếm ngược cho khách
 * xem, không ai nhắc studio dọn. Đo ngày 26/08/2026 thấy hậu quả — Drive đã
 * dùng 99,5%, trong khi toàn bộ album đang phục vụ khách chỉ chiếm 5,79 GB.
 * Tức gần như tất cả là ảnh của những buổi chụp xong từ lâu.
 *
 * Khung này biến chuyện vô hình đó thành thứ nhìn thấy MỖI LẦN mở trang quản
 * lý — đáng tin hơn một lời nhắc hằng tháng, vì nó luôn đúng với hiện tại chứ
 * không phải đúng vào ngày gửi nhắc.
 *
 * Tự giấu đi khi không có gì đáng nói: kho còn rộng và không album nào quá
 * hạn. Một khung luôn hiện thì chẳng mấy chốc thành thứ người ta nhìn mà không
 * đọc nữa.
 */

export type AlbumHan = {
  id: string;
  ten: string;
  slug: string;
  /** Dung lượng trên Drive tính bằng MB. 0 = chưa đo lần nào. */
  mb: number;
  /** Số ngày đã quá hạn, hoặc số ngày còn lại nếu chưa quá. */
  soNgay: number;
  quaHan: boolean;
};

/** Trên mức này thì coi là sắp đầy và đổi sang màu cảnh báo. */
const NGUONG_CANH_BAO = 90;
const NGUONG_GAN_DAY = 75;

function gb(mb: number): string {
  return (mb / 1024).toFixed(2).replace(".", ",");
}

function gbTuByte(byte: number): string {
  return (byte / 1024 ** 3).toFixed(1).replace(".", ",");
}

export function KhoAnh({
  quaHan,
  sapHetHan,
}: {
  /** Album đã qua mốc hạn giữ ảnh — dọn được ngay. */
  quaHan: AlbumHan[];
  /** Album còn hạn nhưng dưới 30 ngày — báo trước để khỏi bị động. */
  sapHetHan: AlbumHan[];
}) {
  const [kho, setKho] = useState<SoLieuKho | null>(null);
  const [dangDoc, setDangDoc] = useState(true);

  useEffect(() => {
    let con = true;

    const doc = async () => {
      try {
        const res = await fetch("/api/admin/kho-anh", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { kho: SoLieuKho | null };
        if (!con) return;
        setKho(data.kho);
      } catch {
        // Mạng trục trặc thì thôi, khung dung lượng tự ẩn.
      } finally {
        if (con) setDangDoc(false);
      }
    };

    void doc();
    return () => {
      con = false;
    };
  }, []);

  const tongMBDonDuoc = quaHan.reduce((s, a) => s + a.mb, 0);
  const chuaDo = quaHan.filter((a) => a.mb === 0).length;

  const gapKho = kho !== null && kho.phanTram >= NGUONG_CANH_BAO;
  const chuY = kho !== null && kho.phanTram >= NGUONG_GAN_DAY;

  // Không có gì đáng nói thì không chiếm chỗ.
  if (!dangDoc && !kho && quaHan.length === 0 && sapHetHan.length === 0) {
    return null;
  }

  return (
    <section
      className={`card p-4 sm:p-5 ${
        gapKho ? "border-red-300" : chuY ? "border-amber-300" : ""
      }`}
      aria-label="Kho ảnh trên Drive"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="eyebrow">Kho ảnh trên Drive</h2>
        {kho?.email && (
          <span className="text-xs text-fg-faint">{kho.email}</span>
        )}
      </div>

      {kho && (
        <div className="mt-3">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-bg-soft"
            role="img"
            aria-label={`Đã dùng ${kho.phanTram}% dung lượng Drive`}
          >
            <div
              className={`h-full rounded-full ${
                gapKho ? "bg-red-500" : chuY ? "bg-amber-500" : "bg-accent"
              }`}
              style={{ width: `${Math.min(100, kho.phanTram)}%` }}
            />
          </div>

          <p className="mt-2.5 text-sm">
            <b
              className={
                gapKho ? "text-red-700" : chuY ? "text-amber-700" : "text-fg"
              }
            >
              Đã dùng {String(kho.phanTram).replace(".", ",")}%
            </b>
            <span className="text-fg-muted">
              {" · "}
              {gbTuByte(kho.daDung)}/{gbTuByte(kho.tong)} GB · còn{" "}
              {gbTuByte(kho.conLai)} GB
            </span>
          </p>

          {gapKho && (
            <p className="notice mt-3 bg-red-50 text-red-700">
              Drive gần đầy. Đầy hẳn là <b>không upload được ảnh mới</b>, và
              Gmail trên chính tài khoản này cũng ngừng nhận thư — mà đó là tài
              khoản dùng chung cho cả Neon lẫn Vercel.
            </p>
          )}
        </div>
      )}

      {quaHan.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium">
            {quaHan.length} album đã quá hạn giữ ảnh
            {tongMBDonDuoc > 0 && (
              <span className="text-fg-muted">
                {" "}
                · dọn được khoảng {gb(tongMBDonDuoc)} GB
              </span>
            )}
          </p>

          <ul className="mt-2.5 divide-y divide-line">
            {quaHan.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1.5"
              >
                <Link
                  href={`/g/${a.slug}`}
                  target="_blank"
                  className="text-sm hover:text-accent"
                >
                  {a.ten}
                </Link>
                <span className="text-xs text-fg-muted tabular-nums">
                  {a.mb > 0 ? `${gb(a.mb)} GB` : "chưa đo"} · quá {a.soNgay}{" "}
                  ngày
                </span>
              </li>
            ))}
          </ul>

          {chuaDo > 0 && (
            <p className="mt-2 text-xs text-fg-faint">
              {chuaDo} album chưa đo dung lượng — bấm “Làm mới” ở thẻ album đó
              là có số.
            </p>
          )}

          <p className="mt-3 text-xs leading-relaxed text-fg-muted">
            Hamita xoá ảnh trên Drive thì khách mở link sẽ không còn thấy ảnh.
            Nên nhắn khách tải về trước, rồi mới dọn. Xoá album ở đây{" "}
            <b>không</b> xoá gì trên Drive — chỉ gỡ link đã gửi khách.
          </p>
        </div>
      )}

      {sapHetHan.length > 0 && (
        <p className="mt-4 text-xs text-fg-muted">
          Sắp tới hạn trong 30 ngày:{" "}
          {sapHetHan
            .map((a) => `${a.ten} (còn ${a.soNgay} ngày)`)
            .join(" · ")}
        </p>
      )}
    </section>
  );
}
