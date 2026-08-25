"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/** Bao lâu hỏi lại một lần. Đủ nhanh để thấy gần như ngay, đủ thưa để không phiền máy chủ. */
const NHIP_HOI = 20_000;

type MucXong = { albumId: string; tenMuc: string; xongLuc: string };

type Album = {
  id: string;
  ten: string;
  slug: string;
  daChon: number;
  mucXong: MucXong[];
};

type Tin = {
  /** Ghép từ album và thư mục, để hai tin của cùng một nhà không đè nhau. */
  khoa: string;
  ten: string;
  slug: string;
  tenMuc: string;
  soAnh: number;
};

/**
 * Theo dõi khách chọn ảnh trong lúc studio đang mở trang quản lý.
 *
 * Trước đây studio phải tự tải lại trang mới biết khách đã chọn xong — mà
 * không ai ngồi F5 cả ngày, nên thường vài hôm sau mới phát hiện, khách thì
 * ngồi đợi. Giờ trang tự hỏi máy chủ mỗi 20 giây; có khách vừa báo xong là
 * hiện ngay một thẻ nổi ở góc.
 *
 * Cách làm là hỏi lại đều đặn chứ không phải kết nối thường trực: chỗ này chạy
 * trên nền serverless, không giữ được kết nối lâu, mà mỗi lần hỏi chỉ tốn vài
 * dòng số liệu đọc từ database. Chậm nhất 20 giây là biết — thừa nhanh cho một
 * việc mà trước đó phải đợi hàng ngày.
 */
export function TheoDoiKhach() {
  const router = useRouter();
  const [tin, setTin] = useState<Tin[]>([]);
  /*
    Ảnh chụp lần hỏi trước, để so ra cái gì vừa đổi. Để trong ref chứ không
    phải state: nó chỉ dùng để so sánh, đổi nó không cần vẽ lại gì cả.
  */
  const truoc = useRef<Map<string, Album> | null>(null);

  useEffect(() => {
    let con = true;

    const hoi = async () => {
      try {
        const res = await fetch("/api/admin/trang-thai", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { album: Album[] };
        if (!con) return;

        const nay = new Map(data.album.map((a) => [a.id, a]));
        const cu = truoc.current;
        truoc.current = nay;

        /*
          Lần hỏi đầu tiên chỉ để chụp lại hiện trạng, không báo gì. Nếu báo
          thì mỗi lần studio mở trang quản lý sẽ đổ ra một loạt thông báo về
          những việc đã xảy ra từ lâu.
        */
        if (!cu) return;

        const moi: Tin[] = [];
        for (const [id, a] of nay) {
          const b = cu.get(id);
          if (!b) continue; // Album vừa được tạo, không phải khách vừa báo.

          /*
            So từng THƯ MỤC chứ không so cả album: khách chọn xong lần lượt
            từng thư mục, mỗi lần là một tin riêng nói rõ vừa xong ở đâu.

            So theo mốc thời gian, không chỉ theo "có mặt trong danh sách":
            khách bấm "chọn thêm" rồi báo xong lại cũng phải ra tin mới.
          */
          const cuTheoMuc = new Map(b.mucXong.map((m) => [m.albumId, m.xongLuc]));
          for (const m of a.mucXong) {
            if (cuTheoMuc.get(m.albumId) === m.xongLuc) continue;
            moi.push({
              khoa: `${id}:${m.albumId}:${m.xongLuc}`,
              ten: a.ten,
              slug: a.slug,
              tenMuc: m.tenMuc,
              soAnh: a.daChon,
            });
          }
        }

        if (moi.length > 0) {
          setTin((truocDo) => [...moi, ...truocDo].slice(0, 4));
          // Vẽ lại trang để thẻ album cập nhật theo, không chỉ có thông báo suông.
          router.refresh();
        }
      } catch {
        // Mạng trục trặc thì thôi, nhịp sau hỏi lại.
      }
    };

    void hoi();
    const id = setInterval(hoi, NHIP_HOI);
    return () => {
      con = false;
      clearInterval(id);
    };
  }, [router]);

  if (tin.length === 0) return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
      {tin.map((t) => (
        <div
          key={t.khoa}
          className="card flex items-start gap-3 p-3.5 shadow-[var(--shadow-lift)]"
        >
          <span className="mt-1 inline-block size-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{t.ten}</p>
            {/* Nói rõ THƯ MỤC nào — studio khỏi phải mở ra dò xem khách vừa
                xong ở đâu, nhất là album có năm sáu thư mục. */}
            <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">
              vừa chọn xong thư mục <b className="text-fg">{t.tenMuc}</b>
              <br />
              cả album đang có {t.soAnh} ảnh được chọn
            </p>
            <Link
              href={`/admin/${t.slug}`}
              className="mt-1.5 inline-block text-xs text-accent underline underline-offset-2"
            >
              Xem ảnh khách chọn
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setTin((ds) => ds.filter((x) => x.khoa !== t.khoa))}
            aria-label="Đóng thông báo"
            className="shrink-0 text-fg-faint transition hover:text-fg"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
