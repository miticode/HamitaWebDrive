"use client";

import { useEffect, useState } from "react";

/**
 * Khoá lưu trong máy khách, tách riêng theo từng album.
 * Khách có thể nhận link của hai ba nhà khác nhau, không được lẫn vào nhau.
 */
function khoa(slug: string): string {
  return `hamita-da-xem:${slug}`;
}

function docDaXem(slug: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(khoa(slug));
    if (!raw) return null;
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    // Máy chặn lưu trữ (chế độ riêng tư) thì coi như chưa biết gì.
    return null;
  }
}

function ghiDaXem(slug: string, ids: string[]): void {
  try {
    const cu = docDaXem(slug) ?? new Set<string>();
    for (const id of ids) cu.add(id);
    localStorage.setItem(khoa(slug), JSON.stringify([...cu]));
  } catch {
    // Không lưu được thì thôi, lần sau chỉ là không đánh dấu được — không sao.
  }
}

/**
 * Chấm "Mới" trên thẻ thư mục khách chưa từng mở.
 *
 * Studio thả thêm thư mục vào Drive lúc nào là khách thấy lúc đó (album là
 * "link sống"), nhưng trước đây thư mục mới nằm lẫn giữa những thư mục cũ,
 * khách vào lại không biết có gì thêm nên thường bỏ sót.
 *
 * Ghi nhớ ngay trong máy khách chứ không lưu ở database: mỗi người xem tới đâu
 * là chuyện riêng của người đó — vợ đã xem rồi không có nghĩa là chồng đã xem.
 * Cách này cũng không cần studio làm gì thêm, và không đụng tới dữ liệu chung.
 *
 * Lần đầu vào album thì KHÔNG đánh dấu gì cả: lúc đó mọi thư mục đều là mới,
 * gắn chấm khắp nơi thì cái chấm mất hết ý nghĩa.
 */
export function DauMoi({ slug, albumId }: { slug: string; albumId: string }) {
  const [moi, setMoi] = useState(false);

  useEffect(() => {
    // Qua setTimeout để không đổi state ngay trong thân effect (xem CLAUDE.md).
    const id = setTimeout(() => {
      const daXem = docDaXem(slug);
      // null = lần đầu vào album này, chưa có gì để so.
      if (daXem) setMoi(!daXem.has(albumId));
    }, 0);
    return () => clearTimeout(id);
  }, [slug, albumId]);

  if (!moi) return null;

  return (
    <span className="ml-2 inline-flex translate-y-[-2px] items-center rounded-full bg-accent px-2 py-0.5 align-middle text-[10px] font-medium tracking-wide text-white">
      Mới
    </span>
  );
}

/**
 * Ghi nhớ những thư mục khách đã nhìn thấy ở trang bìa.
 *
 * Đặt ở trang bìa chứ không phải lúc khách mở từng thư mục: chỉ cần khách đã
 * nhìn thấy danh sách một lần là lần sau không còn "mới" nữa. Nếu đợi khách mở
 * hẳn từng thư mục mới xoá dấu thì những thư mục họ cố ý không mở sẽ mang chấm
 * "Mới" mãi mãi.
 *
 * Chờ vài giây rồi mới ghi, để khách kịp nhìn thấy chấm trước khi nó biến mất
 * ở lần sau.
 */
export function GhiNhoDaXem({ slug, albumIds }: { slug: string; albumIds: string[] }) {
  useEffect(() => {
    const id = setTimeout(() => ghiDaXem(slug, albumIds), 4000);
    return () => clearTimeout(id);
  }, [slug, albumIds]);

  return null;
}
