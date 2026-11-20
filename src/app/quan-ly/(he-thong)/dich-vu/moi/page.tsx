import Link from "next/link";
import { notFound } from "next/navigation";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { loaiDuocSua, type LoaiDichVu } from "@/lib/dichVuChung";
import { nhomTheoLoai } from "@/lib/dichVuMayChu";
import { FormDichVu } from "../FormDichVu";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ loai?: string }> };

export default async function ThemDichVuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  /*
    Chỉ quản lý — cùng lý do với trang bảng (xem dich-vu/page.tsx). Trả
    `notFound` chứ không hiện câu "tài khoản này chỉ xem được": từ 20/11 nhân
    viên không còn thấy mục này ở đâu cả, nên đến được đây nghĩa là gõ thẳng
    đường dẫn, và câu trả lời đúng là trang không tồn tại.
  */
  if (!laQuanTri(nguoi)) notFound();
  const dsLoai = loaiDuocSua(nguoi);
  const { loai: l = "" } = await searchParams;

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
          banDau={{ maDV: "", loai, ten: "", nhom: "", chiTiet: "", donGia: "", donVi: "", dangDung: true }}
          dsLoai={dsLoai}
          nhomGoiY={await nhomTheoLoai()}
        />
      </div>
    </div>
  );
}
