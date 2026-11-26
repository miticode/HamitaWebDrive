import Link from "next/link";
import { getPrisma } from "@/lib/db";
import {
  chuConLai,
  homNayStudio,
  ngayStudio,
  ngayVietTat,
  soNgayToiHan,
  tien,
} from "@/lib/constants";
import { batBuocDangNhap, laQuanTri, xemHopDong } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { boDau } from "@/lib/dichVuChung";
import { khoaCuaToi, khoaNguoi, tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { locHauKy } from "@/lib/nhomViec";
import { NutViec } from "../NutViec";
import {
  BUOC_HAU_KY,
  CHO_LAU,
  gapTruoc,
  mocDaQua,
  soNgayCho,
  tenBuocHauKy,
  type BuocHauKy,
} from "@/lib/hangChoHauKy";

export const dynamic = "force-dynamic";

/*
  HÀNG CHỜ HẬU KỲ — hợp đồng đang ở bước 5 hoặc 14, anh yêu cầu 26/11/2026:
  "hiện lên cho a phần trạng thái số 5 và số 14, khi ấn vô mục đó thì sẽ hiển
  thị như bên app sheet và hãy làm đẹp hơn và dễ dùng hơn".

  Bên AppSheet đây là màn "TIẾN ĐỘ HĐ" lọc theo trạng thái: một bảng MƯỜI CỘT
  phải cuộn ngang, gom nhóm theo loại dịch vụ. Trang này giữ phép gom nhóm ấy
  — nó đúng và quen mắt — nhưng bỏ bảng ngang: ba trong mười cột (tên khách,
  danh sách DV, ghi chú) là chữ dài, mà bảng thì cột nào cũng phải rộng bằng
  dòng dài nhất của nó, nên mười cột ấy không bao giờ nằm vừa một màn.

  BA THỨ THÊM so với AppSheet, đều trả lời câu người ta mở màn này ra để hỏi:

    - CHỜ BAO LÂU RỒI, tính từ buổi chụp cuối cùng đã qua. AppSheet chỉ hiện
      ngày chụp, còn lại phải tự trừ nhẩm từng dòng.
    - AI ĐANG CẦM việc hậu kỳ, và xong mấy việc rồi. Đây là chỗ web biết rõ
      hơn AppSheet: `CongViec` có cả người phụ trách lẫn trạng thái.
    - ĐÃ DỰNG ALBUM CHƯA. Chỉnh xong mà chưa có album thì không gửi khách
      duyệt được, tức hợp đồng vẫn kẹt ở bước này dù việc đã làm xong.

  Trong mỗi nhóm, nhà CHỜ LÂU NHẤT đứng đầu — ngược với AppSheet (xếp theo
  tên). Màn này không dùng để tra một nhà cụ thể (ô tìm ở trang Đầu việc và
  trang Hợp đồng lo việc đó), nó dùng để biết nên làm nhà nào trước.

  QUYỀN: ai đăng nhập cũng vào được, khác trang Hợp đồng (chỉ quản lý + sale).
  Người cần màn này nhất là phòng Media, mà họ là nhân viên thường — chặn thì
  màn hình thành vô dụng. Đổi lại, KHỐI TIỀN chỉ hiện với người được xem hợp
  đồng; đó mới là phần nhạy cảm, không phải chuyện nhà nào đang chờ chỉnh.
*/

type Props = { searchParams: Promise<{ buoc?: string; q?: string }> };

export default async function HangChoHauKyPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const xemTien = xemHopDong(nguoi);
  const quanTri = laQuanTri(nguoi);
  const khoaToi = khoaCuaToi(nguoi);
  const sp = await searchParams;
  const soNhap = Number(sp.buoc);
  const buocLoc: BuocHauKy | null = BUOC_HAU_KY.includes(soNhap as BuocHauKy)
    ? (soNhap as BuocHauKy)
    : null;
  const q = (sp.q ?? "").trim();
  const nay = homNayStudio();

  const prisma = getPrisma();
  const [ds, demBuoc, bangTen, dsNhanVien] = await Promise.all([
    prisma.hopDong.findMany({
      where: {
        matBenAppSheet: null,
        buoc: buocLoc === null ? { in: [...BUOC_HAU_KY] } : buocLoc,
      },
      select: {
        id: true,
        tenKhach: true,
        loaiDV: true,
        danhSachDV: true,
        ghiChu: true,
        buoc: true,
        tongTien: true,
        conLai: true,
        nguoiLapMaNV: true,
        lich: { select: { ngay: true } },
        /*
          HẠN KHÁCH CẦN LẤY HÌNH — anh yêu cầu 26/11/2026: "ở phần khi khách
          chọn xong hình có phần hỏi khách khi nào cần có hình thì em hãy lấy
          phần đó đem vô đây hiển thị lên luôn".

          Ngày ấy do CHÍNH KHÁCH gõ khi bấm "đã chọn xong" ở thư mục file gốc
          hình cổng / album (nguyên tắc 66), ghi vào `MucXong.hanLay`. Nó là
          thứ gấp thật: mọi mốc khác trên thẻ này là studio tự ước, còn đây là
          lời hẹn với khách.
        */
        album: { select: { id: true, mucXong: { select: { hanLay: true } } } },
        /*
          CHỈ việc hậu kỳ, lọc ngay ở database. Lấy hết rồi lọc ở đây thì một
          hợp đồng cưới kéo theo hai chục dòng makeup, hoa, stylist chỉ để
          đếm ra một dòng Photoshop — đo 26/11: một nhà có 21 đầu việc mà chỉ
          5 cái là hậu kỳ.
        */
        congViec: {
          where: { matBenAppSheet: null, ...locHauKy() },
          select: { id: true, loai: true, nguoiPhuTrachMaNV: true, trangThai: true },
          orderBy: { taoLuc: "asc" },
        },
      },
    }),
    /*
      Đếm RIÊNG, không đếm trong `ds` — `ds` đã bị lọc theo bước đang chọn,
      nên đếm trong đó thì chip của nhánh kia luôn hiện 0 và người đọc tưởng
      nhánh ấy hết nhà. Đo 26/11: lọc bước 5 xong, chip bước 14 nói "0" trong
      khi vẫn còn hai hợp đồng.
    */
    prisma.hopDong.groupBy({
      by: ["buoc"],
      where: { matBenAppSheet: null, buoc: { in: [...BUOC_HAU_KY] } },
      _count: { _all: true },
    }),
    tenTheoMaNV(),
    /*
      Danh sách người để giao việc — y hệt trang Đầu việc: mọi người CÒN LÀM,
      kể cả người chưa có mã nhân viên (học viên), khoá ghép là mã NẾU CÓ,
      không thì tên đăng nhập.
    */
    prisma.nhanVien.findMany({
      where: { dangLam: true },
      orderBy: { ten: "asc" },
      select: { maNV: true, tenDangNhap: true, ten: true },
    }),
  ]);

  /*
    CẮT Ở MÁY CHỦ (nguyên tắc 55): người thường chỉ nhận về danh sách gồm
    đúng mình. `NutViec` lọc trong trình duyệt, nên gửi cả danh sách xuống là
    tên và mã của cả tiệm nằm trong nguồn trang.
  */
  const nhanVien = dsNhanVien
    .filter((x) => quanTri || khoaNguoi(x) === khoaToi)
    .map((x) => ({ maNV: khoaNguoi(x), ten: x.ten }));

  const soTheoBuoc = new Map<number, number>(
    demBuoc.map((d) => [d.buoc ?? 0, d._count._all]),
  );

  /* Dựng sẵn mọi thứ cần vẽ, để phần JSX bên dưới chỉ còn việc bày ra. */
  const hang = ds.map((h) => {
    const moc = mocDaQua(h.lich.map((l) => l.ngay), nay);

    /*
      Một hợp đồng có thể có nhiều album, mỗi album nhiều thư mục được hỏi
      ngày — lấy hạn SỚM NHẤT. Nhà hẹn hai mốc thì mốc gần hơn mới là mốc
      phải chạy theo; bày mốc xa hơn ra là tự ru ngủ.
    */
    const hans = h.album
      .flatMap((a) => a.mucXong)
      .map((m) => m.hanLay)
      .filter((d): d is Date => !!d)
      .map(ngayStudio)
      .sort();

    return {
      ...h,
      moc,
      cho: moc ? soNgayCho(moc, nay) : null,
      hanLay: hans.length ? hans[0] : null,
      /* Người lập = sale của nhà này, để biết hỏi ai khi hợp đồng có chỗ chưa rõ. */
      tenNguoiLap: h.nguoiLapMaNV ? tenNV(bangTen, h.nguoiLapMaNV) : null,
    };
  });

  /*
    Ô TÌM lọc ở máy chủ web bằng `boDau`, không ở database — người gõ "chau
    chi" không dấu, mà Postgres `contains` thì không bỏ dấu hộ. Cùng cách với
    trang Đầu việc và trang Hợp đồng.

    Lọc SAU khi đã dựng xong `hang`: con số trên chip từng bước vẫn đếm toàn
    bộ hàng chờ, nên gõ một cái tên không làm "18" tụt xuống "1" rồi người ta
    tưởng mất việc.
  */
  const tim = boDau(q);
  const ketQua = q ? hang.filter((h) => boDau(h.tenKhach).includes(tim)) : hang;

  /* Gom theo loại dịch vụ, y như AppSheet. */
  const gom = new Map<string, typeof hang>();
  for (const h of ketQua) {
    const k = h.loaiDV?.trim() || "Chưa ghi loại";
    if (!gom.has(k)) gom.set(k, []);
    gom.get(k)!.push(h);
  }
  const dsNhom = [...gom.entries()]
    .map(([ten, ds]) => ({ ten, ds: [...ds].sort(gapTruoc) }))
    /*
      Thứ tự NHÓM cũng theo nhà gấp nhất của nhóm, không theo số lượng nữa:
      sắp gấp trước mà để nhóm đông đứng đầu thì nhà gấp nhất vẫn có thể nằm
      ở nhóm thứ ba, phải cuộn mới thấy — tức là không sắp gì cả.
    */
    .sort((a, b) => gapTruoc(a.ds[0], b.ds[0]));

  const duongDan = (buoc: BuocHauKy | null, chu: string) => {
    const p = new URLSearchParams();
    if (buoc !== null) p.set("buoc", String(buoc));
    if (chu) p.set("q", chu);
    const s = p.toString();
    return s ? `/quan-ly/cong-viec/hau-ky?${s}` : "/quan-ly/cong-viec/hau-ky";
  };
  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  return (
    <div>
      <p className="eyebrow">
        <Link href="/quan-ly/cong-viec" className="hover:text-accent">
          ← Đầu việc
        </Link>
      </p>
      <h1 className="mt-2 font-display text-3xl font-light">
        Hàng chờ hậu kỳ <span className="text-fg-faint tabular-nums">{ketQua.length}</span>
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Hợp đồng đã chụp xong, ảnh đang chờ chỉnh. Nhà chờ lâu nhất đứng đầu mỗi nhóm.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {/* Chip giữ nguyên chữ đang tìm: đổi nhánh không phải lý do để xoá ô tìm. */}
        <Link href={duongDan(null, q)} className={lopChip(buocLoc === null)}>
          Cả hai nhánh
        </Link>
        {BUOC_HAU_KY.map((b) => (
          <Link key={b} href={duongDan(b, q)} className={lopChip(buocLoc === b)}>
            {b}. {tenBuocHauKy(b)}{" "}
            <span className="tabular-nums opacity-70">{soTheoBuoc.get(b) ?? 0}</span>
          </Link>
        ))}
      </div>

      <form action="/quan-ly/cong-viec/hau-ky" className="mt-3 flex flex-wrap items-center gap-2">
        {buocLoc !== null && <input type="hidden" name="buoc" value={buocLoc} />}
        <input
          id="tim-hau-ky"
          name="q"
          type="search"
          autoComplete="off"
          defaultValue={q}
          placeholder="Tìm theo tên hợp đồng…"
          className="input w-64"
        />
        <button type="submit" className="btn">Tìm</button>
        {q && (
          <Link
            href={duongDan(buocLoc, "")}
            className="text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
          >
            Bỏ tìm
          </Link>
        )}
      </form>

      {ketQua.length === 0 && (
        <p className="mt-8 text-sm text-fg-muted">
          {q ? (
            <>Không có nhà nào tên khớp “{q}”.</>
          ) : (
            <>Không có hợp đồng nào đang chờ hậu kỳ.</>
          )}{" "}
          {(buocLoc !== null || q) && (
            <Link href="/quan-ly/cong-viec/hau-ky" className="text-accent underline underline-offset-2">
              Xem cả hàng chờ
            </Link>
          )}
        </p>
      )}

      {dsNhom.map((n) => (
        <section key={n.ten} className="mt-8">
          <h2 className="flex items-center gap-2 border-b border-line pb-2">
            <span className="font-display text-xl font-light">{n.ten}</span>
            <span className="text-sm text-fg-faint tabular-nums">{n.ds.length}</span>
          </h2>

          {/*
            LƯỚI THẺ, không phải bảng — xem chú thích đầu tệp.

            Chia cột MUỘN HƠN từ 26/11/2026, khi thẻ mang thêm ô nhận việc:
            đo ở 640px chia hai cột thì mỗi thẻ còn 300px, hai ô chọn (mỗi ô
            tối thiểu 7rem) không nằm vừa một dòng nên vỡ xuống hai dòng,
            thẻ cao gấp rưỡi mà chẳng được gì. Một cột tới 1024px thì thẻ đủ
            rộng để ô người và ô trạng thái đứng cạnh nhau.
          */}
          <div className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {n.ds.map((h) => {
              return (
                /*
                  THẺ KHÔNG CÒN LÀ MỘT LINK BỌC HẾT — anh yêu cầu 26/11/2026
                  cho thợ media tích chọn việc ngay trên đây. Ô chọn nằm
                  trong thẻ, mà `<select>` bên trong `<a>` thì cú bấm bị link
                  nuốt mất: mở sang trang hợp đồng thay vì bung danh sách.

                  Nên chỉ TÊN KHÁCH là link. Bù lại thẻ không còn bấm được cả
                  mảng, nhưng đổi lại được việc mà anh cần làm ngay ở đây.
                */
                <div
                  key={h.id}
                  className="card p-4 transition hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/quan-ly/hop-dong/${h.id}`}
                      className="font-medium leading-snug hover:text-accent"
                    >
                      {h.tenKhach}
                    </Link>
                    {/* Số bước chỉ hiện khi xem CẢ HAI nhánh — lọc rồi thì nó lặp lại chính mình. */}
                    {buocLoc === null && (
                      <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-muted tabular-nums">
                        {h.buoc}
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-fg-muted tabular-nums">
                    {h.moc ? (
                      <>
                        chụp {ngayVN(h.moc)} ·{" "}
                        <span
                          className={h.cho !== null && h.cho >= CHO_LAU ? "font-medium text-amber-800" : ""}
                        >
                          chờ {h.cho} ngày
                        </span>
                      </>
                    ) : (
                      <span className="text-fg-faint">chưa có buổi chụp nào đã qua</span>
                    )}
                    {/*
                      Người lập đi CÙNG DÒNG với ngày, không chiếm một dòng
                      riêng trong khối bên dưới: nó là thứ tra khi cần hỏi,
                      không phải thứ quyết việc hôm nay làm nhà nào.
                    */}
                    {h.tenNguoiLap && <span className="text-fg-faint"> · {h.tenNguoiLap} lập</span>}
                  </p>

                  {/*
                    HẠN KHÁCH HẸN đứng RIÊNG MỘT DÒNG, trên cả khối "Hậu kỳ /
                    Album / Tiền" — nó là thứ quyết thứ tự cả trang, để lẫn
                    vào khối kia thì ngang hàng với "chưa dựng album".

                    Trễ hạn tô ĐỎ, còn dưới ba ngày tô vàng. Đây là chỗ duy
                    nhất trên trang dùng màu đỏ: mọi cảnh báo khác là studio
                    tự nhắc mình, còn đây là đã lỡ hẹn với khách.
                  */}
                  {h.hanLay && (
                    <p
                      className={`mt-2 rounded-md px-2.5 py-1.5 text-xs tabular-nums ${
                        soNgayToiHan(h.hanLay) < 0
                          ? "bg-red-50 font-medium text-red-800"
                          : soNgayToiHan(h.hanLay) <= 3
                            ? "bg-amber-50 font-medium text-amber-800"
                            : "bg-bg-soft text-fg-muted"
                      }`}
                    >
                      Khách cần hình {ngayVietTat(h.hanLay)} · {chuConLai(h.hanLay)}
                    </p>
                  )}

                  <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                    {/*
                      TỪNG ĐẦU VIỆC MỘT, có ô nhận việc — anh yêu cầu
                      26/11/2026: "hãy hiển thị ra phần cho nhân viên media
                      tích chọn việc".

                      Dùng lại `NutViec` của trang Đầu việc chứ không dựng ô
                      mới: nó đã mang sẵn mọi phép khoá đã chốt từ trước —
                      việc của người khác thì khoá, việc đã đánh dấu xong thì
                      người thường không sửa được nữa. Dựng ô mới là sớm muộn
                      hai nơi khoá hai kiểu.

                      Việc anh hỏi — "đã có người chọn rồi thì người khác
                      không thể chọn nữa" — chặn thật ở `duocDung` trong
                      actionsViec.ts, không phải ở ô khoá này (nguyên tắc 3).
                    */}
                    <div className="flex gap-2">
                      <dt className="w-14 shrink-0 pt-1 text-fg-faint">Hậu kỳ</dt>
                      <dd className="min-w-0 flex-1">
                        {h.congViec.length === 0 ? (
                          <span className="font-medium text-amber-800">
                            chưa có đầu việc hậu kỳ
                          </span>
                        ) : (
                          <div className="grid gap-2">
                            {h.congViec.map((v) => (
                              <div key={v.id}>
                                <div className="flex items-baseline justify-between gap-2">
                                  {/*
                                    Tô vàng theo TỪNG VIỆC, không theo cả hợp
                                    đồng: một nhà có thể đã giao Photoshop mà
                                    chưa giao edit clip, tô cả cụm thì hai
                                    cảnh ấy nhìn như một.
                                  */}
                                  <span
                                    className={v.nguoiPhuTrachMaNV?.trim() ? "" : "text-amber-800"}
                                  >
                                    {v.loai ?? "(chưa đặt tên)"}
                                  </span>
                                  {v.trangThai === "Đã làm" && (
                                    <span className="shrink-0 text-[11px] text-fg-faint">xong</span>
                                  )}
                                </div>
                                <div className="mt-1">
                                  <NutViec
                                    id={v.id}
                                    nguoiPhuTrachMaNV={v.nguoiPhuTrachMaNV}
                                    tenNguoiLam={
                                      v.nguoiPhuTrachMaNV
                                        ? (bangTen.get(v.nguoiPhuTrachMaNV.toLowerCase()) ?? null)
                                        : null
                                    }
                                    trangThai={v.trangThai}
                                    nhanVien={nhanVien}
                                    quanTri={quanTri}
                                    maToi={nguoi.maNV}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-14 shrink-0 text-fg-faint">Album</dt>
                      <dd className={h.album.length === 0 ? "text-amber-800" : ""}>
                        {h.album.length === 0 ? "chưa dựng" : `${h.album.length} album`}
                      </dd>
                    </div>
                    {/* Tiền chỉ cho người được xem hợp đồng — xem chú thích đầu tệp. */}
                    {xemTien && (
                      <div className="flex gap-2">
                        <dt className="w-14 shrink-0 text-fg-faint">Tiền</dt>
                        <dd className="tabular-nums">
                          {tien(h.tongTien)}đ
                          {h.conLai > 0 && (
                            <span className="ml-1 text-amber-800">· còn {tien(h.conLai)}đ</span>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {h.danhSachDV && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-fg-muted">
                      {h.danhSachDV}
                    </p>
                  )}
                  {h.ghiChu && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-fg-faint">
                      {h.ghiChu}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
