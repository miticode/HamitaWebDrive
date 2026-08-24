"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Làm mục tiêu mờ dần hiện lên và nhích nhẹ từ dưới lên khi cuộn tới.
 *
 * Chỉ dùng cho trang giới thiệu — nơi nhịp độ chậm rãi là một phần của cảm
 * giác sang trọng. Tự tắt khi khách đặt "giảm chuyển động" ở hệ điều hành.
 */
export function FadeIn({
  children,
  cham = 0,
  className = "",
}: {
  children: ReactNode;
  /** Độ trễ theo mili-giây — cho nhiều mục xuất hiện lần lượt thay vì cùng lúc. */
  cham?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [hien, setHien] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const quan_sat = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHien(true);
          quan_sat.disconnect();
        }
      },
      { rootMargin: "-10% 0px" }
    );
    quan_sat.observe(node);
    return () => quan_sat.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: hien ? 1 : 0,
        transform: hien ? "none" : "translateY(14px)",
        transition: `opacity 0.7s ease-out ${cham}ms, transform 0.7s ease-out ${cham}ms`,
      }}
    >
      {children}
    </div>
  );
}
