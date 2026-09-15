import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";

export const dynamic = "force-dynamic";

/*
  Những phần đang làm, theo đúng thứ tự trong kế hoạch 15/09/2026. Đây là một
  lộ trình có thứ tự thật (phần sau dựng trên phần trước), nên đánh số là mang
  thông tin, không phải trang trí.
*/
const SAP_CO = [
  { dot: 2, ten: "Hợp đồng & khách hàng", mo: "Hợp đồng, phiếu thu, quy trình trạng thái, tự nối với album ảnh." },
  { dot: 3, ten: "Lịch & công việc", mo: "Lịch chụp, lịch soạn váy, chia việc dạng kanban, khách tiềm năng." },
  { dot: 4, ten: "Nhân sự & chi", mo: "Chấm công, đơn xin, thưởng phạt, lương tháng, phiếu chi." },
  { dot: 5, ten: "Báo cáo", mo: "Báo cáo tổng hợp, doanh thu kỳ vọng, chỉ tiêu doanh số." },
];

export default async function TongQuanPage() {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);

  const nhanVien = quanTri
    ? await getPrisma().nhanVien.findMany({
        where: { dangLam: true },
        select: { matKhau: true, doiMatKhau: true },
      })
    : [];
  const chuaCo = nhanVien.filter((n) => !n.matKhau).length;
  const choDoi = nhanVien.filter((n) => n.matKhau && n.doiMatKhau).length;

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Tổng quan</p>
      <h1 className="mt-2 font-display text-3xl font-light">
        Chào {nguoi.id ? nguoi.ten : "anh"}
      </h1>

      {quanTri && (
        <section className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-bg-raised p-4">
            <p className="text-xs text-fg-muted">Nhân viên đang làm</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{nhanVien.length}</p>
          </div>
          {/*
            Thẻ "chưa có mật khẩu" tô màu cảnh báo khi còn người chưa được cấp:
            đó là việc duy nhất anh cần làm ngay để cả tiệm dùng được.
          */}
          <Link
            href="/quan-ly/nhan-vien"
            className={`rounded-md border p-4 transition hover:border-accent ${
              chuaCo > 0 ? "border-amber-300 bg-amber-50 text-amber-900" : "border-line bg-bg-raised"
            }`}
          >
            <p className={`text-xs ${chuaCo > 0 ? "" : "text-fg-muted"}`}>Chưa có mật khẩu</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{chuaCo}</p>
            {chuaCo > 0 && <p className="mt-1 text-xs">Cấp ở mục Nhân viên →</p>}
          </Link>
          <div className="rounded-md border border-line bg-bg-raised p-4">
            <p className="text-xs text-fg-muted">Đã cấp, chờ tự đổi mật khẩu</p>
            <p className="mt-1 font-display text-3xl tabular-nums">{choDoi}</p>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="eyebrow">Đang có</h2>
        <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
          <li className="flex items-baseline justify-between gap-4 px-4 py-3">
            <Link href="/quan-ly/nhan-vien" className="font-medium hover:text-accent">
              Nhân viên
            </Link>
            <span className="text-right text-fg-muted">
              Danh bạ cả tiệm{quanTri ? ", cấp mật khẩu, phân quyền" : ""}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-4 px-4 py-3">
            <Link href="/quan-ly/noi-quy" className="font-medium hover:text-accent">
              Nội quy
            </Link>
            <span className="text-right text-fg-muted">Nội quy và mức phạt{quanTri ? ", sửa được" : ""}</span>
          </li>
          {quanTri && (
            <li className="flex items-baseline justify-between gap-4 px-4 py-3">
              <Link href="/quan-ly/thong-tin" className="font-medium hover:text-accent">
                Thông tin studio
              </Link>
              <span className="text-right text-fg-muted">Tài khoản ngân hàng, giờ làm, ngày công</span>
            </li>
          )}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Sắp có — thay dần AppSheet</h2>
        <ol className="mt-3 divide-y divide-line rounded-md border border-line text-sm">
          {SAP_CO.map((s) => (
            <li key={s.dot} className="flex gap-4 px-4 py-3">
              <span className="w-12 shrink-0 text-fg-faint tabular-nums">Đợt {s.dot}</span>
              <span className="min-w-0">
                <span className="font-medium">{s.ten}</span>
                <span className="block text-fg-muted">{s.mo}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-fg-faint">
          Trong lúc chờ, tiệm vẫn dùng AppSheet cho các phần này như bình thường.
        </p>
      </section>
    </div>
  );
}
