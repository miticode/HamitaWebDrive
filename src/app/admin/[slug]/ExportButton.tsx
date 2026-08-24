"use client";

import { useState } from "react";

/**
 * Mot nut chep-vao-clipboard dung lai duoc cho nhieu dinh dang khac nhau.
 * Dung clipboard thay vi tai file .txt vi ket qua hay duoc dan vao Zalo/mail
 * hon la luu thanh file.
 */
function NutChep({ nhan, text }: { nhan: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="btn"
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
      <NutChep nhan="Chép mã số ảnh" text={maSo} />
    </div>
  );
}
