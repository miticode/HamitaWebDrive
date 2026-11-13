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

  const prisma = getPrisma();
  const [ds, taiLieu] = await Promise.all([
    prisma.noiQuy.findMany({
      where: quanTri ? {} : { dangApDung: true },
      orderBy: [{ dangApDung: "desc" }, { thuTu: "asc" }],
    }),
    /*
      Tài liệu nội bộ — bảng "Tài liệu" bên AppSheet (7 dòng), chép về ở đợt 6.
      Đặt ở ĐÂY chứ không dựng trang riêng: 7 dòng không đủ một trang, mà người
      vào đọc nội quy cũng chính là người cần mấy tài liệu này.
    */
    prisma.taiLieu.findMany({
      where: { matBenAppSheet: null },
      orderBy: [{ maTaiLieu: "asc" }],
      select: { id: true, maTaiLieu: true, ten: true, loai: true, link: true, tinhTrang: true },
    }),
  ]);

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

      {taiLieu.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-light">Tài liệu nội bộ</h2>
          <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
            {taiLieu.map((t) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="min-w-0">
                    {t.link ? (
                      <a
                        href={t.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-accent"
                      >
                        {t.ten}
                      </a>
                    ) : (
                      t.ten
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-fg-faint tabular-nums">{t.maTaiLieu ?? ""}</span>
                </div>
                {t.loai && <p className="mt-0.5 text-xs text-fg-faint">{t.loai}</p>}
              </li>
            ))}
          </ul>
          {/*
            Bảy tài liệu này đều là video dạy dùng CHÍNH app AppSheet. Nói thẳng
            ra đây, để không ai mở lên rồi tưởng đó là hướng dẫn dùng web.
          */}
          <p className="mt-2 text-xs leading-relaxed text-fg-faint">
            Chép từ AppSheet. Bảy mục này hướng dẫn dùng <span className="text-fg-muted">app
            AppSheet cũ</span>, không phải trang web này — hướng dẫn dùng web nằm ở trang Quản lý
            album ảnh.
          </p>
        </section>
      )}
    </div>
  );
}
