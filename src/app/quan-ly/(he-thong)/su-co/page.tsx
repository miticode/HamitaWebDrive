import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { SU_CO_DA_XONG, SU_CO_DANG_TAO } from "@/lib/suCoChung";
import { Chip } from "../Chip";
import { NutDongSuCo, NutGhiSuCo, NutMoLaiSuCo } from "./FormSuCo";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/* Cột "Việc" chỉ quản lý thấy — chỉ họ đóng được sự cố. */
const COT = {
  luc: { ten: "Lúc" },
  suCo: { ten: "Sự cố", chinh: true, lop: "min-w-40" },
  chiTiet: { ten: "Chi tiết", lop: "min-w-48" },
  daXuLy: { ten: "Đã xử lý", lop: "min-w-40" },
  nguoiGhi: { ten: "Người ghi" },
  trangThai: { ten: "Trạng thái" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

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

      <Bang
        lop="mt-5"
        cot={[
          COT.luc,
          COT.suCo,
          COT.chiTiet,
          COT.daXuLy,
          COT.nguoiGhi,
          COT.trangThai,
          ...(quanTri ? [COT.viec] : []),
        ]}
        trong={
          loc === "chua-xong"
            ? "Không có sự cố nào đang treo."
            : "Chưa có sự cố nào. Bấm “Ghi sự cố” khi có gì hỏng."
        }
      >
        {ds.map((s) => {
          const xong = s.trangThai === SU_CO_DA_XONG;
          /* Dòng chép từ AppSheet không mang thời điểm thật — để trống hơn là nói sai. */
          const chep = !!s.bamAppSheet;
          return (
            <Hang key={s.id} lop="align-top transition hover:bg-bg-soft">
              <O cot={COT.luc} lop="whitespace-nowrap text-fg-muted tabular-nums">
                {chep ? <span className="text-fg-faint">từ AppSheet</span> : lucVN(s.taoLuc)}
                {s.xongLuc && <span className="block text-xs text-fg-faint">xong {lucVN(s.xongLuc)}</span>}
              </O>
              <O cot={COT.suCo} lop="font-medium">
                {s.vanDe ?? "—"}
              </O>
              <O cot={COT.chiTiet} lop="text-fg-muted">
                {s.thongTin ?? "—"}
              </O>
              <O cot={COT.daXuLy} lop="text-fg-muted">
                {s.xuLy ?? "—"}
              </O>
              <O cot={COT.nguoiGhi} lop="whitespace-nowrap text-fg-muted">
                {tenNV(bangTen, s.nguoiGhiMaNV) ?? "—"}
              </O>
              <O cot={COT.trangThai} lop="whitespace-nowrap">
                <Chip chu={s.trangThai ?? SU_CO_DANG_TAO} kieu={xong ? "xong" : "cho"} />
              </O>
              {quanTri && (
                <O cot={COT.viec}>{xong ? <NutMoLaiSuCo id={s.id} /> : <NutDongSuCo id={s.id} />}</O>
              )}
            </Hang>
          );
        })}
      </Bang>

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
