import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, MUI_GIO, tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri, xemHopDong, xemNhanVien, xemTienVaKhach } from "@/lib/phienNhanVien";
import { BUOC_CHO_KHACH } from "@/lib/hopDongChung";
import { DON_DANG_TAO } from "@/lib/donTuChung";
import { CHO_DUYET } from "@/lib/soQuyChung";
import { DA_CHOT } from "@/lib/khachTiemNangChung";
import { SU_CO_DA_XONG } from "@/lib/suCoChung";
import { docCaiDatCham, luotHomNay } from "@/lib/chamCong";

export const dynamic = "force-dynamic";

const THU_NGAY = new Intl.DateTimeFormat("vi-VN", {
  timeZone: MUI_GIO,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
});

/**
 * TỔNG QUAN — viết lại 13/11/2026 (`KE-HOACH-UX.md` mục P0-2 và P0-3).
 *
 * Bản cũ có hai chỗ hỏng nặng:
 *
 * 1. Khối "Sắp có — thay dần AppSheet" còn liệt kê đợt 2, 3, 4 là việc tương
 *    lai, trong khi cả ba đã làm xong. Nhân viên mới mở trang đầu thấy "Chấm
 *    công sắp có" rồi đi chấm bên AppSheet — đúng cách lần chuyển 21/09 chết.
 *
 * 2. Trang không nói ai phải làm gì. 14/16 người trong tiệm mở lên chỉ thấy
 *    một lời chào và danh sách liên kết trùng y hệt thanh bên.
 *
 * Giờ trang trả lời đúng ba câu, theo thứ tự ai cần gấp nhất:
 *   - việc CỦA TÔI hôm nay (cả tiệm)
 *   - gì đang CHỜ TÔI DUYỆT (quản lý)
 *   - TIỆM đang thế nào (quản lý + sale)
 *
 * Mỗi thẻ là một liên kết đi thẳng tới danh sách ĐÃ LỌC SẴN, nên thấy số là
 * bấm được ngay, không phải tự đi tìm bộ lọc. Thẻ bằng 0 thì xám và không mời
 * bấm — số 0 là tin tốt, không phải việc.
 *
 * QUYỀN giữ nguyên: mỗi khối hiện theo đúng `laQuanTri` / `xemHopDong` /
 * `xemTienVaKhach` mà các trang đích đang dùng. Không hiện con số nào mà người
 * đó mở ra sẽ bị chặn.
 */
export default async function TongQuanPage() {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const coTien = xemTienVaKhach(nguoi);
  const coHopDong = xemHopDong(nguoi);
  const homNay = homNayStudio();
  const prisma = getPrisma();

  /*
    Việc quá hạn CỦA CHÍNH NGƯỜI ĐANG XEM — kể cả quản lý.

    Bản đầu lặp phép lọc của trang Đầu việc (quản lý thấy cả tiệm). Đo thử ra
    169 việc quá hạn, hạn cũ nhất 23/03/2025 — đó là TỒN KHO HAI MƯƠI THÁNG
    chép từ AppSheet, không phải việc hôm nay. Một thẻ đỏ ghi 169 ngay trang
    đầu là loại cảnh báo tự làm hỏng chính mình: ngày nào cũng đỏ, một tuần sau
    không ai nhìn nữa. Con số cả tiệm vẫn còn nguyên ở chip "Quá hạn" trên
    trang Đầu việc, đúng chỗ của nó.

    Phép lọc dưới đây phải cho ra ĐÚNG con số người ta thấy khi bấm vào, nếu
    không thì thẻ nói dối:

      - quản lý  → link kèm `?nguoi=<mã>`, trang lọc theo đúng mã đó
      - người khác → trang luôn hiện việc ghi tên họ CỘNG việc chưa giao cho
        ai (ai rảnh thì nhận), nên ở đây cũng phải cộng y như vậy

    Người chưa có mã nhân viên chỉ còn thấy việc chưa giao — ghép không ra dòng
    nào mang tên họ.
  */
  const chuaGiao: Prisma.CongViecWhereInput[] = [
    { nguoiPhuTrachMaNV: null },
    { nguoiPhuTrachMaNV: "" },
  ];
  const cuaChinhToi: Prisma.CongViecWhereInput[] = nguoi.maNV
    ? [{ nguoiPhuTrachMaNV: { equals: nguoi.maNV, mode: "insensitive" as const } }]
    : [];
  const viecCuaToi: Prisma.CongViecWhereInput = quanTri
    ? /* Quản lý: đúng việc ghi tên mình, khớp với `?nguoi=` trên liên kết. */
      cuaChinhToi.length
      ? { OR: cuaChinhToi }
      : { id: "khong-co" }
    : { OR: [...cuaChinhToi, ...chuaGiao] };

  const caiDat = await docCaiDatCham();
  const [
    cham,
    viecQuaHan,
    lichHomNay,
    suCoTreo,
    donCho,
    thuCho,
    chiCho,
    chuaCoMatKhau,
    no,
    choKhach,
    denHen,
  ] = await Promise.all([
    nguoi.maNV ? luotHomNay(nguoi.maNV, caiDat) : Promise.resolve(null),
    prisma.congViec.count({
      where: { matBenAppSheet: null, ...viecCuaToi, trangThai: { not: "Đã làm" }, thoiHan: { lt: homNay } },
    }),
    prisma.lichChup.count({ where: { matBenAppSheet: null, ngay: homNay } }),
    /*
      CHỈ sự cố ghi trên web (`bamAppSheet: null`). 19 dòng treo chép từ
      AppSheet không mang thời điểm nào — bên đó ba cột thời gian rỗng hết —
      nên không ai biết chúng còn thật hay đã xong từ năm ngoái. Đếm chúng vào
      đây là bắt cả tiệm nhìn một con số 19 không ai xử lý được.
    */
    prisma.suCo.count({
      where: {
        matBenAppSheet: null,
        bamAppSheet: null,
        OR: [{ trangThai: null }, { trangThai: { not: SU_CO_DA_XONG } }],
      },
    }),
    quanTri
      ? prisma.donTu.count({ where: { matBenAppSheet: null, trangThai: DON_DANG_TAO } })
      : Promise.resolve(0),
    quanTri
      ? prisma.phieuThu.count({ where: { matBenAppSheet: null, trangThai: CHO_DUYET } })
      : Promise.resolve(0),
    quanTri
      ? prisma.chiTieu.count({ where: { matBenAppSheet: null, trangThai: CHO_DUYET } })
      : Promise.resolve(0),
    quanTri
      ? prisma.nhanVien.count({ where: { dangLam: true, matKhau: null } })
      : Promise.resolve(0),
    coTien
      ? prisma.hopDong.aggregate({
          where: { matBenAppSheet: null, conLai: { gt: 0 } },
          _sum: { conLai: true },
          _count: { _all: true },
        })
      : Promise.resolve(null),
    coHopDong
      ? prisma.hopDong.count({ where: { matBenAppSheet: null, buoc: { in: BUOC_CHO_KHACH } } })
      : Promise.resolve(0),
    coHopDong
      ? prisma.khachTiemNang.count({
          where: {
            matBenAppSheet: null,
            khaNang: { not: DA_CHOT },
            ngayLienHeLai: { lte: homNay },
          },
        })
      : Promise.resolve(0),
  ]);

  /* Chấm công: ba trạng thái, mỗi trạng thái một câu khác nhau. */
  const chuaVao = !!nguoi.maNV && !cham?.gioVao;
  const chuaRa = !!cham?.gioVao && !cham.gioRa;

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <p className="eyebrow">Tổng quan</p>
          <h1 className="mt-2 font-display text-3xl font-light">
            Chào {nguoi.id ? nguoi.ten : "anh"}
          </h1>
        </div>
        <p className="text-sm text-fg-muted tabular-nums">{THU_NGAY.format(new Date())}</p>
      </div>

      {/* ── Việc của chính người đang xem ───────────────────────────── */}
      <section className="mt-8">
        <h2 className="eyebrow">Hôm nay</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <The
            href="/quan-ly/cham-cong"
            nhan="Chấm công"
            /* Chữ "Chưa vào ca" không vừa nửa màn hình 375px — cho chiếm cả hàng. */
            rong
            /*
              Thẻ này KHÔNG đếm — nó nói một câu. Con số duy nhất đáng hiện ở
              đây là "đã đủ giờ chưa", mà thứ đó là chữ chứ không phải số.
            */
            chu={!nguoi.maNV ? "—" : chuaVao ? "Chưa vào ca" : chuaRa ? "Chưa ra ca" : "Xong"}
            muc={!nguoi.maNV ? "yen" : chuaVao ? "gap" : chuaRa ? "nhe" : "xong"}
            phu={!nguoi.maNV ? "tài khoản không gắn nhân viên" : chuaVao ? "bấm để vào ca" : undefined}
          />
          <The
            href={`/quan-ly/cong-viec?tt=qua-han${nguoi.maNV ? `&nguoi=${encodeURIComponent(nguoi.maNV)}` : ""}`}
            nhan="Việc quá hạn"
            chu={String(viecQuaHan)}
            muc={viecQuaHan > 0 ? "gap" : "yen"}
            phu="của anh chị"
          />
          <The
            href="/quan-ly/lich"
            nhan="Lịch chụp hôm nay"
            chu={String(lichHomNay)}
            muc={lichHomNay > 0 ? "thuong" : "yen"}
          />
        </div>
        {suCoTreo > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            <Link href="/quan-ly/su-co" className="text-accent underline underline-offset-2">
              {suCoTreo} sự cố
            </Link>{" "}
            đang treo chưa xử lý xong.
          </p>
        )}
      </section>

      {/* ── Việc chờ quản lý quyết ──────────────────────────────────── */}
      {quanTri && (
        <section className="mt-10">
          <h2 className="eyebrow">Chờ anh duyệt</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <The href="/quan-ly/don-tu" nhan="Đơn từ" chu={String(donCho)} muc={donCho > 0 ? "nhe" : "yen"} />
            <The
              href="/quan-ly/phieu-thu?tt=cho-duyet"
              nhan="Phiếu thu"
              chu={String(thuCho)}
              muc={thuCho > 0 ? "nhe" : "yen"}
            />
            <The
              href="/quan-ly/so-quy?tt=cho-duyet"
              nhan="Khoản chi"
              chu={String(chiCho)}
              muc={chiCho > 0 ? "nhe" : "yen"}
            />
          </div>
          {chuaCoMatKhau > 0 && (
            <p className="mt-3 text-sm text-fg-muted">
              <Link href="/quan-ly/nhan-vien" className="text-accent underline underline-offset-2">
                {chuaCoMatKhau} người
              </Link>{" "}
              đang làm mà chưa được cấp mật khẩu — chưa đăng nhập được.
            </p>
          )}
        </section>
      )}

      {/* ── Tình hình tiệm ──────────────────────────────────────────── */}
      {coHopDong && (
        <section className="mt-10">
          <h2 className="eyebrow">Tiệm đang thế nào</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {coTien && no && (
              <The
                href="/quan-ly/hop-dong?no=1"
                nhan="Còn phải thu"
                chu={`${tien(no._sum.conLai ?? 0)}đ`}
                nho
                /* "743.185.910đ" không vừa nửa màn hình 375px. */
                rong
                muc={no._count._all > 0 ? "nhe" : "yen"}
                phu={`${no._count._all} hợp đồng`}
              />
            )}
            <The
              href="/quan-ly/hop-dong?tt=cho-khach"
              nhan="Chờ khách chọn ảnh"
              chu={String(choKhach)}
              muc={choKhach > 0 ? "thuong" : "yen"}
              phu="hợp đồng"
            />
            <The
              href="/quan-ly/khach-tiem-nang"
              nhan="Khách hẹn gọi lại"
              chu={String(denHen)}
              muc={denHen > 0 ? "gap" : "yen"}
              phu="đã đến hẹn"
            />
          </div>
        </section>
      )}

      {/* ── Lối tắt, chủ yếu cho điện thoại ─────────────────────────── */}
      <section className="mt-10">
        <h2 className="eyebrow">Đi tới</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ...(coHopDong ? [["Hợp đồng", "/quan-ly/hop-dong"]] : []),
            ["Lịch chụp", "/quan-ly/lich"],
            ["Đầu việc", "/quan-ly/cong-viec"],
            ...(coHopDong ? [["Khách tiềm năng", "/quan-ly/khach-tiem-nang"]] : []),
            ...(coTien
              ? [
                  ["Khách hàng", "/quan-ly/khach-hang"],
                  ["Phiếu thu", "/quan-ly/phieu-thu"],
                  ["Sổ quỹ", "/quan-ly/so-quy"],
                ]
              : []),
            ["Đơn từ", "/quan-ly/don-tu"],
            ["Lương", "/quan-ly/luong"],
            ...(xemNhanVien(nguoi) ? [["Nhân viên", "/quan-ly/nhan-vien"]] : []),
            ["Nội quy", "/quan-ly/noi-quy"],
            ["Dịch vụ & trang phục", "/quan-ly/dich-vu"],
            ...(quanTri
              ? [
                  ["Thông tin studio", "/quan-ly/thong-tin"],
                  ["Quản lý album ảnh", "/admin"],
                ]
              : []),
          ].map(([ten, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-line px-3 py-1.5 text-sm text-fg-muted transition hover:border-line-strong hover:text-fg"
            >
              {ten}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Một thẻ số. Bốn mức màu, và mức quyết định cả chuyện thẻ có mời bấm không.
 *
 * `yen` (số 0) cố ý nhạt: số không là tin tốt, đừng để nó đòi chú ý ngang với
 * ba việc đang quá hạn.
 */
function The({
  href,
  nhan,
  chu,
  phu,
  muc,
  nho,
  rong,
}: {
  href: string;
  nhan: string;
  chu: string;
  phu?: string;
  muc: "gap" | "nhe" | "thuong" | "xong" | "yen";
  /** Số dài (tiền) thì chữ nhỏ lại cho khỏi tràn. */
  nho?: boolean;
  /** Chiếm cả hàng trên điện thoại (lưới hai cột). */
  rong?: boolean;
}) {
  const vien =
    muc === "gap"
      ? "border-amber-300 bg-amber-50"
      : muc === "nhe"
        ? "border-accent/40 bg-accent-soft/40"
        : "border-line bg-bg-raised";
  const mauSo =
    muc === "gap"
      ? "text-amber-900"
      : muc === "xong"
        ? "text-emerald-700"
        : muc === "yen"
          ? "text-fg-faint"
          : "";
  return (
    <Link
      href={href}
      className={`rounded-md border p-4 transition hover:border-accent ${vien} ${rong ? "col-span-2 sm:col-span-1" : ""}`}
    >
      <p className="text-xs text-fg-muted">{nhan}</p>
      <p
        className={`mt-1 font-display tabular-nums ${
          nho || chu.length > 6 ? "text-xl" : "text-3xl"
        } ${mauSo}`}
      >
        {chu}
      </p>
      {phu && <p className="mt-0.5 text-xs text-fg-faint">{phu}</p>}
    </Link>
  );
}
