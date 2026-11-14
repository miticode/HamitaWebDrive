import Link from "next/link";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { batBuocDangNhap, batBuocQuyen, lapHopDong } from "@/lib/phienNhanVien";
import { docCacBuoc } from "@/lib/buocHopDong";
import { demLuotDung } from "@/lib/dichVuHayDung";
import { FormHopDongMoi } from "./FormHopDongMoi";

export const dynamic = "force-dynamic";

/** Hôm nay theo giờ studio, dạng "YYYY-MM-DD" (nguyên tắc 35). */
function homNay(): string {
  const phan = new Intl.DateTimeFormat("en-CA", {
    timeZone: MUI_GIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return phan;
}

/**
 * Lập hợp đồng mới — anh chốt 21/09/2026 chuyển việc lập hợp đồng từ AppSheet
 * về web (nguyên tắc 52 đã ghi lại).
 *
 * Trang tải sẵn cả bảng dịch vụ và bảng giá hạng mục rồi mới dựng form: gõ tìm
 * dịch vụ là lọc ngay trong máy, không phải mỗi phím một lượt hỏi database
 * (nguyên tắc 53). Bảng dịch vụ 1.018 dòng, bảng giá 313 dòng — hai câu hỏi
 * cho cả một lượt lập hợp đồng.
 *
 * Riêng KHÁCH HÀNG thì không tải sẵn: 1.992 nhà kèm số điện thoại, thứ đó chỉ
 * rời máy chủ theo đúng câu người ta đang gõ (xem timKhachAction).
 */
export default async function LapHopDongPage() {
  const nguoi = await batBuocDangNhap();
  batBuocQuyen(lapHopDong(nguoi));

  const prisma = getPrisma();
  const [dichVu, giaHangMuc, luotDung, cacBuoc] = await Promise.all([
    prisma.dichVu.findMany({
      where: { dangDung: true },
      orderBy: [{ loai: "asc" }, { ten: "asc" }],
      select: { id: true, maDV: true, ten: true, loai: true, nhom: true, donGia: true, donVi: true, chiTiet: true },
    }),
    prisma.giaHangMuc.findMany({
      orderBy: { taoLuc: "asc" },
      select: { dichVuId: true, hangMuc: true, donGia: true },
    }),
    demLuotDung(),
    docCacBuoc(),
  ]);

  return (
    <div className="max-w-5xl">
      <Link href="/quan-ly/hop-dong" className="eyebrow transition hover:text-accent">
        ← Hợp đồng
      </Link>
      <h1 className="mt-3 font-display text-3xl font-light">Lập hợp đồng</h1>
      <p className="mt-2 text-sm text-fg-muted">
        Hợp đồng lập ở đây nằm thẳng trong web. Lưu xong là có luôn dòng dịch vụ, phiếu
        thu cọc, lịch chụp và đầu việc — không phải gõ lại bên AppSheet nữa.
      </p>

      <FormHopDongMoi
        dichVu={dichVu}
        giaHangMuc={giaHangMuc}
        luotDung={luotDung}
        homNay={homNay()}
        laQuanLy={nguoi.vaiTro === "quan-tri"}
        tenNguoiLap={nguoi.ten}
        cacBuoc={cacBuoc}
      />
    </div>
  );
}
