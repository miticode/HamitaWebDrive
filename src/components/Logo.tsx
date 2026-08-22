import { STUDIO_NAME } from "@/lib/constants";

/**
 * Logo studio.
 *
 * File PNG la net ve mau den tren nen trong suot, nen chi can dao mau la ra
 * ban trang — khong phai giu hai file rieng cho nen sang va nen toi.
 */
export function Logo({
  size = "md",
  on = "page",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** "page" doi mau theo che do sang/toi; "dark" luon la ban trang (dat tren anh). */
  on?: "page" | "dark";
  className?: string;
}) {
  const heights = { sm: "h-9 sm:h-10", md: "h-16 sm:h-20", lg: "h-24 sm:h-28" };
  // Net ve mau den; dat tren anh thi dao mau thanh trang.
  const tone = on === "dark" ? "invert" : "";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt={STUDIO_NAME}
      className={`${heights[size]} w-auto ${tone} ${className}`}
    />
  );
}
