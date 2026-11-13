import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri, xemHopDong } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { BangDongBo } from "../hop-dong/BangDongBo";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ thang?: string; loai?: string }> };

/** Tháng hiện tại theo giờ studio, dạng "YYYY-MM". */
function thangNay(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}`;
}

/** Hôm nay theo giờ studio, dạng "YYYY-MM-DD" — để tô đậm ô hôm nay. */
function homNay(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

function doiThang(t: string, buoc: number): string {
  const [y, m] = t.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + buoc, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/**
 * Lịch chụp — trang "Lịch" bên AppSheet, bản chép mỗi giờ (đợt 3).
 *
 * Xem theo THÁNG: studio đặt lịch cưới trước hàng tháng, nên tuần này không
 * nói được gì; mở ra là thấy cả tháng dày hay thưa.
 *
 * Trên điện thoại chỉ hiện danh sách — lưới 7 cột nhét vào màn hình 375px thì
 * mỗi ô còn 40px, đọc không ra chữ nào.
 */
export default async function LichPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  /*
    Lịch thì CẢ TIỆM xem được (anh chốt 21/09/2026), nhưng tên khách chỉ là
    LIÊN KẾT sang hợp đồng với người được xem hợp đồng. Để link cho người khác
    thì bấm vào bị đá về Tổng quan — trông như web hỏng.
  */
  const moHopDong = xemHopDong(nguoi);
  const sp = await searchParams;
  const thang = /^\d{4}-\d{2}$/.test(sp.thang ?? "") ? sp.thang! : thangNay();
  const loai = sp.loai ?? "";

  const where: Prisma.LichChupWhereInput = {
    matBenAppSheet: null,
    ngay: { startsWith: thang },
    ...(loai ? { loai } : {}),
  };
  const prisma = getPrisma();
  const [ds, demLoai] = await Promise.all([
    prisma.lichChup.findMany({
      where,
      select: {
        id: true,
        ngay: true,
        gio: true,
        loai: true,
        trangThai: true,
        ghiChu: true,
        hopDong: { select: { id: true, tenKhach: true, khachHang: { select: { soDienThoai: true } } } },
      },
      orderBy: [{ ngay: "asc" }, { taoLuc: "asc" }],
    }),
    prisma.lichChup.groupBy({
      by: ["loai"],
      where: { matBenAppSheet: null, ngay: { startsWith: thang } },
      _count: { _all: true },
    }),
  ]);

  const [nam, thangSo] = thang.split("-").map(Number);
  const soNgay = new Date(Date.UTC(nam, thangSo, 0)).getUTCDate();
  // Thứ Hai đứng đầu tuần như lịch Việt Nam: Chủ nhật (0) đẩy xuống cuối.
  const troTruoc = (new Date(Date.UTC(nam, thangSo - 1, 1)).getUTCDay() + 6) % 7;
  const theoNgay = new Map<string, typeof ds>();
  for (const l of ds) {
    if (!l.ngay) continue;
    const co = theoNgay.get(l.ngay);
    if (co) co.push(l);
    else theoNgay.set(l.ngay, [l]);
  }

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ thang, loai, ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/lich?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;
  const nay = homNay();

  return (
    <div>
      <p className="eyebrow">Hợp đồng – Công việc</p>
      <h1 className="mt-2 font-display text-3xl font-light">
        Lịch chụp <span className="text-fg-faint tabular-nums">{ds.length}</span>
      </h1>
      <BangDongBo quanTri={laQuanTri(nguoi)} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="mr-2 inline-flex items-center gap-1">
          <Link href={link({ thang: doiThang(thang, -1) })} className="btn px-3" aria-label="Tháng trước">‹</Link>
          <span className="min-w-32 text-center font-medium tabular-nums">
            Tháng {String(thangSo).padStart(2, "0")}/{nam}
          </span>
          <Link href={link({ thang: doiThang(thang, 1) })} className="btn px-3" aria-label="Tháng sau">›</Link>
        </span>
        <Link href={link({ loai: "" })} className={lopChip(!loai)}>Mọi loại</Link>
        {demLoai
          .filter((d) => d.loai)
          .sort((a, b) => b._count._all - a._count._all)
          .map((d) => (
            <Link key={d.loai} href={link({ loai: d.loai! })} className={lopChip(loai === d.loai)}>
              {d.loai} <span className="tabular-nums opacity-70">{d._count._all}</span>
            </Link>
          ))}
      </div>

      {/* Lưới tháng: chỉ máy tính. Xem chú thích đầu tệp. */}
      <div className="mt-5 hidden md:block">
        <div className="grid grid-cols-7 gap-px rounded-md border border-line bg-line text-sm">
          {THU.map((t) => (
            <div key={t} className="bg-bg-soft px-2 py-1.5 text-center text-xs text-fg-muted">{t}</div>
          ))}
          {Array.from({ length: troTruoc }).map((_, i) => (
            <div key={`trong-${i}`} className="min-h-24 bg-bg-raised" />
          ))}
          {Array.from({ length: soNgay }).map((_, i) => {
            const ngay = `${thang}-${String(i + 1).padStart(2, "0")}`;
            const cua = theoNgay.get(ngay) ?? [];
            return (
              <div key={ngay} className={`min-h-24 p-1.5 ${ngay === nay ? "bg-accent-soft" : "bg-bg-raised"}`}>
                <span className={`text-xs tabular-nums ${ngay === nay ? "font-medium text-accent" : "text-fg-faint"}`}>
                  {i + 1}
                </span>
                <ul className="mt-1 space-y-1">
                  {cua.slice(0, 3).map((l) => (
                    <li key={l.id} className="truncate text-[11px] leading-tight">
                      {l.gio && <span className="mr-1 font-medium tabular-nums">{l.gio}</span>}
                      {l.hopDong ? (
                        moHopDong ? (
                          <Link href={`/quan-ly/hop-dong/${l.hopDong.id}`} className="hover:text-accent" title={`${l.loai ?? ""} · ${l.hopDong.tenKhach}`}>
                            <span className="text-fg-muted">{l.loai}</span> {l.hopDong.tenKhach}
                          </Link>
                        ) : (
                          <span title={`${l.loai ?? ""} · ${l.hopDong.tenKhach}`}>
                            <span className="text-fg-muted">{l.loai}</span> {l.hopDong.tenKhach}
                          </span>
                        )
                      ) : (
                        <span className="text-fg-muted">{l.loai}</span>
                      )}
                    </li>
                  ))}
                  {cua.length > 3 && <li className="text-[11px] text-fg-faint">+{cua.length - 3} nữa</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Ngày</th>
              <th className="px-4 py-2.5 font-medium">Giờ</th>
              <th className="px-4 py-2.5 font-medium">Loại</th>
              <th className="px-4 py-2.5 font-medium">Khách</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((l) => (
              <tr key={l.id} className={`align-top transition hover:bg-bg-soft ${l.ngay === nay ? "bg-accent-soft/40" : ""}`}>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(l.ngay)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {l.gio ? <span className="font-medium">{l.gio}</span> : <span className="text-fg-faint">—</span>}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{l.loai ?? "—"}</td>
                <td className="min-w-40 px-4 py-2.5">
                  {l.hopDong ? (
                    moHopDong ? (
                      <Link href={`/quan-ly/hop-dong/${l.hopDong.id}`} className="font-medium hover:text-accent">
                        {l.hopDong.tenKhach}
                      </Link>
                    ) : (
                      <span className="font-medium">{l.hopDong.tenKhach}</span>
                    )
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                  {l.ghiChu && <span className="block text-xs text-fg-muted">{l.ghiChu}</span>}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">{l.trangThai ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {ds.length === 0 && <p className="px-4 py-8 text-center text-sm text-fg-muted">Tháng này chưa có lịch nào.</p>}
      </div>
    </div>
  );
}
