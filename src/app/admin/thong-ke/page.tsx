import Link from "next/link";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/auth";
import { databaseIsConfigured } from "@/lib/db";
import { docThongKe } from "@/lib/thongKe";
import { LoginForm } from "../LoginForm";
import { NutDoiTong } from "../NutDoiTong";

export const dynamic = "force-dynamic";

/**
 * Thống kê cho studio.
 *
 * Xếp theo VIỆC CẦN LÀM chứ không theo con số đẹp: phần đầu trang là danh sách
 * khách nên nhắn, phần sau mới là số liệu để hiểu thói quen khách. Một trang
 * thống kê chỉ toàn biểu đồ thì xem một lần rồi thôi; trang này mở ra là biết
 * hôm nay phải gọi cho ai.
 */

/** Một chữ số sau dấu phẩy, viết kiểu Việt. */
function so(n: number): string {
  return n.toFixed(1).replace(".", ",");
}

function docSoNgay(n: number): string {
  if (n <= 0) return "hôm nay";
  if (n === 1) return "hôm qua";
  return `${n} ngày trước`;
}

export default async function ThongKePage() {
  if (!(await isAdmin())) return <LoginForm />;

  const tongToi = (await cookies()).get("admin-tong")?.value === "toi";

  if (!databaseIsConfigured()) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="notice bg-amber-100 text-amber-900">
          Thống kê cần database. Đang chạy bằng file trên máy.
        </p>
      </main>
    );
  }

  const tk = await docThongKe();
  const dinhGio = Math.max(...tk.gioHayChon, 1);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="eyebrow transition hover:text-accent">
          ← Tất cả album
        </Link>
        <NutDoiTong toiBanDau={tongToi} />
      </div>

      <h1 className="mt-3 border-b border-line pb-6 font-display text-2xl font-light sm:text-3xl">
        Thống kê
      </h1>

      {/* ── Việc cần làm, đặt trên cùng ───────────────────────────────── */}
      <section className="mt-8">
        <h2 className="eyebrow">Nên nhắn khách</h2>

        {tk.canNhac.length === 0 ? (
          <p className="mt-3 text-sm text-fg-muted">
            Không có ai đang chờ. Mọi album đều đã chọn xong hoặc khách vẫn đang
            chọn đều.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {tk.canNhac.map((c) => (
              <li
                key={c.slug}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
              >
                <Link
                  href={`/admin/${c.slug}`}
                  className="text-sm font-medium hover:text-accent"
                >
                  {c.ten}
                </Link>
                <span className="text-xs text-fg-muted">
                  {c.lyDo} · {docSoNgay(c.soNgay)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {tk.soAlbumChuaDoLuotXem > 0 && (
          <p className="mt-3 text-xs text-fg-faint">
            {tk.soAlbumChuaDoLuotXem} album tạo trước ngày 26/08/2026 nên chưa đo
            được lượt mở — với những album đó, “chưa mở link” không kết luận
            được, chỉ biết là chưa chọn tấm nào.
          </p>
        )}
      </section>

      {/* ── Tổng quan ─────────────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="eyebrow">Tổng quan</h2>
        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-5">
          {[
            { so: tk.tongQuan.soAlbum, nhan: "Album" },
            { so: tk.tongQuan.soAnh.toLocaleString("vi-VN"), nhan: "Ảnh trên Drive" },
            { so: tk.tongQuan.soTamDaChon, nhan: "Lượt khách chọn" },
            { so: tk.tongQuan.soAlbumDaXongHet, nhan: "Album xong hẳn" },
            {
              so: tk.tongQuan.soTamDaTai.toLocaleString("vi-VN"),
              nhan: "Tấm khách đã tải",
            },
          ].map((o) => (
            <div key={o.nhan} className="bg-bg-raised px-4 py-3.5">
              <p className="font-display text-2xl font-light tabular-nums">{o.so}</p>
              <p className="eyebrow mt-1">{o.nhan}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Khách chọn nhanh hay chậm ─────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="eyebrow">Khách mất bao lâu</h2>
        <dl className="mt-3 divide-y divide-line rounded-md border border-line text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <dt className="text-fg-muted">Từ lúc gửi link tới tấm đầu tiên</dt>
            <dd className="tabular-nums">
              {tk.thoiGian.ngayToiTamDau === null ? (
                <span className="text-fg-faint">chưa đủ dữ liệu</span>
              ) : (
                <>
                  {so(tk.thoiGian.ngayToiTamDau)} ngày{" "}
                  <span className="text-xs text-fg-faint">
                    ({tk.thoiGian.soMauToiTamDau} album)
                  </span>
                </>
              )}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3">
            <dt className="text-fg-muted">Từ lúc gửi link tới lúc báo chọn xong</dt>
            <dd className="tabular-nums">
              {tk.thoiGian.ngayToiBaoXong === null ? (
                <span className="text-fg-faint">chưa đủ dữ liệu</span>
              ) : (
                <>
                  {so(tk.thoiGian.ngayToiBaoXong)} ngày{" "}
                  <span className="text-xs text-fg-faint">
                    ({tk.thoiGian.soMauToiBaoXong} album)
                  </span>
                </>
              )}
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-fg-faint">
          Số album trong ngoặc là số mẫu tính được. Ít mẫu thì con số trung bình
          chưa nói lên điều gì — cứ để nó lớn dần theo thời gian.
        </p>
      </section>

      {/* ── Thư mục khách hay chọn ────────────────────────────────────── */}
      {tk.thuMucHayChon.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow">Khách thả tim nhiều nhất ở thư mục nào</h2>
          <ul className="mt-3 divide-y divide-line rounded-md border border-line text-sm">
            {tk.thuMucHayChon.map((t) => (
              <li
                key={t.ten}
                className="flex flex-wrap items-baseline justify-between gap-x-4 px-4 py-2.5"
              >
                <span className="min-w-0 truncate">{t.ten}</span>
                <span className="tabular-nums text-fg-muted">{t.soTam} tấm</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-faint">
            Gộp theo tên thư mục trên mọi album — thấy được kiểu chụp nào khách
            hay chọn để in.
          </p>
        </section>
      )}

      {/* ── Giờ khách hay chọn ────────────────────────────────────────── */}
      <section className="mt-12">
        <h2 className="eyebrow">Giờ khách hay ngồi chọn ảnh</h2>
        <div className="mt-4 flex h-24 items-end gap-px">
          {tk.gioHayChon.map((n, gio) => (
            <div
              key={gio}
              className="group relative flex-1"
              title={`${gio}h — ${n} lượt chọn`}
            >
              <div
                className={`w-full rounded-t-[2px] ${n > 0 ? "bg-accent" : "bg-line"}`}
                style={{ height: `${Math.max(2, (n / dinhGio) * 96)}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-fg-faint tabular-nums">
          <span>0h</span>
          <span>6h</span>
          <span>12h</span>
          <span>18h</span>
          <span>23h</span>
        </div>
        <p className="mt-2 text-xs text-fg-faint">
          Giờ Việt Nam. Biết khách hay ngồi chọn lúc nào thì nhắn vào đúng lúc
          đó, và trực sẵn để trả lời khi họ phân vân.
        </p>
      </section>
    </main>
  );
}
