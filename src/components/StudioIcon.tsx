import type { HANH_TRINH } from "@/lib/studio";

type Ten = (typeof HANH_TRINH)["chuong"][number]["icon"];

/**
 * Bộ icon nét mảnh cho từng dịch vụ — cùng phong cách với các icon khác trong
 * web (stroke ~1.5, không tô đặc) để trang giới thiệu không lạc tông.
 */
export function StudioIcon({ ten, className = "size-6" }: { ten: Ten; className?: string }) {
  const chung = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (ten) {
    case "rings":
      return (
        <svg {...chung} className={className} aria-hidden>
          <circle cx="9" cy="14" r="5.2" />
          <circle cx="15" cy="14" r="5.2" />
        </svg>
      );
    case "camera":
      return (
        <svg {...chung} className={className} aria-hidden>
          <path d="M4 8.5h3l1.4-2.2h7.2L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
      );
    case "album":
      return (
        <svg {...chung} className={className} aria-hidden>
          <rect x="4" y="5" width="14" height="16" rx="1" />
          <path d="M8 2.5h14v16" />
        </svg>
      );
    case "sparkle":
      return (
        <svg {...chung} className={className} aria-hidden>
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
          <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
        </svg>
      );
    case "dress":
      return (
        <svg {...chung} className={className} aria-hidden>
          <path d="M12 3a2 2 0 0 1 2 2v1.2l6 3.3-2 10.5H8L6 9.5l6-3.3V5a2 2 0 0 1 2-2Z" />
          <path d="M10 3.5a2 2 0 0 0 4 0" />
        </svg>
      );
  }
}
