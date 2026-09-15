/**
 * Quy tắc dùng chung cho thông tin nội bộ và nội quy của studio — trang quản
 * lý lẫn script nhập dữ liệu từ AppSheet đều đi qua đây.
 *
 * Không nhập Prisma: tệp này chạy được cả ở máy khách.
 */

/** "8:30", "08:30", "0830", "8h30" → "08:30". Không đọc được thì null. */
export function chuanGio(s: string): string | null {
  const m = s.trim().toLowerCase().match(/^(\d{1,2})\s*[:h.]?\s*(\d{2})?$/);
  if (!m) return null;
  const gio = Number(m[1]);
  const phut = Number(m[2] ?? 0);
  if (gio > 23 || phut > 59) return null;
  return `${String(gio).padStart(2, "0")}:${String(phut).padStart(2, "0")}`;
}

/**
 * "10.437096, 106.476095" → cùng chuỗi đó, đã chuẩn khoảng trắng.
 * Không phải toạ độ ở Việt Nam thì null — gõ nhầm kinh độ trước vĩ độ là hay
 * gặp nhất, và toạ độ sai thì đợt chấm công sẽ báo mọi người "sai chỗ".
 */
export function chuanToaDo(s: string): string | null {
  const m = s.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const viDo = Number(m[1]);
  const kinhDo = Number(m[2]);
  if (viDo < 8 || viDo > 24 || kinhDo < 102 || kinhDo > 110) return null;
  return `${m[1]}, ${m[2]}`;
}

export function linkBanDo(toaDo: string): string {
  return `https://www.google.com/maps?q=${encodeURIComponent(toaDo)}`;
}

/** "50.000", "50000", "50,000đ" → 50000. Không phải số thì null. */
export function docTien(s: string): number | null {
  const so = s.replace(/[.,\sđ]/gi, "");
  if (!/^\d{1,9}$/.test(so)) return null;
  return Number(so);
}

/** Che bớt số tài khoản cho nhật ký: "9701234567vcb" → "97…vcb". */
export function cheSo(s: string | null | undefined): string {
  const x = String(s ?? "");
  if (!x) return "—";
  return x.length > 5 ? `${x.slice(0, 2)}…${x.slice(-3)}` : "…";
}
