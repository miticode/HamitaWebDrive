import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong, laQuanTri, xemTienVaKhach } from "@/lib/phienNhanVien";
import { boDau } from "@/lib/dichVuChung";
import { ngayVN } from "@/lib/hopDongChung";
import { BangDongBo } from "../hop-dong/BangDongBo";
import { NutThemKhach } from "./FormKhach";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; loc?: string; so?: string }> };

const MOI_LUOT = 100;

/**
 * Danh sách khách — bản chép từ AppSheet. Xếp theo hợp đồng gần nhất: khách
 * vừa đặt tuần này là người sale hay cần tra nhất.
 */
export default async function KhachHangPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  // Tiền và số điện thoại của hàng trăm nhà khách: chỉ quản lý (anh chốt 21/09/2026).
  batBuocQuyen(xemTienVaKhach(nguoi));
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const loc = sp.loc === "no" || sp.loc === "chua-hd" ? sp.loc : "";
  const so = Math.max(MOI_LUOT, Math.floor(Number(sp.so)) || MOI_LUOT);

  const tatCa = await getPrisma().khachHang.findMany({
    where: { matBenAppSheet: null },
    select: {
      id: true,
      ten: true,
      soDienThoai: true,
      tinh: true,
      taoLuc: true,
      hopDong: { where: { matBenAppSheet: null }, select: { tongTien: true, conLai: true, ngayDat: true } },
    },
  });

  const dong = tatCa
    .map((k) => {
      const ganNhat = k.hopDong.reduce<string | null>((m, h) => (h.ngayDat && (!m || h.ngayDat > m) ? h.ngayDat : m), null);
      return {
        ...k,
        soHD: k.hopDong.length,
        tong: k.hopDong.reduce((s, h) => s + h.tongTien, 0),
        no: k.hopDong.reduce((s, h) => s + Math.max(0, h.conLai), 0),
        ganNhat,
        // Khách chưa có hợp đồng xếp theo ngày tạo, cùng thang "YYYY-MM-DD".
        khoaXep: ganNhat ?? k.taoLuc.toISOString().slice(0, 10),
      };
    })
    .sort((a, b) => b.khoaXep.localeCompare(a.khoaXep));

  const tim = boDau(q);
  const soQ = q.replace(/\D/g, "");
  const ds = dong.filter(
    (k) =>
      (loc !== "no" || k.no > 0) &&
      (loc !== "chua-hd" || k.soHD === 0) &&
      (!q || boDau(k.ten).includes(tim) || (soQ.length >= 3 && (k.soDienThoai ?? "").includes(soQ))),
  );
  const hien = ds.slice(0, so);

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ q, loc, ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/khach-hang?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Tư vấn – Chăm sóc khách hàng</p>
          <h1 className="mt-2 font-display text-3xl font-light">
            Khách hàng <span className="text-fg-faint tabular-nums">{ds.length}</span>
          </h1>
        </div>
        {lapHopDong(nguoi) && <NutThemKhach />}
      </div>
      <BangDongBo quanTri={laQuanTri(nguoi)} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/*
          Nút Tìm nhìn thấy được — đợt soát UX, mục P1-1. Trước đây form này chỉ
          có đúng một ô nhập và không nút nào: gõ xong không có gì xảy ra, người
          quen máy tính bấm Enter, người quen điện thoại ngồi chờ.
        */}
        <form action="/quan-ly/khach-hang" className="flex gap-2">
          {loc && <input type="hidden" name="loc" value={loc} />}
          <input
            id="tim-khach"
            name="q"
            type="search"
            autoComplete="off"
            defaultValue={q}
            placeholder="Tìm tên hoặc số điện thoại…"
            className="input w-56"
          />
          <button type="submit" className="btn">Tìm</button>
          {q && (
            <Link href={link({ q: "" })} className="btn" aria-label="Bỏ tìm">
              Bỏ
            </Link>
          )}
        </form>
        <Link href={link({ loc: "" })} className={lopChip(!loc)}>Tất cả</Link>
        <Link href={link({ loc: "no" })} className={lopChip(loc === "no")}>Còn nợ</Link>
        <Link href={link({ loc: "chua-hd" })} className={lopChip(loc === "chua-hd")}>Chưa có hợp đồng</Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Tên</th>
              <th className="px-4 py-2.5 font-medium">Điện thoại</th>
              <th className="px-4 py-2.5 font-medium">Tỉnh</th>
              <th className="px-4 py-2.5 text-right font-medium">Hợp đồng</th>
              <th className="px-4 py-2.5 font-medium">Gần nhất</th>
              <th className="px-4 py-2.5 text-right font-medium">Tổng các HĐ</th>
              <th className="px-4 py-2.5 text-right font-medium">Còn nợ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {hien.map((k) => (
              <tr key={k.id} className="transition hover:bg-bg-soft">
                <td className="px-4 py-2.5">
                  <Link href={`/quan-ly/khach-hang/${k.id}`} className="font-medium hover:text-accent">{k.ten}</Link>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {k.soDienThoai ? <a href={`tel:${k.soDienThoai}`} className="hover:text-accent">{k.soDienThoai}</a> : "—"}
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">{k.tinh ?? "—"}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{k.soHD}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(k.ganNhat) || "—"}</td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{k.soHD ? `${tien(k.tong)}đ` : "—"}</td>
                <td className={`px-4 py-2.5 text-right whitespace-nowrap tabular-nums ${k.no > 0 ? "font-medium text-amber-800" : "text-fg-faint"}`}>
                  {k.no > 0 ? `${tien(k.no)}đ` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">
            {q || loc ? (
              <>
                Không có khách nào khớp.{" "}
                <Link href="/quan-ly/khach-hang" className="text-accent underline underline-offset-2">
                  Bỏ lọc
                </Link>
              </>
            ) : (
              "Chưa có khách nào. Bấm “Thêm khách” để ghi nhà đầu tiên."
            )}
          </p>
        )}
      </div>

      {ds.length > hien.length && (
        <p className="mt-3 text-sm text-fg-muted">
          Đang hiện <span className="tabular-nums">{hien.length}/{ds.length}</span>.{" "}
          <Link href={link({ so: String(so + MOI_LUOT) })} className="text-accent underline underline-offset-2">Xem thêm</Link>
        </p>
      )}
    </div>
  );
}
