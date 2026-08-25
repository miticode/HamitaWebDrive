import { STUDIO } from "@/lib/studio";

/** Viết 12000 thành "12.000" — cách viết tiền quen thuộc với người Việt. */
function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * Bốn bước hướng dẫn khách chọn ảnh, đặt ngay trên lưới ảnh.
 *
 * Vì sao cần: trước đây chỉ có một dòng chữ nhỏ "bấm vào ảnh để xem lớn, dùng
 * chấm đỏ để chọn ảnh in…". Khách mở link trên điện thoại thường lướt thẳng
 * xuống ảnh, không đọc dòng đó, rồi nhắn hỏi studio từng bước một — hoặc tệ
 * hơn là chọn xong mà không báo, studio ngồi đợi.
 *
 * Bốn bước ứng đúng bốn việc khách phải làm, theo thứ tự: xem → thả tim →
 * ghi chú → báo studio. Riêng bước hai mang thông tin gói ảnh, phần duy nhất
 * khác nhau giữa các album nên studio đặt riêng cho từng album ở trang quản lý.
 */
export function HuongDanChon({
  soAnhTrongGoi,
  giaAnhThem,
}: {
  /** null = album này không tính theo gói, bỏ hẳn đoạn giá cả. */
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
}) {
  const buoc = [
    {
      so: "01",
      ten: "Ngắm ảnh thật kỹ",
      mo: "Chạm vào từng tấm để xem thật lớn. Anh chị cứ thong thả ngắm, hôm nay chưa xong thì mai mở lại xem tiếp cũng được ạ.",
      them: null as string | null,
      icon: (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.5" />
          <path d="m21 16-5-5L5 20" />
        </>
      ),
    },
    {
      so: "02",
      ten: "Thả tim tấm mình thương",
      mo: "Thấy tấm nào ưng, anh chị bấm trái tim để Hamita in ra nhé. Còn dấu tick dành cho những tấm anh chị muốn giữ riêng cho mình.",
      them: soAnhTrongGoi
        ? `Gói của anh chị có ${soAnhTrongGoi} tấm in. Lỡ thương thêm tấm nào ngoài gói thì cứ chọn thoải mái, mỗi tấm ${tien(giaAnhThem)}đ đã gồm cả chỉnh sửa và in ạ.`
        : null,
      icon: <path d="M12 20s-7-4.6-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5c0 4.9-7 9.5-7 9.5Z" />,
    },
    {
      so: "03",
      ten: "Dặn dò Hamita",
      mo: "Muốn ảnh sáng hơn, muốn chỉnh chỗ nào — anh chị cứ ghi ngay dưới tấm đó, đừng ngại nhé.",
      them: "Hamita đọc kỹ từng dòng anh chị dặn trước khi bắt tay chỉnh sửa.",
      icon: <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />,
    },
    {
      so: "04",
      ten: "Nhắn Hamita một tiếng",
      mo: 'Chọn xong, anh chị bấm "Báo cho Hamita" ở thanh trên cùng là Hamita nhận được ngay và bắt tay vào làm liền.',
      them: "Lỡ quên tấm nào hay đổi ý sau đó, anh chị vẫn chọn lại được bình thường ạ.",
      icon: (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </>
      ),
    },
  ];

  return (
    /*
      mb-12 chu khong phai mt: chi dat khoang cach phia DUOI de tach khoi luoi
      anh. Khoang cach phia tren de noi dung tu lo — khoi tieu de ngay tren da
      co san dem duoi roi, tu them le tren o day nua la cong don thanh mot mang
      trong qua rong.
    */
    <section className="mx-auto mb-12 max-w-6xl px-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buoc.map((b) => (
          <div
            key={b.so}
            className="relative flex flex-col rounded-md border border-line bg-bg-raised p-5 pt-7 text-center"
          >
            {/*
              Số bước nằm vắt lên mép trên của thẻ: đây là một quy trình có thứ
              tự thật sự (xem trước rồi mới chọn, chọn xong mới báo), nên đánh
              số là mang thông tin chứ không phải trang trí.
            */}
            <span className="absolute -top-3 left-1/2 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-accent text-[11px] font-medium text-white">
              {b.so}
            </span>

            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="mx-auto size-7 text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {b.icon}
            </svg>

            <h3 className="mt-3.5 text-xs font-medium tracking-[0.12em] uppercase">
              {b.ten}
            </h3>
            <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">{b.mo}</p>

            {b.them && (
              <p className="mt-auto pt-3.5 text-[12px] leading-relaxed text-fg-faint">
                <span className="mx-auto mb-3 block h-px w-8 bg-line" />
                {b.them}
              </p>
            )}
          </div>
        ))}
      </div>

      {/*
        Đường cứu cho khách bối rối. Không có nó thì người ngại hỏi sẽ im lặng
        bỏ dở, studio không biết mà nhắc.
      */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-bg-soft px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Phân vân quá, chọn tấm nào bây giờ?</p>
          <p className="mt-0.5 text-[13px] text-fg-muted">
            Anh chị cứ nhắn, Hamita ngồi xem cùng và gợi ý giúp anh chị ạ.
          </p>
        </div>
        <a
          href={STUDIO.zalo}
          target="_blank"
          rel="noreferrer"
          className="btn shrink-0"
        >
          Nhắn Hamita · {STUDIO.dienThoai}
        </a>
      </div>
    </section>
  );
}
