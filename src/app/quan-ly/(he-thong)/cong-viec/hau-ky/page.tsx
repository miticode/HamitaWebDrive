import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { homNayStudio, tien } from "@/lib/constants";
import { batBuocDangNhap, xemHopDong } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { locHauKy } from "@/lib/nhomViec";
import {
  BUOC_HAU_KY,
  CHO_LAU,
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

type Props = { searchParams: Promise<{ buoc?: string }> };

export default async function HangChoHauKyPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const xemTien = xemHopDong(nguoi);
  const sp = await searchParams;
  const soNhap = Number(sp.buoc);
  const buocLoc: BuocHauKy | null = BUOC_HAU_KY.includes(soNhap as BuocHauKy)
    ? (soNhap as BuocHauKy)
    : null;
  const nay = homNayStudio();

  const prisma = getPrisma();
  const [ds, bangTen] = await Promise.all([
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
        album: { select: { id: true } },
        /*
          CHỈ việc hậu kỳ, lọc ngay ở database. Lấy hết rồi lọc ở đây thì một
          hợp đồng cưới kéo theo hai chục dòng makeup, hoa, stylist chỉ để
          đếm ra một dòng Photoshop — đo 26/11: một nhà có 21 đầu việc mà chỉ
          5 cái là hậu kỳ.
        */
        congViec: {
          where: { matBenAppSheet: null, ...locHauKy() },
          select: { id: true, nguoiPhuTrachMaNV: true, trangThai: true },
        },
      },
    }),
    tenTheoMaNV(),
  ]);

  const soTheoBuoc = new Map<number, number>();
  for (const h of ds) soTheoBuoc.set(h.buoc ?? 0, (soTheoBuoc.get(h.buoc ?? 0) ?? 0) + 1);

  /* Dựng sẵn mọi thứ cần vẽ, để phần JSX bên dưới chỉ còn việc bày ra. */
  const hang = ds.map((h) => {
    const moc = mocDaQua(h.lich.map((l) => l.ngay), nay);

    const dangCam = h.congViec.filter((v) => v.nguoiPhuTrachMaNV?.trim());
    return {
      ...h,
      moc,
      cho: moc ? soNgayCho(moc, nay) : null,
      /* Người lập = sale của nhà này, để biết hỏi ai khi hợp đồng có chỗ chưa rõ. */
      tenNguoiLap: h.nguoiLapMaNV ? tenNV(bangTen, h.nguoiLapMaNV) : null,
      /* Tên người chứ không phải mã: "PTTM81" không nói lên ai cả. */
      nguoiCam: [...new Set(dangCam.map((v) => tenNV(bangTen, v.nguoiPhuTrachMaNV)))],
      soXong: h.congViec.filter((v) => v.trangThai === "Đã làm").length,
    };
  });

  /* Gom theo loại dịch vụ, y như AppSheet. Nhóm đông đứng trước. */
  const gom = new Map<string, typeof hang>();
  for (const h of hang) {
    const k = h.loaiDV?.trim() || "Chưa ghi loại";
    if (!gom.has(k)) gom.set(k, []);
    gom.get(k)!.push(h);
  }
  const dsNhom = [...gom.entries()]
    .map(([ten, ds]) => ({
      ten,
      /* Chờ lâu nhất lên đầu; nhà chưa có buổi chụp nào đã qua xuống cuối. */
      ds: [...ds].sort((a, b) => (b.cho ?? -1) - (a.cho ?? -1)),
    }))
    .sort((a, b) => b.ds.length - a.ds.length);

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
        Hàng chờ hậu kỳ <span className="text-fg-faint tabular-nums">{hang.length}</span>
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        Hợp đồng đã chụp xong, ảnh đang chờ chỉnh. Nhà chờ lâu nhất đứng đầu mỗi nhóm.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href="/quan-ly/cong-viec/hau-ky" className={lopChip(buocLoc === null)}>
          Cả hai nhánh
        </Link>
        {BUOC_HAU_KY.map((b) => (
          <Link key={b} href={`/quan-ly/cong-viec/hau-ky?buoc=${b}`} className={lopChip(buocLoc === b)}>
            {b}. {tenBuocHauKy(b)}{" "}
            <span className="tabular-nums opacity-70">{soTheoBuoc.get(b) ?? 0}</span>
          </Link>
        ))}
      </div>

      {hang.length === 0 && (
        <p className="mt-8 text-sm text-fg-muted">
          Không có hợp đồng nào đang chờ hậu kỳ.{" "}
          {buocLoc !== null && (
            <Link href="/quan-ly/cong-viec/hau-ky" className="text-accent underline underline-offset-2">
              Xem cả hai nhánh
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
            LƯỚI THẺ, không phải bảng — xem chú thích đầu tệp. Ba cột ở màn
            rộng là vừa: hẹp hơn nữa thì tên khách ("Quỳnh Như & Nam Khánh
            23-24/1/2027") xuống ba dòng và thẻ nào cũng cao khác nhau.
          */}
          <div className="mt-3 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {n.ds.map((h) => {
              const chuaGiao = h.nguoiCam.length === 0;
              return (
                <Link
                  key={h.id}
                  href={`/quan-ly/hop-dong/${h.id}`}
                  className="card block p-4 transition hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium leading-snug">{h.tenKhach}</span>
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

                  <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                    <div className="flex gap-2">
                      <dt className="w-14 shrink-0 text-fg-faint">Hậu kỳ</dt>
                      {/*
                        "Chưa giao cho ai" tô VÀNG — cùng màu với việc quá hạn
                        ở trang Đầu việc, vì cùng một nghĩa: studio phải ra
                        tay. Không tô đỏ, đây chưa phải chuyện hỏng.
                      */}
                      <dd className={chuaGiao ? "font-medium text-amber-800" : ""}>
                        {h.congViec.length === 0
                          ? "chưa có đầu việc hậu kỳ"
                          : chuaGiao
                            ? "chưa giao cho ai"
                            : h.nguoiCam.join(", ")}
                        {h.congViec.length > 0 && (
                          <span className="ml-1 font-normal text-fg-faint tabular-nums">
                            · {h.soXong}/{h.congViec.length} xong
                          </span>
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
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
