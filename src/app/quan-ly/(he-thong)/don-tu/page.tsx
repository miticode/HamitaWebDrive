import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, tien } from "@/lib/constants";
import { batBuocDangNhap, laQuanTri } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { DON_DA_DUYET, DON_DANG_TAO, DON_KHONG_DUYET } from "@/lib/donTuChung";
import { Chip } from "../Chip";
import { NutDuyetDon, NutGuiDon, NutHuyDon } from "./FormDon";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/*
  Cột "Người gửi" biến mất khi đang lọc "của tôi" — khai theo TÊN để bỏ một
  cột giữa bảng không làm trượt nhãn của những cột sau.

  "Loại đơn" là `chinh`: trên điện thoại nó làm tiêu đề thẻ. Ngày tháng không
  nhận ra được đơn nào, còn "Nghỉ phép" thì có.
*/
const COT = {
  ngay: { ten: "Ngày" },
  nguoiGui: { ten: "Người gửi" },
  loaiDon: { ten: "Loại đơn", chinh: true },
  lyDo: { ten: "Lý do", lop: "min-w-48" },
  trangThai: { ten: "Trạng thái" },
  nguoiDuyet: { ten: "Người duyệt" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ loc?: string }> };

/**
 * ĐƠN TỪ — nghỉ phép, xin ứng lương. Thêm 13/11/2026 (đợt 5).
 *
 * Ai cũng gửi được và ai cũng xem được đơn CỦA MÌNH; quản lý xem và duyệt cả
 * tiệm. Lọc mặc định của quản lý là "chờ duyệt" — đó là thứ duy nhất cần họ
 * làm gì, còn 445 đơn đã duyệt chỉ để tra lại.
 */
export default async function DonTuPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  const quanTri = laQuanTri(nguoi);
  const sp = await searchParams;

  /* Người thường luôn chỉ thấy đơn của mình, bất kể gõ gì trên địa chỉ. */
  const loc = quanTri ? (sp.loc ?? "cho-duyet") : "cua-toi";

  const where: Prisma.DonTuWhereInput = {
    matBenAppSheet: null,
    ...(loc === "cua-toi"
      ? /*
           Người KHÔNG có mã nhân viên thì không có đơn nào mang tên họ — chặn
           bằng một điều kiện không bao giờ đúng.

           Bản cũ lấy byte NUL làm "chuỗi không bao giờ khớp". Postgres TỪ CHỐI
           mọi chuỗi chứa NUL ("invalid byte sequence for encoding UTF8: 0x00")
           nên trang nổ 500 với đúng những người thiếu mã NV — lỗi sống trên bản
           production từ đợt 5 tới khi kịch bản phân quyền bắt được.
        */
        nguoi.maNV
          ? { maNV: { equals: nguoi.maNV, mode: "insensitive" } }
          : { id: "khong-bao-gio-khop" }
      : loc === "cho-duyet"
        ? { trangThai: DON_DANG_TAO }
        : {}),
  };

  const prisma = getPrisma();
  const [ds, soChoDuyet, bangTen] = await Promise.all([
    prisma.donTu.findMany({
      where,
      orderBy: [{ ngayYeuCau: { sort: "desc", nulls: "last" } }, { taoLuc: "desc" }],
      take: 300,
    }),
    prisma.donTu.count({ where: { matBenAppSheet: null, trangThai: DON_DANG_TAO } }),
    tenTheoMaNV(),
  ]);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  /* Chờ duyệt là việc đang treo; không duyệt là một lời từ chối — xem Chip.tsx. */
  const kieuDon = (t: string | null) =>
    t === DON_DANG_TAO ? "cho" : t === DON_KHONG_DUYET ? "hong" : "xong";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Nhân sự</p>
          <h1 className="mt-2 font-display text-3xl font-light">Đơn từ</h1>
        </div>
        {nguoi.maNV && <NutGuiDon homNay={homNayStudio()} />}
      </div>

      {!nguoi.maNV && (
        /* Hai trường hợp khác nhau — xem chú thích cùng việc ở `cham-cong/page.tsx`. */
        <div className="notice mt-5 bg-accent-soft text-fg">
          {nguoi.id ? (
            <>
              Tài khoản của anh/chị <b>chưa có mã nhân viên</b> nên chưa gửi đơn được. Nhờ quản lý
              thêm mã giúp trong mục <b>Nhân viên</b>.
            </>
          ) : (
            <>
              Đang đăng nhập bằng mật khẩu quản lý chung, không gắn với một nhân viên cụ thể nên
              không gửi đơn được.
            </>
          )}
        </div>
      )}

      {quanTri && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link href="/quan-ly/don-tu?loc=cho-duyet" className={lopChip(loc === "cho-duyet")}>
            Chờ duyệt · {soChoDuyet}
          </Link>
          <Link href="/quan-ly/don-tu?loc=tat-ca" className={lopChip(loc === "tat-ca")}>
            Tất cả
          </Link>
          <Link href="/quan-ly/don-tu?loc=cua-toi" className={lopChip(loc === "cua-toi")}>
            Của tôi
          </Link>
        </div>
      )}

      <Bang
        lop="mt-5"
        cot={[
          COT.ngay,
          ...(loc !== "cua-toi" ? [COT.nguoiGui] : []),
          COT.loaiDon,
          COT.lyDo,
          COT.trangThai,
          COT.nguoiDuyet,
          COT.viec,
        ]}
        trong={
          loc === "cho-duyet"
            ? "Không có đơn nào chờ duyệt."
            : loc === "cua-toi"
              ? "Anh/chị chưa gửi đơn nào."
              : "Chưa có đơn nào."
        }
      >
        {ds.map((d) => {
          const cuaToi = (d.maNV ?? "").toLowerCase() === (nguoi.maNV ?? "").toLowerCase();
          return (
            <Hang key={d.id} lop="align-top transition hover:bg-bg-soft">
              <O cot={COT.ngay} lop="whitespace-nowrap text-fg-muted tabular-nums">
                {ngayVN(d.ngayYeuCau)}
              </O>
              {loc !== "cua-toi" && (
                <O cot={COT.nguoiGui} lop="whitespace-nowrap">
                  {tenNV(bangTen, d.maNV) ?? "—"}
                </O>
              )}
              <O cot={COT.loaiDon} lop="whitespace-nowrap">
                {d.loaiDon ?? "—"}
                {d.loaiNghi && <span className="block text-xs text-fg-muted">{d.loaiNghi}</span>}
                {d.soTien != null && d.soTien > 0 && (
                  <span className="block text-xs tabular-nums text-fg-muted">{tien(d.soTien)}đ</span>
                )}
              </O>
              <O cot={COT.lyDo}>
                {d.lyDo ?? "—"}
                {d.ghiChu && <span className="mt-0.5 block text-xs text-fg-muted">Quản lý: {d.ghiChu}</span>}
              </O>
              <O cot={COT.trangThai} lop="whitespace-nowrap">
                <Chip chu={d.trangThai} kieu={kieuDon(d.trangThai)} />
                {d.ngayDuyet && (
                  <span className="block text-xs text-fg-faint tabular-nums">{ngayVN(d.ngayDuyet)}</span>
                )}
              </O>
              <O cot={COT.nguoiDuyet} lop="whitespace-nowrap text-fg-muted">
                {tenNV(bangTen, d.nguoiDuyetMaNV) ?? "—"}
              </O>
              <O cot={COT.viec}>
                {d.trangThai === DON_DANG_TAO && quanTri && !d.bamAppSheet && <NutDuyetDon id={d.id} />}
                {d.trangThai === DON_DANG_TAO && !quanTri && cuaToi && !d.bamAppSheet && (
                  <div className="md:text-right">
                    <NutHuyDon id={d.id} />
                  </div>
                )}
              </O>
            </Hang>
          );
        })}
      </Bang>

      {/*
        Nói rõ đơn ĐÃ DUYỆT thì người gửi không tự huỷ được — tránh việc họ đi
        tìm nút huỷ rồi tưởng web hỏng. Đơn đã duyệt là căn cứ cho bảng công và
        bảng lương, muốn bỏ thì quản lý chuyển trạng thái để còn dấu vết.
      */}
      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Đơn đã gửi chỉ huỷ được khi còn <span className="text-fg-muted">{DON_DANG_TAO}</span>. Đơn đã
        duyệt là căn cứ cho bảng công và bảng lương — muốn bỏ thì nhờ quản lý
        chuyển sang <span className="text-fg-muted">{DON_KHONG_DUYET}</span>, để còn
        dấu vết ai đổi ý lúc nào. Đơn mang trạng thái{" "}
        <span className="text-fg-muted">{DON_DA_DUYET}</span> từ AppSheet thì xử bên đó.
      </p>
    </div>
  );
}
