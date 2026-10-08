"use client";

import { useState, type ReactNode } from "react";

/**
 * Mot nut chep-vao-clipboard dung lai duoc cho nhieu dinh dang khac nhau.
 * Dung clipboard thay vi tai file .txt vi ket qua hay duoc dan vao Zalo/mail
 * hon la luu thanh file.
 *
 * Xuat ra ngoai tu 08/10/2026: tung THU MUC cung co nut chep ma so rieng
 * (nguyen tac 64), va no can dung dung mot cai nut nay chu khong phai mot ban
 * chep thu hai — hai ban thi co ngay mot ben bao "Da chep" con ben kia khong.
 */
export function NutChep({
  nhan,
  text,
  lop = "btn",
}: {
  /**
   * ReactNode chu khong phai string: nut cua tung thu muc deo them mot bieu
   * tuong chep ben trai chu (xem nguyen tac 64).
   */
  nhan: ReactNode;
  text: string;
  /** Hinh dang nut theo cho dung — hang nut thuong (.btn) hay nut gon trong dau muc (.btn-gon). */
  lop?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className={lop}
    >
      {copied ? "Đã chép ✓" : nhan}
    </button>
  );
}

/**
 * Hai cach chep danh sach anh da chon:
 * - Ten file day du, gom theo thu muc con — de dan vao mail/Zalo cho khach
 *   hoac luu lai doi chieu.
 * - Chi ma so (bo tien to chu va duoi file), cach nhau boi dau cach — dung
 *   dinh dang doi Media dang quen dung de do tim anh trong thu muc goc.
 */
export function ExportButton({
  fileName,
  lines,
  maSo,
}: {
  fileName: string;
  lines: string[];
  maSo: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <NutChep
        nhan="Chép danh sách tên file"
        text={[fileName, "", ...lines].join("\n")}
      />
      {/*
        Nhan noi ro CA ALBUM, khong con de tran "Chep ma so anh".

        Anh nham dung cho nay 08/10/2026: nha co hai thu muc ma bam nut nay thi
        ra ma so ca 238 tam, trong khi anh dang can rieng mot thu muc. Tu khi
        moi thu muc co nut chep rieng thi hai nut dung canh nhau, ten giong het
        nhau la con nhieu kha nang bam nham hon truoc.
      */}
      <NutChep nhan="Chép mã số ảnh — cả album" text={maSo} />
    </div>
  );
}
