import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { DON_DA_DUYET, DON_DANG_TAO, DON_KHONG_DUYET } from "@/lib/donTuChung";
import { NutDuyetDon, NutGuiDon, NutHuyDon } from "./FormDon";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ loc?: string }> };

/**
 * ĐƠN TỪ — nghỉ phép, xin ứng lương. Thêm 13/11/2026 (đợt 5).
 *
 * Ai cũng gửi được và ai cũng xem được đơn CỦA MÌNH; quản lý xem và duyệt cả
 * tiệm. Lọc mặc định của quản lý là "chờ duyệt" — đó là thứ duy nhất cần họ
 * làm gì, còn 445 đơn đã duyệt chỉ để tra lại.
 */
export default async function DonTuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;

  /* Người thường luôn chỉ thấy đơn của mình, bất kể gõ gì trên địa chỉ. */
  const loc = quanTri ? (sp.loc ?? "cho-duyet") : "cua-toi";

  const where: Prisma.DonTuWhereInput = {
    matBenAppSheet: null,
    ...(loc === "cua-toi"
      ? { maNV: { equals: nguoi.maNV ?? "\u0000", mode: "insensitive" } }
      : loc === "cho-duyet"
        ? { trangThai: DON_DANG_TAO }
        : {}),
  };

  const prisma = getPrisma();
  const [ds, soChoDuyet, bangTen] = await Promise.all([
    prisma.donTu.findMany({
      where,
      orderBy: [{ ngayYeuCau: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
      take: 300,
    }),
    prisma.donTu.count({ where: { matBenAppSheet: null, trangThai: DON_DANG_TAO } }),
    tenTheoMaNV(),
  ]);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  const mauTrangThai = (t: string | null) =>
    t === DON_DANG_TAO
      ? "font-medium text-amber-800"
      : t === DON_KHONG_DUYET
        ? "text-red-700"
        : "text-fg-muted";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Nhân sự</p>
          <h1 className="mt-2 font-display text-3xl font-light">Đơn từ</h1>
        </div>
        {nguoi.maNV && <NutGuiDon homNay={homNayStudio()} />}
      </div>

      {!nguoi.maNV && (
        <div className="notice mt-5 bg-accent-soft text-fg">
          Tài khoản này không gắn với một nhân viên cụ thể nên không gửi đơn được.
        </div>
      )}

      {quanTri && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link href="/quan-ly/don-tu?loc=cho-duyet" className={lopChip(loc === "cho-duyet")}>
            Chờ duyệt · {soChoDuyet}
          </Link>
          <Link href="/quan-ly/don-tu?loc=tat-ca" className={lopChip(loc === "tat-ca")}>
            Tất cả
          </Link>
          <Link href="/quan-ly/don-tu?loc=cua-toi" className={lopChip(loc === "cua-toi")}>
            Của tôi
          </Link>
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Ngày</th>
              {loc !== "cua-toi" && <th className="px-4 py-2.5 font-medium">Người gửi</th>}
              <th className="px-4 py-2.5 font-medium">Loại đơn</th>
              <th className="px-4 py-2.5 font-medium">Lý do</th>
              <th className="px-4 py-2.5 font-medium">Trạng thái</th>
              <th className="px-4 py-2.5 font-medium">Người duyệt</th>
              <th className="px-4 py-2.5 text-right font-medium">Việc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((d) => {
              const cuaToi = (d.maNV ?? "").toLowerCase() === (nguoi.maNV ?? "").toLowerCase();
              return (
                <tr key={d.id} className="align-top transition hover:bg-bg-soft">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">
                    {ngayVN(d.ngayYeuCau)}
                  </td>
                  {loc !== "cua-toi" && (
                    <td className="px-4 py-2.5 whitespace-nowrap">{tenNV(bangTen, d.maNV) ?? "—"}</td>
                  )}
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {d.loaiDon ?? "—"}
                    {d.loaiNghi && <span className="block text-xs text-fg-muted">{d.loaiNghi}</span>}
                    {d.soTien != null && d.soTien > 0 && (
                      <span className="block text-xs tabular-nums text-fg-muted">{tien(d.soTien)}đ</span>
                    )}
                  </td>
                  <td className="min-w-48 px-4 py-2.5">
                    {d.lyDo ?? "—"}
                    {d.ghiChu && (
                      <span className="mt-0.5 block text-xs text-fg-muted">Quản lý: {d.ghiChu}</span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 whitespace-nowrap ${mauTrangThai(d.trangThai)}`}>
                    {d.trangThai ?? "—"}
                    {d.ngayDuyet && (
                      <span className="block text-xs text-fg-faint tabular-nums">{ngayVN(d.ngayDuyet)}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {tenNV(bangTen, d.nguoiDuyetMaNV) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {d.trangThai === DON_DANG_TAO && quanTri && !d.bamAppSheet && <NutDuyetDon id={d.id} />}
                    {d.trangThai === DON_DANG_TAO && !quanTri && cuaToi && !d.bamAppSheet && (
                      <div className="text-right">
                        <NutHuyDon id={d.id} />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            {loc === "cho-duyet"
              ? "Không có đơn nào chờ duyệt."
              : loc === "cua-toi"
                ? "Anh/chị chưa gửi đơn nào."
                : "Chưa có đơn nào."}
          </p>
        )}
      </div>

      {/*
        Nói rõ đơn ĐÃ DUYỆT thì người gửi không tự huỷ được — tránh việc họ đi
        tìm nút huỷ rồi tưởng web hỏng. Đơn đã duyệt là căn cứ cho bảng công và
        bảng lương, muốn bỏ thì quản lý chuyển trạng thái để còn dấu vết.
      */}
      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Đơn đã gửi chỉ huỷ được khi còn <span className="text-fg-muted">{DON_DANG_TAO}</span>. Đơn đã
        duyệt là căn cứ cho bảng công và bảng lương — muốn bỏ thì nhờ quản lý
        chuyển sang <span className="text-fg-muted">{DON_KHONG_DUYET}</span>, để còn
        dấu vết ai đổi ý lúc nào. Đơn mang trạng thái{" "}
        <span className="text-fg-muted">{DON_DA_DUYET}</span> từ AppSheet thì xử bên đó.
      </p>
    </div>
  );
}
