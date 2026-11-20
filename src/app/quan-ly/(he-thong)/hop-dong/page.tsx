import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, laQuanTri, lapHopDong, xemHopDong } from "@/lib/phienNhanVien";
import { boDau } from "@/lib/dichVuChung";
import { BUOC_CHO_KHACH, ngayVN, tachTrangThai } from "@/lib/hopDongChung";
import { BangDongBo } from "./BangDongBo";
import { NutLapHopDong } from "./NutLapHopDong";
import { ChipTrangThai } from "./ChipTrangThai";
import { ChonLoc } from "./ChonLoc";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; tt?: string; loai?: string; no?: string; so?: string }> };

/*
  CỘT CỦA BẢNG HỢP ĐỒNG.

  KHÁCH ĐỨNG ĐẦU, không phải ngày đặt — anh chốt 18/11/2026. Người ta tìm một
  hợp đồng bằng TÊN KHÁCH; ngày đặt chỉ là thứ tra sau khi đã thấy đúng nhà.
  Để ngày ở cột đầu thì mắt lướt danh sách gặp một cột số trước khi gặp thứ
  mình cần. `chinh` cũng vì vậy: trên điện thoại tên khách là tiêu đề thẻ.

  "Sắp chụp" đứng cạnh "Ngày đặt" vì hai cột ngày đi cùng nhau thì mắt so
  được ngay.
*/
const COT: CotBang[] = [
  { ten: "Khách", chinh: true, lop: "min-w-48" },
  { ten: "Ngày đặt" },
  { ten: "Sắp chụp" },
  { ten: "Loại" },
  { ten: "Trạng thái" },
  { ten: "Tổng tiền", phai: true },
  { ten: "Còn lại", phai: true },
];

const MOI_LUOT = 100;

/**
 * Danh sách hợp đồng — bản chép từ AppSheet (giai đoạn song song, xem
 * src/lib/dongBoAppSheet.ts). Ai đăng nhập cũng xem được hết, kể cả tiền:
 * studio chốt 15/09 cho nhân viên xem như sale, chỉ không sửa.
 */
export default async function HopDongPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  // Hợp đồng dính tiền và công nợ cả tiệm: chỉ quản lý và sale (anh chốt 21/09/2026).
  batBuocQuyen(xemHopDong(nguoi));
  const duocLap = lapHopDong(nguoi);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tt = sp.tt ?? "";
  const loai = sp.loai ?? "";
  const no = sp.no === "1";
  const so = Math.max(MOI_LUOT, Math.floor(Number(sp.so)) || MOI_LUOT);

  const where: Prisma.HopDongWhereInput = { matBenAppSheet: null };
  if (loai) where.loaiDV = loai;
  if (tt === "cho-khach") where.buoc = { in: BUOC_CHO_KHACH };
  else if (/^\d{1,2}$/.test(tt)) where.buoc = Number(tt);
  if (no) where.conLai = { gt: 0 };

  const prisma = getPrisma();
  const [ds, demTrangThai, demLoai, tongNo, lichSapToi] = await Promise.all([
    prisma.hopDong.findMany({
      where,
      select: {
        id: true,
        maHD: true,
        tenKhach: true,
        loaiDV: true,
        ngayDat: true,
        tongTien: true,
        conLai: true,
        trangThai: true,
        khachHang: { select: { ten: true, soDienThoai: true } },
      },
      orderBy: [{ ngayDat: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
    }),
    prisma.hopDong.groupBy({ by: ["trangThai"], where: { matBenAppSheet: null }, _count: { _all: true } }),
    prisma.hopDong.groupBy({ by: ["loaiDV"], where: { matBenAppSheet: null }, _count: { _all: true } }),
    prisma.hopDong.aggregate({
      where: { matBenAppSheet: null, conLai: { gt: 0 } },
      _sum: { conLai: true },
      _count: { _all: true },
    }),
    /*
      BUỔI CHỤP SẮP TỚI của từng hợp đồng — anh yêu cầu 18/11/2026.

      MỘT truy vấn gộp cho cả bảng, không phải đọc lịch kèm từng hợp đồng:
      danh sách này lấy cả 2.400 hợp đồng một lượt, kèm lịch vào là 2.400 lần
      đọc thêm. Đo 18/11: chỉ 46 hợp đồng có lịch từ hôm nay trở đi (68 buổi
      trên tổng 1.454), nên bảng tra này nhỏ xíu.

      Chỉ lấy buổi TỪ HÔM NAY TRỞ ĐI. Buổi đã qua không giúp gì cho việc
      chuẩn bị, mà hiện ra thì cột này đầy ngày cũ của 2.400 hợp đồng xong
      từ lâu.
    */
    prisma.lichChup.groupBy({
      by: ["hopDongId"],
      where: { matBenAppSheet: null, ngay: { gte: homNayStudio() } },
      _min: { ngay: true },
    }),
  ]);

  // Tìm bằng máy chủ web chứ không bằng database: database không tìm được "khong dau".
  const tim = boDau(q);
  const soQ = q.replace(/\D/g, "");
  const loc = !q
    ? ds
    : ds.filter(
        (h) =>
          boDau(`${h.maHD} ${h.tenKhach} ${h.khachHang?.ten ?? ""}`).includes(tim) ||
          (soQ.length >= 3 && (h.khachHang?.soDienThoai ?? "").includes(soQ)),
      );
  const hien = loc.slice(0, so);
  const conLaiLoc = loc.reduce((s, h) => s + Math.max(0, h.conLai), 0);

  const dsTrangThai = demTrangThai
    .filter((d) => d.trangThai)
    .map((d) => ({ ...tachTrangThai(d.trangThai), goc: d.trangThai!, so: d._count._all }))
    .sort((a, b) => (a.buoc ?? 99) - (b.buoc ?? 99));
  const soChoKhach = dsTrangThai.filter((d) => d.buoc !== null && BUOC_CHO_KHACH.includes(d.buoc)).reduce((s, d) => s + d.so, 0);
  const dsLoai = demLoai.filter((d) => d.loaiDV).sort((a, b) => b._count._all - a._count._all);

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ q, tt, loai, no: no ? "1" : "", ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/hop-dong?${p}`;
  };
  /*
    Hợp đồng nào sắp chụp, và còn mấy ngày nữa.

    Đếm ngày bằng cách trừ hai mốc UTC của chuỗi "YYYY-MM-DD", KHÔNG dùng
    `new Date()` trực tiếp: giờ studio lệch UTC bảy tiếng, nên trừ theo giờ
    máy sẽ ra lệch một ngày với mọi buổi chụp buổi sáng (nguyên tắc 35).
  */
  const sapChup = new Map(
    lichSapToi.filter((x) => x.hopDongId && x._min.ngay).map((x) => [x.hopDongId!, x._min.ngay!]),
  );
  const nay = homNayStudio();
  const conMayNgay = (ngay: string): number =>
    Math.round((Date.parse(`${ngay}T00:00:00Z`) - Date.parse(`${nay}T00:00:00Z`)) / 86_400_000);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <p className="eyebrow">Hợp đồng</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-light">
          Hợp đồng <span className="text-fg-faint tabular-nums">{loc.length}</span>
        </h1>
        {/*
          Nút lập hợp đồng chỉ hiện với người được lập (quản lý + sale, anh chốt
          21/09/2026). Giấu nút CHỈ để đỡ bấm nhầm — chặn thật nằm ở
          `batBuocQuyen(lapHopDong(...))` trong chính trang /hop-dong/moi và
          trong server action (nguyên tắc 3).
        */}
        {duocLap && <NutLapHopDong />}
      </div>
      <BangDongBo quanTri={laQuanTri(nguoi)} />

      <form action="/quan-ly/hop-dong" className="mt-5 flex flex-wrap items-center gap-2">
        {no && <input type="hidden" name="no" value="1" />}
        <input
          id="tim-hop-dong"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={q}
          placeholder="Tìm tên khách, số điện thoại, mã HĐ…"
          className="input w-64"
        />
        {/* Nút gửi form, dành cho ô gõ chữ — hai ô chọn bên dưới tự gửi khi đổi. */}
        <button type="submit" className="btn">Tìm</button>
        <ChonLoc
          ten="tt"
          nhan="Trạng thái"
          giaTri={tt}
          muc={[
            { giaTri: "", chu: "Mọi trạng thái" },
            { giaTri: "cho-khach", chu: `Đang chờ khách chọn / duyệt (${soChoKhach})` },
            ...dsTrangThai
              .filter((d) => d.buoc !== null)
              .map((d) => ({ giaTri: String(d.buoc), chu: `${d.buoc}. ${d.ten} (${d.so})` })),
          ]}
        />
        <ChonLoc
          ten="loai"
          nhan="Loại"
          giaTri={loai}
          muc={[
            { giaTri: "", chu: "Mọi loại" },
            ...dsLoai.map((d) => ({ giaTri: d.loaiDV!, chu: `${d.loaiDV} (${d._count._all})` })),
          ]}
        />
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={link({ no: no ? "" : "1" })} className={lopChip(no)}>
          Còn nợ · {tongNo._count._all} hợp đồng · {tien(tongNo._sum.conLai ?? 0)}đ
        </Link>
        {(q || tt || loai || no) && (
          <Link href="/quan-ly/hop-dong" className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent">
            Bỏ lọc
          </Link>
        )}
      </div>

      <Bang
        lop="mt-4"
        cot={COT}
        trong={
          /* Trạng thái rỗng phải có LỐI RA, đừng để người mới kẹt (mục P2-3). */
          <>
            Không có hợp đồng nào khớp bộ lọc.{" "}
            {(q || tt || loai || no) && (
              <Link href="/quan-ly/hop-dong" className="text-accent underline underline-offset-2">
                Bỏ lọc
              </Link>
            )}
          </>
        }
      >
        {hien.map((h) => (
          <Hang key={h.id} lop="align-top transition hover:bg-bg-soft">
            <O cot={COT[0]}>
              <Link href={`/quan-ly/hop-dong/${h.id}`} className="font-medium hover:text-accent">
                {h.tenKhach || h.khachHang?.ten || h.maHD}
              </Link>
              {h.khachHang?.soDienThoai && (
                <span className="block text-xs text-fg-faint tabular-nums">{h.khachHang.soDienThoai}</span>
              )}
            </O>
            <O cot={COT[1]} lop="whitespace-nowrap text-fg-muted tabular-nums">
              {ngayVN(h.ngayDat)}
            </O>
            <O cot={COT[2]} lop="whitespace-nowrap">
              {(() => {
                const ngay = sapChup.get(h.id);
                if (!ngay) return <span className="text-fg-faint">—</span>;
                const con = conMayNgay(ngay);
                /* Trong tuần tới thì tô vàng: đó là việc cần lo ngay. */
                const gan = con <= 7;
                return (
                  <span className={gan ? "text-amber-800" : "text-fg-muted"}>
                    <span className="tabular-nums">{ngayVN(ngay)}</span>
                    {/*
                      "còn 3 ngày" xuống dòng riêng trong bảng, nhưng trên thẻ
                      điện thoại thì nằm ngay sau ngày — `inline md:block`.
                      Để `block` cả hai nơi thì ô trên thẻ cao gấp đôi mà chỉ
                      chứa hai chữ.
                    */}
                    <span className="ml-1.5 text-xs md:ml-0 md:block">
                      {con === 0 ? "hôm nay" : con === 1 ? "ngày mai" : `còn ${con} ngày`}
                    </span>
                  </span>
                );
              })()}
            </O>
            <O cot={COT[3]} lop="whitespace-nowrap text-fg-muted">
              {h.loaiDV}
            </O>
            <O cot={COT[4]}>
              <ChipTrangThai trangThai={h.trangThai} />
            </O>
            <O cot={COT[5]} lop="whitespace-nowrap tabular-nums">
              {tien(h.tongTien)}đ
            </O>
            {/* Số ÂM là studio THU DƯ — nói rõ, đừng để nó chìm vào màu xám. */}
            <O
              cot={COT[6]}
              lop={`whitespace-nowrap tabular-nums ${
                h.conLai > 0 ? "font-medium text-amber-800" : h.conLai < 0 ? "text-accent" : "text-fg-faint"
              }`}
            >
              {h.conLai > 0 ? `${tien(h.conLai)}đ` : h.conLai < 0 ? `dư ${tien(-h.conLai)}đ` : "—"}
            </O>
          </Hang>
        ))}
      </Bang>

      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-fg-muted">
        {loc.length > hien.length ? (
          <p>
            Đang hiện <span className="tabular-nums">{hien.length}/{loc.length}</span>.{" "}
            <Link href={link({ so: String(so + MOI_LUOT) })} className="text-accent underline underline-offset-2">
              Xem thêm
            </Link>
          </p>
        ) : (
          <span />
        )}
        {loc.length > 0 && conLaiLoc > 0 && (
          <p>
            Còn phải thu của {loc.length === ds.length && !q ? "các hợp đồng này" : "kết quả lọc"}:{" "}
            <span className="font-medium text-fg tabular-nums">{tien(conLaiLoc)}đ</span>
          </p>
        )}
      </div>
    </div>
  );
}
