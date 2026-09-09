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
  const { unlocked, tongSoDaChon, daBaoXong, baoXongLuc, baoDaXong } = useSelection();

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
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-6 py-7 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-11 place-items-center rounded-full bg-emerald-500 text-white"
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
              <path d="M20 6.5 9.2 17.3 4 12.1" />
            </svg>
          </span>

          <p className="mt-4 font-display text-xl font-light text-emerald-900">
            Hamita đã nhận được rồi ạ
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-emerald-800">
            {hoanThien ? "Anh chị đã duyệt thư mục " : "Anh chị đã báo xong thư mục "}
            <strong className="font-medium">{tenMuc}</strong>
            {baoXongLuc &&
              ` lúc ${new Date(baoXongLuc).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}`}
            {hoanThien
              ? ". Hamita mang đi in liền đây ạ."
              : ". Hamita bắt tay vào làm liền đây ạ."}
          </p>

          <p className="mt-4 text-[13px] leading-relaxed text-emerald-800">
            {hoanThien
              ? "Xem lại thấy cần sửa chỗ nào thì anh chị bấm nút dưới, rồi nhắn Hamita nhé."
              : "Lỡ quên tấm nào hay đổi ý thì anh chị vẫn chọn lại bình thường nhé."}
          </p>
          <button
            type="button"
            onClick={() => baoDaXong(false)}
            className="mt-3 inline-flex min-h-11 items-center rounded-full border border-emerald-300 bg-white/70 px-5 text-sm font-medium text-emerald-900 transition hover:border-emerald-500"
          >
            {hoanThien ? "Chưa ok, xem lại" : "Chọn thêm nữa"}
          </button>
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
          onClick={() => baoDaXong(true)}
          className="btn-primary mt-5 w-full text-sm"
        >
          {hoanThien
            ? "Đã ok, báo Hamita để in"
            : `Báo cho Hamita — đã chọn xong ${tongSoDaChon} tấm`}
        </button>

        <p className="mt-3 text-xs leading-relaxed text-fg-faint">
          {hoanThien
            ? "Bấm rồi vẫn đổi lại được, anh chị đừng ngại ạ."
            : "Báo rồi vẫn chọn thêm hoặc bỏ bớt được, anh chị đừng ngại ạ."}
        </p>
      </div>
    </section>
  );
}
