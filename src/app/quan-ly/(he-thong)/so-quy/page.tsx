import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong, laQuanTri, xemTienVaKhach } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { chiTheoKhoan, docSoQuy } from "@/lib/soQuy";
import { CHO_DUYET, HINH_THUC_CHI } from "@/lib/soQuyChung";
import { Chip } from "../Chip";
import { BangDongBo } from "../hop-dong/BangDongBo";
import { NutChi, NutGhiChi } from "./GhiChi";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/* Khai theo TÊN vì cột "Việc" chỉ quản lý thấy — xem phieu-thu/page.tsx. */
const COT = {
  ngay: { ten: "Ngày" },
  khoan: { ten: "Khoản chi", chinh: true, lop: "min-w-40" },
  dienGiai: { ten: "Diễn giải" },
  hinhThuc: { ten: "Hình thức" },
  soTien: { ten: "Số tiền", phai: true },
  trangThai: { ten: "Trạng thái" },
  nguoi: { ten: "Người ghi · duyệt" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ thang?: string; ht?: string; tt?: string }> };

/** Tháng hiện tại theo giờ studio, dạng "YYYY-MM" (nguyên tắc 35). */
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
 * SỔ QUỸ — thu trừ chi. Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 3).
 *
 * Trước đó web có trang Phiếu thu mà không có sổ chi, nên không bao giờ ra
 * được số dư — muốn biết két còn bao nhiêu vẫn phải mở AppSheet. Đó là một lý
 * do khiến đợt chuyển hồi tháng 9 không ai dùng web.
 *
 * Khoản CHỜ DUYỆT vẫn được cộng vào tổng rồi tách ra một con số riêng, giống
 * hệt cách trang Phiếu thu đang làm: để ngoài tổng thì số dư trông đẹp hơn
 * thực tế, mà tiền đã hẹn chi thì coi như đã ra.
 */
export default async function SoQuyPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  // Toàn bộ dòng tiền của tiệm — cùng mức quyền với trang Phiếu thu.
  batBuocQuyen(xemTienVaKhach(nguoi));
  const quanTri = laQuanTri(nguoi);
  const duocGhi = lapHopDong(nguoi);

  const sp = await searchParams;
  const choDuyet = sp.tt === "cho-duyet";
  const thang = /^\d{4}-\d{2}$/.test(sp.thang ?? "") ? sp.thang! : thangNay();
  const ht = (HINH_THUC_CHI as readonly string[]).includes(sp.ht ?? "") ? sp.ht! : "";

  const where: Prisma.ChiTieuWhereInput = {
    matBenAppSheet: null,
    ...(choDuyet ? { trangThai: CHO_DUYET } : { ngayChi: { startsWith: thang } }),
    ...(ht ? { hinhThuc: ht } : {}),
  };

  const prisma = getPrisma();
  const [ds, soChoDuyet, bangTen, tongKet, theoKhoan, taiKhoanNhom] = await Promise.all([
    prisma.chiTieu.findMany({
      where,
      orderBy: [{ ngayChi: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
      take: 500,
    }),
    prisma.chiTieu.count({ where: { matBenAppSheet: null, trangThai: CHO_DUYET } }),
    tenTheoMaNV(),
    docSoQuy(`${thang}-01`, `${thang}-31`),
    chiTheoKhoan(`${thang}-01`, `${thang}-31`, 8),
    /* Tài khoản đã từng dùng — để gợi ý trong ô nhập, khỏi gõ sai số. */
    prisma.chiTieu.groupBy({ by: ["taiKhoan"], _count: { _all: true } }),
  ]);

  /*
    Gộp các cách viết chỉ khác nhau chữ hoa chữ thường, giữ lại cách viết được
    dùng NHIỀU NHẤT.

    Đo trên dữ liệu thật 13/11/2026: cột này có 8 giá trị, trong đó
    "tech" / "Tech" / "Hami Tech" / "Hami tech" là bốn cách viết của cùng một
    tài khoản. Gợi ý mà đưa cả bốn thì chính nó làm sổ lộn xộn thêm — đúng cái
    nó sinh ra để ngăn.

    Chỉ gộp ở Ô GỢI Ý thôi, KHÔNG sửa dữ liệu đã ghi: dọn chữ hoa chữ thường
    trong bảng là việc của đợt 7, làm bây giờ là lúc đối chiếu hai bên không
    khớp nữa (xem chú thích ở model ChiTieu).
  */
  const theoChuThuong = new Map<string, { ten: string; lan: number }>();
  for (const t of taiKhoanNhom) {
    if (!t.taiKhoan) continue;
    const khoa = t.taiKhoan.toLowerCase().replace(/\s+/g, " ").trim();
    const da = theoChuThuong.get(khoa);
    if (!da) theoChuThuong.set(khoa, { ten: t.taiKhoan, lan: t._count._all });
    else {
      if (t._count._all > da.lan) da.ten = t.taiKhoan;
      da.lan += t._count._all;
    }
  }
  const taiKhoanCu = [...theoChuThuong.values()]
    .sort((a, b) => b.lan - a.lan)
    .map((t) => t.ten)
    .slice(0, 12);

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ thang, ht, tt: choDuyet ? "cho-duyet" : "", ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/so-quy?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;
  const [nam, thangSo] = thang.split("-");
  const duong = tongKet.soDu >= 0;
  const chiNhieuNhat = theoKhoan[0]?.soTien ?? 1;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Kế toán</p>
          <h1 className="mt-2 font-display text-3xl font-light">Sổ quỹ</h1>
        </div>
        {duocGhi && <NutGhiChi taiKhoanCu={taiKhoanCu} homNay={homNayStudio()} />}
      </div>
      <BangDongBo quanTri={quanTri} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!choDuyet && (
          <span className="mr-2 inline-flex items-center gap-1">
            <Link href={link({ thang: doiThang(thang, -1) })} className="btn px-3" aria-label="Tháng trước">‹</Link>
            <span className="min-w-32 text-center font-medium tabular-nums">Tháng {thangSo}/{nam}</span>
            <Link href={link({ thang: doiThang(thang, 1) })} className="btn px-3" aria-label="Tháng sau">›</Link>
          </span>
        )}
        <Link href={link({ ht: "" })} className={lopChip(!ht)}>Mọi hình thức</Link>
        {HINH_THUC_CHI.map((h) => (
          <Link key={h} href={link({ ht: h })} className={lopChip(ht === h)}>{h}</Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Link href={link({ tt: choDuyet ? "" : "cho-duyet" })} className={lopChip(choDuyet)}>
          Chờ duyệt · {soChoDuyet}
        </Link>
      </div>

      {!choDuyet && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-bg-raised p-4">
              <p className="text-xs text-fg-muted">Thu trong tháng</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-emerald-700">{tien(tongKet.thu)}đ</p>
              <p className="mt-1 text-xs text-fg-faint">{tongKet.soPhieuThu} phiếu</p>
            </div>
            <div className="rounded-md border border-line bg-bg-raised p-4">
              <p className="text-xs text-fg-muted">Chi trong tháng</p>
              <p className="mt-1 font-display text-2xl tabular-nums text-amber-800">{tien(tongKet.chi)}đ</p>
              <p className="mt-1 text-xs text-fg-faint">{tongKet.soKhoanChi} khoản</p>
            </div>
            {/* Số dư là câu hỏi duy nhất ai cũng muốn biết — cho nó cái khung đậm nhất. */}
            <div className={`rounded-md border-2 p-4 ${duong ? "border-emerald-600/40 bg-emerald-50/40" : "border-amber-600/40 bg-amber-50/40"}`}>
              <p className="text-xs text-fg-muted">Còn lại trong tháng</p>
              <p className={`mt-1 font-display text-2xl tabular-nums ${duong ? "text-emerald-800" : "text-amber-900"}`}>
                {duong ? "" : "−"}{tien(Math.abs(tongKet.soDu))}đ
              </p>
              {(tongKet.thuChoDuyet > 0 || tongKet.chiChoDuyet > 0) && (
                <p className="mt-1 text-xs text-fg-faint">
                  đã tính cả{" "}
                  {tongKet.thuChoDuyet > 0 && <>thu chờ duyệt {tien(tongKet.thuChoDuyet)}đ</>}
                  {tongKet.thuChoDuyet > 0 && tongKet.chiChoDuyet > 0 && " · "}
                  {tongKet.chiChoDuyet > 0 && <>chi chờ duyệt {tien(tongKet.chiChoDuyet)}đ</>}
                </p>
              )}
            </div>
          </div>

          {theoKhoan.length > 0 && (
            <div className="mt-5 rounded-md border border-line bg-bg-raised p-4">
              <p className="text-xs text-fg-muted">Tiền đi đâu nhiều nhất tháng này</p>
              <div className="mt-3 grid gap-2">
                {theoKhoan.map((k) => (
                  <div key={k.khoanChi} className="flex items-center gap-3">
                    <span className="w-44 shrink-0 truncate text-sm" title={k.khoanChi}>{k.khoanChi}</span>
                    {/*
                      Vạch dài ngắn theo tỉ lệ với khoản lớn nhất. Không dùng
                      biểu đồ thư viện: một hàng div là đủ nói, mà không phải
                      kéo thêm mã nào xuống máy khách.
                    */}
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-bg-soft">
                      <span
                        className="block h-full rounded-full bg-accent/60"
                        style={{ width: `${Math.max(2, (k.soTien / chiNhieuNhat) * 100)}%` }}
                      />
                    </span>
                    <span className="w-32 shrink-0 text-right text-sm tabular-nums">{tien(k.soTien)}đ</span>
                    <span className="w-14 shrink-0 text-right text-xs text-fg-faint tabular-nums">{k.soDong} lần</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Bang
        lop="mt-5"
        cot={[
          COT.ngay,
          COT.khoan,
          COT.dienGiai,
          COT.hinhThuc,
          COT.soTien,
          COT.trangThai,
          COT.nguoi,
          ...(quanTri ? [COT.viec] : []),
        ]}
        trong={choDuyet ? "Không có khoản nào chờ duyệt." : "Tháng này chưa có khoản chi nào."}
      >
        {ds.map((c) => (
          <Hang key={c.id} lop="align-top transition hover:bg-bg-soft">
            <O cot={COT.ngay} lop="whitespace-nowrap text-fg-muted tabular-nums">
              {ngayVN(c.ngayChi)}
            </O>
            <O cot={COT.khoan} lop="font-medium">
              {c.khoanChi ?? <span className="font-normal text-fg-faint">(không ghi)</span>}
              {c.nguoiNhan && (
                <span className="block text-xs font-normal text-fg-muted">nhận: {c.nguoiNhan}</span>
              )}
            </O>
            <O cot={COT.dienGiai}>
              {c.dienGiai ?? "—"}
              {c.ghiChu && <span className="block text-xs text-fg-muted">{c.ghiChu}</span>}
              {c.anhKho && (
                <a
                  href={`/api/quan-ly/chung-tu/${c.anhKho}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 block text-xs text-accent hover:underline"
                >
                  Xem chứng từ
                </a>
              )}
            </O>
            <O cot={COT.hinhThuc} lop="whitespace-nowrap text-fg-muted">
              {c.hinhThuc ?? "—"}
              {c.taiKhoan && <span className="block text-xs text-fg-faint">{c.taiKhoan}</span>}
            </O>
            <O cot={COT.soTien} lop="whitespace-nowrap tabular-nums">
              {tien(c.soTien)}đ
            </O>
            <O cot={COT.trangThai} lop="whitespace-nowrap">
              <Chip chu={c.trangThai} kieu={c.trangThai === CHO_DUYET ? "cho" : "xong"} />
            </O>
            <O cot={COT.nguoi} lop="whitespace-nowrap text-fg-muted">
              {tenNV(bangTen, c.nguoiTaoMaNV) ?? "—"}
              {c.nguoiDuyetMaNV && (
                <span className="block text-xs text-fg-faint">duyệt: {tenNV(bangTen, c.nguoiDuyetMaNV)}</span>
              )}
            </O>
            {quanTri && (
              <O cot={COT.viec}>
                <NutChi id={c.id} choDuyet={c.trangThai === CHO_DUYET} tuAppSheet={!!c.bamAppSheet} />
              </O>
            )}
          </Hang>
        ))}
      </Bang>
    </div>
  );
}
