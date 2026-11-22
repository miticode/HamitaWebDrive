import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, laQuanTri, xemNhanVien } from "@/lib/phienNhanVien";
import { HangNhanVien, ThemNhanVien } from "./HangNhanVien";
import { NutHienTrang } from "./NutHienTrang";
import { NutDangXuatMoiMay } from "./NutDangXuatMoiMay";
import { Bang, Hang, O } from "../_ui/Bang";
import { COT_NV } from "./cot";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; phong?: string; tt?: string }> };

const NGAY_GIO = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function boDauThuong(s: string): string {
  return s.replace(/[đĐ]/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Danh bạ nhân viên — mục "Thông Tin Nhân Viên" bên AppSheet cũ.
 *
 * AI CŨNG XEM ĐƯỢC tên, phòng ban, chức vụ, số điện thoại: bên AppSheet mục
 * này mở cho mọi người, nhân viên dùng nó để gọi nhau. Riêng tên đăng nhập,
 * tình trạng tài khoản và các nút cấp mật khẩu, sửa thì chỉ quản lý thấy.
 */
export default async function NhanVienPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  // Chặn ở MÁY CHỦ, không chỉ giấu mục trên thanh bên (nguyên tắc 3): gõ
  // thẳng /quan-ly/nhan-vien cũng bị đưa về Tổng quan.
  batBuocQuyen(xemNhanVien(nguoi));
  const quanTri = laQuanTri(nguoi);
  const { q = "", phong = "", tt = "dang-lam" } = await searchParams;

  const tatCa = await getPrisma().nhanVien.findMany({
    orderBy: [{ dangLam: "desc" }, { phongBan: "asc" }, { ten: "asc" }],
    // Chỉ lấy khoá của bảng ảnh, KHÔNG lấy dữ liệu ảnh: danh sách này có thể
    // vài chục người, kéo theo từng đó ảnh chỉ để biết "có hay chưa" thì phí.
    include: { anh: { select: { nhanVienId: true } } },
  });

  const tim = boDauThuong(q.trim());
  const ds = tatCa.filter(
    (n) =>
      (tt === "tat-ca" || (tt === "da-nghi" ? !n.dangLam : n.dangLam)) &&
      (!phong || n.phongBan === phong) &&
      (!tim ||
        boDauThuong(n.ten).includes(tim) ||
        (n.soDienThoai ?? "").includes(tim)),
  );

  /*
    Thứ tự người trong khu "Đội ngũ" — tính một lần ở đây để mỗi hàng biết
    mình có đang đứng đầu hay cuối, khỏi khoá nhầm mũi tên.
  */
  const dsHien = tatCa
    .filter((n) => n.hienTrenTrang && n.dangLam)
    .sort(
      (a, b) =>
        a.thuTuHien - b.thuTuHien ||
        (a.ngayVaoLam?.getTime() ?? 0) - (b.ngayVaoLam?.getTime() ?? 0) ||
        a.taoLuc.getTime() - b.taoLuc.getTime(),
    )
    .map((n) => n.id);

  const dsPhong = [...new Set(tatCa.filter((n) => n.dangLam).map((n) => n.phongBan).filter(Boolean))] as string[];
  dsPhong.sort((a, b) => a.localeCompare(b, "vi"));
  /* Chức vụ đang dùng thật — gộp với danh mục gợi ý trong form (mục "Học viên"). */
  const dsChucVu = [...new Set(tatCa.filter((n) => n.dangLam).map((n) => n.chucVu).filter(Boolean))] as string[];
  dsChucVu.sort((a, b) => a.localeCompare(b, "vi"));

  const link = (thay: Record<string, string>) => {
    const p = new URLSearchParams({ q, phong, tt, ...thay });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/quan-ly/nhan-vien?${p}`;
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
          <h1 className="mt-2 font-display text-3xl font-light">
            Nhân viên <span className="text-fg-faint tabular-nums">{ds.length}</span>
          </h1>
        </div>
        {quanTri && (
          <div className="flex flex-wrap items-center gap-2">
            <NutDangXuatMoiMay soChuaCoMatKhau={tatCa.filter((n) => n.dangLam && !n.matKhau).length} />
            <ThemNhanVien dsPhong={dsPhong} dsChucVu={dsChucVu} />
          </div>
        )}
      </div>

      {/* Lọc bằng đường link thường, không cần JavaScript: gửi link cho nhau cũng mở ra đúng bộ lọc. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <form action="/quan-ly/nhan-vien" className="flex gap-2">
          <input type="hidden" name="phong" value={phong} />
          <input type="hidden" name="tt" value={tt} />
          <input
            id="tim-nhan-vien"
            name="q"
            defaultValue={q}
            placeholder="Tìm tên hoặc số điện thoại"
            className="input w-56"
          />
        </form>
        <Link href={link({ phong: "" })} className={lopChip(!phong)}>Mọi phòng</Link>
        {dsPhong.map((p) => (
          <Link key={p} href={link({ phong: p })} className={lopChip(phong === p)}>{p}</Link>
        ))}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <Link href={link({ tt: "dang-lam" })} className={lopChip(tt === "dang-lam")}>Đang làm</Link>
        <Link href={link({ tt: "da-nghi" })} className={lopChip(tt === "da-nghi")}>Đã nghỉ</Link>
        <Link href={link({ tt: "tat-ca" })} className={lopChip(tt === "tat-ca")}>Tất cả</Link>
      </div>

      <Bang
        lop="mt-5"
        /* Năm cột sau chỉ quản lý thấy — nguyên tắc 55. Cột khai ở HangNhanVien. */
        cot={[
          COT_NV.ten,
          COT_NV.phongBan,
          COT_NV.chucVu,
          COT_NV.dienThoai,
          ...(quanTri
            ? [COT_NV.tenDangNhap, COT_NV.taiKhoan, COT_NV.vaoGanNhat, COT_NV.trangGioiThieu, COT_NV.viec]
            : []),
        ]}
        trong="Không có nhân viên nào khớp bộ lọc."
      >
        {ds.map((n) => (
          <Hang key={n.id} lop={n.dangLam ? "" : "text-fg-faint"}>
                <O cot={COT_NV.ten}>
                  <span className="font-medium">{n.ten}</span>
                  {n.loaiNV === "Cộng tác viên" && (
                    <span className="ml-2 rounded border border-line px-1.5 py-0.5 text-[11px] text-fg-muted">CTV</span>
                  )}
                  {n.vaiTro === "quan-tri" && (
                    <span className="ml-2 rounded border border-accent px-1.5 py-0.5 text-[11px] text-accent">Quản lý</span>
                  )}
                  {n.vaiTro === "sale" && (
                    <span className="ml-2 rounded border border-line-strong px-1.5 py-0.5 text-[11px] text-fg-muted">Sale</span>
                  )}
                </O>
                <O cot={COT_NV.phongBan} lop="whitespace-nowrap">
                  {n.phongBan}
                </O>
                <O cot={COT_NV.chucVu} lop="whitespace-nowrap">
                  {n.chucVu}
                </O>
                <O cot={COT_NV.dienThoai} lop="whitespace-nowrap tabular-nums">
                  {n.soDienThoai ? (
                    <a href={`tel:${n.soDienThoai}`} className="hover:text-accent">
                      {n.soDienThoai}
                    </a>
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </O>
                {quanTri && (
                  <HangNhanVien
                    nv={{
                      id: n.id,
                      ten: n.ten,
                      maNV: n.maNV ?? "",
                      tenDangNhap: n.tenDangNhap,
                      soDienThoai: n.soDienThoai ?? "",
                      phongBan: n.phongBan ?? "",
                      chucVu: n.chucVu ?? "",
                      loaiNV: n.loaiNV ?? "",
                      vaiTro: n.vaiTro,
                      dangLam: n.dangLam,
                      coMatKhau: n.matKhau !== null,
                      doiMatKhau: n.doiMatKhau,
                    }}
                    vaoGanNhat={n.dangNhapLuc ? NGAY_GIO.format(n.dangNhapLuc) : null}
                    dsPhong={dsPhong}
                    dsChucVu={dsChucVu}
                    laChinhMinh={nguoi.id === n.id}
                    truocNutSua={
                      <NutHienTrang
                        id={n.id}
                        hien={n.hienTrenTrang}
                        coAnh={!!n.anh}
                        dauDanh={dsHien[0] === n.id}
                        cuoiDanh={dsHien[dsHien.length - 1] === n.id}
                      />
                    }
                  />
                )}
          </Hang>
        ))}
      </Bang>
    </div>
  );
}
