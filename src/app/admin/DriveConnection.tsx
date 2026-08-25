import Link from "next/link";
import { disconnectDriveAction } from "./actions";

/**
 * Trạng thái kết nối Google Drive.
 * Khi đã kết nối, web đọc Drive dưới danh nghĩa chủ tài khoản — không cần
 * share folder cho service account nữa.
 */
export function DriveConnection({
  account,
  oauthConfigured,
  serviceAccount,
}: {
  account: { email: string; connectedAt: Date } | null;
  oauthConfigured: boolean;
  serviceAccount: string | null;
}) {
  if (!oauthConfigured) {
    return (
      <div className="notice bg-accent-soft text-fg">
        Chưa bật đăng nhập Google. Đang đọc Drive bằng service account
        {serviceAccount ? ` (${serviceAccount})` : ""} — mỗi folder vẫn phải share
        thủ công.
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Chưa kết nối Google Drive</p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Kết nối một lần để khỏi phải share từng folder cho service account.
          </p>
        </div>
        <Link href="/api/google/connect" prefetch={false} className="btn-primary">
          Kết nối Google Drive
        </Link>
      </div>
    );
  }

  /*
    Dang chay binh thuong thi thu gon lai con mot dong chu nho.

    Khong an han duoc: trang nay chi doc trong database thay "co ket noi", no
    khong biet phieu con song hay da chet. An han thi den luc phieu hong, album
    ngung hien anh ma khong con nut nao de bam Ket noi lai.

    Dung <details> cua HTML thay vi state cua React de giu day la server
    component — mo dong ra khong ton mot dong JavaScript nao.

    Tien the: hai nut nguy hiem nam khuat mot lop. "Ket noi lai" ma dang nhap
    nham tai khoan khac se GHI DE ket noi hien tai (bang chi giu mot dong duy
    nhat) — moi album dang chay mat quyen doc Drive ngay lap tuc.
  */
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 text-xs text-fg-faint transition hover:text-fg-muted">
        <span className="inline-block size-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="truncate">Drive: {account.email}</span>
        <span aria-hidden className="transition group-open:rotate-180">
          ⌄
        </span>
      </summary>

      <div className="card mt-2 flex flex-wrap items-center gap-3 px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">
            Đã kết nối <strong>{account.email}</strong>
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            Từ {account.connectedAt.toLocaleDateString("vi-VN")} · không cần share
            folder nữa
          </p>
          <p className="mt-2 text-xs text-amber-700">
            Đăng nhập tài khoản khác sẽ thay thế kết nối này, mọi album đang chạy
            sẽ ngừng hiện ảnh. Muốn dùng Drive của tài khoản khác thì share thư
            mục đó cho {account.email} thay vì đổi ở đây.
          </p>
        </div>
        <Link href="/api/google/connect" prefetch={false} className="btn">
          Kết nối lại
        </Link>
        <form action={disconnectDriveAction}>
          <button className="btn">Ngắt</button>
        </form>
      </div>
    </details>
  );
}
