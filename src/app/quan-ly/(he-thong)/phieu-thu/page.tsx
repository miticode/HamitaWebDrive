import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { BangDongBo } from "../hop-dong/BangDongBo";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ thang?: string; ht?: string; tt?: string }> };

/** Tháng hiện tại theo giờ studio, dạng "YYYY-MM". */
function thangNay(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}`;
}

function doiThang(t: string, buoc: number): string {
  const [y, m] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + buoc, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Phiếu thu theo tháng — bản chép từ AppSheet. Tổng tháng CHỈ cộng phiếu đã
 * thu; phiếu chờ duyệt tách riêng, vì tiền đó chưa chắc đã vào két.
 */
export default async function PhieuThuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const sp = await searchParams;
  const choDuyet = sp.tt === "cho-duyet";
  const thang = /^\d{4}-\d{2}$/.test(sp.thang ?? "") ? sp.thang! : thangNay();
  const ht = sp.ht === "Tiền mặt" || sp.ht === "Chuyển khoản" ? sp.ht : "";

  const where: Prisma.PhieuThuWhereInput = {
    matBenAppSheet: null,
    ...(choDuyet ? { trangThai: "Chờ duyệt" } : { ngayThu: { startsWith: thang } }),
    ...(ht ? { hinhThuc: ht } : {}),
  };
  const prisma = getPrisma();
  const [ds, soChoDuyet, bangTen] = await Promise.all([
    prisma.phieuThu.findMany({
      where,
      include: { hopDong: { select: { id: true, tenKhach: true } } },
      orderBy: [{ ngayThu: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
    }),
    prisma.phieuThu.count({ where: { matBenAppSheet: null, trangThai: "Chờ duyệt" } }),
    tenTheoMaNV(),
  ]);

  const daThu = ds.filter((p) => p.trangThai !== "Chờ duyệt");
  const cong = (loc: (p: (typeof ds)[number]) => boolean) => daThu.filter(loc).reduce((s, p) => s + p.soTien, 0);
  const tong = cong(() => true);
  const tienMat = cong((p) => p.hinhThuc === "Tiền mặt");
  const chuyenKhoan = cong((p) => p.hinhThuc === "Chuyển khoản");

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ thang, ht, tt: choDuyet ? "cho-duyet" : "", ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/phieu-thu?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;
  const [nam, thangSo] = thang.split("-");

  return (
    <div>
      <p className="eyebrow">Kế toán</p>
      <h1 className="mt-2 font-display text-3xl font-light">Phiếu thu</h1>
      <BangDongBo quanTri={laQuanTri(nguoi)} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!choDuyet && (
          <span className="mr-2 inline-flex items-center gap-1">
            <Link href={link({ thang: doiThang(thang, -1) })} className="btn px-3" aria-label="Tháng trước">‹</Link>
            <span className="min-w-32 text-center font-medium tabular-nums">Tháng {thangSo}/{nam}</span>
            <Link href={link({ thang: doiThang(thang, 1) })} className="btn px-3" aria-label="Tháng sau">›</Link>
          </span>
        )}
        <Link href={link({ ht: "" })} className={lopChip(!ht)}>Mọi hình thức</Link>
        <Link href={link({ ht: "Tiền mặt" })} className={lopChip(ht === "Tiền mặt")}>Tiền mặt</Link>
        <Link href={link({ ht: "Chuyển khoản" })} className={lopChip(ht === "Chuyển khoản")}>Chuyển khoản</Link>
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Link href={link({ tt: choDuyet ? "" : "cho-duyet" })} className={lopChip(choDuyet)}>
          Chờ duyệt · {soChoDuyet}
        </Link>
      </div>

      {!choDuyet && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-bg-raised p-4">
            <p className="text-xs text-fg-muted">Đã thu trong tháng</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{tien(tong)}đ</p>
            <p className="mt-1 text-xs text-fg-faint">{daThu.length} phiếu</p>
          </div>
          <div className="rounded-md border border-line bg-bg-raised p-4">
            <p className="text-xs text-fg-muted">Tiền mặt</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{tien(tienMat)}đ</p>
          </div>
          <div className="rounded-md border border-line bg-bg-raised p-4">
            <p className="text-xs text-fg-muted">Chuyển khoản</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{tien(chuyenKhoan)}đ</p>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Ngày</th>
              <th className="px-4 py-2.5 font-medium">Khách</th>
              <th className="px-4 py-2.5 font-medium">Nội dung</th>
              <th className="px-4 py-2.5 font-medium">Hình thức</th>
              <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 font-medium">Người thu · duyệt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((p) => (
              <tr key={p.id} className="align-top transition hover:bg-bg-soft">
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(p.ngayThu)}</td>
                <td className="min-w-40 px-4 py-2.5">
                  {p.hopDong ? (
                    <Link href={`/quan-ly/hop-dong/${p.hopDong.id}`} className="font-medium hover:text-accent">
                      {p.hopDong.tenKhach || "(không tên)"}
                    </Link>
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {p.noiDung ?? "—"}
                  {p.ghiChu && <span className="block text-xs text-fg-muted">{p.ghiChu}</span>}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                  {p.hinhThuc ?? "—"}
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
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            {choDuyet ? "Không có phiếu nào chờ duyệt." : "Tháng này chưa có phiếu thu nào."}
          </p>
        )}
      </div>
    </div>
  );
}
