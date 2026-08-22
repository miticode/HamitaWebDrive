"use client";

import { useState } from "react";

/**
 * Chep danh sach ten file ra clipboard de dan thang vao mail gui lab in.
 * Dung clipboard thay vi tai file .txt vi ket qua hay duoc dan vao Zalo/mail
 * hon la luu thanh file.
 */
export function ExportButton({
  fileName,
  lines,
}: {
  fileName: string;
  lines: string[];
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(
          [`${fileName}`, "", ...lines].join("\n")
        );
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="btn"
    >
      {copied ? "Đã chép ✓" : "Chép danh sách tên file"}
    </button>
  );
}
