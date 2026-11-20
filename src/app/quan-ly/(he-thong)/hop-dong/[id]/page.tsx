import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/db";
import { MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, laQuanTri, lapHopDong, xemHopDong } from "@/lib/phienNhanVien";
import { TEN_LOAI, laLoaiDichVu } from "@/lib/dichVuChung";
import { ngayVN } from "@/lib/hopDongChung";
import { khoaCuaToi, khoaNguoi, tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { albumCuaHopDong } from "@/lib/noiAlbum";
import { docLoaiBuoi } from "@/lib/loaiBuoi";
import { NHOM, docDanhMuc } from "@/lib/danhMuc";
import { docMaAlbum } from "@/lib/docMaAlbum";
import { coGiaoAnh } from "@/lib/thuMucHopDong";
import { NutTaoThuMuc } from "./NutTaoThuMuc";
import { buocTiepTheo, docBuocDayDu, laBuocXong } from "@/lib/buocHopDong";
import { NutPhieuThu, NutXoaHopDong, ThemPhieuThu } from "./NutHopDong";
import { KhoiLich } from "./KhoiLich";
import { KhoiViec } from "./KhoiViec";
import { DaiTienDo } from "./DaiTienDo";
import { KhoiTien } from "./KhoiTien";
import { TieuDeKhoi } from "./TieuDeKhoi";
import { Bang, Hang, O, type CotBang } from "../../_ui/Bang";

export const dynamic = "force-dynamic";

/* Hai bảng của trang này. "Mục" và "Nội dung" là tiêu đề thẻ trên điện thoại. */
const COT_DV = {
  ngayChup: { ten: "Ngày chụp" },
  muc: { ten: "Mục", chinh: true, lop: "min-w-64" },
  sl: { ten: "SL", phai: true },
  donGia: { ten: "Đơn giá", phai: true },
  thanhTien: { ten: "Thành tiền", phai: true },
} satisfies Record<string, CotBang>;

const COT_THU = {
  ngay: { ten: "Ngày" },
  noiDung: { ten: "Nội dung", chinh: true },
  hinhThuc: { ten: "Hình thức" },
  soTien: { ten: "Số tiền", phai: true },
  trangThai: { ten: "Trạng thái" },
  nguoi: { ten: "Người thu · duyệt" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

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

  const [hd, bangTen, album, cacBuoc, loaiBuoi, boMa, dsLyDo, dsNhanVien] = await Promise.all([
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
        /*
          ĐẦU VIỆC CỦA HỢP ĐỒNG — anh yêu cầu 20/11/2026 ("trong phần chi tiết
          hợp đồng cũng hãy hiển thị đầu việc và người được chia việc, nhận
          việc"). Trước đó muốn biết nhà này ai chụp phải sang trang Đầu việc
          rồi lọc lại theo tên khách.
        */
        congViec: {
          where: { matBenAppSheet: null },
          orderBy: [{ loai: "asc" }, { taoLuc: "asc" }],
          select: {
            id: true,
            loai: true,
            soLuong: true,
            donGia: true,
            lichChupId: true,
            nguoiPhuTrachMaNV: true,
            trangThai: true,
            ngayHoanThanh: true,
          },
        },
      },
    }),
    tenTheoMaNV(),
    albumCuaHopDong(id),
    docBuocDayDu(),
    docLoaiBuoi(),
    docMaAlbum(),
    docDanhMuc(NHOM.lyDoTrongNgay),
    /*
      Nhân viên còn làm, cho ô chọn người của từng đầu việc. CẮT Ở MÁY CHỦ với
      người không phải quản lý (nguyên tắc 55) — giống hệt trang Lịch và trang
      Đầu việc, xem chú thích ở hai nơi đó.
    */
    prisma.nhanVien.findMany({
      where: { dangLam: true },
      orderBy: { ten: "asc" },
      select: { maNV: true, tenDangNhap: true, ten: true },
    }),
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
    chụp, 13 nhánh tiệc) — nhắc một câu để người phụ trách chuyển bước.

    TỪ 19/11/2026 WEB TỰ CHUYỂN bước này (anh yêu cầu): khách bấm "đã chọn
    xong" là hợp đồng sang 5 hoặc 14 ngay, xem `buocSauKhiKhachChonXong`. Đảo
    ngược hẳn câu trước đó ở chỗ này — "web không tự chuyển, phải do người nhìn
    rồi quyết" — vì thực tế câu nhắc cũng bị bỏ qua, nên hợp đồng vẫn kẹt.

    CÂU NHẮC VẪN GIỮ, và không phải thừa: nó bắt những hợp đồng kẹt lại từ
    TRƯỚC 19/11 (khách đã báo xong hồi đó mà bước vẫn đứng ở 4 hoặc 13), và
    bắt cả trường hợp việc đổi bước tự động gặp sự cố — `doiBuocAlbum` nuốt
    lỗi để không làm hỏng việc báo của khách, nên nó có thể im lặng không đổi.
    Mất câu nhắc thì những hợp đồng đó không ai thấy nữa.
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
        DẢI TIẾN ĐỘ — anh yêu cầu 18/11/2026, dựng lại thành năm chặng 20/11.

        "Hợp đồng này đang ở bước nào, ai làm gì tiếp" là câu đầu tiên người
        mở trang cần trả lời. Bản 18/11 trả lời bằng một chip mang tên bước —
        đúng, nhưng phải thuộc lòng cả mười tám bước mới biết còn bao xa tới
        lúc giao hình. Nay năm chặng vẽ ra, nhìn một cái là thấy.

        Để ở đây, ngay dưới tên khách và chạy hết chiều ngang, vì nó nói về
        CẢ hợp đồng chứ không thuộc khối nào.
      */}
      <div className="mt-4">
        <DaiTienDo
          buoc={hd.buoc}
          tenBuoc={hd.trangThai}
          buocSau={buocSau?.ten ?? null}
          aiLo={buocSau?.trachNhiem ?? null}
          xongNhanh={xongNhanh && !!buocSau}
        />
      </div>

      {hd.matBenAppSheet && (
        <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Hợp đồng này không còn bên AppSheet (thấy mất lúc {NGAY.format(hd.matBenAppSheet)}). Web vẫn giữ lại để tra.
        </p>
      )}

      {/*
        BỐ CỤC WORKSPACE — anh duyệt 20/11/2026 (KE-HOACH-GIAO-DIEN §4.3).

        Trước đó bảy khối xếp dọc một mạch: Khách · Tiền · Album · Dịch vụ ·
        Lịch · Đầu việc · Phiếu thu. Trên màn rộng thì nửa phải trống trơn, mà
        muốn xem còn nợ bao nhiêu với album tới đâu vẫn phải cuộn qua nhau.

        Hai cột từ 1024px: TRÁI là thứ người ta làm việc trên đó (lịch, đầu
        việc, dịch vụ, phiếu thu), PHẢI là thứ liếc một cái rồi thôi (tiền,
        album, liên hệ khách). Cột phải hẹp và `sticky` nên cuộn tới đâu nó
        vẫn đứng đó.

        TRÊN ĐIỆN THOẠI CỘT PHẢI LÊN TRƯỚC (`order-first`): tiền và album là
        hai thứ mở hợp đồng ra để liếc, không phải thứ cuộn mãi mới tới.
      */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="order-first grid min-w-0 gap-6 lg:order-none lg:col-start-2">
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

      <section>
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

      </div>

      <div className="grid min-w-0 gap-6 lg:col-start-1 lg:row-start-1">
      <section>
        <TieuDeKhoi ten="Dịch vụ, trang phục" so={hd.chiTiet.length} />
        <Bang lop="mt-3" cot={Object.values(COT_DV)} trong="Chưa có dòng nào.">
          {hd.chiTiet.map((c) => (
            <Hang key={c.id} lop="align-top">
              <O cot={COT_DV.ngayChup} lop="whitespace-nowrap text-fg-muted tabular-nums">
                {ngayVN(c.ngayChup) || "—"}
              </O>
              <O cot={COT_DV.muc}>
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
                  <span className="mt-0.5 block text-xs leading-relaxed whitespace-pre-line text-fg-muted">
                    {c.chiTiet}
                  </span>
                )}
                {c.ghiChu && (
                  <span className="mt-1 block rounded-sm bg-amber-50 px-1.5 py-1 text-xs text-amber-900">
                    {c.ghiChu}
                  </span>
                )}
              </O>
              <O cot={COT_DV.sl} lop="tabular-nums">
                {c.soLuong}
              </O>
              <O cot={COT_DV.donGia} lop="whitespace-nowrap tabular-nums">
                {tien(c.donGia)}đ
              </O>
              <O cot={COT_DV.thanhTien} lop="whitespace-nowrap tabular-nums">
                {tien(c.thanhTien)}đ
              </O>
            </Hang>
          ))}
        </Bang>
      </section>

      <section>
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

      {/*
        ĐẦU VIỆC đứng NGAY SAU LỊCH CHỤP, trước phiếu thu: nó gom theo buổi,
        nên đọc liền mạch với khối lịch ngay trên. Để sau phiếu thu thì người
        xem phải cuộn qua chuyện tiền nong mới tới chuyện chia người.
      */}
      {hd.congViec.length > 0 && (
        <section>
          <TieuDeKhoi ten="Đầu việc" so={hd.congViec.length} />
          <KhoiViec
            buoi={hd.lich.map((l) => ({
              id: l.id,
              ngay: l.ngay,
              gio: l.gio,
              loai: l.loai,
            }))}
            viec={hd.congViec.map((v) => ({
              id: v.id,
              loai: v.loai,
              lichChupId: v.lichChupId,
              /* Tiền công chỉ quản lý — studio chốt 15/09, xem lich/page.tsx. */
              tienCong: quanTri ? Math.round(v.donGia * v.soLuong) : null,
              nguoiPhuTrachMaNV: v.nguoiPhuTrachMaNV,
              tenNguoiLam: v.nguoiPhuTrachMaNV
                ? (bangTen.get(v.nguoiPhuTrachMaNV.toLowerCase()) ?? null)
                : null,
              trangThai: v.trangThai,
              ngayHoanThanh: v.ngayHoanThanh,
            }))}
            nhanVien={dsNhanVien
              .filter((n) => quanTri || khoaNguoi(n) === khoaCuaToi(nguoi))
              .map((n) => ({ maNV: khoaNguoi(n), ten: n.ten }))}
            quanTri={quanTri}
            maToi={khoaCuaToi(nguoi)}
          />
        </section>
      )}

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TieuDeKhoi ten="Phiếu thu" so={hd.phieuThu.length} />
          {duocSua && <ThemPhieuThu hopDongId={hd.id} homNay={homNay()} laQuanLy={quanTri} />}
        </div>
        <Bang
          lop="mt-3"
          cot={[
            COT_THU.ngay,
            COT_THU.noiDung,
            COT_THU.hinhThuc,
            COT_THU.soTien,
            COT_THU.trangThai,
            COT_THU.nguoi,
            ...(quanTri ? [COT_THU.viec] : []),
          ]}
          trong="Chưa có phiếu thu nào."
        >
          {hd.phieuThu.map((p) => (
            <Hang key={p.id} lop="align-top">
              <O cot={COT_THU.ngay} lop="whitespace-nowrap text-fg-muted tabular-nums">
                {ngayVN(p.ngayThu)}
              </O>
              <O cot={COT_THU.noiDung}>
                {p.noiDung ?? "—"}
                {p.ghiChu && <span className="block text-xs text-fg-muted">{p.ghiChu}</span>}
              </O>
              <O cot={COT_THU.hinhThuc} lop="whitespace-nowrap text-fg-muted">
                {p.hinhThuc}
                {p.taiKhoan && <span className="block text-xs text-fg-faint">{p.taiKhoan}</span>}
              </O>
              <O cot={COT_THU.soTien} lop="whitespace-nowrap tabular-nums">
                {tien(p.soTien)}đ
              </O>
              <O
                cot={COT_THU.trangThai}
                lop={`whitespace-nowrap ${p.trangThai === "Chờ duyệt" ? "font-medium text-amber-800" : "text-fg-muted"}`}
              >
                {p.trangThai}
              </O>
              <O cot={COT_THU.nguoi} lop="whitespace-nowrap text-fg-muted">
                {tenNV(bangTen, p.nguoiTaoMaNV) ?? "—"}
                {p.nguoiDuyetMaNV && (
                  <span className="block text-xs text-fg-faint">duyệt: {tenNV(bangTen, p.nguoiDuyetMaNV)}</span>
                )}
              </O>
              {quanTri && (
                <O cot={COT_THU.viec}>
                  <NutPhieuThu id={p.id} choDuyet={p.trangThai === "Chờ duyệt"} />
                </O>
              )}
            </Hang>
          ))}
        </Bang>
      </section>

      </div>
      </div>

      {hd.ghiChu && (
        <section className="mt-8">
          <h2 className="eyebrow">Ghi chú</h2>
          <p className="mt-2 rounded-md border border-line bg-bg-raised px-4 py-3 text-sm leading-relaxed whitespace-pre-line">{hd.ghiChu}</p>
        </section>
      )}
    </div>
  );
}
