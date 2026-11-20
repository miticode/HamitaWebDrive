import { CHANG, changCuaBuoc, daXong } from "@/lib/changHopDong";

/*
  DẢI TIẾN ĐỘ — anh duyệt 20/11/2026 (KE-HOACH-GIAO-DIEN §4.3).

  Mở một hợp đồng ra, câu đầu tiên người ta hỏi là "nhà này đang kẹt đâu".
  Trước đây câu trả lời nằm trong một chip chữ như "10. Chờ ngày tiệc" — đúng
  nhưng phải thuộc lòng cả mười tám bước mới biết còn bao xa tới lúc giao hình.

  Năm chặng gióng hai nhánh (chụp và tiệc) về cùng một thước — xem
  `src/lib/changHopDong.ts`.

  KHÔNG phải nút bấm. Đổi bước vẫn làm ở nút "Sửa hợp đồng" như cũ: dải này
  chỉ để NHÌN. Biến nó thành chỗ bấm thì một cú chạm nhầm trên điện thoại là
  nhảy trạng thái của cả một nhà, mà trạng thái còn kéo theo album và đầu việc.
*/

export function DaiTienDo({
  buoc,
  tenBuoc,
  buocSau,
  aiLo,
  xongNhanh,
}: {
  /** Số bước 1–18, hoặc null khi hợp đồng chưa gõ bước. */
  buoc: number | null;
  /** Tên đầy đủ của bước, để câu dưới dải nói chính xác. */
  tenBuoc: string | null;
  /** Tên bước kế tiếp, lấy từ bảng BuocHopDong. */
  buocSau?: string | null;
  /** Bộ phận lo bước kế tiếp ("Sale", "Nhiếp ảnh") — cột trachNhiem. */
  aiLo?: string | null;
  /** Đã xong nhánh này nhưng còn nhánh kia (hợp đồng có cả chụp lẫn tiệc). */
  xongNhanh?: boolean;
}) {
  const dangO = changCuaBuoc(buoc);
  const xong = daXong(buoc);

  return (
    <div className="card p-4 sm:px-5">
      {/*
        Lưới năm cột bằng nhau, KHÔNG phải flex với đường kẻ nối.

        Đường kẻ nối giữa các chấm nghe hay nhưng trên màn 375px nó bóp tên
        chặng xuống còn hai chữ rồi cắt. Lưới thì mỗi chặng tự co, tên xuống
        dòng được, và cột nào cũng rộng bằng nhau nên mắt đếm được ngay.
      */}
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {CHANG.map((c) => {
          const qua = dangO !== null && (xong || c.so < dangO.so);
          const hienTai = dangO?.so === c.so && !xong;
          return (
            <li key={c.so} className="flex flex-col items-center gap-1.5 text-center">
              <span
                aria-hidden
                className={`h-1 w-full rounded-full ${
                  qua || hienTai ? "bg-accent" : "bg-line"
                }`}
              />
              <span
                className={`text-[11px] leading-tight sm:text-xs ${
                  hienTai ? "font-medium text-fg" : qua ? "text-fg-muted" : "text-fg-faint"
                }`}
              >
                {c.ten}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-sm leading-relaxed">
        {dangO === null ? (
          <span className="text-fg-muted">
            Hợp đồng này chưa gõ bước nào — bấm “Sửa hợp đồng” để chọn.
          </span>
        ) : xong ? (
          <span className="text-emerald-700">Đã xong · {tenBuoc}</span>
        ) : (
          <>
            <span className="font-medium">{tenBuoc}</span>
            {buocSau && (
              <span className="text-fg-muted">
                {" · tiếp theo "}
                {buocSau}
                {/* Ai lo bước sau — bảng BuocHopDong có cột này cho 11/18 bước. */}
                {aiLo && ` — ${aiLo} lo`}
              </span>
            )}
            {/*
              Hợp đồng có CẢ hai nhánh thì xong nhánh này chưa phải xong hẳn.
              Nói rõ, kẻo nhìn dải thấy còn chặng trống mà tưởng đang kẹt.
            */}
            {xongNhanh && <span className="block text-emerald-700">Đã xong nhánh này.</span>}
          </>
        )}
      </p>
    </div>
  );
}
