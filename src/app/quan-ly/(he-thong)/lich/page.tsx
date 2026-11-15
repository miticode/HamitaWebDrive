import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri, xemHopDong } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { LOP_NHOM, nhomCuaLoai, type BuoiLich } from "@/lib/lichChung";
import { BangDongBo } from "../hop-dong/BangDongBo";
import { LuoiLich } from "./LuoiLich";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ thang?: string; loai?: string; xem?: string }> };

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
 * Lịch chụp — trang "Lịch" bên AppSheet, chép về khi quản lý bấm Đồng bộ.
 *
 * Xem theo THÁNG: studio đặt lịch cưới trước hàng tháng, nên tuần này không
 * nói được gì; mở ra là thấy cả tháng dày hay thưa.
 *
 * Lưới chạy trên MỌI CỠ MÀN HÌNH từ 15/11/2026 (anh bảo làm giống Lark).
 * Trước đó điện thoại chỉ có danh sách, vì lưới 7 cột nhét vào 375px thì mỗi
 * ô còn 40px. Lý do đó vẫn đúng — nhưng Lark giải bằng cách khác: ô nhỏ chỉ
 * để NHÌN ngày nào dày, bấm vào thì danh sách buổi hôm đó hiện ra đọc được.
 * Xem `LuoiLich.tsx`.
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
  /*
    MỘT kiểu xem tại một lúc — đợt soát UX, mục P1-3.

    Trước đây máy tính vẽ lưới cả tháng rồi vẽ tiếp bảng cùng từng ấy buổi:
    hai lần một dữ liệu, phải cuộn qua cả hai. Giờ mặc định là lưới trên mọi
    cỡ màn hình; chọn "Danh sách" thì ra bảng, dùng khi cần soát cả tháng
    theo hàng hoặc tìm một buổi mà không nhớ ngày.
  */
  const xem = sp.xem === "ds" ? "ds" : "luoi";

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

  /*
    Làm phẳng trước khi gửi xuống trình duyệt: `hopDong.khachHang.soDienThoai`
    lồng ba tầng, mà mỗi tầng là một lớp bọc nữa trong gói dữ liệu gửi kèm
    trang. Phẳng ra thì gói nhẹ hơn và lưới không phải biết hình dạng bảng
    trong database.
  */
  const buoi: BuoiLich[] = ds.map((l) => ({
    id: l.id,
    ngay: l.ngay,
    gio: l.gio,
    loai: l.loai,
    trangThai: l.trangThai,
    ghiChu: l.ghiChu,
    hopDongId: l.hopDong?.id ?? null,
    tenKhach: l.hopDong?.tenKhach ?? null,
    soDienThoai: l.hopDong?.khachHang?.soDienThoai ?? null,
  }));

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ thang, loai, xem: xem === "ds" ? "ds" : "", ...thay });
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
      <p className="eyebrow">Hằng ngày</p>
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
        {/* Về tháng này — trước đây lùi năm tháng rồi muốn quay lại phải bấm › năm lần. */}
        {thang !== thangNay() && (
          <Link href={link({ thang: thangNay() })} className="btn px-3">
            Hôm nay
          </Link>
        )}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        {/* Công tắc kiểu xem — từ 15/11/2026 hiện ở mọi cỡ, vì lưới chạy được cả trên điện thoại. */}
        <span className="mr-2 inline-flex items-center gap-1">
          <Link href={link({ xem: "" })} className={lopChip(xem === "luoi")}>Lưới tháng</Link>
          <Link href={link({ xem: "ds" })} className={lopChip(xem === "ds")}>Danh sách</Link>
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

      {xem === "luoi" && <LuoiLich ds={buoi} thang={thang} nay={nay} moHopDong={moHopDong} />}

      <div className={`mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised ${xem === "ds" ? "" : "hidden"}`}>
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
                {/* Chấm màu cùng bảng với lưới — học màu một lần, đọc được cả hai kiểu xem. */}
                <td className={`px-4 py-2.5 whitespace-nowrap ${LOP_NHOM[nhomCuaLoai(l.loai)]}`}>
                  <span className="inline-flex items-center gap-2">
                    <span className="cham-lich" aria-hidden />
                    {l.loai ?? "—"}
                  </span>
                </td>
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
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            Tháng này chưa có lịch nào{loai ? ` thuộc loại “${loai}”` : ""}.{" "}
            {loai && (
              <Link href={link({ loai: "" })} className="text-accent underline underline-offset-2">
                Xem mọi loại
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
