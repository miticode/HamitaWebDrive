import Link from "next/link";
import { cookies } from "next/headers";
import { adminPasswordIsSet, isAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { NutDoiTong } from "./NutDoiTong";
import { TheoDoiKhach } from "./TheoDoiKhach";
import { serviceAccountEmail } from "@/lib/drive";
import { getConnectedAccount, oauthIsConfigured } from "@/lib/googleAuth";
import {
  listBiaMuc,
  listCounts,
  listGalleries,
  listMucXong,
  storageKind,
  type Gallery,
} from "@/lib/store";
import { docMoc } from "@/lib/moc";
import { docThongBao } from "@/lib/thongBao";
import { demNguoiNhanMoiAlbum } from "@/lib/push";
import { logoutAction } from "./actions";
import { NutSaoLuu } from "./NutSaoLuu";
import { KhoAnh } from "./KhoAnh";
import { DriveConnection } from "./DriveConnection";
import { AlbumList } from "./AlbumList";
import { GalleryForm } from "./GalleryForm";
import { ThongBao } from "./ThongBao";
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
  const [galleries, counts, mucXong, biaMuc] = await Promise.all([
    listGalleries(),
    listCounts(),
    listMucXong(),
    listBiaMuc(),
  ]);

  const driveAccount = await getConnectedAccount().catch(() => null);
  let serviceAccount: string | null = null;
  try {
    serviceAccount = serviceAccountEmail();
  } catch {
    serviceAccount = null;
  }

  const onJsonStore = storageKind() === "json";

  /*
    Thông báo đọc thẳng từ Prisma nên chỉ có khi chạy trên Postgres, giống
    trang thống kê. Chạy ở máy bằng kho JSON thì khung báo trống — chấp nhận
    được, vì đó là chế độ chỉ dùng lúc phát triển.

    Nuốt lỗi: đây là khung phụ trợ, hỏng thì cũng không được kéo cả trang quản
    lý chết theo.
  */
  const tinThongBao = onJsonStore ? [] : await docThongBao().catch(() => []);

  /*
    Số máy đang chờ nhận thông báo của từng album — nút "Gửi thông báo" trên
    mỗi thẻ cần con số này để biết có ai để gửi không.

    Đếm MỘT LẦN cho cả trang rồi tra theo id, không gọi mỗi thẻ một lần: mười
    sáu album là mười sáu lần hỏi database cho một con số nhỏ.
  */
  const soMayChoTin = onJsonStore
    ? {}
    : await demNguoiNhanMoiAlbum().catch(() => ({}));

  const { quaHan, sapHetHan } = xepTheoHan(galleries);
  const saoLuuCachDay = cachDayMayNgay(await docMoc("saoLuu"));

  // Cung mot cookie voi layout — doc lai o day de nut hien dung bieu tuong ngay
  // tu luot ve dau, khong nhay tu "Nen toi" sang "Nen sang" sau khi trang chay.
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  return (
    /*
      Từ 1536px trở lên, TRANG KHÔNG CUỘN — chỉ lưới thẻ album cuộn (studio yêu
      cầu 07/09/2026).

      Lý do: mọi thứ còn lại trên trang này đều là thứ phải luôn nhìn thấy —
      khung kho ảnh trên Drive, ô tạo link mới, cây lọc theo tháng, khung thông
      báo. Cuộn xuống xem album thứ hai mươi là mất sạch, mà đó lại chính là
      lúc cần chúng nhất.

      Chỉ áp dụng từ `2xl` (1536px) — đúng chỗ ba cột thật sự đứng cạnh nhau.
      Đo ở 1280px: cột trái lúc đó nằm NGANG phía trên danh sách, khoá chiều cao
      lại thì phần lưới thẻ chỉ còn một dải chừng 40px, gần như không thấy album
      nào. Dưới 1536px cứ để trang cuộn như cũ.

      `h-dvh` chứ không `h-screen`: thanh địa chỉ của trình duyệt di động co ra
      giãn vào, `h-screen` sẽ để một dải nội dung nằm dưới mép màn hình.
    */
    <main className="mx-auto w-full max-w-[104rem] px-5 py-10 sm:px-6 sm:py-12 2xl:flex 2xl:h-dvh 2xl:flex-col 2xl:overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
          <h1 className="font-display text-2xl font-light sm:text-3xl">
            Quản lý album
          </h1>
        </div>
        {/*
          Theo dõi khách chọn ảnh trong lúc trang đang mở. Không vẽ ra gì cho
          tới khi có khách vừa báo xong — lúc đó mới hiện thẻ nổi ở góc.
        */}
        <TheoDoiKhach />

        <div className="flex items-center gap-5">
          <Link
            href="/admin/thong-ke"
            className="eyebrow transition hover:text-accent"
          >
            Thống kê
          </Link>
          <NutDoiTong toiBanDau={tongToi} />
          {adminPasswordIsSet() && (
            <form action={logoutAction}>
              <button className="eyebrow transition hover:text-accent">
                Đăng xuất
              </button>
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
              Chưa đặt <code>ADMIN_PASSWORD</code> trong <code>.env.local</code>{" "}
              — trang này đang mở tự do. Bắt buộc phải đặt trước khi đưa lên
              mạng.
            </p>
          )}
          {onJsonStore && (
            <p className="notice bg-amber-100 text-amber-900">
              Dữ liệu đang lưu trong file trên máy này. Đặt{" "}
              <code>DATABASE_URL</code> trỏ tới Neon Postgres trước khi deploy,
              nếu không lựa chọn của khách sẽ mất.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:min-h-0 2xl:flex-1 2xl:items-stretch">
        {/*
          Cột phải cũng cuộn riêng: ô tạo link cao hơn màn hình 13 inch, khoá
          chiều cao mà không cho nó cuộn là nhân viên không tới được nút "Tạo
          link".
        */}
        <div className="lg:order-2 2xl:min-h-0 2xl:overflow-y-auto">
          <GalleryForm />
        </div>

        <div className="lg:order-1 2xl:min-h-0">
          {galleries.length === 0 ? (
            <>
              <h2 className="eyebrow">Album đã tạo · 0</h2>
              <p className="mt-4 text-sm text-fg-muted">Chưa có album nào.</p>
            </>
          ) : (
            /*
              Khung thông báo truyền XUỐNG AlbumList chứ không đứng ở đây, vì
              chỗ của nó giờ là cột trái cạnh cây lọc theo tháng (studio yêu cầu
              07/09/2026) — mà cây lọc thì phải nằm trong AlbumList để dùng
              chung state lọc. Truyền sẵn phần tử đã dựng ở máy chủ thì AlbumList
              vẫn là component phía khách, không phải biết gì về database.
            */
            <AlbumList
              galleries={galleries}
              counts={counts}
              mucXong={mucXong}
              biaMuc={biaMuc}
              soMayChoTin={soMayChoTin}
              thongBao={<ThongBao tin={tinThongBao} />}
            />
          )}
        </div>
      </div>
    </main>
  );
}
