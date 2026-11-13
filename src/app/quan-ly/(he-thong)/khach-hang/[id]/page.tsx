import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong, xemTienVaKhach } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { ChipTrangThai } from "../../hop-dong/ChipTrangThai";
import { NutSuaKhach } from "../FormKhach";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/** Một khách: thông tin liên hệ và mọi hợp đồng của họ. */
export default async function ChiTietKhachPage({ params }: Props) {
  const nguoi = await batBuocDangNhap();
  // Tiền và số điện thoại của khách: chỉ quản lý (anh chốt 21/09/2026).
  batBuocQuyen(xemTienVaKhach(nguoi));
  const { id } = await params;
  const [kh, bangTen] = await Promise.all([
    getPrisma().khachHang.findUnique({
      where: { id },
      include: {
        hopDong: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayDat: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
          select: { id: true, maHD: true, loaiDV: true, ngayDat: true, tongTien: true, conLai: true, trangThai: true },
        },
      },
    }),
    tenTheoMaNV(),
  ]);
  if (!kh) notFound();

  const tong = kh.hopDong.reduce((s, h) => s + h.tongTien, 0);
  const no = kh.hopDong.reduce((s, h) => s + Math.max(0, h.conLai), 0);

  return (
    <div className="max-w-4xl">
      <Link href="/quan-ly/khach-hang" className="eyebrow transition hover:text-accent">← Khách hàng</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="mt-3 font-display text-3xl font-light text-balance">{kh.ten}</h1>
        {lapHopDong(nguoi) && (
          <div className="mt-3">
            <NutSuaKhach
              khach={{
                id: kh.id,
                ten: kh.ten,
                soDienThoai: kh.soDienThoai,
                tinh: kh.tinh,
                ghiChu: kh.ghiChu,
              }}
              chepTuAppSheet={!!kh.bamAppSheet}
            />
          </div>
        )}
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
        {kh.soDienThoai && (
          <a href={`tel:${kh.soDienThoai}`} className="tabular-nums hover:text-accent">{kh.soDienThoai}</a>
        )}
        {kh.tinh && (
          <>
            <span aria-hidden>·</span>
            <span>{kh.tinh}</span>
          </>
        )}
        {kh.nguoiTaoMaNV && (
          <>
            <span aria-hidden>·</span>
            <span>{tenNV(bangTen, kh.nguoiTaoMaNV)} tạo</span>
          </>
        )}
      </p>
      {kh.ghiChu && (
        <p className="mt-4 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm whitespace-pre-line">{kh.ghiChu}</p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-bg-raised p-4">
          <p className="text-xs text-fg-muted">Hợp đồng</p>
          <p className="mt-1 font-display text-3xl tabular-nums">{kh.hopDong.length}</p>
        </div>
        <div className="rounded-md border border-line bg-bg-raised p-4">
          <p className="text-xs text-fg-muted">Tổng các hợp đồng</p>
          <p className="mt-1 font-display text-2xl tabular-nums">{tien(tong)}đ</p>
        </div>
        <div className={`rounded-md border p-4 ${no > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line bg-bg-raised"}`}>
          <p className={`text-xs ${no > 0 ? "" : "text-fg-muted"}`}>Còn nợ</p>
          <p className="mt-1 font-display text-2xl tabular-nums">{tien(no)}đ</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Ngày đặt</th>
              <th className="px-4 py-2.5 font-medium">Loại</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 text-right font-medium">Tổng tiền</th>
              <th className="px-4 py-2.5 text-right font-medium">Còn lại</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {kh.hopDong.map((h) => (
              <tr key={h.id} className="transition hover:bg-bg-soft">
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  <Link href={`/quan-ly/hop-dong/${h.id}`} className="font-medium hover:text-accent">
                    {ngayVN(h.ngayDat) || h.maHD}
                  </Link>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">{h.loaiDV}</td>
                <td className="px-4 py-2.5"><ChipTrangThai trangThai={h.trangThai} /></td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(h.tongTien)}đ</td>
                <td className={`px-4 py-2.5 text-right whitespace-nowrap tabular-nums ${h.conLai > 0 ? "font-medium text-amber-800" : "text-fg-faint"}`}>
                  {h.conLai !== 0 ? `${tien(h.conLai)}đ` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {kh.hopDong.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-muted">Khách này chưa có hợp đồng.</p>}
      </div>
    </div>
  );
}
