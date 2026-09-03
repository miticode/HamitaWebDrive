"use client";

import { useMemo, useState } from "react";
import { MUI_GIO } from "@/lib/constants";

/** Mốc thời gian đang lọc. null = không lọc. `thang` null = lọc cả năm. */
export type MocLoc = { nam: number; thang: number | null } | null;

/**
 * Tách một mốc ISO thành năm và tháng THEO GIỜ STUDIO.
 *
 * Không dùng `getFullYear()` của Date: hàm đó lấy múi giờ của máy đang chạy,
 * mà máy chủ chạy UTC còn máy nhân viên chạy UTC+7 — album tạo lúc 0h30 ngày
 * 1/1 giờ Việt Nam sẽ bị hai bên xếp vào hai năm khác nhau (xem MUI_GIO).
 */
function namThang(iso: string): { nam: number; thang: number } {
  const phan = new Intl.DateTimeFormat("en-CA", {
    timeZone: MUI_GIO,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(iso));

  const lay = (loai: string) =>
    Number(phan.find((p) => p.type === loai)?.value ?? 0);

  return { nam: lay("year"), thang: lay("month") };
}

type Nam = {
  nam: number;
  so: number;
  thang: { thang: number; so: number }[];
};

/**
 * Cây lọc album theo tháng tạo link.
 *
 * Vì sao theo NGÀY TẠO LINK chứ không phải ngày chụp: ngày chụp không có ở đâu
 * cả — ảnh nằm trên Drive, database chỉ giữ mốc studio tạo link. Mà hai mốc đó
 * thực tế sát nhau, vì link được tạo ngay sau buổi chụp. Đây cũng đúng con số
 * ngày đang in dưới mỗi thẻ album, nên bấm vào tháng nào thì thấy đúng những
 * thẻ mang ngày của tháng đó.
 *
 * Chỉ dựng những năm và tháng THẬT SỰ CÓ ALBUM. Liệt kê đủ mười hai tháng thì
 * hơn nửa cây là số 0 — nhân viên phải đọc lướt qua một đống dòng chết để tìm
 * ra dòng sống.
 *
 * Năm mới nhất mở sẵn, các năm cũ thu lại: album cần tìm gần như luôn nằm ở
 * năm nay.
 *
 * Trạng thái mở/thu do React giữ, KHÔNG để `<details>` tự lo — khác với phần
 * hướng dẫn chọn ảnh ở trang khách (nguyên tắc 30), và đây là lý do:
 * `open` là thuộc tính React kiểm soát, nên mỗi lần bấm lọc là component vẽ
 * lại và React ghi đè `open` về giá trị ban đầu. Đã thử và thấy đúng vậy —
 * mở năm 2025 ra rồi bấm một tháng thì nó tự gấp lại ngay. Giữ bằng state thì
 * cây đứng yên. Vẫn không nháy như nguyên tắc 30 lo, vì giá trị đầu tính thẳng
 * từ props (`useState` có hàm khởi tạo), máy chủ và máy khách ra như nhau.
 */
export function LocTheoThang({
  ngayTao,
  moc,
  doiMoc,
}: {
  /** Mốc tạo của mọi album, dạng ISO. */
  ngayTao: string[];
  moc: MocLoc;
  doiMoc: (m: MocLoc) => void;
}) {
  const cay = useMemo<Nam[]>(() => {
    const gom = new Map<number, Map<number, number>>();

    for (const iso of ngayTao) {
      const { nam, thang } = namThang(iso);
      if (!nam) continue;
      const theoThang = gom.get(nam) ?? new Map<number, number>();
      theoThang.set(thang, (theoThang.get(thang) ?? 0) + 1);
      gom.set(nam, theoThang);
    }

    return (
      [...gom.entries()]
        // Năm mới nhất lên đầu — album vừa làm là thứ hay phải mở lại nhất.
        .sort((a, b) => b[0] - a[0])
        .map(([nam, theoThang]) => ({
          nam,
          so: [...theoThang.values()].reduce((t, n) => t + n, 0),
          thang: [...theoThang.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([thang, so]) => ({ thang, so })),
        }))
    );
  }, [ngayTao]);

  // Mở sẵn năm mới nhất. Hàm khởi tạo chứ không phải giá trị: `cay` chỉ có sau
  // khi useMemo chạy, mà giá trị đầu của useState thì chỉ dùng đúng lượt đầu.
  const [dangMo, setDangMo] = useState<Set<number>>(
    () => new Set(cay.length > 0 ? [cay[0].nam] : []),
  );

  if (cay.length === 0) return null;

  return (
    <div className="rounded-md border border-line bg-bg-raised p-3">
      <div className="flex items-center gap-2 px-1 pb-2">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="size-4 shrink-0 text-fg-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        >
          <path d="M4 7h16M7 12h10M10 17h4" />
        </svg>
        <span className="eyebrow">Theo tháng</span>
        {moc && (
          <button
            type="button"
            onClick={() => doiMoc(null)}
            className="ml-auto text-xs text-fg-faint underline underline-offset-2 hover:text-accent"
          >
            bỏ
          </button>
        )}
      </div>

      <ul className="space-y-0.5">
        {cay.map((n) => {
          const caNamDangChon = moc?.nam === n.nam && moc.thang === null;
          return (
            <li key={n.nam}>
              <details
                open={dangMo.has(n.nam)}
                onToggle={(e) => {
                  const mo = e.currentTarget.open;
                  setDangMo((cu) => {
                    const m = new Set(cu);
                    if (mo) m.add(n.nam);
                    else m.delete(n.nam);
                    return m;
                  });
                }}
                className="group"
              >
                <summary
                  /*
                    list-none + marker:hidden: bỏ tam giác mặc định của trình
                    duyệt để tự vẽ mũi tên xoay theo trạng thái mở — tam giác
                    mặc định mỗi trình duyệt một kiểu và không tô màu được.
                  */
                  className="flex cursor-pointer list-none items-center gap-2 rounded px-2 py-2 text-sm transition hover:bg-bg-soft [&::-webkit-details-marker]:hidden"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="size-3.5 shrink-0 text-fg-faint transition-transform group-open:rotate-90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 5 7 7-7 7" />
                  </svg>

                  {/*
                    Nút nằm TRONG summary nên một cú bấm mang hai ý nghĩa. Chặn
                    hành vi mặc định rồi tự quyết: bấm vào năm thì LUÔN mở ra,
                    không bao giờ gấp lại.

                    Bấm một năm còn thu mà nó vẫn thu thì nhân viên không có
                    đường nào thấy các tháng bên trong. Ngược lại, bấm một năm
                    đang mở mà nó gấp lại thì đúng thứ vừa lọc ra biến mất khỏi
                    tầm mắt. Cả hai chiều đều dẫn về "mở". Muốn gấp thì bấm mũi
                    tên bên trái.
                  */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setDangMo((cu) => new Set(cu).add(n.nam));
                      doiMoc(
                        caNamDangChon ? null : { nam: n.nam, thang: null },
                      );
                    }}
                    className={`min-w-0 flex-1 text-left transition ${
                      caNamDangChon
                        ? "font-medium text-accent"
                        : "hover:text-accent"
                    }`}
                  >
                    {n.nam}
                  </button>
                  <span className="shrink-0 text-xs text-fg-faint tabular-nums">
                    {n.so}
                  </span>
                </summary>

                <ul className="mb-1 ml-[1.35rem] space-y-0.5 border-l border-line pl-2">
                  {n.thang.map((t) => {
                    const dangChon =
                      moc?.nam === n.nam && moc.thang === t.thang;
                    return (
                      <li key={t.thang}>
                        <button
                          type="button"
                          onClick={() =>
                            doiMoc(
                              dangChon ? null : { nam: n.nam, thang: t.thang },
                            )
                          }
                          className={`flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition ${
                            dangChon
                              ? "bg-bg-soft font-medium text-accent"
                              : "text-fg-muted hover:bg-bg-soft hover:text-fg"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            Tháng {t.thang}
                          </span>
                          <span className="shrink-0 text-xs text-fg-faint tabular-nums">
                            {t.so}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Album này có rơi vào mốc đang lọc không. Để AlbumList dùng chung cách tính. */
export function hopMoc(iso: string, moc: MocLoc): boolean {
  if (!moc) return true;
  const { nam, thang } = namThang(iso);
  if (nam !== moc.nam) return false;
  return moc.thang === null || thang === moc.thang;
}
