"use client";

import { useSelection } from "./Selection";

/**
 * Khoi xac nhan "da chon xong", dat o CUOI trang duoi luoi anh.
 *
 * Vi sao can them mot cho nua trong khi thanh tren cung da co: anh doi chieu
 * ngay 27/08/2026 tren dien thoai that — dong "Báo cho Hamita" o thanh tren
 * la chu gach chan trong mot cau, chim vao nen, va no o DAU trang. Khach cuon
 * het 80 tam anh xuong toi day thi cai nut do da troi khoi man hinh tu lau.
 *
 * Cuoi trang moi la luc khach vua chon xong tam cuoi cung — dung khoanh khac
 * de hoi "xong chua ạ?". Thanh tren van giu nguyen: no phuc vu nguoi dang o
 * giua trang muon bao ngay, con khoi nay phuc vu nguoi vua xem het.
 *
 * Noi RO TEN THU MUC dang bao. Trang thai "da chon xong" tinh rieng tung thu
 * muc (nguyen tac 20), nen mot khoi chi noi chung chung "da xong" se lam khach
 * tuong minh vua bao xong ca album — roi khong quay lai nhung thu muc con lai.
 *
 * HAI BO CHU cho hai loai thu muc (studio yeu cau 09/09/2026), xem
 * `laMucHoanThien()` trong constants.ts:
 *
 * - Thu muc FILE GOC — khach dang CHON: "chọn xong thư mục X chưa ạ?"
 * - Thu muc HOAN THIEN / PTS — anh da chinh xong, khach dang DUYET:
 *   "xem thư mục X ưng chưa ạ?" va nut "Đã ok, báo Hamita để in".
 *
 * Chi doi CAU CHU, khong doi cach chay: van la mot lan bam bao xong, van ghi
 * vao dung bang MucXong nhu cu. Hoi sai viec moi la cai lam khach ngap ngung,
 * chu khong phai co che.
 */
export function XacNhanXong({
  tenMuc,
  hoanThien,
}: {
  tenMuc: string;
  /** Thư mục ảnh đã chỉnh xong — khách duyệt để in, không phải chọn. */
  hoanThien: boolean;
}) {
  const {
    unlocked,
    tongSoDaChon,
    soLoiDan,
    daBaoXong,
    loaiBao,
    baoXongLuc,
    baoDaXong,
  } = useSelection();
  const canSua = loaiBao === "can-sua";

  /*
    Chua nhap ma thi khong the bao gi ca — van an nhu cu.

    Con dieu kien "phai chon it nhat mot tam" thi CHI ap cho thu muc FILE GOC
    (studio yeu cau 09/09/2026). O file goc, chua tha tim tam nao nghia la chua
    co gi de bao, mot khoi lon noi "chua co gi" chi ton mot man hinh cuon.

    Thu muc HOAN THIEN thi nguoc han: Hamita da chinh xong het roi, viec cua
    khach chi la xem qua va gat dau. Bat ho tha tim mot tam moi hien nut duyet
    la bat lam mot buoc thua — ma phan lon se khong lam, roi ngoi doi studio
    trong khi studio ngoi doi ho.
  */
  if (!unlocked) return null;
  if (!hoanThien && tongSoDaChon === 0 && !daBaoXong) return null;

  if (daBaoXong) {
    return (
      <section className="mx-auto mt-14 mb-4 max-w-md px-5">
        {/*
          Hai mau cho hai viec khac han: XANH la xong chuyen, VANG la Hamita
          con phai lam tiep. Dung chung mot mau xanh cho ca hai thi khach bao
          "can chinh lai" xong nhin thay dau tich xanh va tuong minh vua duyet
          nham.
        */}
        <div
          className={`rounded-lg border px-6 py-7 text-center ${
            canSua ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"
          }`}
        >
          <span
            aria-hidden
            className={`mx-auto grid size-11 place-items-center rounded-full text-white ${
              canSua ? "bg-amber-500" : "bg-emerald-500"
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {canSua ? (
                /* Cây cọ — việc chuyển sang tay Media, không phải dấu tích. */
                <>
                  <path d="M9.5 14.5 4 20l5.5-1.5z" />
                  <path d="M12 12 19.5 4.5a1.8 1.8 0 0 1 2.5 2.5L14.5 14.5" />
                </>
              ) : (
                <path d="M20 6.5 9.2 17.3 4 12.1" />
              )}
            </svg>
          </span>

          <p
            className={`mt-4 font-display text-xl font-light ${
              canSua ? "text-amber-900" : "text-emerald-900"
            }`}
          >
            {canSua ? "Hamita nhận lời dặn rồi ạ" : "Hamita đã nhận được rồi ạ"}
          </p>
          <p
            className={`mt-1.5 text-[13px] leading-relaxed ${
              canSua ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {canSua
              ? "Anh chị đã nhờ Hamita chỉnh lại thư mục "
              : hoanThien
                ? "Anh chị đã duyệt thư mục "
                : "Anh chị đã báo xong thư mục "}
            <strong className="font-medium">{tenMuc}</strong>
            {baoXongLuc &&
              ` lúc ${new Date(baoXongLuc).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}`}
            {canSua
              ? ". Bên em chỉnh xong sẽ báo lại anh chị ngay ạ."
              : hoanThien
                ? ". Hamita mang đi in liền đây ạ."
                : ". Hamita bắt tay vào làm liền đây ạ."}
          </p>

          <p
            className={`mt-4 text-[13px] leading-relaxed ${
              canSua ? "text-amber-800" : "text-emerald-800"
            }`}
          >
            {canSua
              ? "Còn muốn dặn thêm tấm nào thì anh chị cứ ghi vào ảnh, Hamita đọc được hết ạ."
              : hoanThien
                ? "Xem lại thấy cần sửa chỗ nào thì anh chị bấm nút dưới, rồi nhắn Hamita nhé."
                : "Lỡ quên tấm nào hay đổi ý thì anh chị vẫn chọn lại bình thường nhé."}
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {/*
              Khách đang ở trạng thái "cần chỉnh lại" vẫn phải có đường bấm
              thẳng sang "đã ok" — không bắt họ gỡ trạng thái cũ rồi bấm lại
              từ đầu. Hay gặp nhất: khách dặn xong, xem lại lần nữa thấy thật
              ra cũng được, muốn chốt luôn.
            */}
            {canSua && (
              <button
                type="button"
                onClick={() => baoDaXong("xong")}
                className="inline-flex min-h-11 items-center rounded-full border border-amber-400 bg-amber-500 px-5 text-sm font-medium text-white transition hover:bg-amber-600"
              >
                Thôi, đã ok rồi
              </button>
            )}
            <button
              type="button"
              onClick={() => baoDaXong(null)}
              className={`inline-flex min-h-11 items-center rounded-full border bg-white/70 px-5 text-sm font-medium transition ${
                canSua
                  ? "border-amber-300 text-amber-900 hover:border-amber-500"
                  : "border-emerald-300 text-emerald-900 hover:border-emerald-500"
              }`}
            >
              {canSua
                ? "Bỏ lời báo này"
                : hoanThien
                  ? "Chưa ok, xem lại"
                  : "Chọn thêm nữa"}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-14 mb-4 max-w-md px-5">
      <div className="rounded-lg border border-accent/40 bg-bg-raised px-6 py-7 text-center">
        <p className="eyebrow">Bước cuối cùng</p>
        <p className="mt-3 font-display text-xl leading-snug font-light">
          {hoanThien ? (
            <>
              Anh chị xem thư mục <span className="italic">{tenMuc}</span> ưng chưa ạ?
            </>
          ) : (
            <>
              Anh chị chọn xong thư mục <span className="italic">{tenMuc}</span> chưa ạ?
            </>
          )}
        </p>
        {/*
          Thư mục hoàn thiện mà khách chưa thả tim tấm nào thì KHÔNG nói tới
          con số — "anh chị đang chọn 0 tấm" vừa sai vừa làm khách tưởng mình
          còn thiếu một bước nào đó chưa làm.
        */}
        <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
          {hoanThien && tongSoDaChon === 0 ? (
            "Hamita chỉnh xong cả thư mục này rồi ạ. Anh chị xem qua thấy ổn thì bấm nút dưới đây, Hamita mang đi in liền."
          ) : (
            <>
              Anh chị đang chọn{" "}
              <strong className="font-medium text-fg">{tongSoDaChon} tấm</strong> ở thư mục
              này.{" "}
              {hoanThien
                ? "Ưng rồi thì bấm nút dưới đây, Hamita mang đi in liền ạ."
                : "Bấm nút dưới đây báo cho Hamita một tiếng là Hamita nhận được ngay và bắt tay vào làm liền ạ."}
            </>
          )}
        </p>

        {/*
          Nut chiem tron chieu ngang, chu khong phai mot nut nho can giua: day
          la viec duy nhat con lai o cuoi trang, khong co gi de no phai chia
          cho cho.
        */}
        <button
          type="button"
          onClick={() => baoDaXong("xong")}
          className="btn-primary mt-5 w-full text-sm"
        >
          {hoanThien
            ? "Đã ok, báo Hamita để in"
            : `Báo cho Hamita — đã chọn xong ${tongSoDaChon} tấm`}
        </button>

        {/*
          LỐI RA THỨ HAI, chỉ ở thư mục ảnh đã chỉnh (anh yêu cầu 08/10/2026).

          Trước đó thư mục hoàn thiện chỉ có đúng một nút "Đã ok, báo Hamita
          để in". Khách xem thấy cần sửa thì ghi lời dặn vào từng tấm rồi…
          hết, không có nút nào báo là mình dặn xong. Hậu quả đúng như anh nói:
          "bên phía media không biết khách đã yêu cầu chỉnh sửa xong chưa" —
          Media ngồi đợi, khách tưởng đã báo, hai bên cùng đợi nhau.

          Nút này để NHẸ hơn nút chính, không phải vì nó kém quan trọng mà vì
          phần lớn khách sẽ bấm "đã ok"; để hai nút nặng ngang nhau thì thành
          một câu hỏi bắt khách cân nhắc, trong khi đa số chỉ cần gật đầu.

          Thư mục FILE GỐC không có nút này: ở đó khách đang chọn ảnh, chưa có
          bản chỉnh nào để mà yêu cầu sửa.
        */}
        {hoanThien && (
          <>
            <button
              type="button"
              onClick={() => baoDaXong("can-sua")}
              className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-[3px] border border-line-strong bg-bg-raised px-5 text-sm text-fg-muted transition hover:border-amber-500 hover:text-amber-700"
            >
              Cần chỉnh lại
            </button>

            {/*
              Nhắc khi khách chưa ghi lời dặn nào — anh chốt 08/10/2026: VẪN
              cho báo, nhưng phải nhắc. Có khách muốn dặn chung cả bộ ("sáng
              hơn chút") chứ không riêng tấm nào, chặn lại là bế tắc; nhưng
              báo suông mà không ghi gì thì Media mở ra không biết sửa cái gì.
            */}
            {soLoiDan === 0 ? (
              <p className="mt-2.5 text-xs leading-relaxed text-fg-faint">
                Cần sửa tấm nào, anh chị bấm vào tấm đó rồi ghi vào ô dưới ảnh
                giúp Hamita nhé — có ghi thì bên em mới biết sửa chỗ nào ạ.
              </p>
            ) : (
              <p className="mt-2.5 text-xs leading-relaxed text-fg-faint">
                Anh chị đã dặn{" "}
                <strong className="font-medium text-fg-muted">{soLoiDan} tấm</strong>{" "}
                trong thư mục này.
              </p>
            )}
          </>
        )}

        <p className="mt-3 text-xs leading-relaxed text-fg-faint">
          {hoanThien
            ? "Bấm rồi vẫn đổi lại được, anh chị đừng ngại ạ."
            : "Báo rồi vẫn chọn thêm hoặc bỏ bớt được, anh chị đừng ngại ạ."}
        </p>
      </div>
    </section>
  );
}
