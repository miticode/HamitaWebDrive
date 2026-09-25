import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { databaseIsConfigured } from "@/lib/db";
import { listGalleries } from "@/lib/store";
import { docThuMucGioiThieu } from "@/lib/anhGioiThieu";
import { docNhomCoMuc } from "@/lib/mucDichVu";
import { NutDoiTong } from "../NutDoiTong";
import { QuanLyGioiThieu } from "./QuanLyGioiThieu";

export const dynamic = "force-dynamic";

/**
 * Quản lý nội dung trang giới thiệu (anh yêu cầu 17/09/2026).
 *
 * Mỗi nhóm dịch vụ (src/lib/nhomGioiThieu.ts) có các mục nhỏ. Mỗi mục là danh sách THƯ MỤC CON của
 * các album, chọn theo mã đầu tên album. Trang này không gọi Drive lúc mở
 * (nguyên tắc 9) — tên thư mục và tấm bìa đã lưu sẵn lúc chọn; chỉ khi bấm vào
 * một album trong ô chọn mới đọc Drive để liệt kê thư mục.
 */
export default async function GioiThieuPage({ searchParams }: PageProps<"/admin/gioi-thieu">) {
  if (!(await quyenAlbum())) redirect("/quan-ly/dang-nhap?tiep=%2Fadmin%2Fgioi-thieu");
  /*
    Nhóm đang xem nằm trong ĐỊA CHỈ TRANG (?nhom=be-gia-dinh) chứ không chỉ
    trong bộ nhớ tạm — anh báo 25/09/2026: đang ở tab Bé & gia đình mà bấm đọc
    lại là nhảy về tab đầu. Để trong địa chỉ thì F5, bấm đọc lại, hay mở lại
    link đều quay về đúng tab.
  */
  const nhomBanDau = (await searchParams).nhom;
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  if (!databaseIsConfigured()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="notice bg-amber-100 text-amber-900">Phần này cần database.</p>
      </main>
    );
  }

  const [galleries, daChon, nhomDs] = await Promise.all([listGalleries(), docThuMucGioiThieu(), docNhomCoMuc()]);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="eyebrow transition hover:text-accent">
          ← Tất cả album
        </Link>
        <NutDoiTong toiBanDau={tongToi} />
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-6">
        <div>
          <h1 className="font-display text-2xl font-light sm:text-3xl">Trang giới thiệu</h1>
          <p className="mt-2 text-sm text-fg-muted">
            Chọn thư mục ảnh cho từng dịch vụ trong lưới <strong className="font-medium text-fg">Hamita chụp gì?</strong>.
            Khách bấm vào một mục sẽ thấy các thư mục trước, bấm thư mục mới xem ảnh bên trong.
          </p>
        </div>
        <a href="/#dich-vu" target="_blank" rel="noreferrer" className="btn">
          Xem trang giới thiệu ↗
        </a>
      </div>

      <QuanLyGioiThieu
        albums={galleries.map((g) => ({
          id: g.id,
          ten: g.clientName ?? g.title,
          bia: g.coverFileId,
          soThuMuc: g.albumCount,
          ngayTao: g.createdAt,
        }))}
        daChon={daChon}
        nhomDs={nhomDs}
        nhomBanDau={typeof nhomBanDau === "string" ? nhomBanDau : undefined}
      />
    </main>
  );
}
