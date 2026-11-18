import Link from "next/link";
import { batBuocDangNhap } from "@/lib/phienNhanVien";
import { loaiDuocSua, type LoaiDichVu } from "@/lib/dichVuChung";
import { nhomTheoLoai } from "@/lib/dichVuMayChu";
import { FormDichVu } from "../FormDichVu";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ loai?: string }> };

export default async function ThemDichVuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const dsLoai = loaiDuocSua(nguoi);
  const { loai: l = "" } = await searchParams;

  if (dsLoai.length === 0) {
    return (
      <div className="max-w-3xl">
        <Link href="/quan-ly/dich-vu" className="eyebrow transition hover:text-accent">← Dịch vụ &amp; trang phục</Link>
        <p className="mt-6 text-sm text-fg-muted">
          Tài khoản này chỉ xem được bảng dịch vụ. Cần thêm mục mới thì nhờ quản lý hoặc sale giúp.
        </p>
      </div>
    );
  }

  const loai = (dsLoai as string[]).includes(l) ? (l as LoaiDichVu) : dsLoai[0];

  return (
    <div className="max-w-3xl">
      <Link href={`/quan-ly/dich-vu?loai=${loai}`} className="eyebrow transition hover:text-accent">
        ← Dịch vụ &amp; trang phục
      </Link>
      <h1 className="mt-3 font-display text-3xl font-light">Thêm mục mới</h1>
      <div className="mt-6 rounded-md border border-line bg-bg-raised p-4 sm:p-5">
        <FormDichVu
          che="them"
          banDau={{ maDV: "", loai, ten: "", nhom: "", maAlbum: "", chiTiet: "", donGia: "", donVi: "", dangDung: true }}
          dsLoai={dsLoai}
          nhomGoiY={await nhomTheoLoai()}
        />
      </div>
    </div>
  );
}
