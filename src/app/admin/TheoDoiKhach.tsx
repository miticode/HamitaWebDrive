"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Bao lâu hỏi lại một lần.
 *
 * Nới từ 20 giây lên 60 giây ngày 21/09/2026 sau khi database Neon hết hạn mức
 * gói miễn phí và cả web sập. Neon tính tiền theo THỜI GIAN DATABASE THỨC, mỗi
 * lần bị gọi là thức thêm ít nhất 5 phút — nên thứ tốn tiền không phải câu lệnh
 * nặng hay nhẹ, mà là có thứ gì gọi đều đặn suốt ngày hay không. Đường này đo
 * được 4 câu lệnh, 518ms mỗi lượt, và studio mở trang quản lý cả buổi.
 *
 * 60 giây vẫn đủ: đây chỉ là thẻ nổi báo "khách vừa chọn xong", không phải thứ
 * studio đứng canh từng giây; khung Thông báo ở cột trái vẫn ghi lại đầy đủ.
 */
const NHIP_HOI = 60_000;

/**
 * Không đụng chuột, bàn phím hay cuộn trang lâu chừng này thì NGƯNG hỏi.
 *
 * Anh chốt 22/09/2026 sau khi xem bảng tiền Neon ngày đầu chạy gói Launch: sáu
 * CU-giờ một ngày, ban đêm database ngủ ngon nhưng ban ngày thức gần như liên
 * tục. Thủ phạm chính là trang này — studio mở nó cả buổi, tab vẫn hiện nên
 * lượt hỏi 60 giây một lần cứ đều đặn đánh thức database, kể cả lúc không ai
 * ngồi trước máy.
 *
 * Đúng cách trang khách đã làm với `Selection.tsx` (cùng ngày 21/09): chạm vào
 * là chạy tiếp ngay, nên studio không nhận ra khác biệt nào ngoài hoá đơn.
 */
const NGHI_SAU = 5 * 60_000;

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
    /* Lần cuối có người thật đụng vào trang — xem NGHI_SAU. */
    let chamCuoi = Date.now();

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

    /*
      Hỏi khi tab đang hiện VÀ vừa có người đụng vào trang trong NGHI_SAU gần
      đây. Trước đây hỏi cả khi tab bị ẩn, mà studio hay để trang quản lý mở
      nguyên ngày ở một tab sau lưng: database không bao giờ được ngủ. Từ
      22/09/2026 thêm vế thứ hai — tab hiện mà cả năm phút không ai chạm vào
      thì cũng ngưng.
    */
    const dangNgoiTruocMay = () =>
      document.visibilityState === "visible" && Date.now() - chamCuoi < NGHI_SAU;

    hoi();
    const id = setInterval(() => {
      if (dangNgoiTruocMay()) void hoi();
    }, NHIP_HOI);

    /*
      Đụng vào sau một lúc nghỉ: hỏi NGAY một lần rồi mới tính nhịp tiếp. Chỉ
      ghi lại mốc mà không hỏi thì studio vừa quay lại bàn sẽ phải đợi thêm một
      phút mới thấy nhà khách vừa báo xong.
    */
    const daCham = () => {
      const nghiLau = Date.now() - chamCuoi >= NGHI_SAU;
      chamCuoi = Date.now();
      if (nghiLau && document.visibilityState === "visible") void hoi();
    };
    const khiQuayLai = () => {
      if (document.visibilityState === "visible") {
        chamCuoi = Date.now();
        void hoi();
      }
    };

    document.addEventListener("visibilitychange", khiQuayLai);
    for (const ten of ["pointerdown", "keydown", "scroll"] as const) {
      window.addEventListener(ten, daCham, { passive: true });
    }

    return () => {
      con = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", khiQuayLai);
      for (const ten of ["pointerdown", "keydown", "scroll"] as const) {
        window.removeEventListener(ten, daCham);
      }
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
