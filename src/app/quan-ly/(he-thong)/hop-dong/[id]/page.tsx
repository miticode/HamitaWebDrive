import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, laQuanTri, lapHopDong, xemHopDong } from "@/lib/phienNhanVien";
import { TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { albumCuaHopDong } from "@/lib/noiAlbum";
import { docLoaiBuoi } from "@/lib/loaiBuoi";
import { NHOM, docDanhMuc } from "@/lib/danhMuc";
import { docMaAlbum } from "@/lib/docMaAlbum";
import { coGiaoAnh } from "@/lib/thuMucHopDong";
import { NutTaoThuMuc } from "./NutTaoThuMuc";
import { buocTiepTheo, docBuocDayDu, laBuocXong } from "@/lib/buocHopDong";
import { ChipTrangThai } from "../ChipTrangThai";
import { NutPhieuThu, NutXoaHopDong, ThemPhieuThu } from "./NutHopDong";
import { KhoiLich } from "./KhoiLich";
import { KhoiTien } from "./KhoiTien";
import { TieuDeKhoi } from "./TieuDeKhoi";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

const NGAY = new Intl.DateTimeFormat("vi-VN", { timeZone: MUI_GIO, day: "2-digit", month: "2-digit", year: "numeric" });

/** Hôm nay theo giờ studio, dạng "YYYY-MM-DD" — ngày mặc định của phiếu thu mới. */
function homNay(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MUI_GIO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Một hợp đồng: khách, tiền, từng dòng dịch vụ, từng phiếu thu. Chỉ xem — xem BangDongBo. */
export default async function ChiTietHopDongPage({ params }: Props) {
  // Hợp đồng dính tiền và công nợ cả tiệm: chỉ quản lý và sale (anh chốt 21/09/2026).
  const nguoi = await batBuocDangNhap();
  batBuocQuyen(xemHopDong(nguoi));
  const duocSua = lapHopDong(nguoi);
  const quanTri = laQuanTri(nguoi);
  const { id } = await params;
  const prisma = getPrisma();

  const [hd, bangTen, album, cacBuoc, loaiBuoi, boMa, dsLyDo] = await Promise.all([
    prisma.hopDong.findUnique({
      where: { id },
      include: {
        khachHang: true,
        chiTiet: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayChup: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
        phieuThu: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayThu: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
        lich: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngay: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
      },
    }),
    tenTheoMaNV(),
    albumCuaHopDong(id),
    docBuocDayDu(),
    docLoaiBuoi(),
    docMaAlbum(),
    docDanhMuc(NHOM.lyDoTrongNgay),
  ]);
  if (!hd) notFound();

  /*
    BƯỚC TIẾP THEO và AI LO — đợt soát UX, mục P1-5.

    Bảng `BuocHopDong` chép về 13/11 mang sẵn bước trước, bước sau và trách
    nhiệm (Sale 7 bước, Nhiếp ảnh 4), nhưng chưa hiện ra đâu cả. Trước đó muốn
    biết bước sau là gì phải mở form sửa rồi đọc hết mười tám dòng trong ô chọn.

    Hiện ở ĐÂY chứ không ở danh sách: danh sách đã có chip mang số bước, thêm
    một dòng nữa cho 100 dòng bảng là làm bảng khó đọc hơn chứ không dễ hơn.
  */
  const buocSau = buocTiepTheo(cacBuoc, hd.trangThai);
  const xongNhanh = laBuocXong(cacBuoc, hd.trangThai);

  /*
    Khách đã bấm "đã chọn xong" mà hợp đồng vẫn đứng ở bước chờ khách (4 nhánh
    chụp, 13 nhánh tiệc) — nhắc một câu để người phụ trách chuyển bước. Web
    KHÔNG tự chuyển: đổi bước là đổi tiến độ cả một nhà khách, phải do người
    nhìn rồi quyết. Từ 23/09/2026 chuyển ngay trên web được (nút Sửa hợp đồng).
  */
  const daChonXong = album.find((a) => a.xongLuc);
  const nhacChuyenBuoc = daChonXong && (hd.buoc === 4 || hd.buoc === 13);

  const choDuyet = hd.phieuThu.filter((p) => p.trangThai === "Chờ duyệt");

  return (
    <div className="max-w-5xl">
      <Link href="/quan-ly/hop-dong" className="eyebrow transition hover:text-accent">← Hợp đồng</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-light text-balance">{hd.tenKhach || hd.khachHang?.ten || hd.maHD}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            {hd.loaiDV && <span>{hd.loaiDV}</span>}
            {hd.ngayDat && (
              <>
                <span aria-hidden>·</span>
                <span>đặt {ngayVN(hd.ngayDat)}</span>
              </>
            )}
            {hd.nguoiLapMaNV && (
              <>
                <span aria-hidden>·</span>
                <span>{tenNV(bangTen, hd.nguoiLapMaNV)} lập</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs break-all text-fg-faint">{hd.maHD}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/*
            In: ai vào được trang này thì in được — tờ giấy không có gì mà
            trang này chưa hiện. Sửa: quản lý + sale. Xoá: chỉ quản lý, và còn
            phải bấm hai lần trong hộp xác nhận. Giấu nút chỉ để đỡ bấm nhầm —
            chặn thật nằm trong server action (nguyên tắc 3).
          */}
          <Link href={`/quan-ly/in-hop-dong/${hd.id}`} className="btn">
            In hợp đồng
          </Link>
          {duocSua && (
            <Link href={`/quan-ly/hop-dong/${hd.id}/sua`} className="btn">
              Sửa hợp đồng
            </Link>
          )}
          {/*
            NÚT XOÁ TÁCH KHỎI HAI NÚT KIA — sửa 18/11/2026.

            Trước đó nó đứng sát "Sửa hợp đồng", cùng cỡ cùng dáng, chỉ khác
            màu chữ. Hai nút cạnh nhau mà một cái sửa được còn một cái xoá hẳn
            cả hợp đồng là mời người ta bấm nhầm — nhất là trên điện thoại khi
            các nút xuống dòng và đổi chỗ cho nhau.

            Hộp xác nhận hai lần bấm vẫn còn nguyên, đây chỉ là lớp đầu tiên.
          */}
          {quanTri && (
            <>
              <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />
              <NutXoaHopDong id={hd.id} maHD={hd.maHD} tenKhach={hd.tenKhach} />
            </>
          )}
        </div>
      </div>

      {/*
        DẢI TRẠNG THÁI RIÊNG — anh yêu cầu 18/11/2026.

        "Hợp đồng này đang ở bước nào, ai làm gì tiếp" là câu đầu tiên người
        mở trang cần trả lời. Trước đó nó nép ở góc phải, chữ 12px, chen giữa
        ba cái nút — thứ quan trọng nhất của trang lại là thứ mờ nhất.

        Để ở đây, ngay dưới tên khách và chạy hết chiều ngang, vì nó nói về
        CẢ hợp đồng chứ không thuộc khối nào.
      */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-line bg-bg-raised px-4 py-3">
        <ChipTrangThai trangThai={hd.trangThai} />
        {buocSau ? (
          <span className="text-sm">
            <span className="text-fg-muted">Tiếp theo </span>
            <b className="font-medium">{buocSau.ten}</b>
            {buocSau.trachNhiem && (
              <span className="text-fg-muted"> — {buocSau.trachNhiem} lo</span>
            )}
          </span>
        ) : (
          xongNhanh && <span className="text-sm font-medium text-emerald-700">Đã xong nhánh này</span>
        )}
        {xongNhanh && buocSau && (
          <span className="text-sm text-emerald-700">· đã xong nhánh này</span>
        )}
      </div>

      {hd.matBenAppSheet && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hợp đồng này không còn bên AppSheet (thấy mất lúc {NGAY.format(hd.matBenAppSheet)}). Web vẫn giữ lại để tra.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-md border border-line bg-bg-raised p-4">
          <h2 className="eyebrow">Khách</h2>
          <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Tên</dt>
            <dd>
              {hd.khachHang ? (
                <Link href={`/quan-ly/khach-hang/${hd.khachHang.id}`} className="hover:text-accent">
                  {hd.khachHang.ten}
                </Link>
              ) : (
                hd.tenKhach
              )}
            </dd>
            <dt className="text-fg-muted">Điện thoại</dt>
            <dd className="tabular-nums">
              {hd.khachHang?.soDienThoai ? (
                <a href={`tel:${hd.khachHang.soDienThoai}`} className="hover:text-accent">{hd.khachHang.soDienThoai}</a>
              ) : (
                "—"
              )}
            </dd>
            {hd.khachHang?.tinh && (
              <>
                <dt className="text-fg-muted">Tỉnh</dt>
                <dd>{hd.khachHang.tinh}</dd>
              </>
            )}
            {hd.diaChi && (
              <>
                <dt className="text-fg-muted">Địa chỉ</dt>
                <dd>{hd.diaChi}</dd>
              </>
            )}
          </dl>
        </section>

        <KhoiTien
          thanhTien={hd.thanhTien}
          khuyenMai={hd.khuyenMai}
          tongTien={hd.tongTien}
          daThu={hd.daThu}
          conLai={hd.conLai}
          soPhieuChoDuyet={choDuyet.length}
        />
      </div>

      <section className="mt-8">
        <TieuDeKhoi ten="Album ảnh" so={album.length} />
        {nhacChuyenBuoc && (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            Khách đã báo chọn xong ảnh ngày {NGAY.format(daChonXong!.xongLuc!)} mà hợp đồng còn ở bước{" "}
            {hd.buoc}.{" "}
            {duocSua ? (
              <Link href={`/quan-ly/hop-dong/${hd.id}/sua`} className="underline underline-offset-2">
                Chuyển bước
              </Link>
            ) : (
              "Nhờ quản lý hoặc sale chuyển bước giúp."
            )}
          </p>
        )}
        {album.length === 0 ? (
          <div className="mt-2">
            <p className="text-sm text-fg-muted">
              Chưa có album nào.{" "}
              {coGiaoAnh(hd.loaiDV)
                ? "Hợp đồng vừa lập thì web đang tự tạo thư mục — tải lại trang sau vài giây. Lâu quá thì bấm nút dưới."
                : `Loại “${hd.loaiDV ?? "—"}” thường không giao ảnh, nên web không tự tạo thư mục.`}{" "}
              Album đã có sẵn trên Drive thì mở trang quản lý album rồi bấm “Gắn hợp đồng”.
            </p>
            {duocSua && <NutTaoThuMuc hopDongId={hd.id} tenKhach={hd.tenKhach} boMa={boMa} />}
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line bg-bg-raised text-sm">
            {album.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-0">
                  <Link href={`/admin/${a.slug}`} className="font-medium hover:text-accent">
                    {a.ten}
                  </Link>
                  <span className="block text-xs text-fg-muted">
                    Tạo {NGAY.format(a.taoLuc)}
                    {a.xongLuc ? ` · khách báo chọn xong ${NGAY.format(a.xongLuc)}` : " · khách chưa báo chọn xong"}
                    {a.soMucXong > 1 ? ` (${a.soMucXong} thư mục)` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-medium tabular-nums">{a.soTim}</span>
                  <span className="text-fg-muted"> tấm khách chọn in</span>
                  <Link
                    href={`/admin/${a.slug}/don-in`}
                    className="ml-3 text-xs text-fg-muted underline underline-offset-2 hover:text-accent"
                  >
                    Đơn giao in
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
        {/*
          Nút tạo hiện CẢ KHI đã có album — anh yêu cầu 15/11/2026. Gói cưới
          hai ngày cần hai album (HER nhà gái, HIS nhà trai), và 2.400 hợp
          đồng cũ có thể thiếu một bên. Bấm nhầm thì server action hỏi lại kèm
          tên album đang có, không tạo ngay.
        */}
        {album.length > 0 && duocSua && <NutTaoThuMuc hopDongId={hd.id} tenKhach={hd.tenKhach} boMa={boMa} />}
      </section>

      <section className="mt-8">
        <TieuDeKhoi ten="Dịch vụ, trang phục" so={hd.chiTiet.length} />
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Ngày chụp</th>
                <th className="px-4 py-2.5 font-medium">Mục</th>
                <th className="px-4 py-2.5 text-right font-medium">SL</th>
                <th className="px-4 py-2.5 text-right font-medium">Đơn giá</th>
                <th className="px-4 py-2.5 text-right font-medium">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hd.chiTiet.map((c) => (
                <tr key={c.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(c.ngayChup) || "—"}</td>
                  <td className="min-w-64 px-4 py-2.5">
                    <span className="text-xs text-fg-faint">
                      {c.loai && laLoaiDichVu(c.loai) ? TEN_LOAI[c.loai] : ""}
                      {c.maDV ? ` · ${c.maDV}` : ""}
                    </span>
                    <span className="block font-medium">
                      {c.dichVuId ? (
                        <Link href={`/quan-ly/dich-vu/${c.dichVuId}`} className="hover:text-accent">
                          {c.tenDV ?? c.maDV}
                        </Link>
                      ) : (
                        (c.tenDV ?? c.maDV ?? "—")
                      )}
                    </span>
                    {c.chiTiet && c.chiTiet !== c.tenDV && (
                      <span className="mt-0.5 block text-xs leading-relaxed whitespace-pre-line text-fg-muted">{c.chiTiet}</span>
                    )}
                    {c.ghiChu && (
                      <span className="mt-1 block rounded-sm bg-amber-50 px-1.5 py-1 text-xs text-amber-900">{c.ghiChu}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{c.soLuong}</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(c.donGia)}đ</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(c.thanhTien)}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hd.chiTiet.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-muted">Chưa có dòng nào.</p>}
        </div>
      </section>

      <section className="mt-8">
        <TieuDeKhoi ten="Lịch chụp" so={hd.lich.length} />
        <KhoiLich
          loaiBuoi={loaiBuoi}
          lyDo={dsLyDo}
          hopDongId={hd.id}
          duocSua={duocSua}
          banDau={hd.lich.map((l) => ({
            id: l.id,
            ngay: l.ngay ?? "",
            gio: l.gio ?? "",
            loai: l.loai ?? "Ngày chụp",
            lyDoTrong: l.lyDoTrong ?? "",
            ghiChu: l.ghiChu ?? "",
            trangThai: l.trangThai ?? "Chưa làm",
          }))}
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TieuDeKhoi ten="Phiếu thu" so={hd.phieuThu.length} />
          {duocSua && <ThemPhieuThu hopDongId={hd.id} homNay={homNay()} laQuanLy={quanTri} />}
        </div>
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-bg-raised">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-bg-soft text-left text-xs text-fg-muted">
                <th className="px-4 py-2.5 font-medium">Ngày</th>
                <th className="px-4 py-2.5 font-medium">Nội dung</th>
                <th className="px-4 py-2.5 font-medium">Hình thức</th>
                <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Người thu · duyệt</th>
                {quanTri && <th className="px-4 py-2.5 text-right font-medium">Việc</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hd.phieuThu.map((p) => (
                <tr key={p.id} className="align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted tabular-nums">{ngayVN(p.ngayThu)}</td>
                  <td className="px-4 py-2.5">
                    {p.noiDung ?? "—"}
                    {p.ghiChu && <span className="block text-xs text-fg-muted">{p.ghiChu}</span>}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {p.hinhThuc}
                    {p.taiKhoan && <span className="block text-xs text-fg-faint">{p.taiKhoan}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap tabular-nums">{tien(p.soTien)}đ</td>
                  <td className={`px-4 py-2.5 whitespace-nowrap ${p.trangThai === "Chờ duyệt" ? "font-medium text-amber-800" : "text-fg-muted"}`}>
                    {p.trangThai}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-fg-muted">
                    {tenNV(bangTen, p.nguoiTaoMaNV) ?? "—"}
                    {p.nguoiDuyetMaNV && <span className="block text-xs text-fg-faint">duyệt: {tenNV(bangTen, p.nguoiDuyetMaNV)}</span>}
                  </td>
                  {quanTri && (
                    <td className="px-4 py-2.5">
                      <NutPhieuThu id={p.id} choDuyet={p.trangThai === "Chờ duyệt"} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {hd.phieuThu.length === 0 && <p className="px-4 py-6 text-center text-sm text-fg-muted">Chưa có phiếu thu nào.</p>}
        </div>
      </section>

      {hd.ghiChu && (
        <section className="mt-8">
          <h2 className="eyebrow">Ghi chú</h2>
          <p className="mt-2 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm leading-relaxed whitespace-pre-line">{hd.ghiChu}</p>
        </section>
      )}
    </div>
  );
}
