import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { STUDIO } from "@/lib/studio";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { FormThongTin } from "./FormThongTin";

export const dynamic = "force-dynamic";

/**
 * Thông tin studio — chỉ quản lý (bên AppSheet cũ mục này cũng chỉ Admin xem):
 * có số tài khoản ngân hàng.
 *
 * Hai phần, khác nhau về NƠI GIỮ:
 * - Liên hệ công khai: đọc từ src/lib/studio.ts, CHỈ HIỆN LẠI. Trang giới
 *   thiệu và khung Hỏi Hamita đọc từ đó; cho sửa riêng ở đây là có hai số
 *   điện thoại lệch nhau — đo 15/09/2026, AppSheet đã ghi địa chỉ "377" lẫn
 *   "337" trong cùng một ô.
 * - Nội bộ: trong database, sửa ngay tại đây.
 */
export default async function ThongTinPage() {
  const nguoi = await batBuocDangNhap();
  if (!laQuanTri(nguoi)) notFound();

  const tt = await getPrisma().thongTinStudio.findUnique({ where: { id: "studio" } });

  const congKhai: [string, string][] = [
    ["Tên", STUDIO.ten],
    ["Địa chỉ", STUDIO.diaChi],
    ["Điện thoại", STUDIO.dienThoai],
    ["Email", STUDIO.email],
    ["Giờ mở cửa", STUDIO.gioMoCua],
    ["Facebook", STUDIO.facebook],
    ["Zalo", STUDIO.zalo],
  ];

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Thông tin studio</p>
      <h1 className="mt-2 font-display text-3xl font-light">Thông tin studio</h1>

      <section className="mt-8">
        <h2 className="eyebrow">Nội bộ — chỉ quản lý thấy</h2>
        <p className="mt-1 text-xs text-fg-faint">
          Giờ làm và ngày công dùng để tính đi trễ và lương khi chấm công chuyển
          sang (đợt 4). Toạ độ để kiểm nhân viên chấm công đúng chỗ.
        </p>
        <div className="mt-3 rounded-md border border-line bg-bg-raised p-5">
          <FormThongTin
            banDau={{
              nguoiDaiDien: tt?.nguoiDaiDien ?? "",
              soTaiKhoan1: tt?.soTaiKhoan1 ?? "",
              soTaiKhoan2: tt?.soTaiKhoan2 ?? "",
              gioBatDau: tt?.gioBatDau ?? "",
              gioKetThuc: tt?.gioKetThuc ?? "",
              gioNghiGiuaBuoi: tt?.gioNghiGiuaBuoi?.toString() ?? "",
              ngayCongThang: tt?.ngayCongThang?.toString() ?? "",
              toaDo: tt?.toaDo ?? "",
            }}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="eyebrow">Liên hệ công khai</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fg-faint">
          Hiện trên trang giới thiệu và trong khung Hỏi Hamita của khách. Giữ một
          chỗ duy nhất để không bao giờ có hai số điện thoại khác nhau — muốn đổi
          thì nhắn em, sửa một lần là đổi khắp nơi.
        </p>
        <dl className="mt-3 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
          {congKhai.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-4 py-2.5">
              <dt className="text-fg-muted">{k}</dt>
              <dd className="min-w-0 break-words text-right">
                {v.startsWith("http") ? (
                  <a href={v} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-accent">
                    {v.replace(/^https?:\/\/(www\.)?/, "")}
                  </a>
                ) : (
                  v
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
