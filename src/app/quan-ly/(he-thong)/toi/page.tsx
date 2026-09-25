import { getPrisma } from "@/lib/db";
import { batBuocDangNhap } from "@/lib/phienNhanVien";
import { TEN_VAI_TRO, laVaiTro } from "@/lib/nhanVienChung";
import { FormDoiMatKhau } from "../../FormDoiMatKhau";
import { AnhDaiDien } from "./AnhDaiDien";

export const dynamic = "force-dynamic";

/**
 * Tài khoản của tôi — thông tin của chính người đang đăng nhập và ô đổi mật
 * khẩu. Từ đợt 4, đây cũng là chỗ nhân viên xem lương của riêng mình.
 */
export default async function ToiPage() {
  const nguoi = await batBuocDangNhap();

  if (!nguoi.id) {
    return (
      <div className="max-w-xl">
        <p className="eyebrow">Tài khoản của tôi</p>
        <h1 className="mt-2 font-display text-3xl font-light">Quản lý</h1>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Anh đang đăng nhập bằng mật khẩu quản lý album — tài khoản chung, không
          gắn với nhân viên nào. Muốn có tài khoản riêng thì vào mục Nhân viên,
          cấp mật khẩu cho chính mình.
        </p>
      </div>
    );
  }

  const nv = await getPrisma().nhanVien.findUnique({
    where: { id: nguoi.id },
    include: { anh: { select: { nhanVienId: true } } },
  });
  if (!nv) return null;

  const dong: [string, string | null][] = [
    ["Tên đăng nhập", nv.tenDangNhap],
    ["Phòng ban", nv.phongBan],
    ["Chức vụ", nv.chucVu],
    ["Điện thoại", nv.soDienThoai],
    ["Vai trò", TEN_VAI_TRO[laVaiTro(nv.vaiTro) ? nv.vaiTro : "nhan-vien"]],
  ];

  return (
    <div className="max-w-xl">
      <p className="eyebrow">Tài khoản của tôi</p>
      <h1 className="mt-2 font-display text-3xl font-light">{nv.ten}</h1>

      {/* Ảnh đại diện cho khu "Đội ngũ" ngoài trang giới thiệu (25/09/2026). */}
      <div className="mt-6 rounded-md border border-line bg-bg-raised p-5">
        <h2 className="eyebrow">Ảnh đại diện</h2>
        <div className="mt-3">
          <AnhDaiDien nhanVienId={nv.id} coAnhSan={!!nv.anh} />
        </div>
      </div>

      <dl className="mt-6 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
        {dong.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
            <dt className="text-fg-muted">{k}</dt>
            <dd>{v || "—"}</dd>
          </div>
        ))}
      </dl>

      <h2 className="eyebrow mt-10">Đổi mật khẩu</h2>
      <div className="mt-3 rounded-md border border-line bg-bg-raised p-5">
        <FormDoiMatKhau batBuoc={false} />
      </div>
    </div>
  );
}
