import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { STUDIO_NAME } from "@/lib/constants";
import { maSoFile, tien, tinhTienIn } from "@/lib/anhIn";
import {
  getGalleryBySlug,
  getLists,
  getSelections,
  type Selection,
} from "@/lib/store";
import { LoginForm } from "../../LoginForm";
import { NutDonIn } from "./NutDonIn";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

/**
 * Đơn giao in — tờ giấy đưa cho bên in ảnh, hoặc chép gửi đội Media.
 *
 * Khác trang "Ảnh khách chọn" ở chỗ nào: trang kia để studio NGỒI XEM, có ảnh
 * thu nhỏ, có cả hai danh sách. Trang này để ĐƯA CHO NGƯỜI KHÁC LÀM — không
 * ảnh, chỉ mã số và ghi chú, và chỉ những tấm thật sự phải in.
 *
 * Xem `src/lib/anhIn.ts` để biết vì sao chỉ tính danh sách "Ảnh in".
 */

/**
 * Ngày hôm nay, dạng dd/mm/yyyy.
 *
 * Để ngoài thân component: `new Date()` là hàm bất thuần, viết thẳng trong
 * component thì ESLint của React 19 chặn (bẫy đã ghi trong CLAUDE.md).
 */
function ngayHomNay(): string {
  return new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function gomTheoThuMuc(anh: Selection[]): [string, Selection[]][] {
  const nhom = new Map<string, Selection[]>();
  for (const a of anh) {
    const ten = a.albumName || "(thư mục gốc)";
    const co = nhom.get(ten);
    if (co) co.push(a);
    else nhom.set(ten, [a]);
  }
  return [...nhom.entries()];
}

export default async function DonInPage({ params }: Props) {
  if (!(await isAdmin())) return <LoginForm />;

  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const [lists, selections] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
  ]);

  /*
    Danh sách để IN là danh sách mang biểu tượng trái tim, không phải danh sách
    đầu tiên: thứ tự có thể đổi, còn biểu tượng thì gắn với ý nghĩa. Khách được
    dặn "bấm trái tim để Hamita in ra".
  */
  const dsIn = lists.find((l) => l.icon === "heart");
  const dsGiuRieng = lists.find((l) => l.icon === "check");

  /*
    Đếm theo TẤM RIÊNG BIỆT. Một tấm chỉ có thể nằm một lần trong cùng một danh
    sách (ràng buộc unique trong database), nên ở đây lọc theo listId là đủ —
    nhưng vẫn lọc trùng driveFileId cho chắc, phòng khi sau này có thêm cách
    ghi khác.
  */
  const daThay = new Set<string>();
  const anhIn = selections
    .filter((s) => s.listId === dsIn?.id)
    .filter((s) => {
      if (daThay.has(s.driveFileId)) return false;
      daThay.add(s.driveFileId);
      return true;
    })
    .sort(
      (a, b) =>
        a.albumName.localeCompare(b.albumName, "vi") ||
        a.fileName.localeCompare(b.fileName, "vi")
    );

  const soGiuRieng = new Set(
    selections.filter((s) => s.listId === dsGiuRieng?.id).map((s) => s.driveFileId)
  ).size;

  const tinh = tinhTienIn(
    anhIn.length,
    gallery.soAnhTrongGoi,
    gallery.giaAnhThem
  );

  const tenKhach = gallery.clientName ?? gallery.title;
  const ngay = ngayHomNay();
  const nhom = gomTheoThuMuc(anhIn);

  /* Bản chữ để dán vào Zalo — cùng nội dung với tờ in, chỉ bỏ phần trình bày. */
  const banChu = [
    `ĐƠN GIAO IN — ${tenKhach}`,
    `${STUDIO_NAME} · ${ngay}`,
    "",
    `Tổng số tấm in: ${anhIn.length}`,
    ...(tinh.thanhTien !== null
      ? [
          `Trong gói: ${tinh.trongGoi}/${gallery.soAnhTrongGoi}`,
          `Vượt gói: ${tinh.vuotGoi} tấm × ${tien(gallery.giaAnhThem)}đ = ${tien(tinh.thanhTien)}đ`,
        ]
      : []),
    "",
    ...nhom.flatMap(([thuMuc, ds]) => [
      `--- ${thuMuc} (${ds.length} tấm) ---`,
      ...ds.map(
        (a) => `${maSoFile(a.fileName)}  ${a.fileName}${a.note ? `  [${a.note}]` : ""}`
      ),
      "",
    ]),
  ].join("\n");

  return (
    <main className="trang-don-in mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="khong-in flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/${slug}`} className="eyebrow transition hover:text-accent">
          ← Ảnh khách chọn
        </Link>
        <NutDonIn chu={banChu} />
      </div>

      <header className="mt-6 border-b border-line pb-5">
        <p className="eyebrow">Đơn giao in</p>
        <h1 className="mt-2 font-display text-3xl font-light">{tenKhach}</h1>
        <p className="mt-2 text-sm text-fg-muted">
          {STUDIO_NAME} · {ngay} · <code>{slug}</code>
        </p>
      </header>

      {anhIn.length === 0 ? (
        <p className="mt-10 text-sm text-fg-muted">
          Khách chưa thả tim tấm nào, chưa có gì để in.
        </p>
      ) : (
        <>
          {/*
            Bảng tính tiền đặt NGAY ĐẦU, trước danh sách ảnh: người cầm tờ này
            cần biết con số tổng trước, còn danh sách là để dò khi làm.
          */}
          <section className="mt-6 rounded-md border border-line-strong">
            <dl className="divide-y divide-line text-sm">
              <div className="flex items-baseline justify-between px-4 py-2.5">
                <dt className="text-fg-muted">Tổng số tấm in</dt>
                <dd className="font-medium tabular-nums">{anhIn.length} tấm</dd>
              </div>

              {tinh.thanhTien === null ? (
                <div className="px-4 py-2.5 text-xs text-fg-muted">
                  Album này chưa đặt số ảnh trong gói, nên đơn không tính tiền
                  phát sinh. Đặt ở trang quản lý, dòng “Gói ảnh”.
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between px-4 py-2.5">
                    <dt className="text-fg-muted">Trong gói</dt>
                    <dd className="tabular-nums">
                      {tinh.trongGoi}/{gallery.soAnhTrongGoi} tấm
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between px-4 py-2.5">
                    <dt className="text-fg-muted">
                      Vượt gói · {tien(gallery.giaAnhThem)}đ mỗi tấm
                    </dt>
                    <dd className="tabular-nums">{tinh.vuotGoi} tấm</dd>
                  </div>
                  <div className="flex items-baseline justify-between bg-bg-soft px-4 py-3">
                    <dt className="font-medium">Khách trả thêm</dt>
                    <dd className="font-display text-2xl tabular-nums">
                      {tien(tinh.thanhTien)}đ
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          {nhom.map(([thuMuc, ds]) => (
            <section key={thuMuc} className="khoi-thu-muc mt-8">
              <h2 className="eyebrow border-b border-line pb-2">
                {thuMuc} · {ds.length} tấm
              </h2>
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-fg-faint">
                    <th className="w-10 py-2 font-normal">#</th>
                    <th className="w-24 py-2 font-normal">Mã số</th>
                    <th className="py-2 font-normal">Tên file</th>
                    <th className="py-2 font-normal">Khách dặn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {ds.map((a, i) => (
                    <tr key={a.id}>
                      <td className="py-2 align-top text-fg-faint tabular-nums">
                        {i + 1}
                      </td>
                      <td className="py-2 align-top font-medium tabular-nums">
                        {maSoFile(a.fileName)}
                      </td>
                      <td className="py-2 align-top text-fg-muted">{a.fileName}</td>
                      <td className="py-2 align-top">{a.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}

      {/*
        Nói rõ số tấm KHÔNG in, để người cầm đơn không tưởng là đơn bị thiếu.
        Khách được dặn dấu tick là "giữ riêng cho mình" nên những tấm đó không
        được in và không được tính tiền.
      */}
      {soGiuRieng > 0 && (
        <p className="mt-10 border-t border-line pt-4 text-xs leading-relaxed text-fg-muted">
          Khách còn tick <b>{soGiuRieng} tấm</b> để giữ riêng cho mình — không
          nằm trong đơn in này và không tính tiền.
        </p>
      )}
    </main>
  );
}
