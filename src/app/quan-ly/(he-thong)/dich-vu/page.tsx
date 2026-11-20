import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { LOAI_DICH_VU, TEN_LOAI, boDau, laLoaiDichVu, loaiDuocSua, type LoaiDichVu } from "@/lib/dichVuChung";
import { OBuoiChup } from "./OBuoiChup";
import { TabDanhMuc, TrangDanhMuc } from "./TrangDanhMuc";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ loai?: string; nhom?: string; q?: string; tt?: string; so?: string; dm?: string }>;
};

/*
  Mỗi lượt hiện 150 dòng. Trang phục có 887 mục, 859 cái cùng nhóm "Thuê lẻ" —
  lọc theo nhóm không thu nhỏ được, dựng cả 887 dòng thì điện thoại ì. Người
  tra váy thường gõ mã hay tên, nên ô tìm mới là đường chính.
*/
const MOI_LUOT = 150;

/*
  Cột "Buổi chụp" CHỈ ở tab Dịch vụ: trang phục và sản phẩm không sinh buổi
  chụp nào, thêm một cột trống cho 888 dòng là tốn chỗ. Khai theo tên để bỏ
  cột giữa bảng không làm trượt nhãn của cột sau.
*/
const COT = {
  ma: { ten: "Mã" },
  ten: { ten: "Tên", chinh: true, lop: "min-w-56" },
  nhom: { ten: "Nhóm" },
  buoiChup: { ten: "Buổi chụp", rong: true },
  donGia: { ten: "Đơn giá", phai: true },
} satisfies Record<string, CotBang>;

/**
 * Bảng dịch vụ & trang phục — trang "Dịch vụ" bên AppSheet cũ.
 *
 * CHỈ QUẢN LÝ, từ 20/11/2026 (anh chỉ ra: "đăng nhập bằng tài khoản nhân viên
 * thì vẫn thấy được phần quản lý dịch vụ, như vậy là không được").
 *
 * Trang này không chỉ là bảng giá bán: bảy tab danh mục của nó là cấu hình
 * dùng chung cả tiệm — loại buổi chụp, trạng thái hợp đồng, mã album, hình
 * thức thu. Đổi một dòng ở đó là đổi ô chọn của mọi người đang lập hợp đồng.
 *
 * Trước đó ai đăng nhập cũng vào được, với lý do "sale tra giá, phòng Váy tra
 * mẫu". Đo 20/11: không ai mang vai trò sale, và 11/13 người đăng nhập được
 * là nhân viên thường. Xem thêm `loaiDuocSua` trong dichVuChung.ts.
 */
export default async function DichVuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  if (!laQuanTri(nguoi)) notFound();
  const sp = await searchParams;

  /*
    MỘT TRANG CHO MỌI DANH MỤC — anh chốt 18/11/2026 ("tất cả những mục có
    CRUD sẽ gom chung vô 1 mục gọi là quản lý dịch vụ").

    `?dm=` chuyển sang bảng danh mục; không có thì vẫn là bảng dịch vụ như cũ.
    Dùng một trang với tham số thay vì tám trang riêng: tám trang là tám lần
    chép lại khung tiêu đề và thanh tab, mà thanh bên cũng dài thêm tám mục.
  */
  if (sp.dm) return <TrangDanhMuc nhom={sp.dm} nguoi={nguoi} />;

  const l = sp.loai ?? "";
  const loai: LoaiDichVu = laLoaiDichVu(l) ? l : "dich-vu";
  const nhom = sp.nhom ?? "";
  const q = sp.q ?? "";
  const tt = sp.tt === "ngung" ? "ngung" : "dang-dung";
  const so = Math.max(MOI_LUOT, Math.floor(Number(sp.so)) || MOI_LUOT);

  const prisma = getPrisma();
  const [demLoai, cuaLoai, dsLoaiBuoi] = await Promise.all([
    prisma.dichVu.groupBy({ by: ["loai"], where: { dangDung: tt === "dang-dung" }, _count: { _all: true } }),
    prisma.dichVu.findMany({
      where: { loai, dangDung: tt === "dang-dung" },
      select: {
        id: true, maDV: true, ten: true, nhom: true, chiTiet: true, donGia: true, donVi: true,
        /* Buổi chụp mặc định — anh yêu cầu 18/11/2026. */
        buoi: { select: { loaiBuoi: { select: { id: true, ten: true } } }, orderBy: { thuTu: "asc" } },
      },
      orderBy: [{ nhom: "asc" }, { maDV: "asc" }],
    }),
    /*
      Danh sách loại buổi cho ô chọn. Đọc một lần cho cả bảng, không phải mỗi
      dòng một lần — bảng trang phục có tới 888 dòng.
    */
    prisma.loaiBuoi.findMany({
      where: { dangDung: true },
      select: { id: true, ten: true },
      orderBy: [{ thuTu: "asc" }, { ten: "asc" }],
    }),
  ]);
  const soTheoLoai: Record<string, number> = Object.fromEntries(demLoai.map((d) => [d.loai, d._count._all]));

  const demNhom = new Map<string, number>();
  for (const d of cuaLoai) if (d.nhom) demNhom.set(d.nhom, (demNhom.get(d.nhom) ?? 0) + 1);
  const dsNhom = [...demNhom].sort((a, b) => b[1] - a[1]);

  const tim = boDau(q);
  const ds = cuaLoai.filter(
    (d) =>
      (!nhom || d.nhom === nhom) &&
      (!tim || boDau(`${d.maDV} ${d.ten} ${d.chiTiet ?? ""}`).includes(tim)),
  );
  const hien = ds.slice(0, so);
  const themDuoc = loaiDuocSua(nguoi).includes(loai);

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ loai, nhom, q, tt, ...thay });
    for (const [k, v] of [...p.entries()]) if (!v || (k === "tt" && v === "dang-dung")) p.delete(k);
    return `/quan-ly/dich-vu?${p}`;
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Thông tin studio</p>
          <h1 className="mt-2 font-display text-3xl font-light">Quản lý dịch vụ</h1>
        </div>
        {themDuoc && (
          <Link href={`/quan-ly/dich-vu/moi?loai=${loai}`} className="btn-primary">
            + Thêm {TEN_LOAI[loai].toLowerCase()}
          </Link>
        )}
      </div>

      <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Loại">
        {LOAI_DICH_VU.map((x) => (
          <Link
            key={x}
            href={link({ loai: x, nhom: "" })}
            aria-current={x === loai ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition ${
              x === loai ? "border-accent font-medium text-fg" : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {TEN_LOAI[x]} <span className="text-fg-faint tabular-nums">{soTheoLoai[x] ?? 0}</span>
          </Link>
        ))}
        <TabDanhMuc dangMo={null} quanLy={laQuanTri(nguoi)} />
      </nav>

      {/* Lọc bằng đường link thường như mục Nhân viên: gửi link cho nhau cũng mở ra đúng bộ lọc. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <form action="/quan-ly/dich-vu" className="flex gap-2">
          <input type="hidden" name="loai" value={loai} />
          {nhom && <input type="hidden" name="nhom" value={nhom} />}
          {tt !== "dang-dung" && <input type="hidden" name="tt" value={tt} />}
          <input
            id="tim-dich-vu"
            name="q"
            defaultValue={q}
            placeholder="Tìm mã, tên hoặc chi tiết"
            className="input w-60"
          />
        </form>
        {dsNhom.length > 1 && (
          <>
            <Link href={link({ nhom: "" })} className={lopChip(!nhom)}>Mọi nhóm</Link>
            {dsNhom.map(([n, c]) => (
              <Link key={n} href={link({ nhom: n })} className={lopChip(nhom === n)}>
                {n} <span className="tabular-nums opacity-70">{c}</span>
              </Link>
            ))}
            <span className="mx-1 h-4 w-px bg-line" aria-hidden />
          </>
        )}
        <Link href={link({ tt: "dang-dung" })} className={lopChip(tt === "dang-dung")}>Đang dùng</Link>
        <Link href={link({ tt: "ngung" })} className={lopChip(tt === "ngung")}>Ngưng dùng</Link>
      </div>

      {laQuanTri(nguoi) && loai === "trang-phuc" && (
        <p className="mt-4 text-xs leading-relaxed text-fg-faint">
          Ảnh mẫu trang phục chưa có: thư mục ảnh của app AppSheet chưa được người bán chia sẻ. Đường dẫn
          ảnh đã lưu sẵn từng mục, có quyền là ghép vào được.
        </p>
      )}

      <Bang
        lop="mt-5"
        cot={[COT.ma, COT.ten, COT.nhom, ...(loai === "dich-vu" ? [COT.buoiChup] : []), COT.donGia]}
        trong="Không có mục nào khớp bộ lọc."
      >
        {hien.map((d) => {
          // Dòng chi tiết đầu tiên khác tên — cho biết gói gồm gì mà không phải mở ra.
          const dong1 = (d.chiTiet ?? "")
            .split("\n")
            .map((s) => s.trim())
            .find((s) => s && boDau(s) !== boDau(d.ten));
          return (
            <Hang key={d.id} lop="align-top transition hover:bg-bg-soft">
              <O cot={COT.ma} lop="whitespace-nowrap text-fg-muted tabular-nums">
                {d.maDV}
              </O>
              <O cot={COT.ten}>
                <Link href={`/quan-ly/dich-vu/${d.id}`} className="font-medium hover:text-accent">
                  {d.ten}
                </Link>
                {dong1 && (
                  <span className="mt-0.5 block max-w-md truncate text-xs text-fg-faint">{dong1}</span>
                )}
              </O>
              <O cot={COT.nhom} lop="whitespace-nowrap text-fg-muted">
                {d.nhom ?? "—"}
              </O>
              {loai === "dich-vu" && (
                <O cot={COT.buoiChup}>
                  <OBuoiChup
                    dichVuId={d.id}
                    banDau={d.buoi.map((b) => b.loaiBuoi)}
                    dsLoai={dsLoaiBuoi}
                    suaDuoc={themDuoc}
                  />
                </O>
              )}
              <O cot={COT.donGia} lop="whitespace-nowrap tabular-nums">
                {tien(d.donGia)}đ
                {d.donVi && <span className="text-fg-faint"> / {d.donVi}</span>}
              </O>
            </Hang>
          );
        })}
      </Bang>

      {ds.length > hien.length && (
        <p className="mt-3 text-sm text-fg-muted">
          Đang hiện <span className="tabular-nums">{hien.length}/{ds.length}</span> mục.{" "}
          <Link href={link({ so: String(so + MOI_LUOT) })} className="text-accent underline underline-offset-2">
            Xem thêm
          </Link>{" "}
          hoặc tìm theo mã, tên cho nhanh.
        </p>
      )}
    </div>
  );
}
