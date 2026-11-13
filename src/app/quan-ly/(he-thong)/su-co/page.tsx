import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { SU_CO_DA_XONG, SU_CO_DANG_TAO } from "@/lib/suCoChung";
import { NutDongSuCo, NutGhiSuCo, NutMoLaiSuCo } from "./FormSuCo";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ loc?: string }> };

/** Giờ Việt Nam, "dd/mm hh:mm". Null thì chuỗi rỗng. */
function lucVN(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * SỔ SỰ CỐ — bảng "Log" bên AppSheet. Thêm 13/11/2026 (đợt 6).
 *
 * CẢ TIỆM xem và ghi; chỉ quản lý đóng. Lọc mặc định là "chưa xong" — đó là
 * thứ duy nhất đòi ai làm gì (nguyên tắc 29).
 *
 * 22 dòng chép từ AppSheet không có thời điểm nào: ba cột thời gian bên đó
 * rỗng hết. Nên cột "Lúc" của dòng chép để trống chứ KHÔNG hiện `taoLuc` —
 * `taoLuc` của chúng là lúc web chép về, không phải lúc sự cố xảy ra, và hiện
 * ra là nói sai.
 */
/*
  "Chưa xong" phải NHẬN CẢ dòng trạng thái trống. 8/21 dòng chép từ AppSheet
  không có trạng thái (bên đó chỉ 13/22 dòng có), và trong Postgres
  `NULL != 'Đã xong'` không phải đúng — viết `NOT: { trangThai: "Đã xong" }`
  là 8 dòng đó rơi khỏi CẢ HAI bộ lọc, đo được: 11 + 2 ≠ 21.
*/
const CHUA_XONG: Prisma.SuCoWhereInput = {
  OR: [{ trangThai: null }, { trangThai: { not: SU_CO_DA_XONG } }],
};

export default async function SuCoPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;
  const loc = sp.loc === "tat-ca" || sp.loc === "da-xong" ? sp.loc : "chua-xong";

  const where: Prisma.SuCoWhereInput = {
    matBenAppSheet: null,
    ...(loc === "chua-xong" ? CHUA_XONG : loc === "da-xong" ? { trangThai: SU_CO_DA_XONG } : {}),
  };

  const prisma = getPrisma();
  const [ds, soChuaXong, bangTen] = await Promise.all([
    prisma.suCo.findMany({
      where,
      orderBy: [{ xongLuc: { sort: "desc", nulls: "first" } }, { taoLuc: "desc" }],
      take: 300,
    }),
    prisma.suCo.count({ where: { matBenAppSheet: null, ...CHUA_XONG } }),
    tenTheoMaNV(),
  ]);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Hệ thống</p>
          <h1 className="mt-2 font-display text-3xl font-light">
            Sổ sự cố <span className="text-fg-faint tabular-nums">{ds.length}</span>
          </h1>
        </div>
        <NutGhiSuCo />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href="/quan-ly/su-co" className={lopChip(loc === "chua-xong")}>
          Chưa xong · {soChuaXong}
        </Link>
        <Link href="/quan-ly/su-co?loc=da-xong" className={lopChip(loc === "da-xong")}>
          Đã xong
        </Link>
        <Link href="/quan-ly/su-co?loc=tat-ca" className={lopChip(loc === "tat-ca")}>
          Tất cả
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Lúc</th>
              <th className="px-4 py-2.5 font-medium">Sự cố</th>
              <th className="px-4 py-2.5 font-medium">Chi tiết</th>
              <th className="px-4 py-2.5 font-medium">Đã xử lý</th>
              <th className="px-4 py-2.5 font-medium">Người ghi</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              {quanTri && <th className="px-4 py-2.5 text-right font-medium">Việc</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((s) => {
              const xong = s.trangThai === SU_CO_DA_XONG;
              /* Dòng chép từ AppSheet không mang thời điểm thật — để trống hơn là nói sai. */
              const chep = !!s.bamAppSheet;
              return (
                <tr key={s.id} className="align-top transition hover:bg-bg-soft">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">
                    {chep ? <span className="text-fg-faint">từ AppSheet</span> : lucVN(s.taoLuc)}
                    {s.xongLuc && (
                      <span className="block text-xs text-fg-faint">xong {lucVN(s.xongLuc)}</span>
                    )}
                  </td>
                  <td className="min-w-40 px-4 py-2.5 font-medium">{s.vanDe ?? "—"}</td>
                  <td className="min-w-48 px-4 py-2.5 text-fg-muted">{s.thongTin ?? "—"}</td>
                  <td className="min-w-40 px-4 py-2.5 text-fg-muted">{s.xuLy ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {tenNV(bangTen, s.nguoiGhiMaNV) ?? "—"}
                  </td>
                  <td
                    className={`px-4 py-2.5 whitespace-nowrap ${
                      xong ? "text-fg-muted" : "font-medium text-amber-800"
                    }`}
                  >
                    {s.trangThai ?? SU_CO_DANG_TAO}
                  </td>
                  {quanTri && (
                    <td className="px-4 py-2.5 text-right">
                      {xong ? <NutMoLaiSuCo id={s.id} /> : <NutDongSuCo id={s.id} />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            {loc === "chua-xong" ? "Không có sự cố nào đang treo." : "Chưa có sự cố nào."}
          </p>
        )}
      </div>

      {/*
        Nói thẳng chất lượng của 22 dòng cũ. Người đọc bảng này cần biết vì sao
        gần nửa dòng trống trơn — đó là dữ liệu bên AppSheet vốn như vậy, không
        phải web làm mất.
      */}
      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Ai cũng ghi được; chỉ <span className="text-fg-muted">quản lý</span> đóng. 22 dòng chép từ
        AppSheet không mang thời điểm nào — bên đó ba cột thời gian để trống hết, nên cột “Lúc” của
        chúng ghi <span className="text-fg-muted">từ AppSheet</span>. Dòng ghi trên web thì có đủ
        giờ ghi, giờ xong và người ghi.
      </p>
    </div>
  );
}
