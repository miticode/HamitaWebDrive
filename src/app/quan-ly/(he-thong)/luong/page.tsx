import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { maKy } from "@/lib/luong";
import { NutChotKy, NutTinhLuong, SuaTien } from "./NutLuong";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/*
  Hai cột đầu và cuối chỉ quản lý thấy — người thường chỉ xem phiếu lương của
  chính mình nên không cần cột tên, và cũng không sửa tay được. Khai theo tên
  để bỏ cột không làm trượt nhãn.

  Bảng mười cột, gần như toàn số: đây là bảng khổ nhất trên điện thoại trước
  khi có thẻ.
*/
const COT = {
  nhanVien: { ten: "Nhân viên", chinh: true },
  ngayCong: { ten: "Ngày công", phai: true },
  luongThang: { ten: "Lương tháng", phai: true },
  sanPham: { ten: "Sản phẩm", phai: true },
  thuong: { ten: "Thưởng", phai: true },
  phat: { ten: "Phạt", phai: true },
  tong: { ten: "Tổng", phai: true },
  tamUng: { ten: "Tạm ứng", phai: true },
  thucLanh: { ten: "Thực lãnh", phai: true },
  conLai: { ten: "Còn lại", phai: true },
  suaTay: { ten: "Sửa tay", phai: true, rong: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ ky?: string }> };

function kyNay(): { nam: number; thang: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return { nam: Number(p.year), thang: Number(p.month) };
}

function doiKy(nam: number, thang: number, buoc: number) {
  const d = new Date(Date.UTC(nam, thang - 1 + buoc, 1));
  return { nam: d.getUTCFullYear(), thang: d.getUTCMonth() + 1 };
}

/**
 * LƯƠNG — thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 5).
 *
 * QUYỀN: quản lý xem cả tiệm; người khác CHỈ xem phiếu lương của chính mình.
 * Chặn bằng câu truy vấn chứ không bằng việc giấu bảng — nguyên tắc 3.
 *
 * Công thức và nguồn từng con số nằm ở `src/lib/luong.ts`, đo ngược từ 341
 * dòng thật bên AppSheet chứ không đoán.
 */
export default async function LuongPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;

  const m = /^(\d{4})-(\d{2})$/.exec(sp.ky ?? "");
  const { nam, thang } = m ? { nam: Number(m[1]), thang: Number(m[2]) } : kyNay();
  const ky = maKy(nam, thang);

  const prisma = getPrisma();
  const [kyLuong, dong, bangTen] = await Promise.all([
    prisma.kyLuong.findFirst({ where: { maAppSheet: ky } }),
    prisma.luongNhanVien.findMany({
      where: {
        kyLuong: ky,
        matBenAppSheet: null,
        /* Người thường chỉ thấy dòng của chính mình. */
        /* Xem chú thích cùng lỗi ở `don-tu/page.tsx`: byte NUL làm Postgres nổ. */
        ...(quanTri
          ? {}
          : nguoi.maNV
            ? { maNV: { equals: nguoi.maNV, mode: "insensitive" as const } }
            : { id: "khong-bao-gio-khop" }),
      },
      orderBy: { tongLuong: "desc" },
    }),
    tenTheoMaNV(),
  ]);

  const daChot = !!kyLuong?.daChot;
  const truoc = doiKy(nam, thang, -1);
  const sau = doiKy(nam, thang, 1);
  const lk = (k: { nam: number; thang: number }) =>
    `/quan-ly/luong?ky=${k.nam}-${String(k.thang).padStart(2, "0")}`;

  const tong = (f: (d: (typeof dong)[number]) => number) => dong.reduce((s, d) => s + f(d), 0);

  return (
    <div>
      <p className="eyebrow">Nhân sự</p>
      <h1 className="mt-2 font-display text-3xl font-light">
        {quanTri ? "Bảng lương" : "Phiếu lương của tôi"}
      </h1>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <Link href={lk(truoc)} className="btn px-3" aria-label="Kỳ trước">‹</Link>
          <span className="min-w-32 text-center font-medium tabular-nums">Tháng {String(thang).padStart(2, "0")}/{nam}</span>
          <Link href={lk(sau)} className="btn px-3" aria-label="Kỳ sau">›</Link>
        </span>
        {daChot && (
          <span className="rounded-full border border-emerald-600/40 bg-emerald-50 px-3 py-1 text-xs text-emerald-800">
            Đã chốt
          </span>
        )}
        {quanTri && (
          <>
            <NutTinhLuong nam={nam} thang={thang} daCo={!!kyLuong} />
            {!!kyLuong && <NutChotKy nam={nam} thang={thang} daChot={daChot} />}
          </>
        )}
      </div>

      {quanTri && dong.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Lương tháng", tong((d) => d.luongThang)],
            ["Lương sản phẩm", tong((d) => d.luongSP)],
            ["Thưởng − phạt", tong((d) => d.thuong - d.phat)],
            ["Tổng phải trả", tong((d) => d.thucLanh)],
          ].map(([ten, v], i) => (
            <div
              key={ten as string}
              className={`rounded-md p-4 ${i === 3 ? "border-2 border-accent/40 bg-accent-soft/40" : "border border-line bg-bg-raised"}`}
            >
              <p className="text-xs text-fg-muted">{ten as string}</p>
              <p className="mt-1 font-display text-xl tabular-nums">{tien(v as number)}đ</p>
            </div>
          ))}
        </div>
      )}

      <Bang
        lop="mt-5"
        cot={[
          ...(quanTri ? [COT.nhanVien] : []),
          COT.ngayCong,
          COT.luongThang,
          COT.sanPham,
          COT.thuong,
          COT.phat,
          COT.tong,
          COT.tamUng,
          COT.thucLanh,
          COT.conLai,
          ...(quanTri ? [COT.suaTay] : []),
        ]}
        trong={
          quanTri
            ? `Kỳ ${ky} chưa có bảng lương. Bấm “Tính kỳ này” để web tính từ chấm công, đầu việc và đánh giá.`
            : `Chưa có phiếu lương tháng ${String(thang).padStart(2, "0")}/${nam} của anh/chị.`
        }
      >
        {dong.map((d) => (
          <Hang key={d.id} lop="align-top transition hover:bg-bg-soft">
            {quanTri && (
              <O cot={COT.nhanVien} lop="whitespace-nowrap">
                {tenNV(bangTen, d.maNV) ?? "—"}
                {d.phongBan && <span className="block text-xs text-fg-faint">{d.phongBan}</span>}
                {/* Thiếu lương cứng thì con số tính ra vô nghĩa — nói ngay tại dòng. */}
                {d.luongCung <= 0 && (
                  <span className="block text-xs text-amber-800">chưa khai lương cứng</span>
                )}
              </O>
            )}
            <O cot={COT.ngayCong} lop="tabular-nums text-fg-muted">
              {d.soNgayLam}
            </O>
            <O cot={COT.luongThang} lop="tabular-nums">
              {tien(d.luongThang)}
            </O>
            <O cot={COT.sanPham} lop="tabular-nums">
              {d.luongSP ? tien(d.luongSP) : "—"}
            </O>
            <O cot={COT.thuong} lop="tabular-nums text-emerald-700">
              {d.thuong ? tien(d.thuong) : "—"}
            </O>
            <O cot={COT.phat} lop="tabular-nums text-amber-800">
              {d.phat ? tien(d.phat) : "—"}
            </O>
            <O cot={COT.tong} lop="font-medium tabular-nums">
              {tien(d.tongLuong)}
            </O>
            <O cot={COT.tamUng} lop="tabular-nums text-fg-muted">
              {d.tamUng ? tien(d.tamUng) : "—"}
            </O>
            <O cot={COT.thucLanh} lop="font-medium tabular-nums">
              {tien(d.thucLanh)}
            </O>
            <O cot={COT.conLai} lop={`tabular-nums ${d.conLai > 0 ? "text-amber-800" : "text-fg-faint"}`}>
              {d.conLai ? tien(d.conLai) : "—"}
            </O>
            {quanTri && (
              <O cot={COT.suaTay}>
                <SuaTien id={d.id} tamUng={d.tamUng} daThanhToan={d.daThanhToan} khoa={daChot} />
              </O>
            )}
          </Hang>
        ))}
      </Bang>

      {quanTri && (
        <p className="mt-2 text-xs leading-relaxed text-fg-faint">
          Web tính <span className="text-fg-muted">ngày công</span> từ bảng Chấm công,{" "}
          <span className="text-fg-muted">lương sản phẩm</span> từ Tiến độ công việc đã hoàn thành,{" "}
          <span className="text-fg-muted">thưởng/phạt</span> từ bảng Đánh giá. Hai cột{" "}
          <span className="text-fg-muted">tạm ứng</span> và{" "}
          <span className="text-fg-muted">đã thanh toán</span> máy không tính được — phải nhập tay, và
          tính lại kỳ cũng không xoá chúng.
          <br />
          Người chưa khai lương cứng trong mục Nhân viên thì lương tháng ra 0 — khai
          rồi bấm &ldquo;Tính lại kỳ này&rdquo;.
        </p>
      )}
    </div>
  );
}
