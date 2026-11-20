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
import { demChuaGhep } from "@/lib/ghepAlbum";
import { khoaCuaToi } from "@/lib/hopDongMayChu";

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
  /*
    NGÀY MAI cũng phải thấy được — thử hành trình 14/11 mới lộ.

    Thẻ "Lịch chụp hôm nay" chỉ đếm hôm nay, nên Photo mở web buổi tối thì
    không biết sáng mai có buổi nào. Mà lịch chụp thì chốt từ trước hàng tháng:
    thứ người ta cần biết lúc cuối ngày chính là NGÀY MAI.
  */
  const ngayMai = new Date(new Date(`${homNay}T00:00:00+07:00`).getTime() + 86_400_000)
    .toLocaleDateString("sv-SE", { timeZone: MUI_GIO });
  const prisma = getPrisma();

  /*
    Việc quá hạn CỦA CHÍNH NGƯỜI ĐANG XEM — đúng nghĩa "của anh chị".

    Hai lần sửa, hai lần cùng một bài học: đừng gọi việc của người khác là
    việc của tôi.

    · Bản đầu đếm cả tiệm → ra 169, hạn cũ nhất 23/03/2025. Đó là tồn kho hai
      mươi tháng chép từ AppSheet, không phải việc hôm nay.
    · Bản thứ hai cộng thêm "việc chưa giao cho ai" để khớp với trang Đầu
      việc. Đo bằng tài khoản HỌC VIÊN chưa có mã nhân viên thì thẻ ghi
      "137 — của anh chị", trong khi bạn ấy chưa được giao việc nào: 137 đó
      là việc chung của cả tiệm.

    Giờ thẻ chỉ đếm việc GHI TÊN MÌNH. Bấm vào trang Đầu việc có thể thấy
    nhiều hơn (người thường luôn thấy thêm việc chưa giao) — thấy thêm thì
    không ai hiểu nhầm, còn gọi nhầm việc người khác là việc mình thì có.

    Việc chưa giao vẫn đáng biết, nhưng là một câu khác, nằm riêng bên dưới.
  */
  const khoaToi = khoaCuaToi(nguoi);
  const viecCuaToi: Prisma.CongViecWhereInput = khoaToi
    ? { nguoiPhuTrachMaNV: { equals: khoaToi, mode: "insensitive" } }
    : { id: "khong-bao-gio-khop" };

  /** Việc chưa giao cho ai — ai rảnh thì nhận. Quản lý không cần dòng này. */
  const viecChuaGiao: Prisma.CongViecWhereInput = {
    OR: [{ nguoiPhuTrachMaNV: null }, { nguoiPhuTrachMaNV: "" }],
  };

  const caiDat = await docCaiDatCham();
  const [
    cham,
    viecQuaHan,
    viecChuaAiNhan,
    lichHomNay,
    lichNgayMai,
    suCoTreo,
    donCho,
    thuCho,
    chiCho,
    chuaCoMatKhau,
    no,
    choKhach,
    albumChuaGhep,
    denHen,
  ] = await Promise.all([
    nguoi.maNV ? luotHomNay(nguoi.maNV, caiDat) : Promise.resolve(null),
    prisma.congViec.count({
      where: { matBenAppSheet: null, ...viecCuaToi, trangThai: { not: "Đã làm" }, thoiHan: { lt: homNay } },
    }),
    quanTri
      ? Promise.resolve(0)
      : prisma.congViec.count({
          where: { matBenAppSheet: null, ...viecChuaGiao, trangThai: { not: "Đã làm" } },
        }),
    prisma.lichChup.count({ where: { matBenAppSheet: null, ngay: homNay } }),
    prisma.lichChup.count({ where: { matBenAppSheet: null, ngay: ngayMai } }),
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
    /*
      Album chưa gắn hợp đồng (14/11/2026). Chỉ quản lý + sale thấy: gắn album
      là việc nối tiền và tiến độ của một nhà khách, cùng nhóm với hợp đồng.
    */
    coHopDong ? demChuaGhep() : Promise.resolve(0),
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
            href={`/quan-ly/cong-viec?tt=qua-han${khoaToi ? `&nguoi=${encodeURIComponent(khoaToi)}` : ""}`}
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
            phu={lichNgayMai > 0 ? `mai ${lichNgayMai} buổi` : undefined}
          />
        </div>
        {/*
          Việc chưa ai nhận: câu RIÊNG, không trộn vào thẻ "của anh chị".
          Đáng giá nhất với người mới — mở web lên là thấy có việc để nhận.
        */}
        {viecChuaAiNhan > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            <Link href="/quan-ly/cong-viec" className="text-accent underline underline-offset-2">
              {viecChuaAiNhan} đầu việc
            </Link>{" "}
            chưa giao cho ai — ai rảnh thì nhận.
          </p>
        )}
        {/*
          Album chưa gắn hợp đồng — đo 14/11: 169 album, gắn 3. Mối nối này là
          nền của mọi thứ về tiến độ sản xuất, nên nhắc ở chỗ người ta nhìn.
        */}
        {albumChuaGhep > 0 && (
          <p className="mt-3 text-sm text-fg-muted">
            <Link href="/admin/ghep-hop-dong" className="text-accent underline underline-offset-2">
              {albumChuaGhep} album
            </Link>{" "}
            chưa gắn hợp đồng — gắn rồi thì trang hợp đồng mới thấy khách chọn ảnh tới đâu.
          </p>
        )}
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
            ...(quanTri
              ? [
                  /* Quản lý dịch vụ chỉ quản lý — xem dich-vu/page.tsx (20/11/2026). */
                  ["Quản lý dịch vụ", "/quan-ly/dich-vu"],
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
