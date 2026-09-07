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
      /*
        Thông tin gói ảnh KHÔNG còn nằm ở đây nữa — nó đã ra thành một khối
        riêng bên dưới. Xem chú thích ở khối đó để biết vì sao.
      */
      them: null,
      icon: (
        <path d="M12 20s-7-4.6-7-9.5A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.5c0 4.9-7 9.5-7 9.5Z" />
      ),
    },
    {
      so: "02",
      ten: "Dặn dò Hamita",
      mo: "Muốn ảnh sáng hơn, muốn chỉnh chỗ nào — anh chị cứ ghi ngay dưới tấm đó, đừng ngại nhé.",
      them: "Hamita đọc kỹ từng dòng anh chị dặn trước khi bắt tay chỉnh sửa.",
      icon: (
        <path d="M20 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      ),
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
              <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
                {b.mo}
              </p>

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

      {/*
        Gói ảnh: khối riêng, NẰM NGOÀI phần thu gọn được.

        Trước đây đoạn này là dòng chữ nhỏ nhất và nhạt nhất trên thẻ bước 01
        (12px, màu fg-faint, nằm dưới một gạch mảnh) — tức là thứ duy nhất trên
        trang dính tới TIỀN của khách lại được trình bày mờ nhất. Studio yêu cầu
        làm nổi bật ngày 03/09/2026.

        Ba thay đổi, cái nào cũng có lý do riêng:

        - RA KHỎI `<details>`. Khách đã chọn lần nào rồi thì phần ba bước tự thu
          lại (nguyên tắc 30), mà thu lại là nuốt luôn thông tin gói. Trong khi
          đó gói ảnh mới là thứ khách cần đúng lúc đang chọn — tới tấm thứ mười
          lăm mới nảy ra câu hỏi "quá gói mấy tấm rồi, bao nhiêu tiền". Nằm
          ngoài thì lần nào mở album cũng thấy.

        - RỘNG HẾT HÀNG thay vì nằm trong một ô của lưới ba cột. Trên máy tính,
          ô cũ chỉ rộng chừng một phần ba trang; nay khối chiếm trọn chiều
          ngang. Trên điện thoại vốn đã một cột, cái làm nên khác biệt là nền
          màu nhấn và cỡ chữ.

        - HAI CON SỐ IN ĐẬM và tô màu nhấn. Khách đọc lướt chỉ cần bắt được hai
          thứ: gói bao nhiêu tấm, và thêm một tấm thì bao nhiêu tiền.

        Giữ nguyên câu chữ cũ, chỉ đổi cách trình bày. Đây là lời studio đã nói
        với khách (nguyên tắc 28) — sửa lại cho "gọn" là nói khác đi.
      */}
      {soAnhTrongGoi !== null && (
        <div className="mt-5 flex items-start gap-4 rounded-md border border-accent bg-accent-soft px-4 py-4 sm:items-center sm:px-6 sm:py-5">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-white sm:size-11"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5 sm:size-[22px]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Hộp quà — đúng thứ khách sẽ cầm về, và nhận ra ngay không cần đọc chữ. */}
              <path d="M4 9.5h16V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
              <path d="M3 6.5h18v3H3zM12 6.5V21" />
              <path d="M12 6.5S10.5 3 8.5 3a2 2 0 0 0 0 3.5Zm0 0S13.5 3 15.5 3a2 2 0 0 1 0 3.5Z" />
            </svg>
          </span>

          <div className="min-w-0">
            <p className="eyebrow text-accent">Gói ảnh của anh chị</p>

            {/*
              Gói 0 tấm là một gói THẬT, không phải "chưa đặt": khách mua gói
              chỉ lấy file, không kèm tấm in nào. Nói thẳng ra như vậy thay vì
              để khách đọc "gói có 0 tấm in" — câu đó nghe như studio quên
              điền số.

              Vẫn mời khách in thêm: họ có quyền đổi ý, và giá thì đã rõ sẵn.

              Gói này giữ MỘT câu, không tách thành ba gạch đầu dòng như gói
              có ảnh in: cả ba dòng kia đều nói về việc in (tim đủ số tấm, ghi
              chú tấm này treo ở đâu), mà gói chỉ lấy file thì chưa in tấm nào.
            */}
            {soAnhTrongGoi === 0 ? (
              <p className="mt-1.5 text-sm leading-relaxed text-fg sm:text-[15px]">
                Gói của anh chị là gói{" "}
                <strong className="font-semibold text-accent">
                  chỉ lấy file ảnh
                </strong>
                , không kèm ảnh in. Tấm nào anh chị muốn Hamita in ra thì mỗi
                tấm{" "}
                <strong className="font-semibold text-accent">
                  {tien(giaAnhThem)}đ
                </strong>
                , đã gồm cả chỉnh sửa và in ạ.
              </p>
            ) : (
              /*
                Ba gạch đầu dòng chứ không phải một đoạn văn (studio yêu cầu
                07/09/2026). Ba dòng là ba việc khác nhau — tim đủ số tấm, ghi
                chú tấm nào treo ở đâu, và giá tấm in thêm — trước đây chỉ có
                dòng một và dòng ba, dính liền nhau trong một câu.

                Dòng "ghi chú" nằm ở đây chứ không chỉ ở bước 02: bước 02 tự
                thu lại khi khách đã chọn lần nào rồi, mà đúng lúc đang thả tim
                mới là lúc khách cần nhớ ghi "tấm này ảnh cổng".
              */
              <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-fg sm:text-[15px]">
                {[
                  <>
                    Gói của anh chị cần tim{" "}
                    <strong className="font-semibold text-accent">
                      {soAnhTrongGoi} tấm
                    </strong>
                    .
                  </>,
                  <>
                    Ghi chú vào ảnh: ảnh cổng, ảnh bàn, ảnh bìa,…
                  </>,
                  <>
                    Chi phí phát sinh thêm trên mỗi tấm ảnh là{" "}
                    <strong className="font-semibold text-accent">
                      {tien(giaAnhThem)}đ
                    </strong>{" "}
                    đã gồm chỉnh sửa và in ạ.
                  </>,
                ].map((dong, i) => (
                  <li key={i} className="flex gap-2.5">
                    {/*
                      Chấm tròn vẽ tay chứ không dùng list-disc: chấm mặc định
                      của trình duyệt nằm ngoài lề, khi dòng dài xuống hàng thì
                      chữ hàng dưới thụt về sát chấm. Flex + chấm cố định giữ
                      cả khối chữ thẳng một mép.
                    */}
                    <span
                      aria-hidden
                      className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-accent"
                    />
                    <span>{dong}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
