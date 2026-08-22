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

  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3.5">
      <span className="inline-block size-2 shrink-0 rounded-full bg-emerald-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          Đã kết nối <strong>{account.email}</strong>
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Từ {account.connectedAt.toLocaleDateString("vi-VN")} · không cần share folder nữa
        </p>
      </div>
      <Link href="/api/google/connect" prefetch={false} className="btn">
        Kết nối lại
      </Link>
      <form action={disconnectDriveAction}>
        <button className="btn">Ngắt</button>
      </form>
    </div>
  );
}
