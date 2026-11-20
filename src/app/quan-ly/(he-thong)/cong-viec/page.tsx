import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { khoaCuaToi, khoaNguoi, tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { BangDongBo } from "../hop-dong/BangDongBo";
import { NutViec } from "./NutViec";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/*
  THỜI HẠN ĐỨNG ĐẦU, không phải tên việc — giữ nguyên thứ tự cũ.

  Bảng này xếp theo hạn, nên mắt lướt dọc cột đầu để tìm việc gấp. Tên việc
  mới là `chinh`: trên điện thoại nó thành tiêu đề thẻ, vì "Photoshop" nhận
  ra nhanh hơn một ngày tháng.

  Ô "Người làm · trạng thái" là `rong`: nó chứa hai ô chọn, mà một dòng
  "NGƯỜI LÀM · TRẠNG THÁI   [ô chọn][ô chọn]" trên thẻ thì nhãn chiếm mất
  chỗ của chính hai ô ấy.
*/
const COT = {
  thoiHan: { ten: "Thời hạn" },
  viec: { ten: "Việc", chinh: true, lop: "min-w-40" },
  khach: { ten: "Khách", lop: "min-w-40" },
  nguoi: { ten: "Người làm · trạng thái", rong: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ nguoi?: string; tt?: string; so?: string }> };

const MOI_LUOT = 150;

/** Hôm nay theo giờ studio, dạng "YYYY-MM-DD" — mốc để biết việc nào trễ hạn. */
function homNay(): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: MUI_GIO, year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date())
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}

/**
 * Đầu việc — trang "Tiến độ công việc" bên AppSheet, bản chép mỗi giờ (đợt 3).
 *
 * Mặc định chỉ hiện việc CHƯA XONG, xếp theo thời hạn gần nhất: 4.449/4.577
 * dòng đã làm xong rồi, mở ra mà thấy cả đống việc cũ thì không ai tìm được
 * việc của hôm nay. Việc quá hạn tô vàng.
 */
export default async function CongViecPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;
  const loc = quanTri ? (sp.nguoi ?? "") : "";

  /*
    Ai thấy việc của ai (anh chốt 21/09/2026).

    Quản lý thấy hết. Người khác chỉ thấy việc GHI TÊN MÌNH, cộng những việc
    CHƯA GIAO cho ai — anh muốn ai rảnh thì nhận. Không phải chuyện giấu diếm
    mà là chuyện đúng việc: mở ra thấy 186 đầu việc của cả tiệm thì không ai
    tìm ra phần của mình.

    Lọc ngay trong câu lệnh database, không lọc ở giao diện: lọc ở giao diện
    thì dữ liệu vẫn rời khỏi máy chủ, ai mở phần xem mã nguồn trang cũng đọc
    được (cùng bài học với nguyên tắc 3).

    Người chưa có mã nhân viên bên AppSheet (`maNV` trống) thì chỉ còn thấy
    việc chưa giao — không ghép được dòng nào với họ.
  */
  /* Mã nhân viên, hoặc tên đăng nhập với học viên chưa có mã — xem `khoaNguoi`. */
  const khoaToi = khoaCuaToi(nguoi);
  const chuaGiao: Prisma.CongViecWhereInput[] = [
    { nguoiPhuTrachMaNV: null },
    { nguoiPhuTrachMaNV: "" },
  ];
  const theoNguoi: Prisma.CongViecWhereInput = quanTri
    ? {}
    : { OR: [...(khoaToi ? [{ nguoiPhuTrachMaNV: khoaToi }] : []), ...chuaGiao] };
  const tt = ["qua-han", "sap-toi", "da-lam", "tat-ca"].includes(sp.tt ?? "") ? sp.tt! : "chua-xong";
  const so = Math.max(MOI_LUOT, Math.floor(Number(sp.so)) || MOI_LUOT);
  const nay = homNay();

  /*
    "Sắp tới" — việc có hạn trong bảy ngày tới, thêm 14/11/2026.

    Vì sao cần: trang hiện tối đa 150 việc mỗi lượt, mà việc chưa xong cả tiệm
    là 246 và 181 trong số đó mang hạn CŨ hơn hôm nay. Việc vừa sinh cho buổi
    chụp ngày mai nằm ở vị trí thứ 182 — người mở trang không thấy nó, bị đống
    tồn kho từ 2025 che mất.

    Không tăng giới hạn 150 và không đổi thứ tự mặc định: tăng chỉ đẩy vấn đề
    xuống sau, còn đổi thứ tự là giấu mất việc quá hạn thật. Thêm một lối lọc
    thì người cần việc sắp tới bấm một cái là thấy.
  */
  const bayNgayNua = new Date(new Date(`${nay}T00:00:00+07:00`).getTime() + 7 * 86_400_000)
    .toLocaleDateString("sv-SE", { timeZone: MUI_GIO });

  const theoTrangThai: Prisma.CongViecWhereInput =
    tt === "sap-toi"
      ? { trangThai: { not: "Đã làm" }, thoiHan: { gte: nay, lte: bayNgayNua } }
      : tt === "da-lam"
      ? { trangThai: "Đã làm" }
      : tt === "tat-ca"
        ? {}
        : tt === "qua-han"
          ? { trangThai: { not: "Đã làm" }, thoiHan: { lt: nay } }
          : { trangThai: { not: "Đã làm" } };
  const where: Prisma.CongViecWhereInput = {
    matBenAppSheet: null,
    ...theoTrangThai,
    ...theoNguoi,
    ...(loc ? { nguoiPhuTrachMaNV: loc } : {}),
  };

  const prisma = getPrisma();
  const [ds, demNguoi, soQuaHan, soSapToi, bangTen, dsNhanVien] = await Promise.all([
    prisma.congViec.findMany({
      where,
      select: {
        id: true,
        loai: true,
        thoiHan: true,
        ngayHoanThanh: true,
        trangThai: true,
        tienDo: true,
        ghiChu: true,
        nguoiPhuTrachMaNV: true,
        hopDong: { select: { id: true, tenKhach: true } },
      },
      orderBy: [{ thoiHan: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
    }),
    quanTri
      ? prisma.congViec.groupBy({
          by: ["nguoiPhuTrachMaNV"],
          where: { matBenAppSheet: null, trangThai: { not: "Đã làm" } },
          _count: { _all: true },
        })
      : Promise.resolve([] as { nguoiPhuTrachMaNV: string | null; _count: { _all: number } }[]),
    prisma.congViec.count({
      where: { matBenAppSheet: null, ...theoNguoi, trangThai: { not: "Đã làm" }, thoiHan: { lt: nay } },
    }),
    prisma.congViec.count({
      where: {
        matBenAppSheet: null, ...theoNguoi, trangThai: { not: "Đã làm" },
        thoiHan: {
          gte: nay,
          lte: new Date(new Date(`${nay}T00:00:00+07:00`).getTime() + 7 * 86_400_000)
            .toLocaleDateString("sv-SE", { timeZone: MUI_GIO }),
        },
      },
    }),
    tenTheoMaNV(),
    /*
      Danh sách người để giao việc: chỉ người CÒN LÀM và có mã nhân viên —
      đầu việc ghép người bằng mã bên AppSheet, người chưa có mã thì ghép
      không ra (đã ghi trong nguyên tắc 52).
    */
    /*
      Danh sách người để giao việc: mọi người CÒN LÀM, kể cả người chưa có mã
      nhân viên.

      Bản cũ lọc `maNV: { not: null }` vì đầu việc ghép người bằng mã bên
      AppSheet. Từ 14/11/2026 anh chốt sếp vẫn giao được việc cho học viên, mà
      học viên thì chưa có mã — nên khoá ghép là mã NẾU CÓ, không thì tên đăng
      nhập (`khoaNguoi`).
    */
    prisma.nhanVien.findMany({
      where: { dangLam: true },
      orderBy: { ten: "asc" },
      select: { maNV: true, tenDangNhap: true, ten: true },
    }),
  ]);
  /*
    Cắt ở MÁY CHỦ — nguyên tắc 55, và cùng lý do với trang Lịch: `NutViec` lọc
    danh sách trong trình duyệt, nên trước 20/11/2026 tên và mã của cả 15 nhân
    viên vẫn đi xuống máy người thường trong nguồn trang.
  */
  const nhanVien = dsNhanVien
    .filter((n) => quanTri || khoaNguoi(n) === khoaToi)
    .map((n) => ({ maNV: khoaNguoi(n), ten: n.ten }));
  const hien = ds.slice(0, so);

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ nguoi: loc, tt, ...thay });
    for (const [k, v] of [...p.entries()]) if (!v || (k === "tt" && v === "chua-xong")) p.delete(k);
    return `/quan-ly/cong-viec?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <p className="eyebrow">Hằng ngày</p>
      <h1 className="mt-2 font-display text-3xl font-light">
        Đầu việc <span className="text-fg-faint tabular-nums">{ds.length}</span>
      </h1>
      <BangDongBo quanTri={quanTri} />
      {!quanTri && (
        <p className="mt-3 text-sm text-fg-muted">
          Đang hiện việc ghi tên anh chị và những việc chưa giao cho ai.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={link({ tt: "chua-xong" })} className={lopChip(tt === "chua-xong")}>Chưa xong</Link>
        <Link href={link({ tt: "qua-han" })} className={lopChip(tt === "qua-han")}>
          Quá hạn <span className="tabular-nums opacity-70">{soQuaHan}</span>
        </Link>
        <Link href={link({ tt: "sap-toi" })} className={lopChip(tt === "sap-toi")}>
          Bảy ngày tới <span className="tabular-nums opacity-70">{soSapToi}</span>
        </Link>
        <Link href={link({ tt: "da-lam" })} className={lopChip(tt === "da-lam")}>Đã làm</Link>
        <Link href={link({ tt: "tat-ca" })} className={lopChip(tt === "tat-ca")}>Tất cả</Link>
        {quanTri && <span className="mx-1 h-4 w-px bg-line" aria-hidden />}
        {quanTri && <Link href={link({ nguoi: "" })} className={lopChip(!loc)}>Mọi người</Link>}
        {/* "Việc của tôi" chỉ hiện với quản lý — người khác vốn đã chỉ thấy việc mình. */}
        {quanTri && khoaToi && (
          <Link href={link({ nguoi: khoaToi })} className={lopChip(loc.toLowerCase() === khoaToi.toLowerCase())}>
            Việc của tôi
          </Link>
        )}
        {demNguoi
          .filter((d) => d.nguoiPhuTrachMaNV)
          .sort((a, b) => b._count._all - a._count._all)
          .slice(0, 10)
          .map((d) => (
            <Link key={d.nguoiPhuTrachMaNV} href={link({ nguoi: d.nguoiPhuTrachMaNV! })} className={lopChip(loc === d.nguoiPhuTrachMaNV)}>
              {tenNV(bangTen, d.nguoiPhuTrachMaNV)} <span className="tabular-nums opacity-70">{d._count._all}</span>
            </Link>
          ))}
      </div>

      <Bang
        lop="mt-5"
        cot={Object.values(COT)}
        trong={
          <>
            Không có đầu việc nào khớp bộ lọc.{" "}
            {(loc || tt !== "chua-xong") && (
              <Link href="/quan-ly/cong-viec" className="text-accent underline underline-offset-2">
                Về việc chưa xong
              </Link>
            )}
          </>
        }
      >
        {hien.map((v) => {
          const treHan = v.thoiHan !== null && v.thoiHan < nay && v.trangThai !== "Đã làm";
          return (
            <Hang key={v.id} lop="align-top transition hover:bg-bg-soft">
              <O
                cot={COT.thoiHan}
                lop={`whitespace-nowrap tabular-nums ${treHan ? "font-medium text-amber-800" : "text-fg-muted"}`}
              >
                {ngayVN(v.thoiHan) || "—"}
                {/*
                  "quá hạn" để `inline md:block`: trong bảng nó xuống dòng
                  dưới ngày, còn trên thẻ thì nằm ngay sau — hai chữ không
                  đáng một dòng riêng.
                */}
                {treHan && <span className="ml-1.5 text-[11px] md:ml-0 md:block">quá hạn</span>}
              </O>
              <O cot={COT.viec}>
                {v.loai ?? "—"}
                {v.ghiChu && <span className="block text-xs text-fg-muted">{v.ghiChu}</span>}
              </O>
              <O cot={COT.khach}>
                {v.hopDong ? (
                  <Link href={`/quan-ly/hop-dong/${v.hopDong.id}`} className="font-medium hover:text-accent">
                    {v.hopDong.tenKhach}
                  </Link>
                ) : (
                  <span className="text-fg-faint">—</span>
                )}
              </O>
              <O cot={COT.nguoi}>
                <NutViec
                  id={v.id}
                  nguoiPhuTrachMaNV={v.nguoiPhuTrachMaNV}
                  tenNguoiLam={
                    v.nguoiPhuTrachMaNV
                      ? (bangTen.get(v.nguoiPhuTrachMaNV.toLowerCase()) ?? null)
                      : null
                  }
                  trangThai={v.trangThai}
                  nhanVien={nhanVien}
                  quanTri={quanTri}
                  maToi={nguoi.maNV}
                />
                {v.trangThai === "Đã làm" && v.ngayHoanThanh && (
                  <span className="mt-1 block text-xs text-fg-faint">
                    xong {ngayVN(v.ngayHoanThanh)}
                    {v.tienDo ? ` · ${v.tienDo}` : ""}
                  </span>
                )}
              </O>
            </Hang>
          );
        })}
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
