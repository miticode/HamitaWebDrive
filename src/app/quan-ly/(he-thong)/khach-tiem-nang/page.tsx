import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { homNayStudio, soNgayToiHan } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong, xemHopDong } from "@/lib/phienNhanVien";
import { ngayVN } from "@/lib/hopDongChung";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";
import { DA_CHOT, KHA_NANG } from "@/lib/khachTiemNangChung";
import { Chip } from "../Chip";
import { NutSuaTiemNang, NutThemTiemNang } from "./FormTiemNang";
import { Bang, Hang, O, type CotBang } from "../_ui/Bang";

export const dynamic = "force-dynamic";

/* Khai theo TÊN vì cột "Việc" chỉ người được sửa mới thấy. */
const COT = {
  nguoi: { ten: "Người liên hệ", chinh: true },
  dienThoai: { ten: "Điện thoại" },
  nguon: { ten: "Nguồn" },
  nhuCau: { ten: "Nhu cầu", lop: "min-w-40" },
  khaNang: { ten: "Khả năng" },
  tinhTrang: { ten: "Tình trạng" },
  phuTrach: { ten: "Phụ trách" },
  henGoi: { ten: "Hẹn gọi lại" },
  viec: { ten: "Việc", phai: true, rong: true },
} satisfies Record<string, CotBang>;

type Props = { searchParams: Promise<{ loc?: string }> };

/**
 * KHÁCH TIỀM NĂNG — bảng "CRM" bên AppSheet. Thêm 13/11/2026 (đợt 6).
 *
 * Người mới hỏi giá, chưa thành hợp đồng. Lọc mặc định là ĐANG THEO, xếp theo
 * ngày hẹn gọi lại: trong 35 dòng bên AppSheet có 28 dòng mang ngày hẹn, và đó
 * là thứ duy nhất trong bảng này đòi ai đó làm gì hôm nay. Mở trang ra thấy
 * ngay việc phải làm, cùng nếp "chờ duyệt" của trang Đơn từ (nguyên tắc 29).
 */
export default async function KhachTiemNangPage({ searchParams }: Props) {
  const nguoi = await batBuocDangNhap();
  /* Bảng này mang số điện thoại khách — đúng nhóm được xem hợp đồng (quản lý + sale). */
  batBuocQuyen(xemHopDong(nguoi));
  const sp = await searchParams;
  const loc = sp.loc === "tat-ca" || sp.loc === "da-chot" ? sp.loc : "dang-theo";
  const homNay = homNayStudio();

  const where: Prisma.KhachTiemNangWhereInput = {
    matBenAppSheet: null,
    ...(loc === "dang-theo"
      ? { khaNang: { not: DA_CHOT } }
      : loc === "da-chot"
        ? { khaNang: DA_CHOT }
        : {}),
  };

  const prisma = getPrisma();
  const [ds, soDangTheo, soDenHen, bangTen] = await Promise.all([
    prisma.khachTiemNang.findMany({
      where,
      orderBy: [{ ngayLienHeLai: { sort: "asc", nulls: "last" } }, { taoLuc: "desc" }],
      take: 300,
    }),
    prisma.khachTiemNang.count({ where: { matBenAppSheet: null, khaNang: { not: DA_CHOT } } }),
    prisma.khachTiemNang.count({
      where: { matBenAppSheet: null, khaNang: { not: DA_CHOT }, ngayLienHeLai: { lte: homNay } },
    }),
    tenTheoMaNV(),
  ]);

  const lopChip = (bat: boolean) =>
    `rounded-full border px-3 py-1 text-xs transition whitespace-nowrap ${
      bat ? "border-accent bg-accent-soft text-accent" : "border-line text-fg-muted hover:border-line-strong"
    }`;

  /*
    Khả năng chốt theo đúng nghĩa màu dùng chung (xem Chip.tsx): chốt rồi là
    xanh, "Chờ chốt" là vàng — đó là người sale phải gọi ngay — còn bốn mức
    đầu là trung tính, chưa đòi ai làm gì gấp.
  */
  const kieuKhaNang = (k: string) => (k === DA_CHOT ? "xong" : k === "Chờ chốt" ? "cho" : "thuong");

  const duocSua = lapHopDong(nguoi);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Tư vấn – Chăm sóc khách hàng</p>
          <h1 className="mt-2 font-display text-3xl font-light">
            Khách tiềm năng <span className="text-fg-faint tabular-nums">{ds.length}</span>
          </h1>
        </div>
        {duocSua && <NutThemTiemNang />}
      </div>

      {/*
        Số đến hẹn nói thẳng ở đầu trang, không bắt người ta tự đếm trong bảng.
        Chỉ hiện khi CÓ việc — một dải báo "0 người cần gọi" là dải báo vô ích.
      */}
      {soDenHen > 0 && (
        <div className="notice mt-5 bg-accent-soft text-fg">
          <span className="font-medium tabular-nums">{soDenHen}</span> người đã đến hẹn liên hệ lại.
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href="/quan-ly/khach-tiem-nang" className={lopChip(loc === "dang-theo")}>
          Đang theo · {soDangTheo}
        </Link>
        <Link href="/quan-ly/khach-tiem-nang?loc=da-chot" className={lopChip(loc === "da-chot")}>
          Đã chốt
        </Link>
        <Link href="/quan-ly/khach-tiem-nang?loc=tat-ca" className={lopChip(loc === "tat-ca")}>
          Tất cả
        </Link>
      </div>

      <Bang
        lop="mt-5"
        cot={[
          COT.nguoi,
          COT.dienThoai,
          COT.nguon,
          COT.nhuCau,
          COT.khaNang,
          COT.tinhTrang,
          COT.phuTrach,
          COT.henGoi,
          ...(duocSua ? [COT.viec] : []),
        ]}
        trong={
          loc === "dang-theo"
            ? "Không còn khách nào đang theo."
            : loc === "da-chot"
              ? "Chưa có khách tiềm năng nào chốt."
              : "Chưa có khách tiềm năng nào. Bấm “Thêm khách tiềm năng” để ghi người đầu tiên."
        }
      >
        {ds.map((k) => {
          const conLai = k.ngayLienHeLai ? soNgayToiHan(k.ngayLienHeLai) : null;
          const denHen = conLai !== null && conLai <= 0 && k.khaNang !== DA_CHOT;
          return (
            <Hang key={k.id} lop="align-top transition hover:bg-bg-soft">
              <O cot={COT.nguoi}>
                <span className="font-medium">{k.tenNguoi}</span>
                {k.diaChi && <span className="block text-xs text-fg-faint">{k.diaChi}</span>}
              </O>
              <O cot={COT.dienThoai} lop="whitespace-nowrap tabular-nums">
                {k.soDienThoai ? (
                  <a href={`tel:${k.soDienThoai}`} className="hover:text-accent">
                    {k.soDienThoai}
                  </a>
                ) : (
                  "—"
                )}
                {k.loaiCskh && <span className="block text-xs text-fg-faint">{k.loaiCskh}</span>}
              </O>
              <O cot={COT.nguon} lop="whitespace-nowrap text-fg-muted">
                {k.nguon ?? "—"}
              </O>
              <O cot={COT.nhuCau}>{k.nhuCau ?? "—"}</O>
              <O cot={COT.khaNang} lop="whitespace-nowrap">
                <Chip chu={k.khaNang} kieu={kieuKhaNang(k.khaNang)} />
              </O>
              <O cot={COT.tinhTrang} lop="whitespace-nowrap text-fg-muted">
                {k.tinhTrang ?? "—"}
              </O>
              <O cot={COT.phuTrach} lop="whitespace-nowrap text-fg-muted">
                {tenNV(bangTen, k.phuTrachMaNV) ?? "—"}
              </O>
              <O
                cot={COT.henGoi}
                lop={`whitespace-nowrap tabular-nums ${denHen ? "font-medium text-amber-800" : "text-fg-muted"}`}
              >
                {ngayVN(k.ngayLienHeLai) || "—"}
                {denHen && <span className="ml-1.5 text-xs md:ml-0 md:block">đến hẹn</span>}
              </O>
              {duocSua && (
                <O cot={COT.viec}>
                  <NutSuaTiemNang
                    khach={{
                      id: k.id,
                      tenNguoi: k.tenNguoi,
                      soDienThoai: k.soDienThoai,
                      nguon: k.nguon,
                      nhuCau: k.nhuCau,
                      diaChi: k.diaChi,
                      phuTrachMaNV: k.phuTrachMaNV,
                      khaNang: k.khaNang,
                      tinhTrang: k.tinhTrang,
                      ghiChu: k.ghiChu,
                      loaiCskh: k.loaiCskh,
                      ngayLienHeLai: k.ngayLienHeLai,
                      lichSuCskh: k.lichSuCskh,
                    }}
                  />
                </O>
              )}
            </Hang>
          );
        })}
      </Bang>

      <p className="mt-2 text-xs leading-relaxed text-fg-faint">
        Khách ở đây <span className="text-fg-muted">chưa phải khách hàng</span> — chốt được rồi thì
        lập hợp đồng ở mục Hợp đồng, nhà đó sẽ sang bảng Khách hàng. Xếp theo{" "}
        <span className="text-fg-muted">ngày hẹn gọi lại</span>, gần nhất lên đầu. Sáu mức khả năng
        theo thứ tự {KHA_NANG.join(" → ")}.
      </p>
    </div>
  );
}
