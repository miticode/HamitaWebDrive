import { getPrisma } from "@/lib/db";
import { xoaTrenKho } from "@/lib/khoAnh";
import { maNguoiLap, type NguoiLap } from "@/lib/taoHopDong";
import { CHO_DUYET, kiemChi, trangThaiChi, type DuLieuChi } from "@/lib/soQuyChung";

/**
 * Sổ quỹ: phần GHI của bảng Chi, và phép cộng thu − chi.
 *
 * Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 3). Trước đó web có Thu mà không có
 * Chi nên không ra được số dư — tiệm vẫn phải mở AppSheet để biết còn bao
 * nhiêu, và đó là một lý do nữa khiến không ai chuyển sang web.
 *
 * Phần ĐỌC từ AppSheet nằm ở `src/lib/dongBoAppSheet.ts` (mục 7).
 */

/** Thêm một khoản chi lập trên web. `anhKho` là mã tệp chứng từ trên Drive kho. */
export async function themChi(
  du: DuLieuChi,
  nguoi: NguoiLap,
  anhKho?: string | null,
): Promise<{ loi: string } | { ok: true; id: string }> {
  const kq = kiemChi(du);
  if ("loi" in kq) return kq;

  const maNV = maNguoiLap(nguoi);
  const dong = await getPrisma().chiTieu.create({
    data: {
      hinhThuc: kq.hinhThuc,
      taiKhoan: kq.taiKhoan || null,
      khoanChi: kq.khoanChi,
      dienGiai: kq.dienGiai || null,
      ngayChi: kq.ngayChi,
      soTien: kq.soTien,
      trangThai: trangThaiChi(kq.hinhThuc, nguoi.laQuanLy),
      ghiChu: kq.ghiChu || null,
      nguoiNhan: kq.nguoiNhan || null,
      nguoiTaoMaNV: maNV,
      nguoiDuyetMaNV: nguoi.laQuanLy ? maNV : null,
      anhKho: anhKho || null,
    },
    select: { id: true },
  });
  return { ok: true, id: dong.id };
}

/**
 * Quản lý duyệt một khoản đang chờ.
 *
 * Giống bên phiếu thu: duyệt KHÔNG làm đổi con số tổng — số chi vốn đã cộng cả
 * khoản chờ duyệt. Nó chỉ trả lời "tiền này đã thật sự ra khỏi két chưa", và
 * ghi tên người chịu trách nhiệm cho câu trả lời đó.
 */
export async function duyetChi(
  id: string,
  nguoi: NguoiLap,
): Promise<{ loi: string } | { ok: true }> {
  const prisma = getPrisma();
  const c = await prisma.chiTieu.findUnique({
    where: { id },
    select: { trangThai: true, hinhThuc: true },
  });
  if (!c) return { loi: "Khoản chi này không còn." };
  if (c.trangThai !== CHO_DUYET) return { loi: "Khoản này đã được duyệt rồi." };

  await prisma.chiTieu.update({
    where: { id },
    data: {
      trangThai: trangThaiChi(c.hinhThuc ?? "Tiền mặt", true),
      nguoiDuyetMaNV: maNguoiLap(nguoi),
    },
  });
  return { ok: true };
}

/**
 * Xoá hẳn một khoản chi lập nhầm.
 *
 * CHỈ xoá được dòng LẬP TRÊN WEB. Dòng chép từ AppSheet (`bamAppSheet` có giá
 * trị) thì xoá ở đây vô nghĩa: đêm nay lịch chép chạy là nó quay lại y nguyên.
 * Muốn bỏ thì phải bỏ bên AppSheet — nói thẳng thay vì để người dùng bấm xoá
 * rồi sáng mai thấy nó còn đó mà không hiểu vì sao.
 *
 * Ảnh chứng từ trên Drive xoá luôn, vì không còn dòng nào trỏ tới nó nữa. Xoá
 * ảnh hỏng thì KHÔNG chặn việc xoá dòng — cùng lắm là thừa một tệp trên Drive,
 * còn hơn để lại một dòng sổ mà người ta tưởng đã xoá.
 */
export async function xoaChi(id: string): Promise<{ loi: string } | { ok: true }> {
  const prisma = getPrisma();
  const c = await prisma.chiTieu.findUnique({
    where: { id },
    select: { bamAppSheet: true, anhKho: true },
  });
  if (!c) return { loi: "Khoản chi này không còn." };
  if (c.bamAppSheet) {
    return { loi: "Khoản này chép từ AppSheet, phải xoá bên đó — xoá ở đây đêm nay nó chép lại." };
  }

  await prisma.chiTieu.delete({ where: { id } });
  if (c.anhKho) await xoaTrenKho(c.anhKho).catch(() => {});
  return { ok: true };
}

export type TongKetSoQuy = {
  thu: number;
  chi: number;
  soDu: number;
  thuChoDuyet: number;
  chiChoDuyet: number;
  soPhieuThu: number;
  soKhoanChi: number;
};

/**
 * Cộng thu − chi trong một khoảng ngày.
 *
 * Hai cột ngày đều là chuỗi "yyyy-mm-dd" chứ không phải kiểu ngày tháng, nên
 * so sánh ở đây là so chuỗi. Đúng được vì định dạng đó xếp theo thứ tự chữ cái
 * cũng chính là xếp theo thời gian — nhưng chỉ đúng với định dạng NÀY, đừng
 * bê cách so này sang cột ngày kiểu khác.
 *
 * Khoản CHỜ DUYỆT vẫn được cộng vào tổng, giống hệt cách phiếu thu đang làm,
 * rồi tách ra một con số riêng. Để ngoài tổng thì số dư trông đẹp hơn thực tế
 * — mà tiền thì đã hẹn chi là coi như đã ra.
 */
export async function docSoQuy(tu: string, den: string): Promise<TongKetSoQuy> {
  const prisma = getPrisma();
  const trongKy = { gte: tu, lte: den };

  const [thuTong, chiTong, thuCho, chiCho] = await Promise.all([
    prisma.phieuThu.aggregate({
      where: { ngayThu: trongKy },
      _sum: { soTien: true },
      _count: { _all: true },
    }),
    prisma.chiTieu.aggregate({
      where: { ngayChi: trongKy },
      _sum: { soTien: true },
      _count: { _all: true },
    }),
    prisma.phieuThu.aggregate({
      where: { ngayThu: trongKy, trangThai: CHO_DUYET },
      _sum: { soTien: true },
    }),
    prisma.chiTieu.aggregate({
      where: { ngayChi: trongKy, trangThai: CHO_DUYET },
      _sum: { soTien: true },
    }),
  ]);

  const thu = thuTong._sum.soTien ?? 0;
  const chi = chiTong._sum.soTien ?? 0;
  return {
    thu,
    chi,
    soDu: thu - chi,
    thuChoDuyet: thuCho._sum.soTien ?? 0,
    chiChoDuyet: chiCho._sum.soTien ?? 0,
    soPhieuThu: thuTong._count._all,
    soKhoanChi: chiTong._count._all,
  };
}

/** Cộng tiền chi theo từng khoản, để biết tiền đi đâu nhiều nhất trong kỳ. */
export async function chiTheoKhoan(
  tu: string,
  den: string,
  gioiHan = 15,
): Promise<{ khoanChi: string; soTien: number; soDong: number }[]> {
  const nhom = await getPrisma().chiTieu.groupBy({
    by: ["khoanChi"],
    where: { ngayChi: { gte: tu, lte: den } },
    _sum: { soTien: true },
    _count: { _all: true },
  });

  return nhom
    .map((n) => ({
      khoanChi: n.khoanChi ?? "(không ghi)",
      soTien: n._sum.soTien ?? 0,
      soDong: n._count._all,
    }))
    .sort((a, b) => b.soTien - a.soTien)
    .slice(0, gioiHan);
}
