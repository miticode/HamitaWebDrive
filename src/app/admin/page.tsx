import { cookies } from "next/headers";
import { adminPasswordIsSet, isAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { NutDoiTong } from "./NutDoiTong";
import { TheoDoiKhach } from "./TheoDoiKhach";
import { serviceAccountEmail } from "@/lib/drive";
import { getConnectedAccount, oauthIsConfigured } from "@/lib/googleAuth";
import {
  listCounts,
  listGalleries,
  listMucXong,
  storageKind,
  type Gallery,
} from "@/lib/store";
import { docMoc } from "@/lib/moc";
import { logoutAction } from "./actions";
import { NutSaoLuu } from "./NutSaoLuu";
import { KhoAnh } from "./KhoAnh";
import { DriveConnection } from "./DriveConnection";
import { AlbumList } from "./AlbumList";
import { GalleryForm } from "./GalleryForm";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

// Dung san anh chay nen sau khi tra loi — can them thoi gian so voi mac dinh.
export const maxDuration = 60;

const NGAY = 86_400_000;
/** Còn dưới ngần này ngày thì báo trước cho studio khỏi bị động. */
const BAO_TRUOC_NGAY = 30;

/**
 * Xếp album theo hạn giữ ảnh: cái nào đã quá, cái nào sắp tới.
 *
 * Để NGOÀI thân component có lý do: `Date.now()` là hàm bất thuần, viết thẳng
 * trong thân component thì ESLint của React 19 chặn (đúng cái bẫy đã ghi trong
 * CLAUDE.md). Ở đây trang là server component chạy lại mỗi request nên không
 * có nguy cơ lệch giữa máy chủ và máy khách, nhưng luật vẫn đúng về nguyên
 * tắc — tách ra hàm riêng vừa qua được luật vừa dễ đọc hơn.
 *
 * Trả về số ngày đã tính sẵn chứ không đưa mốc thời gian thô xuống trình
 * duyệt: để phía kia tự trừ là mở đường cho lệch múi giờ.
 */
function xepTheoHan(galleries: Gallery[]) {
  const bayGio = Date.now();

  const theoHan = galleries
    .filter((g) => g.expiresAt)
    .map((g) => {
      const conLaiMs = Date.parse(g.expiresAt!) - bayGio;
      return {
        id: g.id,
        ten: g.clientName ?? g.title,
        slug: g.slug,
        mb: g.dungLuongMB,
        soNgay: Math.abs(Math.ceil(conLaiMs / NGAY)),
        quaHan: conLaiMs < 0,
        conLaiMs,
      };
    });

  return {
    // Quá lâu nhất lên đầu — đó là album nên dọn trước.
    quaHan: theoHan
      .filter((a) => a.quaHan)
      .sort((a, b) => a.conLaiMs - b.conLaiMs),
    sapHetHan: theoHan
      .filter((a) => !a.quaHan && a.conLaiMs <= BAO_TRUOC_NGAY * NGAY)
      .sort((a, b) => a.conLaiMs - b.conLaiMs),
  };
}

/**
 * Lần sao lưu gần nhất cách đây bao nhiêu ngày. null = chưa lần nào.
 *
 * Cùng lý do với `xepTheoHan()` ở trên: `Date.now()` là hàm bất thuần, để
 * trong thân component thì ESLint của React 19 chặn.
 */
function cachDayMayNgay(luc: Date | null): number | null {
  if (!luc) return null;
  return Math.max(0, Math.floor((Date.now() - luc.getTime()) / NGAY));
}

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  /*
    Ca trang nay chi doc database, khong goi Drive lan nao.
    So lieu cua tung album (anh bia, so anh, ten thu muc con) da duoc chup lai
    luc tao link va moi lan bam "Lam moi" — neu doc thang tu Drive thi 9 album
    la khoang 70 lan goi, cham 8-10 giay moi lan mo trang.
  */
  const [galleries, counts, mucXong] = await Promise.all([
    listGalleries(),
    listCounts(),
    listMucXong(),
  ]);

  const driveAccount = await getConnectedAccount().catch(() => null);
  let serviceAccount: string | null = null;
  try {
    serviceAccount = serviceAccountEmail();
  } catch {
    serviceAccount = null;
  }

  const onJsonStore = storageKind() === "json";

  const { quaHan, sapHetHan } = xepTheoHan(galleries);
  const saoLuuCachDay = cachDayMayNgay(await docMoc("saoLuu"));

  // Cung mot cookie voi layout — doc lai o day de nut hien dung bieu tuong ngay
  // tu luot ve dau, khong nhay tu "Nen toi" sang "Nen sang" sau khi trang chay.
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  return (
    <main className="mx-auto w-full max-w-[90rem] px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <h1 className="font-display text-2xl font-light sm:text-3xl">Quản lý album</h1>
        </div>
        {/*
          Theo dõi khách chọn ảnh trong lúc trang đang mở. Không vẽ ra gì cho
          tới khi có khách vừa báo xong — lúc đó mới hiện thẻ nổi ở góc.
        */}
        <TheoDoiKhach />

        <div className="flex items-center gap-5">
          <NutDoiTong toiBanDau={tongToi} />
          {adminPasswordIsSet() && (
            <form action={logoutAction}>
              <button className="eyebrow transition hover:text-accent">Đăng xuất</button>
            </form>
          )}
        </div>
      </div>

      {/*
        Thanh kết nối Drive và nút sao lưu chung một hàng: cả hai đều là việc
        chăm sóc hệ thống, không phải việc làm với từng album. Gộp lại thì phần
        trên trang gọn còn một hàng, chừa chỗ cho khung kho ảnh ngay dưới.
      */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1">
          <DriveConnection
            account={driveAccount}
            oauthConfigured={oauthIsConfigured()}
            serviceAccount={serviceAccount}
          />
        </div>
        <NutSaoLuu soNgayTruoc={saoLuuCachDay} />
      </div>

      {/*
        Khung kho ảnh đặt NGAY ĐẦU TRANG, trên cả ô tạo link.

        Đây là việc duy nhất trên trang này có hạn chót thật: Drive đầy là
        studio không upload được ảnh mới nữa. Đặt xuống cuối thì nó thành thứ
        phải cuộn mới thấy, mà cái gì phải cuộn mới thấy thì không ai thấy.
        Component tự giấu đi khi kho còn rộng và không album nào quá hạn.
      */}
      <div className="mt-4">
        <KhoAnh quaHan={quaHan} sapHetHan={sapHetHan} />
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
            <AlbumList galleries={galleries} counts={counts} mucXong={mucXong} />
          )}
        </div>
      </div>
    </main>
  );
}
