import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { TEN_LOAI, laLoaiDichVu, loaiDuocSua } from "@/lib/dichVuChung";
import { nhomTheoLoai } from "@/lib/dichVuMayChu";
import { NutSuaDichVu } from "../FormDichVu";
import { BangGiaHangMuc } from "../BangGiaHangMuc";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Một mục trong bảng dịch vụ & trang phục: đủ chi tiết, nút sửa cho người
 * được sửa, và — CHỈ QUẢN LÝ — chi phí từng hạng mục (tiền công thợ).
 */
export default async function ChiTietDichVuPage({ params }: Props) {
  const nguoi = await batBuocDangNhap();
  const { id } = await params;
  const prisma = getPrisma();

  const dv = await prisma.dichVu.findUnique({ where: { id } });
  if (!dv) notFound();

  const quanTri = laQuanTri(nguoi);
  const dsLoai = loaiDuocSua(nguoi);
  const suaDuoc = (dsLoai as string[]).includes(dv.loai);
  const [chiPhi, dsBuoi, nhomGoiY] = await Promise.all([
    quanTri
      ? prisma.giaHangMuc.findMany({
          where: { dichVuId: id },
          /*
            Xep theo BUOI truoc, roi moi den ten — tu 20/11/2026 bang nay chia
            theo buoi, nen thu tu trong database cung phai theo buoi thi khoi
            phai xep lai o may khach.
          */
          orderBy: [{ buoiThu: "asc" }, { hangMuc: "asc" }, { taoLuc: "asc" }],
          select: { id: true, hangMuc: true, donGia: true, buoiThu: true },
        })
      : Promise.resolve([]),
    quanTri
      ? prisma.dichVuBuoi.findMany({
          where: { dichVuId: id },
          orderBy: { thuTu: "asc" },
          select: { thuTu: true, loaiBuoi: { select: { ten: true } } },
        })
      : Promise.resolve([]),
    suaDuoc ? nhomTheoLoai() : Promise.resolve({}),
  ]);
  const tenLoai = laLoaiDichVu(dv.loai) ? TEN_LOAI[dv.loai] : dv.loai;

  return (
    <div className="max-w-3xl">
      <Link href={`/quan-ly/dich-vu?loai=${dv.loai}`} className="eyebrow transition hover:text-accent">
        ← {tenLoai}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-light text-balance">{dv.ten}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
        <span className="tabular-nums">{dv.maDV}</span>
        {dv.nhom && (
          <>
            <span aria-hidden>·</span>
            <span>{dv.nhom}</span>
          </>
        )}
        {!dv.dangDung && (
          <span className="rounded border border-line-strong px-1.5 py-0.5 text-[11px]">Ngưng dùng</span>
        )}
      </p>

      <p className="mt-5 font-display text-3xl tabular-nums">
        {tien(dv.donGia)}đ
        {dv.donVi && <span className="text-base text-fg-muted"> / {dv.donVi}</span>}
      </p>

      {dv.chiTiet && (
        <div className="mt-6 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm leading-relaxed whitespace-pre-line">
          {dv.chiTiet}
        </div>
      )}

      {/*
        Bang nay vua la bang gia (tien cong tho) vua la danh sach dau viec tu
        sinh — tu 20/11/2026 sua duoc ngay tai day, xem BangGiaHangMuc.tsx.
        CHI QUAN TRI: no la luong nguoi lam.
      */}
      {quanTri && (
        <BangGiaHangMuc
          dichVuId={dv.id}
          banDau={chiPhi.map((c) => ({
            id: c.id,
            hangMuc: c.hangMuc ?? "",
            donGia: c.donGia,
            buoiThu: c.buoiThu,
          }))}
          dsBuoi={dsBuoi.map((b) => ({ thuTu: b.thuTu, ten: b.loaiBuoi.ten }))}
        />
      )}

      {suaDuoc && (
        <section className="mt-10">
          <NutSuaDichVu
            id={dv.id}
            banDau={{
              maDV: dv.maDV,
              loai: laLoaiDichVu(dv.loai) ? dv.loai : "dich-vu",
              ten: dv.ten,
              nhom: dv.nhom ?? "",
              chiTiet: dv.chiTiet ?? "",
              donGia: tien(dv.donGia),
              donVi: dv.donVi ?? "",
              dangDung: dv.dangDung,
            }}
            dsLoai={dsLoai}
            nhomGoiY={nhomGoiY}
          />
        </section>
      )}
    </div>
  );
}
