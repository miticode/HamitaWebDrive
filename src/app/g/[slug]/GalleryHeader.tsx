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
}: {
  title: string;
  backHref: string | null;
  backLabel: string;
  total: number;
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
    muc.push(
      <span key="khoa">
        Anh chị xin Hamita mã để chọn ảnh nhé{" "}
        <button
          onClick={openCode}
          className="underline underline-offset-2 hover:text-accent"
        >
          nhập mã
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
          chọn thêm nữa
        </button>
      </span>
    );
  } else if (tongSoDaChon > 0) {
    muc.push(
      <span key="hoi">
        Anh chị chọn xong {tongSoDaChon} tấm rồi phải không ạ?{" "}
        <button
          onClick={() => baoDaXong(true)}
          className="font-medium text-accent underline underline-offset-2 hover:text-fg"
        >
          Báo cho Hamita
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
              className="inline-flex items-center gap-1 text-xs text-fg-muted transition hover:text-accent"
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
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm transition disabled:opacity-40 ${
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
