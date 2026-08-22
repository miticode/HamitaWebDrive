"use client";

import { useState } from "react";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(`${location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="btn"
    >
      {copied ? "Đã chép ✓" : "Chép link"}
    </button>
  );
}
