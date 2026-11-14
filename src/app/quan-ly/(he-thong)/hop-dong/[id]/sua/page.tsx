import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { batBuocDangNhap, batBuocQuyen, lapHopDong } from "@/lib/phienNhanVien";
import { docCacBuoc } from "@/lib/buocHopDong";
import { demLuotDung } from "@/lib/dichVuHayDung";
import { FormSuaHopDong } from "./FormSuaHopDong";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Trang sửa hợp đồng. Quyền giống quyền lập (quản lý + sale) và kiểm lại ở
 * server action nữa — giấu trang chỉ đỡ bấm nhầm (nguyên tắc 3).
 */
export default async function SuaHopDongPage({ params }: Props) {
  batBuocQuyen(lapHopDong(await batBuocDangNhap()));
  const { id } = await params;

  const prisma = getPrisma();
  const [hd, dichVu, luotDung, cacBuoc] = await Promise.all([
    prisma.hopDong.findUnique({
      where: { id },
      include: {
        chiTiet: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayChup: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
      },
    }),
    prisma.dichVu.findMany({
      where: { dangDung: true },
      orderBy: [{ loai: "asc" }, { ten: "asc" }],
      select: { id: true, maDV: true, ten: true, loai: true, nhom: true, donGia: true, donVi: true },
    }),
    demLuotDung(),
    docCacBuoc(),
  ]);
  if (!hd) notFound();

  return (
    <div className="max-w-5xl">
      <Link href={`/quan-ly/hop-dong/${id}`} className="eyebrow transition hover:text-accent">
        ← {hd.tenKhach || hd.maHD}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-light">Sửa hợp đồng</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Sửa xong web tự cộng lại tiền của hợp đồng từ các dòng và phiếu thu thật.
      </p>

      <FormSuaHopDong
        id={hd.id}
        maHD={hd.maHD}
        dichVu={dichVu}
        luotDung={luotDung}
        banDau={{
          tenKhach: hd.tenKhach,
          loaiDV: hd.loaiDV ?? "",
          ngayDat: hd.ngayDat ?? "",
          diaChi: hd.diaChi ?? "",
          ghiChu: hd.ghiChu ?? "",
          khuyenMai: hd.khuyenMai,
          trangThai: hd.trangThai ?? "1. Chưa có ngày chụp",
          dong: hd.chiTiet.map((c) => ({
            id: c.id,
            dichVuId: c.dichVuId,
            maDV: c.maDV ?? "",
            tenDV: c.tenDV ?? "",
            loai: c.loai ?? "",
            donGia: c.donGia,
            soLuong: c.soLuong,
            ngayChup: c.ngayChup ?? "",
            chiTiet: c.chiTiet ?? "",
            ghiChu: c.ghiChu ?? "",
          })),
        }}
        cacBuoc={cacBuoc}
        chepTuAppSheet={!!hd.bamAppSheet}
      />
    </div>
  );
}
