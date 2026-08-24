"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

      {!unlocked && (
        <div className="border-t border-line bg-bg-soft px-4 py-1.5 text-center text-xs text-fg-muted sm:px-6">
          Cần mã của studio để chọn ảnh ·{" "}
          <button
            onClick={openCode}
            className="underline underline-offset-2 hover:text-accent"
          >
            nhập mã
          </button>
        </div>
      )}

      {filter && (
        <div className="border-t border-line bg-accent-soft px-4 py-2 text-center text-xs sm:px-6">
          Đang chỉ hiện ảnh đã chọn ·{" "}
          <button
            onClick={() => setFilter(null)}
            className="underline underline-offset-2 hover:text-accent"
          >
            xem lại tất cả {total} ảnh
          </button>
        </div>
      )}

      {/*
        Chi moc noi khi da chon it nhat mot anh — bao "xong" luc chua chon gi
        thi chang co y nghia. Ap dung cho ca gallery, khong rieng thu muc dang
        xem, vi cac thu muc con dung chung mot danh sach chon.
      */}
      {unlocked && tongSoDaChon > 0 && !daBaoXong && (
        <div className="border-t border-line bg-bg-soft px-4 py-2 text-center text-xs sm:px-6">
          Đã chọn xong {tongSoDaChon} ảnh?{" "}
          <button
            onClick={() => baoDaXong(true)}
            className="font-medium text-accent underline underline-offset-2 hover:text-fg"
          >
            Báo cho studio
          </button>
        </div>
      )}

      {daBaoXong && (
        <div className="border-t border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-xs text-emerald-800 sm:px-6">
          Đã báo studio{" "}
          {baoXongLuc &&
            `lúc ${new Date(baoXongLuc).toLocaleString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              day: "2-digit",
              month: "2-digit",
            })}`}{" "}
          ·{" "}
          <button
            onClick={() => baoDaXong(false)}
            className="underline underline-offset-2 hover:text-emerald-950"
          >
            chọn thêm ảnh
          </button>
        </div>
      )}

      {failed && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-xs text-red-700 sm:px-6">
          Có lựa chọn chưa lưu được — kiểm tra mạng rồi bấm lại giúp em
        </div>
      )}
    </header>
  );
}
