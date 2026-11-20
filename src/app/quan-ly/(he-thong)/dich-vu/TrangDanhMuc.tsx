import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { laQuanTri, type NguoiDung } from "@/lib/phienNhanVien";
import { LOAI_DICH_VU, TEN_LOAI, boDau } from "@/lib/dichVuChung";
import { MA_ALBUM } from "@/lib/maAlbum";
import { CHU_NHOM, COT_DUNG, NHOM, bangCung, type TenNhom } from "@/lib/danhMuc";
import { LOAI_LICH } from "@/lib/hopDongChung";
import { BangDanhMuc, type DongDanhMuc } from "./BangDanhMuc";
import { BangLoaiBuoi, type DongLoai } from "../loai-buoi/BangLoaiBuoi";
import { BangBuoc, type DongBuoc } from "./BangBuoc";
import { BangMaAlbum, type DongMa } from "./BangMaAlbum";

/*
  TRANG DANH MỤC — anh chốt 18/11/2026: gom mọi thứ có CRUD vào một mục
  "Quản lý dịch vụ".

  Trang này là nhánh `?dm=` của `/quan-ly/dich-vu`. Ba bảng khác nhau vì ba
  thứ dữ liệu khác nhau:
    · `loai-buoi` có thêm mã album
    · `buoc` có thêm trách nhiệm và thứ tự trong quy trình
    · bốn nhóm còn lại chỉ có tên, dùng chung `BangDanhMuc`
*/

/** Các tab danh mục, đúng thứ tự hiện trên thanh. */
export const TAB_DM = [
  { khoa: "loai-buoi", ten: "Loại buổi chụp" },
  { khoa: NHOM.loaiHopDong, ten: CHU_NHOM[NHOM.loaiHopDong].ten },
  { khoa: "buoc", ten: "Trạng thái hợp đồng" },
  { khoa: NHOM.hinhThucThu, ten: CHU_NHOM[NHOM.hinhThucThu].ten },
  { khoa: NHOM.noiDungThu, ten: CHU_NHOM[NHOM.noiDungThu].ten },
  { khoa: "ma-album", ten: "Mã album" },
  { khoa: NHOM.lyDoTrongNgay, ten: CHU_NHOM[NHOM.lyDoTrongNgay].ten },
] as const;

/** Thanh tab dùng chung cho cả hai nhánh của trang. */
export function TabDanhMuc({ dangMo }: { dangMo: string | null }) {
  return (
    <>
      <span className="mx-2 self-center text-line-strong" aria-hidden>
        |
      </span>
      {TAB_DM.map((t) => (
        <Link
          key={t.khoa}
          href={`/quan-ly/dich-vu?dm=${t.khoa}`}
          aria-current={t.khoa === dangMo ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition ${
            t.khoa === dangMo
              ? "border-accent font-medium text-fg"
              : "border-transparent text-fg-muted hover:text-fg"
          }`}
        >
          {t.ten}
        </Link>
      ))}
    </>
  );
}

function Khung({
  dangMo,
  chu,
  canhBao,
  children,
}: {
  dangMo: string;
  chu: string;
  canhBao?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ten = TAB_DM.find((t) => t.khoa === dangMo)?.ten ?? "Danh mục";
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Thông tin studio</p>
          <h1 className="mt-2 font-display text-3xl font-light">Quản lý dịch vụ</h1>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Danh mục">
        {LOAI_DICH_VU.map((x) => (
          <Link
            key={x}
            href={`/quan-ly/dich-vu?loai=${x}`}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-fg-muted transition hover:text-fg"
          >
            {TEN_LOAI[x]}
          </Link>
        ))}
        <TabDanhMuc dangMo={dangMo} />
      </nav>

      <div className="mt-5 max-w-4xl">
        <h2 className="font-display text-xl font-light">{ten}</h2>
        <p className="mt-1 text-sm text-fg-muted">{chu}</p>
        {canhBao}
        {children}
      </div>
    </div>
  );
}

export async function TrangDanhMuc({ nhom, nguoi }: { nhom: string; nguoi: NguoiDung }) {
  const quanLy = laQuanTri(nguoi);
  const prisma = getPrisma();

  /* ── Loại buổi chụp ───────────────────────────────────────────────── */
  if (nhom === "loai-buoi") {
    const [ds, dem] = await Promise.all([
      prisma.loaiBuoi.findMany({
        select: { id: true, ten: true, maAlbum: true, mau: true, dangDung: true },
        orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
      }),
      prisma.lichChup.groupBy({ by: ["loai"], _count: { _all: true } }),
    ]);
    const so = new Map(dem.map((n) => [(n.loai ?? "").toLowerCase(), n._count._all]));
    const dong: DongLoai[] = ds.map((d) => ({ ...d, soBuoi: so.get(d.ten.toLowerCase()) ?? 0 }));
    const lac = dem
      .map((n) => ({ ten: n.loai ?? "", so: n._count._all }))
      .filter((x) => x.ten.trim() && !ds.some((d) => d.ten.toLowerCase() === x.ten.toLowerCase()))
      .sort((a, b) => b.so - a.so);

    return (
      <Khung
        dangMo="loai-buoi"
        chu="Hiện trong ô “Loại” của phần Lịch chụp. Mã album gắn ở đây quyết định album của hợp đồng mang mã gì — “nhà gái” ra HER, “Đính Hôn” ra ĐH."
        canhBao={
          <>
            {ds.length === 0 && (
              <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Bảng còn rỗng nên web đang dùng {LOAI_LICH.length} loại cứng sẵn có.
              </p>
            )}
            {lac.length > 0 && <KhungLac ds={lac} donVi="buổi" />}
          </>
        }
      >
        <BangLoaiBuoi ds={dong} laQuanLy={quanLy} />
      </Khung>
    );
  }

  /* ── Bước hợp đồng ────────────────────────────────────────────────── */
  if (nhom === "buoc") {
    const [ds, dem] = await Promise.all([
      prisma.buocHopDong.findMany({
        select: { id: true, ten: true, thuTu: true, trachNhiem: true },
        orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
      }),
      prisma.hopDong.groupBy({ by: ["trangThai"], _count: { _all: true } }),
    ]);
    const so = new Map(dem.map((n) => [(n.trangThai ?? "").toLowerCase(), n._count._all]));
    const dong: DongBuoc[] = ds.map((d) => ({ ...d, soHopDong: so.get(d.ten.toLowerCase()) ?? 0 }));
    const lac = dem
      .map((n) => ({ ten: n.trangThai ?? "", so: n._count._all }))
      .filter((x) => x.ten.trim() && !ds.some((d) => d.ten.toLowerCase() === x.ten.toLowerCase()))
      .sort((a, b) => b.so - a.so);

    return (
      <Khung
        dangMo="buoc"
        chu="Mười tám bước của một hợp đồng, hiện trong ô “Trạng thái”. Số đầu tên quyết định thứ tự và nhánh — 1–9 nhánh chụp, 10–18 nhánh tiệc."
        canhBao={lac.length > 0 ? <KhungLac ds={lac} donVi="hợp đồng" /> : undefined}
      >
        <BangBuoc ds={dong} laQuanLy={quanLy} />
      </Khung>
    );
  }

  /* ── Mã album (tag) ───────────────────────────────────────────────── */
  if (nhom === "ma-album") {
    const [ds, album, lb] = await Promise.all([
      prisma.maAlbum.findMany({
        select: { id: true, ma: true, nghia: true, dangDung: true },
        orderBy: [{ thuTu: "asc" }, { ma: "asc" }],
      }),
      prisma.gallery.findMany({ select: { title: true, clientName: true } }),
      prisma.loaiBuoi.groupBy({ by: ["maAlbum"], where: { maAlbum: { not: null } }, _count: { _all: true } }),
    ]);

    /*
      Đếm album y như BỘ LỌC ở trang quản lý album: tách tên thành TỪ RỜI rồi
      khớp theo đầu từ. Đếm bằng `startsWith` trên cả tên thì hụt hẳn — đo
      19/11: cách đó ra HIS 0 album trong khi bộ lọc thật thấy 47, vì tên hay
      mang hai mã ("HIS - HER - Nhã hân") hoặc viết thường ("Her - Minh Ngọc").
    */
    const tuCuaAlbum = album.map((a) =>
      boDau([a.clientName ?? "", a.title].join(" "))
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    );
    const demLB = new Map(lb.map((x) => [(x.maAlbum ?? "").toLowerCase(), x._count._all]));

    const dong: DongMa[] = ds.map((d) => {
      const key = boDau(d.ma);
      return {
        ...d,
        soAlbum: tuCuaAlbum.filter((t) => t.some((x) => x.startsWith(key))).length,
        soLoaiBuoi: demLB.get(d.ma.toLowerCase()) ?? 0,
      };
    });

    return (
      <Khung
        dangMo="ma-album"
        chu="Mã hiện ở đầu tên album — “HIS - Minh Ngọc & Công Khoa”. Dùng để lọc ở trang quản lý album, và gắn sẵn được cho từng loại buổi chụp."
        canhBao={
          ds.length === 0 ? (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Bảng còn rỗng nên web đang dùng {MA_ALBUM.length} mã cứng sẵn có.
            </p>
          ) : undefined
        }
      >
        <BangMaAlbum ds={dong} laQuanLy={quanLy} />
      </Khung>
    );
  }

  /* ── Bốn nhóm còn lại ──────────────────────────────────────────────── */
  const khoa = (Object.values(NHOM) as string[]).includes(nhom) ? (nhom as TenNhom) : NHOM.loaiHopDong;
  const { bang, cot } = COT_DUNG[khoa];
  const [ds, dem] = await Promise.all([
    prisma.danhMuc.findMany({
      where: { nhom: khoa },
      select: { id: true, ten: true, dangDung: true },
      orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
    }),
    bang === "hopDong"
      ? prisma.hopDong.groupBy({ by: [cot as "loaiDV"], _count: { _all: true } })
      : bang === "lichChup"
        ? prisma.lichChup.groupBy({ by: [cot as "lyDoTrong"], _count: { _all: true } })
        : prisma.phieuThu.groupBy({ by: [cot as "hinhThuc"], _count: { _all: true } }),
  ]);
  const so = new Map(
    (dem as { [k: string]: unknown; _count: { _all: number } }[]).map((n) => [
      String(n[cot] ?? "").toLowerCase(),
      n._count._all,
    ]),
  );
  const dong: DongDanhMuc[] = ds.map((d) => ({ ...d, soDung: so.get(d.ten.toLowerCase()) ?? 0 }));
  const donVi = bang === "hopDong" ? "hợp đồng" : bang === "lichChup" ? "buổi chụp" : "phiếu thu";

  /*
    Nhóm "nội dung thu" KHÔNG kể giá trị lạc: 234 nội dung gõ tay ngoài bảng
    là chữ tự do của từng phiếu ("Cọc 200k", "Tt giày"), không phải danh mục
    thiếu. Kể ra thì khung cảnh báo dài hơn cả bảng mà chẳng để làm gì.
  */
  const lac =
    khoa === NHOM.noiDungThu
      ? []
      : (dem as { [k: string]: unknown; _count: { _all: number } }[])
          .map((n) => ({ ten: String(n[cot] ?? ""), so: n._count._all }))
          .filter((x) => x.ten.trim() && !ds.some((d) => d.ten.toLowerCase() === x.ten.toLowerCase()))
          .sort((a, b) => b.so - a.so);

  return (
    <Khung
      dangMo={khoa}
      chu={CHU_NHOM[khoa].chu}
      canhBao={
        <>
          {ds.length === 0 && (
            <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Bảng còn rỗng nên web đang dùng {bangCung(khoa).length} giá trị cứng sẵn có.
            </p>
          )}
          {lac.length > 0 && <KhungLac ds={lac} donVi={donVi} />}
        </>
      }
    >
      <BangDanhMuc nhom={khoa} ds={dong} laQuanLy={quanLy} donVi={donVi} tenCot={CHU_NHOM[khoa].ten} />
    </Khung>
  );
}

/**
 * Khung vàng kể những giá trị CÓ TRONG DỮ LIỆU mà không có trong danh mục.
 *
 * Đây là thứ đã bắt được lỗ hồi 18/11: ba loại buổi ("Chụp sự kiện", "Chụp
 * chịu lạy", "chụp đầy tháng") nằm trong lịch cũ nhưng không ai chọn lại
 * được, vì bảng cứng thiếu chúng. Giữ khung này ở mọi danh mục để lần sau
 * lệch là thấy ngay.
 */
function KhungLac({ ds, donVi }: { ds: { ten: string; so: number }[]; donVi: string }) {
  return (
    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">{ds.length} giá trị đang có trong dữ liệu nhưng không có trong danh sách:</p>
      <p className="mt-1">{ds.map((x) => `${x.ten} (${x.so} ${donVi})`).join(" · ")}</p>
      <p className="mt-1 text-xs">Dữ liệu cũ vẫn đọc được, nhưng người lập không chọn lại được.</p>
    </div>
  );
}
