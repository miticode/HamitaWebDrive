import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri, xemHopDong } from "@/lib/phienNhanVien";
import { BUOC_XONG, ngayVN } from "@/lib/hopDongChung";
import { laViecHauKy } from "@/lib/viecLich";
import { khoaCuaToi, khoaNguoi } from "@/lib/hopDongMayChu";
import { LOP_NHOM, nhomCuaLoai, type BuoiLich, type ViecBuoi } from "@/lib/lichChung";
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
  /* Mã nhân viên, hoặc tên đăng nhập với học viên chưa có mã — xem `khoaNguoi`. */
  const khoaToi = khoaCuaToi(nguoi);
  const quanTri = laQuanTri(nguoi);

  const [ds, demLoai, choNgay, dsNhanVien] = await Promise.all([
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
    /*
      BUỔI CHƯA CÓ NGÀY — anh chốt 19/11/2026.

      KHÔNG lọc theo tháng, vì một buổi chưa có ngày không thuộc tháng nào:
      nó là VIỆC ĐANG TREO, phải thấy dù đang xem tháng nào (nguyên tắc 29 —
      xếp theo việc cần làm). Lọc theo loại thì vẫn theo, để chip "Mọi loại"
      không nói dối.

      Cũ nhất lên đầu: hợp đồng ký từ tháng 6 mà chưa chốt ngày thì gấp hơn
      cái ký tuần trước.

      BỎ HỢP ĐỒNG ĐÃ XONG (bước 9 và 18). Đo 19/11 ngay sau khi làm khu này:
      8 buổi đang không có ngày, và CẢ 8 đều thuộc hợp đồng đã hoàn thành từ
      2024–2026 — dòng lịch rác chép về từ AppSheet. Không lọc thì khu này
      hiện 8 việc giả vĩnh viễn, mà việc giả làm người ta thôi tin cả khu.

      `buoc = null` thì GIỮ: hợp đồng chưa gõ bước không có nghĩa là đã xong.
      Viết thành OR chứ không `notIn`, vì trong SQL `null NOT IN (9,18)` ra
      null nên dòng đó bị loại oan.
    */
    prisma.lichChup.findMany({
      where: {
        matBenAppSheet: null,
        ngay: null,
        hopDong: { OR: [{ buoc: null }, { buoc: { notIn: [...BUOC_XONG] } }] },
        ...(loai ? { loai } : {}),
      },
      select: {
        id: true,
        loai: true,
        lyDoTrong: true,
        ghiChu: true,
        hopDong: {
          select: {
            id: true,
            tenKhach: true,
            ngayDat: true,
            loaiDV: true,
            khachHang: { select: { soDienThoai: true } },
          },
        },
      },
      orderBy: [{ taoLuc: "asc" }],
    }),
    /*
      Nhân viên còn làm — để ô chọn người trên từng đầu việc có cái mà bày.

      Khoá ghép là mã NẾU CÓ, không thì tên đăng nhập (`khoaNguoi`): học viên
      chưa có mã vẫn nhận được việc, anh chốt 14/11/2026.
    */
    prisma.nhanVien.findMany({
      where: { dangLam: true },
      orderBy: { ten: "asc" },
      select: { maNV: true, tenDangNhap: true, ten: true },
    }),
  ]);

  /*
    ĐẦU VIỆC CỦA CÁC BUỔI TRONG THÁNG — anh yêu cầu 19/11/2026.

    "Trên lịch hãy hiển thị đầu việc lên hết để quản lý có thể chia việc trên
    lịch chụp cho dễ luôn."

    Đọc theo HỢP ĐỒNG của những buổi đang hiện, không đọc cả bảng: 5.299 đầu
    việc mà một tháng chỉ dính tới vài chục hợp đồng (nguyên tắc 53).

    HAI ĐƯỜNG GẮN VIỆC VÀO BUỔI, tuỳ hợp đồng lập ở đâu:

    1. Hợp đồng lập trên web TỪ 20/11/2026 có `CongViec.lichChupId` — người
       lập đã chỉ rõ việc nào làm buổi nào (bảng giá hạng mục khai sẵn, sửa
       được trong form). Tin thẳng cột đó: việc không gắn buổi là việc hậu kỳ
       họ cố ý để ngoài, không hiện lên lịch.

    2. 5.310 dòng chép từ AppSheet KHÔNG CÓ cột ấy. Với chúng vẫn phải đoán
       theo tên như từ 19/11: bỏ việc hậu kỳ bằng `laViecHauKy`, phần còn lại
       hiện ở mọi buổi của hợp đồng. Hợp đồng hai ngày thì cả hai ngày cùng
       hiện một danh sách — đó là giới hạn của dữ liệu cũ, không chữa được.

    Ranh giới giữa hai đường là CẢ HỢP ĐỒNG, không phải từng dòng việc: hợp
    đồng nào có dù chỉ một việc gắn buổi thì nó thuộc đường 1 trọn vẹn. Trộn
    hai đường trong cùng một hợp đồng thì việc thêm tay (không gắn buổi, tên
    không khớp `laViecHauKy`) sẽ mọc lên ở MỌI buổi — đúng cái lỗi đang chữa.

    Lọc bằng `laViecHauKy` ngay sau khi đọc chứ không trong SQL: phép phân
    loại phải có MỘT nguồn duy nhất, viết lại bằng tiếng SQL là sớm muộn hai
    bên lệch nhau. Đo 19/11: bỏ 1.366/5.299 việc (26%), đúng những tên
    Photoshop, edit clip, Dựng phim, Xưởng in.
  */
  const hopDongIds = [...new Set([...ds, ...choNgay].map((l) => l.hopDong?.id).filter((x): x is string => !!x))];
  const viecTho = hopDongIds.length
    ? await prisma.congViec.findMany({
        where: { matBenAppSheet: null, hopDongId: { in: hopDongIds } },
        select: {
          id: true,
          hopDongId: true,
          lichChupId: true,
          loai: true,
          donGia: true,
          soLuong: true,
          nguoiPhuTrachMaNV: true,
          trangThai: true,
        },
        orderBy: [{ loai: "asc" }],
      })
    : [];

  const gon = (v: (typeof viecTho)[number]): ViecBuoi => ({
    id: v.id,
    loai: v.loai,
    tienCong: Math.round(v.donGia * v.soLuong),
    nguoiPhuTrachMaNV: v.nguoiPhuTrachMaNV,
    trangThai: v.trangThai,
  });

  /** Hợp đồng đã khai buổi cho việc — thuộc đường 1, xem chú thích trên. */
  const hdCoBuoi = new Set(
    viecTho.filter((v) => v.lichChupId && v.hopDongId).map((v) => v.hopDongId as string),
  );

  /** Đường 1: việc gắn thẳng vào một dòng lịch. */
  const viecTheoBuoi = new Map<string, ViecBuoi[]>();
  /** Đường 2: việc chỉ biết hợp đồng, hiện ở mọi buổi của hợp đồng đó. */
  const viecTheoHopDong = new Map<string, ViecBuoi[]>();
  for (const v of viecTho) {
    if (!v.hopDongId) continue;
    if (v.lichChupId) {
      viecTheoBuoi.set(v.lichChupId, [...(viecTheoBuoi.get(v.lichChupId) ?? []), gon(v)]);
      continue;
    }
    /* Hợp đồng đã khai buổi: việc không buổi là hậu kỳ, cố ý để ngoài lịch. */
    if (hdCoBuoi.has(v.hopDongId) || laViecHauKy(v.loai)) continue;
    viecTheoHopDong.set(v.hopDongId, [...(viecTheoHopDong.get(v.hopDongId) ?? []), gon(v)]);
  }

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
    viec: [
      ...(viecTheoBuoi.get(l.id) ?? []),
      ...(l.hopDong?.id ? (viecTheoHopDong.get(l.hopDong.id) ?? []) : []),
    ],
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

      {/*
        Khu CHỜ XẾP NGÀY — đứng trên lưới vì nó là việc cần làm, còn lưới là
        việc đã xếp xong. Chỉ hiện khi có buổi; không có thì trang y như cũ.

        Nó KHÔNG đổi theo tháng: buổi chưa có ngày không nằm trong tháng nào.
      */}
      {choNgay.length > 0 && (
        <section className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-display text-lg font-medium text-amber-900">
            Chờ xếp ngày <span className="tabular-nums opacity-70">{choNgay.length}</span>
          </h2>
          <p className="mt-1 text-xs text-amber-900/80">
            Khách đã mua buổi này nhưng chưa có ngày. Gọi khách chốt ngày rồi điền vào lịch của hợp
            đồng — buổi sẽ tự rời khỏi đây.
          </p>
          <ul className="mt-3 grid gap-2">
            {choNgay.map((l) => (
              <li
                key={l.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-amber-300/70 bg-bg-raised px-3.5 py-2.5 text-sm"
              >
                <span className={`inline-flex items-center gap-2 ${LOP_NHOM[nhomCuaLoai(l.loai)]}`}>
                  <span className="cham-lich" aria-hidden />
                  {l.loai ?? "—"}
                </span>
                {l.hopDong ? (
                  moHopDong ? (
                    <Link
                      href={`/quan-ly/hop-dong/${l.hopDong.id}`}
                      className="font-medium hover:text-accent"
                    >
                      {l.hopDong.tenKhach}
                    </Link>
                  ) : (
                    <span className="font-medium">{l.hopDong.tenKhach}</span>
                  )
                ) : (
                  <span className="text-fg-faint">chưa nối hợp đồng</span>
                )}
                {l.hopDong?.khachHang?.soDienThoai && (
                  <span className="text-xs text-fg-muted tabular-nums">
                    {l.hopDong.khachHang.soDienThoai}
                  </span>
                )}
                {/*
                  Lý do là thứ quyết việc phải làm, nên tô đậm hơn mọi thứ
                  khác trên dòng: "chưa chốt" thì gọi nhắc, "đã hoãn" thì phải
                  báo lại ekip đã xếp người.
                */}
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                  {l.lyDoTrong ?? "chưa ghi lý do"}
                </span>
                {l.hopDong?.ngayDat && (
                  <span className="text-xs text-fg-faint">ký {ngayVN(l.hopDong.ngayDat)}</span>
                )}
                {l.ghiChu && <span className="text-xs text-fg-muted">{l.ghiChu}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {xem === "luoi" && (
        <LuoiLich
          ds={buoi}
          thang={thang}
          nay={nay}
          moHopDong={moHopDong}
          nhanVien={dsNhanVien.map((n) => ({ maNV: khoaNguoi(n), ten: n.ten }))}
          quanTri={quanTri}
          maToi={khoaToi}
        />
      )}

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
