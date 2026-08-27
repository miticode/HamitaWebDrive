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
 */
export function XacNhanXong({ tenMuc }: { tenMuc: string }) {
  const { unlocked, tongSoDaChon, daBaoXong, baoXongLuc, baoDaXong } = useSelection();

  /*
    Chua nhap ma thi khong the chon duoc tam nao, ma chua chon tam nao thi
    khong co gi de bao. Ca hai truong hop deu khong hien gi — mot khoi lon nam
    cuoi trang chi de noi "chua co gi" la thu vo ich duy nhat khach phai cuon qua.
  */
  if (!unlocked || (tongSoDaChon === 0 && !daBaoXong)) return null;

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
            Anh chị đã báo xong thư mục <strong className="font-medium">{tenMuc}</strong>
            {baoXongLuc &&
              ` lúc ${new Date(baoXongLuc).toLocaleString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "2-digit",
              })}`}
            . Hamita bắt tay vào làm liền đây ạ.
          </p>

          <p className="mt-4 text-[13px] leading-relaxed text-emerald-800">
            Lỡ quên tấm nào hay đổi ý thì anh chị vẫn chọn lại bình thường nhé.
          </p>
          <button
            type="button"
            onClick={() => baoDaXong(false)}
            className="mt-3 inline-flex min-h-11 items-center rounded-full border border-emerald-300 bg-white/70 px-5 text-sm font-medium text-emerald-900 transition hover:border-emerald-500"
          >
            Chọn thêm nữa
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
          Anh chị chọn xong thư mục <span className="italic">{tenMuc}</span> chưa ạ?
        </p>
        <p className="mt-2.5 text-[13px] leading-relaxed text-fg-muted">
          Anh chị đang chọn <strong className="font-medium text-fg">{tongSoDaChon} tấm</strong> ở
          thư mục này. Bấm nút dưới đây báo cho Hamita một tiếng là Hamita nhận được ngay và
          bắt tay vào làm liền ạ.
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
          Báo cho Hamita — đã chọn xong {tongSoDaChon} tấm
        </button>

        <p className="mt-3 text-xs leading-relaxed text-fg-faint">
          Báo rồi vẫn chọn thêm hoặc bỏ bớt được, anh chị đừng ngại ạ.
        </p>
      </div>
    </section>
  );
}
