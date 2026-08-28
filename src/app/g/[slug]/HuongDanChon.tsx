/** Viết 12000 thành "12.000" — cách viết tiền quen thuộc với người Việt. */
function tien(so: number): string {
  return so.toLocaleString("vi-VN");
}

/**
 * Ba bước hướng dẫn khách chọn ảnh, đặt ngay trên lưới ảnh.
 *
 * Vì sao cần: trước đây chỉ có một dòng chữ nhỏ "bấm vào ảnh để xem lớn, dùng
 * chấm đỏ để chọn ảnh in…". Khách mở link trên điện thoại thường lướt thẳng
 * xuống ảnh, không đọc dòng đó, rồi nhắn hỏi studio từng bước một — hoặc tệ
 * hơn là chọn xong mà không báo, studio ngồi đợi.
 *
 * Ba bước ứng đúng ba việc khách phải làm, theo thứ tự: thả tim → ghi chú →
 * báo studio. Riêng bước một mang thông tin gói ảnh, phần duy nhất khác nhau
 * giữa các album nên studio đặt riêng cho từng album ở trang quản lý.
 *
 * Bước "Ngắm ảnh thật kỹ" đã bỏ ngày 28/08/2026 theo yêu cầu của studio. Nó
 * chỉ dạy khách chạm vào ảnh để xem lớn — thứ ai cầm điện thoại cũng tự làm —
 * mà lại chiếm ô đầu tiên, đẩy ba việc thật sự cần hướng dẫn xuống dưới.
 */
export function HuongDanChon({
  soAnhTrongGoi,
  giaAnhThem,
  daTungChon,
}: {
  /** null = album này không tính theo gói, bỏ hẳn đoạn giá cả. */
  soAnhTrongGoi: number | null;
  giaAnhThem: number;
  /**
   * Khách đã chọn tấm nào trong album này chưa.
   *
   * Đã chọn rồi thì thu bốn bước lại, vì họ biết cách làm rồi. Đo thật ngày
   * 27/08/2026 trên màn hình 375px: để mở sẵn thì khách phải cuộn 1.506px —
   * gần hai màn hình — mới thấy tấm ảnh đầu tiên, và phải cuộn lại từng ấy
   * mỗi lần vào một thư mục mới. Thu lại còn 44px.
   */
  daTungChon: boolean;
}) {
  const buoc = [
    {
      so: "01",
      ten: "Thả tim tấm mình thương",
      mo: "Thấy tấm nào ưng, anh chị bấm trái tim để Hamita in ra nhé. Còn dấu tick dành cho những tấm anh chị muốn giữ riêng cho mình.",
      them: soAnhTrongGoi
        ? `Gói của anh chị có ${soAnhTrongGoi} tấm in. Lỡ thương thêm tấm nào ngoài gói thì cứ chọn thoải mái, mỗi tấm ${tien(giaAnhThem)}đ đã gồm cả chỉnh sửa và in ạ.`
        : null,
      icon: <path d="M12 20s-7-4.6-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5c0 4.9-7 9.5-7 9.5Z" />,
    },
    {
      so: "02",
      ten: "Dặn dò Hamita",
      mo: "Muốn ảnh sáng hơn, muốn chỉnh chỗ nào — anh chị cứ ghi ngay dưới tấm đó, đừng ngại nhé.",
      them: "Hamita đọc kỹ từng dòng anh chị dặn trước khi bắt tay chỉnh sửa.",
      icon: <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />,
    },
    {
      so: "03",
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
      mb chu khong phai mt: chi dat khoang cach phia DUOI de tach khoi luoi
      anh. Khoang cach phia tren de noi dung tu lo — khoi tieu de ngay tren da
      co san dem duoi roi, tu them le tren o day nua la cong don thanh mot mang
      trong qua rong. Thu lai thi khoi nay chi con mot hang nen le duoi hep
      theo, khong thi no thanh mot mang trong giua hang chu va luoi anh.
    */
    <section
      className={`mx-auto max-w-6xl px-4 ${daTungChon ? "mb-6" : "mb-12"}`}
    >
      {/*
        Dung <details> cua HTML chu khong phai state trong React.

        Ly do khong phai la it code hon: trang thai mo/thu phai DUNG NGAY o
        dong HTML dau tien. Lam bang React thi component phai doi danh sach da
        chon tai ve moi biet khach da tung chon chua — khach da chon roi se
        thay bon buoc hien ra rong roi tu gap lai, keo ca trang giat mot cai
        va nhay mat vi tri dang cuon. <details open={...}> do may chu quyet
        dinh san nen khong co nhip nao sai ca, va no chay ca khi JavaScript
        chua kip tai.
      */}
      <details open={!daTungChon} className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-md text-xs font-medium tracking-[0.12em] text-fg-muted uppercase transition hover:text-accent [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Xem lại 3 bước chọn ảnh</span>
          <span className="hidden group-open:inline">3 bước chọn ảnh</span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="size-4 transition-transform duration-200 group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        {/*
          Chia ba cot tu md (768px) chu khong phai sm (640px). Do that o 640px:
          moi the chi con 176px, doan mo ta xuong 7 dong, the cao 445px — chat
          hon han ban bon buoc cu vi gio moi the phai chua ca doan "them" ma
          truoc day nam rai o bon o.
        */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
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
      </details>
    </section>
  );
}
