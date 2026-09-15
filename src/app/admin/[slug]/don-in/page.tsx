import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { STUDIO_NAME, tien } from "@/lib/constants";
import { goiCuaMucTheoTen, maSoFile, tinhTienIn } from "@/lib/anhIn";
import {
  getGalleryBySlug,
  getGoiMuc,
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
 * thu nhỏ và lời dặn trên từng tấm. Trang này để ĐƯA CHO NGƯỜI KHÁC LÀM — không
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

  const [lists, selections, goiMuc] = await Promise.all([
    getLists(gallery.id),
    getSelections(gallery.id),
    getGoiMuc(gallery.id),
  ]);

  /*
    Danh sách để IN là danh sách mang biểu tượng trái tim, không phải danh sách
    đầu tiên: thứ tự có thể đổi, còn biểu tượng thì gắn với ý nghĩa. Khách được
    dặn "bấm trái tim để Hamita in ra".
  */
  const dsIn = lists.find((l) => l.icon === "heart");

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
        a.fileName.localeCompare(b.fileName, "vi"),
    );

  const tenKhach = gallery.clientName ?? gallery.title;
  const ngay = ngayHomNay();
  const nhom = gomTheoThuMuc(anhIn);

  /*
    TÍNH TIỀN THEO TỪNG THƯ MỤC, không phải một lần cho cả album.

    Từ 10/09/2026 mỗi thư mục có thể mang một gói riêng — nhà khách chụp làm
    nhiều đợt, chụp cổng trước rồi ít lâu sau mới chụp cưới, mỗi đợt một gói.
    Cách cũ đem TOÀN BỘ số tấm khách thả tim so với DUY NHẤT con số chung của
    album, nên sai ở cả hai chiều tuỳ gói của nhà đó — đo thử một nhà có gói
    chung 21 và một thư mục đặt riêng 30: khách thả 10 tấm ở thư mục này và 40
    tấm ở thư mục kia, tính đúng là 120.000đ, tính gộp ra 348.000đ. Chiều
    ngược lại cũng xảy ra, và thu thiếu thì studio chịu.

    Thư mục không đặt riêng thì `goiCuaMucTheoTen` trả về con số chung của
    album, nên album một gói duy nhất ra đúng kết quả như trước.

    Ghép theo TÊN thư mục vì `Selection.albumName` chỉ lưu tên — xem chú thích
    ở goiCuaMucTheoTen để biết điểm yếu của cách ghép này.
  */
  const theoMuc = nhom.map(([thuMuc, ds]) => {
    const goi = goiCuaMucTheoTen(goiMuc, thuMuc, gallery.soAnhTrongGoi);
    return {
      thuMuc,
      ds,
      goi,
      tinh: tinhTienIn(ds.length, goi, gallery.giaAnhThem),
    };
  });

  /*
    Chỉ bày bảng tách theo thư mục khi album THẬT SỰ có gói riêng. Album một
    gói duy nhất (phần lớn) giữ nguyên tờ đơn cũ — thêm một bảng nữa cho cùng
    một con số chỉ làm người cầm tờ giấy phải đọc hai lần để yên tâm là chúng
    khớp nhau.
  */
  const coGoiRieng = goiMuc.length > 0;

  /*
    Tổng của cả đơn.

    Chỉ cộng những thư mục CÓ tính tiền. Album chưa đặt gói nào thì
    `thanhTien` là null ở mọi thư mục và tổng cũng là null — giữ đúng luật cũ:
    không đặt gói thì đơn không tự nghĩ ra một con số tiền nào (xem anhIn.ts).
  */
  const coTinhTien = theoMuc.some((m) => m.tinh.thanhTien !== null);
  const tinh = coGoiRieng
    ? {
        soTam: anhIn.length,
        trongGoi: coTinhTien
          ? theoMuc.reduce((t, m) => t + (m.tinh.trongGoi ?? 0), 0)
          : null,
        vuotGoi: coTinhTien
          ? theoMuc.reduce((t, m) => t + (m.tinh.vuotGoi ?? 0), 0)
          : null,
        thanhTien: coTinhTien
          ? theoMuc.reduce((t, m) => t + (m.tinh.thanhTien ?? 0), 0)
          : null,
      }
    : tinhTienIn(anhIn.length, gallery.soAnhTrongGoi, gallery.giaAnhThem);

  /* Bản chữ để dán vào Zalo — cùng nội dung với tờ in, chỉ bỏ phần trình bày. */
  const banChu = [
    `ĐƠN GIAO IN — ${tenKhach}`,
    `${STUDIO_NAME} · ${ngay}`,
    "",
    `Tổng số tấm in: ${anhIn.length}`,
    /*
      Goi 0 tam ("chi lay file") thi bo dong "Trong goi: 0/0" — no khong noi
      duoc gi ma con lam nguoi doc tuong studio quen dien so. Noi thang la goi
      khong kem tam in nao, roi liet ke tien nhu thuong.
    */
    ...(tinh.thanhTien === null
      ? []
      : coGoiRieng
        ? /*
            Co goi rieng thi CHIA TUNG DONG cho tung thu muc roi moi cong tong.

            Ban chu nay studio dan thang cho khach qua Zalo. Chi dua con so tong
            thi khach hoi lai ngay "sao lai ra tung ay" — ma cau tra loi that su
            la "vi moi dot mot goi khac nhau", thu khong the doan ra tu mot dong
            duy nhat.
          */
          [
            ...theoMuc.flatMap((m) =>
              m.tinh.thanhTien === null
                ? [`${m.thuMuc}: ${m.ds.length} tấm — album chưa đặt gói`]
                : [
                    `${m.thuMuc}: ${m.ds.length} tấm` +
                      (m.goi === 0
                        ? " — gói chỉ lấy file"
                        : ` — trong gói ${m.tinh.trongGoi}/${m.goi}`) +
                      `, vượt ${m.tinh.vuotGoi} tấm = ${tien(m.tinh.thanhTien)}đ`,
                  ],
            ),
            `Cộng: khách trả thêm ${tien(tinh.thanhTien)}đ`,
          ]
        : gallery.soAnhTrongGoi === 0
          ? [
              "Gói chỉ lấy file — không kèm tấm in nào",
              `In thêm: ${tinh.vuotGoi} tấm × ${tien(gallery.giaAnhThem)}đ = ${tien(tinh.thanhTien)}đ`,
            ]
          : [
              `Trong gói: ${tinh.trongGoi}/${gallery.soAnhTrongGoi}`,
              `Vượt gói: ${tinh.vuotGoi} tấm × ${tien(gallery.giaAnhThem)}đ = ${tien(tinh.thanhTien)}đ`,
            ]),
    "",
    ...nhom.flatMap(([thuMuc, ds]) => [
      `--- ${thuMuc} (${ds.length} tấm) ---`,
      ...ds.map(
        (a) =>
          `${maSoFile(a.fileName)}  ${a.fileName}${a.note ? `  [${a.note}]` : ""}`,
      ),
      "",
    ]),
  ].join("\n");

  return (
    <main className="trang-don-in mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
      <div className="khong-in flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/${slug}`}
          className="eyebrow transition hover:text-accent"
        >
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
              ) : coGoiRieng ? (
                /*
                  Nhà chụp nhiều đợt: mỗi thư mục một dòng, rồi mới tới tổng.

                  KHÔNG gộp thành một dòng "trong gói x/y" như album một gói:
                  hai đợt chụp là hai lần mua khác nhau, mà một mẫu số chung
                  thì không nói được đợt nào vượt bao nhiêu. Người ngồi thu
                  tiền cần đọc ra từng đợt, không phải một con số đã trộn.
                */
                <>
                  {theoMuc.map((m) => (
                    <div key={m.thuMuc} className="px-4 py-2.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="min-w-0 break-words">{m.thuMuc}</dt>
                        <dd className="shrink-0 tabular-nums">
                          {m.tinh.thanhTien === null
                            ? "chưa đặt gói"
                            : `${tien(m.tinh.thanhTien)}đ`}
                        </dd>
                      </div>
                      <p className="mt-0.5 text-xs text-fg-faint tabular-nums">
                        {m.ds.length} tấm ·{" "}
                        {m.tinh.thanhTien === null
                          ? "không tính tiền phát sinh"
                          : m.goi === 0
                            ? `gói chỉ lấy file · in ${m.tinh.vuotGoi} tấm`
                            : `trong gói ${m.tinh.trongGoi}/${m.goi} · vượt ${m.tinh.vuotGoi} tấm`}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between bg-bg-soft px-4 py-3">
                    <dt className="font-medium">Khách trả thêm</dt>
                    <dd className="font-display text-2xl tabular-nums">
                      {tien(tinh.thanhTien)}đ
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  {/*
                    Gói 0 tấm thì hàng "Trong gói 0/0" không nói được gì mà còn
                    làm người đọc tưởng studio quên điền số — thay bằng một
                    dòng nói thẳng bản chất của gói.
                  */}
                  {gallery.soAnhTrongGoi === 0 ? (
                    <div className="px-4 py-2.5 text-xs text-fg-muted">
                      Gói chỉ lấy file — không kèm tấm in nào, mọi tấm khách thả
                      tim đều tính tiền in.
                    </div>
                  ) : (
                    <div className="flex items-baseline justify-between px-4 py-2.5">
                      <dt className="text-fg-muted">Trong gói</dt>
                      <dd className="tabular-nums">
                        {tinh.trongGoi}/{gallery.soAnhTrongGoi} tấm
                      </dd>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between px-4 py-2.5">
                    <dt className="text-fg-muted">
                      {gallery.soAnhTrongGoi === 0 ? "In thêm" : "Vượt gói"} ·{" "}
                      {tien(gallery.giaAnhThem)}đ mỗi tấm
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

          {theoMuc.map(({ thuMuc, ds, goi }) => (
            <section key={thuMuc} className="khoi-thu-muc mt-8">
              {/*
                Gói của thư mục ghi ngay trên đầu danh sách ảnh của nó, chỉ khi
                album có gói riêng. Người ngồi làm đơn nhìn thẳng vào khối ảnh
                đang làm, không phải cuộn ngược lên bảng tính tiền để nhớ đợt
                này được bao nhiêu tấm.
              */}
              <h2 className="eyebrow border-b border-line pb-2">
                {thuMuc} · {ds.length} tấm
                {coGoiRieng && goi !== null && (
                  <> · gói {goi === 0 ? "chỉ lấy file" : `${goi} tấm`}</>
                )}
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
                      <td className="py-2 align-top text-fg-muted">
                        {a.fileName}
                      </td>
                      <td className="py-2 align-top">{a.note ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}

    </main>
  );
}
