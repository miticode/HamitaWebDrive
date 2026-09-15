import { getPrisma } from "@/lib/db";
import { tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { BangNoiQuy } from "./BangNoiQuy";

export const dynamic = "force-dynamic";

/**
 * Nội quy studio — ai cũng xem được (như bên AppSheet cũ), chỉ quản lý sửa.
 *
 * Nhân viên chỉ thấy nội quy ĐANG ÁP DỤNG. Quản lý thấy cả nội quy đã ngưng,
 * để bật lại được — không bao giờ xoá, vì các lần phạt đã ghi vẫn trỏ tới nó.
 */
export default async function NoiQuyPage() {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);

  const ds = await getPrisma().noiQuy.findMany({
    where: quanTri ? {} : { dangApDung: true },
    orderBy: [{ dangApDung: "desc" }, { thuTu: "asc" }],
  });

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Thông tin studio</p>
      <h1 className="mt-2 font-display text-3xl font-light">Nội quy</h1>
      <p className="mt-2 text-sm text-fg-muted">Vi phạm mỗi lần bị trừ đúng mức ghi bên cạnh.</p>

      {quanTri ? (
        <BangNoiQuy
          ds={ds.map((n) => ({
            id: n.id,
            noiDung: n.noiDung,
            mucPhat: n.mucPhat,
            dangApDung: n.dangApDung,
          }))}
        />
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
          {ds.map((n) => (
            <li key={n.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <span className="min-w-0">{n.noiDung}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {n.mucPhat > 0 ? `${tien(n.mucPhat)}đ` : "nhắc nhở"}
              </span>
            </li>
          ))}
          {ds.length === 0 && <li className="px-4 py-8 text-center text-fg-muted">Chưa có nội quy nào.</li>}
        </ul>
      )}
    </div>
  );
}
