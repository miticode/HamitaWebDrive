"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSelection } from "./Selection";

/**
 * Thanh trên cùng dính theo màn hình.
 *
 * Gộp ba việc vào một chỗ thay vì rải rác: quay lại, biết mình đang xem mục nào,
 * và biết đã chọn bao nhiêu ảnh. Con số cũng chính là nút lọc — bấm vào là chỉ
 * hiện những ảnh đã chọn, khỏi phải cuộn lại từ đầu để xem mình đã tim tấm nào.
 */
export function GalleryHeader({
  title,
  backHref,
  backLabel,
  total,
  hoanThien = false,
}: {
  title: string;
  backHref: string | null;
  backLabel: string;
  total: number;
  /**
   * Thư mục ảnh đã chỉnh xong — khách DUYỆT chứ không chọn, nên câu hỏi khác.
   * Phải đổi cùng lúc với khối cuối trang (XacNhanXong): hai chỗ nói về đúng
   * một việc, để lệch nhau là khách đọc trên một kiểu, đọc dưới một kiểu.
   */
  hoanThien?: boolean;
}) {
  const {
    lists,
    countFor,
    filter,
    setFilter,
    failed,
    unlocked,
    openCode,
    tongSoDaChon,
    daBaoXong,
    baoXongLuc,
    baoDaXong,
  } = useSelection();
  const [dinh, setDinh] = useState(false);

  // Chỉ đổ bóng khi đã cuộn — lúc ở đầu trang để thanh chìm vào nền cho nhẹ mắt.
  useEffect(() => {
    const onScroll = () => setDinh(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /*
    Truoc day moi trang thai (khoa, loc, hoi xong, da bao, loi) la mot dai mau
    rieng, co the xep chong toi 3 dai cung luc — nang ne voi mot web anh cuoi
    can su nhe nhang. Gio gop lai thanh TOI DA MOT dong phu duy nhat: cac muc
    khong phai loi noi voi nhau bang dau cham giua, rieng loi that su van
    duoc tach mau do de con nguoi con chu y ngay.
  */
  const muc: ReactNode[] = [];

  if (!unlocked) {
    /*
      "Nhap ma" phai la NUT THAT, khong phai chu gach chan trong cau.
      Do that ngay 27/08/2026 tren man hinh 375px: dang chu gach chan no chi
      cao 16px, trong khi day la viec quan trong nhat khach phai lam — chua
      nhap ma thi khong tha tim duoc tam nao. Gio cao 44px, co vien va nen
      rieng de nhin ra ngay la bam duoc.
    */
    muc.push(
      <span key="khoa" className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        Anh chị xin Hamita mã để chọn ảnh nhé
        <button
          type="button"
          onClick={openCode}
          className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-bg-raised px-4 text-xs font-medium text-fg transition hover:border-accent hover:text-accent"
        >
          Nhập mã
        </button>
      </span>
    );
  } else if (daBaoXong) {
    muc.push(
      <span key="xong" className="inline-flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
        Hamita đã nhận được rồi ạ
        {baoXongLuc &&
          ` lúc ${new Date(baoXongLuc).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          })}`}{" "}
        <button
          onClick={() => baoDaXong(false)}
          className="underline underline-offset-2 hover:text-accent"
        >
          {/* Cùng chữ với nút trong khối cuối trang — hai chỗ làm đúng một
              việc, ghi hai kiểu thì khách tưởng là hai thứ khác nhau. */}
          {hoanThien ? "chưa ok, xem lại" : "chọn thêm nữa"}
        </button>
      </span>
    );
    /*
      Thư mục HOÀN THIỆN hỏi cả khi chưa thả tim tấm nào: ở đó khách không
      chọn, họ chỉ xem rồi gật đầu — bắt tim một tấm mới hiện lời mời là bắt
      làm một bước thừa (studio yêu cầu 09/09/2026). Thư mục file gốc thì giữ
      nguyên: chưa chọn tấm nào thì chưa có gì để báo.
    */
  } else if (hoanThien || tongSoDaChon > 0) {
    muc.push(
      <span key="hoi">
        {!hoanThien
          ? `Anh chị chọn xong ${tongSoDaChon} tấm rồi phải không ạ? `
          : tongSoDaChon > 0
            ? `Anh chị ưng ${tongSoDaChon} tấm này rồi phải không ạ? `
            : "Anh chị xem xong thư mục này chưa ạ? "}
        <button
          onClick={() => baoDaXong(true)}
          className="font-medium text-accent underline underline-offset-2 hover:text-fg"
        >
          {hoanThien ? "Đã ok, báo Hamita để in" : "Báo cho Hamita"}
        </button>
      </span>
    );
  }

  if (filter) {
    muc.push(
      <span key="loc">
        Đang xem riêng những tấm anh chị đã chọn{" "}
        <button
          onClick={() => setFilter(null)}
          className="underline underline-offset-2 hover:text-accent"
        >
          xem lại tất cả {total} ảnh
        </button>
      </span>
    );
  }

  return (
    <header
      className={`sticky top-0 z-30 border-b bg-bg/85 backdrop-blur-md transition-shadow ${
        dinh ? "border-line shadow-[0_1px_16px_rgba(31,28,26,0.06)]" : "border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1700px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          {backHref && (
            <Link
              href={backHref}
              /*
                py-2 -mt-2 chu khong phai chi py-2: dem doc lam vung cham cao
                len 32px (16px chu + 8px moi ben) ma KHONG day tieu de xuong —
                le am keo lai dung bang phan vua them. Do that: truoc khi sua
                vung cham chi cao 16px, mong hon mot nua muc toi thieu.
              */
              className="-mt-2 inline-flex items-center gap-1 py-2 text-xs text-fg-muted transition hover:text-accent"
            >
              <span aria-hidden>←</span>
              <span className="max-w-[40vw] truncate sm:max-w-none">{backLabel}</span>
            </Link>
          )}
          <p className="truncate font-display text-lg leading-tight sm:text-xl">
            {title}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {lists.map((list) => {
            const n = countFor(list.id);
            const dangLoc = filter === list.id;
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setFilter(dangLoc ? null : list.id)}
                disabled={n === 0 && !dangLoc}
                title={
                  n === 0
                    ? `Chưa chọn ảnh nào cho “${list.name}”`
                    : dangLoc
                      ? "Bấm để xem lại tất cả ảnh"
                      : `Chỉ xem ${n} ảnh trong “${list.name}”`
                }
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 text-sm transition disabled:opacity-40 ${
                  dangLoc
                    ? "border-transparent bg-fg text-bg"
                    : "border-line-strong bg-bg-raised hover:border-accent"
                }`}
              >
                <span
                  aria-hidden
                  className={`inline-block size-2 rounded-full ${
                    list.icon === "heart" ? "bg-rose-500" : "bg-accent"
                  }`}
                />
                <span className="hidden sm:inline">{list.name}</span>
                <strong className="font-display text-base leading-none font-medium">
                  {n}
                </strong>
              </button>
            );
          })}
        </div>
      </div>

      {failed ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700 sm:px-6">
          Có tấm chưa lưu kịp — anh chị xem lại mạng rồi bấm giúp Hamita nhé
        </div>
      ) : (
        muc.length > 0 && (
          <div className="border-t border-line bg-bg-soft px-4 py-2 text-center text-xs text-fg-muted sm:px-6">
            {muc.map((m, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2.5 text-fg-faint">·</span>}
                {m}
              </span>
            ))}
          </div>
        )
      )}
    </header>
  );
}
