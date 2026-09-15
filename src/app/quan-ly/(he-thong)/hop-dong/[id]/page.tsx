import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap } from "@/lib/phienNhanVien";
import { TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { ChipTrangThai } from "../ChipTrangThai";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const NGAY = new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, day: "2-digit", month: "2-digit", year: "numeric" });

/** Một hợp đồng: khách, tiền, từng dòng dịch vụ, từng phiếu thu. Chỉ xem — xem BangDongBo. */
export default async function ChiTietHopDongPage({ params }: Props) {
  await batBuocDangNhap();
  const { id } = await params;
  const prisma = getPrisma();

  const [hd, bangTen] = await Promise.all([
    prisma.hopDong.findUnique({
      where: { id },
      include: {
        khachHang: true,
        chiTiet: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayChup: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
        phieuThu: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayThu: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
      },
    }),
    tenTheoMaNV(),
  ]);
  if (!hd) notFound();

  const choDuyet = hd.phieuThu.filter((p) => p.trangThai === "Chờ duyệt");

  return (
    <div className="max-w-5xl">
      <Link href="/quan-ly/hop-dong" className="eyebrow transition hover:text-accent">← Hợp đồng</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-light text-balance">{hd.tenKhach || hd.khachHang?.ten || hd.maHD}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            {hd.loaiDV && <span>{hd.loaiDV}</span>}
            {hd.ngayDat && (
              <>
                <span aria-hidden>·</span>
                <span>đặt {ngayVN(hd.ngayDat)}</span>
              </>
            )}
            {hd.nguoiLapMaNV && (
              <>
                <span aria-hidden>·</span>
                <span>{tenNV(bangTen, hd.nguoiLapMaNV)} lập</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs break-all text-fg-faint">{hd.maHD}</p>
        </div>
        <ChipTrangThai trangThai={hd.trangThai} />
      </div>

      {hd.matBenAppSheet && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hợp đồng này không còn bên AppSheet (thấy mất lúc {NGAY.format(hd.matBenAppSheet)}). Web vẫn giữ lại để tra.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-line bg-bg-raised p-4">
          <h2 className="eyebrow">Khách</h2>
          <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Tên</dt>
            <dd>
              {hd.khachHang ? (
                <Link href={`/quan-ly/khach-hang/${hd.khachHang.id}`} className="hover:text-accent">
                  {hd.khachHang.ten}
                </Link>
              ) : (
                hd.tenKhach
              )}
            </dd>
            <dt className="text-fg-muted">Điện thoại</dt>
            <dd className="tabular-nums">
              {hd.khachHang?.soDienThoai ? (
                <a href={`tel:${hd.khachHang.soDienThoai}`} className="hover:text-accent">{hd.khachHang.soDienThoai}</a>
              ) : (
                "—"
              )}
            </dd>
            {hd.khachHang?.tinh && (
              <>
                <dt className="text-fg-muted">Tỉnh</dt>
                <dd>{hd.khachHang.tinh}</dd>
              </>
            )}
            {hd.diaChi && (
              <>
                <dt className="text-fg-muted">Địa chỉ</dt>
                <dd>{hd.diaChi}</dd>
              </>
            )}
          </dl>
        </section>

        <section className="rounded-md border border-line bg-bg-raised p-4">
          <h2 className="eyebrow">Tiền</h2>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-sm tabular-nums">
            <dt className="text-fg-muted">Thành tiền</dt>
            <dd className="text-right">{tien(hd.thanhTien)}đ</dd>
            {hd.khuyenMai !== 0 && (
              <>
                <dt className="text-fg-muted">Khuyến mãi</dt>
                <dd className="text-right">−{tien(hd.khuyenMai)}đ</dd>
              </>
            )}
            <dt className="font-medium">Tổng</dt>
            <dd className="text-right font-medium">{tien(hd.tongTien)}đ</dd>
            <dt className="text-fg-muted">Đã thu</dt>
            <dd className="text-right">{tien(hd.daThu)}đ</dd>
            <dt className={hd.conLai > 0 ? "font-medium text-amber-800" : "text-fg-muted"}>Còn lại</dt>
            <dd className={`text-right ${hd.conLai > 0 ? "font-medium text-amber-800" : ""}`}>{tien(hd.conLai)}đ</dd>
          </dl>
          {choDuyet.length > 0 && (
            <p className="mt-3 text-xs text-amber-800">
              Đã thu có tính {choDuyet.length} phiếu đang chờ duyệt — AppSheet cộng cả phiếu chờ duyệt.
            </p>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="eyebrow">Dịch vụ, trang phục ({hd.chiTiet.length})</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Ngày chụp</th>
                <th className="px-4 py-2.5 font-medium">Mục</th>
                <th className="px-4 py-2.5 text-right font-medium">SL</th>
                <th className="px-4 py-2.5 text-right font-medium">Đơn giá</th>
                <th className="px-4 py-2.5 text-right font-medium">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hd.chiTiet.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(c.ngayChup) || "—"}</td>
                  <td className="min-w-64 px-4 py-2.5">
                    <span className="text-xs text-fg-faint">
                      {c.loai && laLoaiDichVu(c.loai) ? TEN_LOAI[c.loai] : ""}
                      {c.maDV ? ` · ${c.maDV}` : ""}
                    </span>
                    <span className="block font-medium">
                      {c.dichVuId ? (
                        <Link href={`/quan-ly/dich-vu/${c.dichVuId}`} className="hover:text-accent">
                          {c.tenDV ?? c.maDV}
                        </Link>
                      ) : (
                        (c.tenDV ?? c.maDV ?? "—")
                      )}
                    </span>
                    {c.chiTiet && c.chiTiet !== c.tenDV && (
                      <span className="mt-0.5 block text-xs leading-relaxed whitespace-pre-line text-fg-muted">{c.chiTiet}</span>
                    )}
                    {c.ghiChu && (
                      <span className="mt-1 block rounded-sm bg-amber-50 px-1.5 py-1 text-xs text-amber-900">{c.ghiChu}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.soLuong}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(c.donGia)}đ</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(c.thanhTien)}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hd.chiTiet.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-muted">Chưa có dòng nào.</p>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="eyebrow">Phiếu thu ({hd.phieuThu.length})</h2>
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Ngày</th>
                <th className="px-4 py-2.5 font-medium">Nội dung</th>
                <th className="px-4 py-2.5 font-medium">Hình thức</th>
                <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Người thu · duyệt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hd.phieuThu.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(p.ngayThu)}</td>
                  <td className="px-4 py-2.5">
                    {p.noiDung ?? "—"}
                    {p.ghiChu && <span className="block text-xs text-fg-muted">{p.ghiChu}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {p.hinhThuc}
                    {p.taiKhoan && <span className="block text-xs text-fg-faint">{p.taiKhoan}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(p.soTien)}đ</td>
                  <td className={`px-4 py-2.5 whitespace-nowrap ${p.trangThai === "Chờ duyệt" ? "font-medium text-amber-800" : "text-fg-muted"}`}>
                    {p.trangThai}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {tenNV(bangTen, p.nguoiTaoMaNV) ?? "—"}
                    {p.nguoiDuyetMaNV && <span className="block text-xs text-fg-faint">duyệt: {tenNV(bangTen, p.nguoiDuyetMaNV)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hd.phieuThu.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-muted">Chưa có phiếu thu nào.</p>}
        </div>
      </section>

      {hd.ghiChu && (
        <section className="mt-8">
          <h2 className="eyebrow">Ghi chú</h2>
          <p className="mt-2 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm leading-relaxed whitespace-pre-line">{hd.ghiChu}</p>
        </section>
      )}
    </div>
  );
}
