import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { HangNhanVien, ThemNhanVien } from "./HangNhanVien";

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
  const quanTri = laQuanTri(nguoi);
  const { q = "", phong = "", tt = "dang-lam" } = await searchParams;

  const tatCa = await getPrisma().nhanVien.findMany({
    orderBy: [{ dangLam: "desc" }, { phongBan: "asc" }, { ten: "asc" }],
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

  const dsPhong = [...new Set(tatCa.filter((n) => n.dangLam).map((n) => n.phongBan).filter(Boolean))] as string[];
  dsPhong.sort((a, b) => a.localeCompare(b, "vi"));

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
        {quanTri && <ThemNhanVien dsPhong={dsPhong} />}
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

      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-bg-raised">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
              <th className="px-4 py-2.5 font-medium">Tên</th>
              <th className="px-4 py-2.5 font-medium">Phòng ban</th>
              <th className="px-4 py-2.5 font-medium">Chức vụ</th>
              <th className="px-4 py-2.5 font-medium">Điện thoại</th>
              {quanTri && (
                <>
                  <th className="px-4 py-2.5 font-medium">Tên đăng nhập</th>
                  <th className="px-4 py-2.5 font-medium">Tài khoản</th>
                  <th className="px-4 py-2.5 font-medium">Vào gần nhất</th>
                  <th className="px-4 py-2.5" />
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {ds.map((n) => (
              <tr key={n.id} className={n.dangLam ? "" : "text-fg-faint"}>
                <td className="px-4 py-2.5">
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
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">{n.phongBan}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{n.chucVu}</td>
                <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                  {n.soDienThoai ? (
                    <a href={`tel:${n.soDienThoai}`} className="hover:text-accent">{n.soDienThoai}</a>
                  ) : (
                    <span className="text-fg-faint">—</span>
                  )}
                </td>
                {quanTri && (
                  <HangNhanVien
                    nv={{
                      id: n.id,
                      ten: n.ten,
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
                    laChinhMinh={nguoi.id === n.id}
                  />
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {ds.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-fg-muted">Không có nhân viên nào khớp bộ lọc.</p>
        )}
      </div>
    </div>
  );
}
