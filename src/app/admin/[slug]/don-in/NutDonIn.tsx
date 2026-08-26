"use client";

import { useState } from "react";

/**
 * Hai nút của đơn giao in: in ra giấy, và chép thành chữ để gửi đội Media.
 *
 * Giữ cả hai vì hai đội làm khác nhau: bên in ảnh cầm tờ giấy đi dò từng tấm,
 * còn đội Media thì dán vào Zalo. Ép một cách thôi là một bên phải làm thêm
 * một khâu thủ công.
 */
export function NutDonIn({ chu }: { chu: string }) {
  const [daChep, setDaChep] = useState(false);

  return (
    // khong-in: chính hai nút này không được nằm trên bản in.
    <div className="khong-in flex flex-wrap gap-2">
      <button type="button" onClick={() => window.print()} className="btn-primary">
        In đơn
      </button>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(chu);
          setDaChep(true);
          setTimeout(() => setDaChep(false), 1800);
        }}
        className="btn"
      >
        {daChep ? "Đã chép ✓" : "Chép cho đội Media"}
      </button>
    </div>
  );
}
