import { adminPasswordIsSet, isAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { serviceAccountEmail } from "@/lib/drive";
import { getConnectedAccount, oauthIsConfigured } from "@/lib/googleAuth";
import { listCounts, listGalleries, storageKind } from "@/lib/store";
import { logoutAction } from "./actions";
import { DriveConnection } from "./DriveConnection";
import { AlbumList } from "./AlbumList";
import { GalleryForm } from "./GalleryForm";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

// Dung san anh chay nen sau khi tra loi — can them thoi gian so voi mac dinh.
export const maxDuration = 60;

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  /*
    Ca trang nay chi doc database, khong goi Drive lan nao.
    So lieu cua tung album (anh bia, so anh, ten thu muc con) da duoc chup lai
    luc tao link va moi lan bam "Lam moi" — neu doc thang tu Drive thi 9 album
    la khoang 70 lan goi, cham 8-10 giay moi lan mo trang.
  */
  const [galleries, counts] = await Promise.all([listGalleries(), listCounts()]);

  const driveAccount = await getConnectedAccount().catch(() => null);
  let serviceAccount: string | null = null;
  try {
    serviceAccount = serviceAccountEmail();
  } catch {
    serviceAccount = null;
  }

  const onJsonStore = storageKind() === "json";

  return (
    <main className="mx-auto w-full max-w-[90rem] px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <h1 className="font-display text-2xl font-light sm:text-3xl">Quản lý album</h1>
        </div>
        {adminPasswordIsSet() && (
          <form action={logoutAction}>
            <button className="eyebrow transition hover:text-accent">Đăng xuất</button>
          </form>
        )}
      </div>

      <div className="mt-6">
        <DriveConnection
          account={driveAccount}
          oauthConfigured={oauthIsConfigured()}
          serviceAccount={serviceAccount}
        />
      </div>

      {(!adminPasswordIsSet() || onJsonStore) && (
        <div className="mt-4 space-y-2">
          {!adminPasswordIsSet() && (
            <p className="notice bg-amber-100 text-amber-900">
              Chưa đặt <code>ADMIN_PASSWORD</code> trong <code>.env.local</code> — trang
              này đang mở tự do. Bắt buộc phải đặt trước khi đưa lên mạng.
            </p>
          )}
          {onJsonStore && (
            <p className="notice bg-amber-100 text-amber-900">
              Dữ liệu đang lưu trong file trên máy này. Đặt <code>DATABASE_URL</code> trỏ
              tới Neon Postgres trước khi deploy, nếu không lựa chọn của khách sẽ mất.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="lg:order-2">
          <GalleryForm />
        </div>

        <div className="lg:order-1">
          {galleries.length === 0 ? (
            <>
              <h2 className="eyebrow">Album đã tạo · 0</h2>
              <p className="mt-4 text-sm text-fg-muted">Chưa có album nào.</p>
            </>
          ) : (
            <AlbumList galleries={galleries} counts={counts} />
          )}
        </div>
      </div>
    </main>
  );
}
