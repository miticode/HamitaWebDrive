import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { databaseIsConfigured } from "@/lib/db";
import { listGalleries } from "@/lib/store";
import { docThuMucGioiThieu } from "@/lib/anhGioiThieu";
import { NutDoiTong } from "../NutDoiTong";
import { QuanLyAnhCuoi } from "./QuanLyAnhCuoi";

export const dynamic = "force-dynamic";

/**
 * Quản lý nội dung trang giới thiệu (anh yêu cầu 17/09/2026).
 *
 * Hiện có nhóm Ảnh cưới với năm mục nhỏ. Mỗi mục là danh sách THƯ MỤC CON của
 * các album, chọn theo mã đầu tên album. Trang này không gọi Drive lúc mở
 * (nguyên tắc 9) — tên thư mục và tấm bìa đã lưu sẵn lúc chọn; chỉ khi bấm vào
 * một album trong ô chọn mới đọc Drive để liệt kê thư mục.
 */
export default async function GioiThieuPage() {
  if (!(await quyenAlbum())) redirect("/quan-ly/dang-nhap?tiep=%2Fadmin%2Fgioi-thieu");
  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  if (!databaseIsConfigured()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="notice bg-amber-100 text-amber-900">Phần này cần database.</p>
      </main>
    );
  }

  const [galleries, daChon] = await Promise.all([listGalleries(), docThuMucGioiThieu()]);

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
            Chọn thư mục ảnh đưa lên trang <strong className="font-medium text-fg">Ảnh cưới</strong>.
            Khách bấm vào một mục sẽ thấy các thư mục trước, bấm thư mục mới xem ảnh bên trong.
          </p>
        </div>
        <a href="/anh-cuoi" target="_blank" rel="noreferrer" className="btn">
          Xem trang Ảnh cưới ↗
        </a>
      </div>

      <QuanLyAnhCuoi
        albums={galleries.map((g) => ({
          id: g.id,
          ten: g.clientName ?? g.title,
          bia: g.coverFileId,
          soThuMuc: g.albumCount,
          ngayTao: g.createdAt,
        }))}
        daChon={daChon}
      />
    </main>
  );
}
