import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { TEN_LOAI, laLoaiDichVu, loaiDuocSua } from "@/lib/dichVuChung";
import { nhomTheoLoai } from "@/lib/dichVuMayChu";
import { NutSuaDichVu } from "../FormDichVu";

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
  const [chiPhi, nhomGoiY] = await Promise.all([
    quanTri
      ? prisma.giaHangMuc.findMany({ where: { dichVuId: id }, orderBy: [{ hangMuc: "asc" }, { taoLuc: "asc" }] })
      : Promise.resolve([]),
    suaDuoc ? nhomTheoLoai() : Promise.resolve({}),
  ]);
  const tongChiPhi = chiPhi.reduce((s, c) => s + c.donGia, 0);
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

      {quanTri && chiPhi.length > 0 && (
        <section className="mt-10">
          <h2 className="eyebrow">Chi phí từng hạng mục</h2>
          <p className="mt-1 text-xs text-fg-faint">
            Tiền trả thợ, xưởng cho mỗi lần làm dịch vụ này, nhập từ AppSheet. Chỉ quản lý thấy. Sẽ dùng để tính
            lương sản phẩm ở đợt Nhân sự.
          </p>
          <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {chiPhi.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2">{c.hangMuc ?? <span className="text-fg-faint">(không ghi hạng mục)</span>}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{tien(c.donGia)}đ</td>
                  </tr>
                ))}
                <tr className="bg-bg-soft font-medium">
                  <td className="px-4 py-2">Cộng</td>
                  <td className="px-4 py-2 text-right tabular-nums">{tien(tongChiPhi)}đ</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
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
              maAlbum: dv.maAlbum ?? "",
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
