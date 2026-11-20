import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong, laQuanTri, xemTienVaKhach } from "@/lib/phienNhanVien";
import { boDau } from "@/lib/dichVuChung";
import { ngayVN } from "@/lib/hopDongChung";
import { BangDongBo } from "../hop-dong/BangDongBo";
import { NutThemKhach } from "./FormKhach";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

const COT = {
  ten: { ten: "Tên", chinh: true },
  dienThoai: { ten: "Điện thoại" },
  tinh: { ten: "Tỉnh" },
  soHD: { ten: "Hợp đồng", phai: true },
  ganNhat: { ten: "Gần nhất" },
  tong: { ten: "Tổng các HĐ", phai: true },
  no: { ten: "Còn nợ", phai: true },
} satisfies Record<string, CotBang>;

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

      <Bang
        lop="mt-5"
        cot={Object.values(COT)}
        trong={
          q || loc ? (
            <>
              Không có khách nào khớp.{" "}
              <Link href="/quan-ly/khach-hang" className="text-accent underline underline-offset-2">
                Bỏ lọc
              </Link>
            </>
          ) : (
            "Chưa có khách nào. Bấm “Thêm khách” để ghi nhà đầu tiên."
          )
        }
      >
        {hien.map((k) => (
          <Hang key={k.id} lop="transition hover:bg-bg-soft">
            <O cot={COT.ten}>
              <Link href={`/quan-ly/khach-hang/${k.id}`} className="font-medium hover:text-accent">
                {k.ten}
              </Link>
            </O>
            <O cot={COT.dienThoai} lop="whitespace-nowrap tabular-nums">
              {k.soDienThoai ? (
                <a href={`tel:${k.soDienThoai}`} className="hover:text-accent">
                  {k.soDienThoai}
                </a>
              ) : (
                "—"
              )}
            </O>
            <O cot={COT.tinh} lop="whitespace-nowrap text-fg-muted">
              {k.tinh ?? "—"}
            </O>
            <O cot={COT.soHD} lop="tabular-nums">
              {k.soHD}
            </O>
            <O cot={COT.ganNhat} lop="whitespace-nowrap text-fg-muted tabular-nums">
              {ngayVN(k.ganNhat) || "—"}
            </O>
            <O cot={COT.tong} lop="whitespace-nowrap tabular-nums">
              {k.soHD ? `${tien(k.tong)}đ` : "—"}
            </O>
            <O
              cot={COT.no}
              lop={`whitespace-nowrap tabular-nums ${k.no > 0 ? "font-medium text-amber-800" : "text-fg-faint"}`}
            >
              {k.no > 0 ? `${tien(k.no)}đ` : "—"}
            </O>
          </Hang>
        ))}
      </Bang>

      {ds.length > hien.length && (
        <p className="mt-3 text-sm text-fg-muted">
          Đang hiện <span className="tabular-nums">{hien.length}/{ds.length}</span>.{" "}
          <Link href={link({ so: String(so + MOI_LUOT) })} className="text-accent underline underline-offset-2">Xem thêm</Link>
        </p>
      )}
    </div>
  );
}
