import Link from "next/link";
import { disconnectKhoAction } from "./actions";

/**
 * Trạng thái kết nối KHO ẢNH CRM — tài khoản Google thứ hai, chỉ dùng để chứa
 * tệp do web sinh ra: ảnh chấm công, chứng từ thu chi.
 *
 * Vì sao phải là tài khoản riêng chứ không phải một thư mục chia sẻ: trên
 * Google Drive, **tệp thuộc về người tải lên**, không thuộc về chủ thư mục.
 * Chia sẻ một thư mục của ổ 5 TB cho `hamita.studio` rồi ghi vào đó thì dung
 * lượng vẫn trừ vào ổ 2 TB của `hamita.studio` — mà ổ đó đã dùng 1.880/2.048
 * GB (đo 13/11/2026), chỉ còn 167 GB. Anh chốt 13/11/2026: nối thêm tài khoản
 * thứ hai. Xem `KE-HOACH-CRM.md` mục 3a.
 *
 * Kết nối này xin **ít quyền hơn hẳn** kết nối gốc: chỉ `drive.file`, tức chỉ
 * đụng được vào những tệp do chính web tạo ra. Nó không nhìn thấy phần còn lại
 * của Drive đó — nên nối nhầm cũng không lộ gì.
 */
export function KhoAnhCrm({
  account,
  oauthConfigured,
}: {
  account: { email: string; connectedAt: Date } | null;
  oauthConfigured: boolean;
}) {
  if (!oauthConfigured) return null;

  if (!account) {
    return (
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Chưa nối kho ảnh CRM</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Nơi chứa ảnh chấm công và chứng từ thu chi. Bấm nối rồi chọn{" "}
            <strong>hamitaweddinghouse@gmail.com</strong> (ổ 5 TB) — đừng chọn
            tài khoản đang dùng cho ảnh cưới, ổ đó sắp đầy.
          </p>
        </div>
        <Link
          href="/api/google/connect?ket=kho"
          prefetch={false}
          className="btn"
        >
          Nối kho ảnh
        </Link>
      </div>
    );
  }

  /*
    Giống khối Drive ở trên: thu gọn thành một dòng khi đang chạy bình thường,
    nhưng KHÔNG ẩn hẳn — trang này chỉ đọc trong database thấy "có kết nối", nó
    không biết phiếu còn sống hay đã chết. Ẩn hẳn thì tới lúc phiếu hỏng sẽ
    không còn nút nào để bấm nối lại.

    Dùng <details> của HTML thay vì state của React để giữ đây là server
    component — mở dòng ra không tốn một dòng JavaScript nào.
  */
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-xs text-fg-faint transition hover:text-fg-muted">
        <span className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate">Kho ảnh CRM: {account.email}</span>
        <span aria-hidden className="transition group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="card mt-2 flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            Đang chứa ở <strong>{account.email}</strong>
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Từ {account.connectedAt.toLocaleDateString("vi-VN")} · chỉ chứa ảnh
            chấm công và chứng từ, không đụng tới ảnh cưới
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Ngắt kết nối này thì những ảnh đã lưu vẫn còn nguyên trên Drive,
            nhưng web không mở lại được cho tới khi nối lại đúng tài khoản đó.
          </p>
        </div>
        <Link href="/api/google/connect?ket=kho" prefetch={false} className="btn">
          Nối lại
        </Link>
        <form action={disconnectKhoAction}>
          <button className="btn">Ngắt</button>
        </form>
      </div>
    </details>
  );
}
