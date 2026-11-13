import { getPrisma } from "@/lib/db";
import { docCacBuoc } from "@/lib/buocHopDong";
import {
  kiemPhieuThu,
  kiemSuaHopDong,
  trangThaiThu,
  type DuLieuPhieuThu,
  type DuLieuSuaHopDong,
} from "@/lib/hopDongChung";
import type { NguoiLap } from "@/lib/taoHopDong";
import { maNguoiLap } from "@/lib/taoHopDong";

/**
 * Sửa hợp đồng đã lập, và thêm / duyệt / xoá phiếu thu của nó.
 *
 * Anh chốt 23/09/2026 — lỗ hổng do chính đợt trước mở ra: web lập được hợp
 * đồng nhưng không sửa được, mà AppSheet thì không còn là nơi sửa nữa (nguyên
 * tắc 52). Gõ nhầm một con số là kẹt luôn.
 *
 * Mọi thay đổi đi qua đây đều KẾT THÚC bằng `tinhLaiTien`: bốn con số tiền của
 * hợp đồng (thành tiền, tổng, đã thu, còn lại) luôn được cộng LẠI từ dòng chi
 * tiết và phiếu thu thật, không bao giờ cộng dồn vào số cũ. Cộng dồn thì chỉ
 * cần một lần hỏng giữa chừng là sổ sai mãi mà không ai biết.
 */

type Tx = Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0];

/**
 * Cộng lại tiền của một hợp đồng từ dữ liệu thật rồi ghi xuống.
 *
 * "Đã thu" cộng MỌI phiếu thu kể cả phiếu chờ duyệt — đúng cách AppSheet tính
 * suốt mấy năm nay (kiểm 300 hợp đồng mới nhất không lệch dòng nào). Đổi cách
 * tính ở đây là số trên web lệch với số studio quen đọc.
 */
export async function tinhLaiTien(tx: Tx, hopDongId: string): Promise<void> {
  const [dong, thu, hd] = await Promise.all([
    tx.chiTietHopDong.findMany({
      where: { hopDongId, matBenAppSheet: null },
      select: { thanhTien: true, tenDV: true },
    }),
    tx.phieuThu.findMany({
      where: { hopDongId, matBenAppSheet: null },
      select: { soTien: true },
    }),
    tx.hopDong.findUnique({ where: { id: hopDongId }, select: { khuyenMai: true } }),
  ]);

  const thanhTien = dong.reduce((s, d) => s + d.thanhTien, 0);
  const khuyenMai = Math.min(hd?.khuyenMai ?? 0, thanhTien);
  const tongTien = thanhTien - khuyenMai;
  const daThu = thu.reduce((s, t) => s + t.soTien, 0);

  await tx.hopDong.update({
    where: { id: hopDongId },
    data: {
      thanhTien,
      khuyenMai,
      tongTien,
      daThu,
      conLai: tongTien - daThu,
      danhSachDV: dong.map((d) => d.tenDV).filter(Boolean).join(" , "),
    },
  });
}

/**
 * Ghi phần sửa của hợp đồng.
 *
 * Các dòng dịch vụ xử lý theo kiểu "thay cả cụm": dòng nào form không gửi lên
 * nữa thì xoá, dòng cũ còn thì cập nhật, dòng mới thì thêm. Mã dòng (`_1`,
 * `_2`…) của dòng cũ GIỮ NGUYÊN — mã đó đã in trên đơn giao in và có thể đã
 * gửi cho khách, đánh số lại là hai tờ giấy nói hai chuyện khác nhau.
 *
 * Xoá một dòng thì đầu việc sinh từ dòng đó cũng đi theo: đầu việc "Makeup của
 * gói Album Hamita Garden" mà gói ấy không còn trong hợp đồng thì nó là việc
 * không ai phải làm. Chỉ xoá đầu việc CHƯA AI LÀM — việc đã giao hoặc đã xong
 * thì giữ lại, vì người ta đã bỏ công thật.
 */
export async function suaHopDong(
  id: string,
  du: DuLieuSuaHopDong,
  nguoi: NguoiLap,
): Promise<{ loi: string } | { ok: true }> {
  const kq = kiemSuaHopDong(du, await docCacBuoc());
  if ("loi" in kq) return kq;

  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({ where: { id }, select: { id: true, maHD: true } });
  if (!hd) return { loi: "Hợp đồng này không còn." };

  const maNV = maNguoiLap(nguoi);

  await prisma.$transaction(async (tx) => {
    await tx.hopDong.update({
      where: { id },
      data: {
        tenKhach: kq.tenKhach,
        loaiDV: kq.loaiDV,
        ngayDat: kq.ngayDat,
        diaChi: kq.diaChi,
        ghiChu: kq.ghiChu,
        trangThai: kq.trangThai,
        buoc: kq.buoc,
        khuyenMai: kq.khuyenMai,
      },
    });

    const cu = await tx.chiTietHopDong.findMany({
      where: { hopDongId: id },
      select: { id: true, maAppSheet: true },
    });
    const giuLai = new Set(du.dong.map((d) => d.id).filter(Boolean) as string[]);
    const boDi = cu.filter((c) => !giuLai.has(c.id));

    if (boDi.length) {
      const idBo = boDi.map((c) => c.id);
      await tx.congViec.deleteMany({
        where: {
          chiTietId: { in: idBo },
          OR: [{ trangThai: "Chưa giao việc" }, { trangThai: null }],
        },
      });
      // Việc đã giao hay đã xong thì chỉ cắt dây, không xoá công của người ta.
      await tx.congViec.updateMany({ where: { chiTietId: { in: idBo } }, data: { chiTietId: null } });
      await tx.chiTietHopDong.deleteMany({ where: { id: { in: idBo } } });
    }

    /*
      Số thứ tự cho dòng MỚI tiếp tục từ số lớn nhất đang có, không đếm lại từ
      đầu: đếm lại là đụng mã của dòng vừa xoá, mà mã dòng phải unique.
    */
    let keTiep = 0;
    for (const c of cu) {
      const n = Number(c.maAppSheet.split("_").pop());
      if (Number.isFinite(n) && n > keTiep) keTiep = n;
    }

    for (const d of kq.dong) {
      const data = {
        loai: d.loai || null,
        ngayChup: d.ngayChup || null,
        maDV: d.maDV || null,
        dichVuId: d.dichVuId,
        tenDV: d.tenDV,
        chiTiet: d.chiTiet || null,
        donGia: d.donGia,
        soLuong: d.soLuong,
        thanhTien: d.thanhTien,
        ghiChu: d.ghiChu || null,
      };
      if (d.id) {
        await tx.chiTietHopDong.update({ where: { id: d.id }, data });
      } else {
        keTiep++;
        await tx.chiTietHopDong.create({
          data: { ...data, hopDongId: id, maAppSheet: `${hd.maHD}_${keTiep}`, nguoiLapMaNV: maNV },
        });
      }
    }

    await tinhLaiTien(tx, id);
  });

  return { ok: true };
}

/** Thêm một phiếu thu cho hợp đồng đã có (thu lần hai, thu đủ…). */
export async function themPhieuThu(
  hopDongId: string,
  du: DuLieuPhieuThu,
  nguoi: NguoiLap,
): Promise<{ loi: string } | { ok: true }> {
  const kq = kiemPhieuThu(du);
  if ("loi" in kq) return kq;

  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({ where: { id: hopDongId }, select: { id: true } });
  if (!hd) return { loi: "Hợp đồng này không còn." };

  const maNV = maNguoiLap(nguoi);
  await prisma.$transaction(async (tx) => {
    await tx.phieuThu.create({
      data: {
        hopDongId,
        hinhThuc: kq.hinhThuc,
        noiDung: kq.noiDung,
        ngayThu: kq.ngayThu,
        soTien: kq.soTien,
        trangThai: trangThaiThu(kq.hinhThuc, nguoi.laQuanLy),
        ghiChu: kq.ghiChu || null,
        nguoiTaoMaNV: maNV,
        nguoiDuyetMaNV: nguoi.laQuanLy ? maNV : null,
      },
    });
    await tinhLaiTien(tx, hopDongId);
  });

  return { ok: true };
}

/**
 * Quản lý duyệt một phiếu đang chờ.
 *
 * Duyệt KHÔNG làm đổi tiền của hợp đồng — "đã thu" vốn đã cộng cả phiếu chờ
 * duyệt. Nó chỉ trả lời câu hỏi "tiền này đã vào két chưa", và ghi tên người
 * chịu trách nhiệm cho câu trả lời đó.
 */
export async function duyetPhieuThu(
  id: string,
  nguoi: NguoiLap,
): Promise<{ loi: string } | { ok: true }> {
  const prisma = getPrisma();
  const p = await prisma.phieuThu.findUnique({
    where: { id },
    select: { trangThai: true, hinhThuc: true },
  });
  if (!p) return { loi: "Phiếu thu này không còn." };
  if (p.trangThai !== "Chờ duyệt") return { loi: "Phiếu này đã được duyệt rồi." };

  await prisma.phieuThu.update({
    where: { id },
    data: {
      trangThai: trangThaiThu(p.hinhThuc ?? "Tiền mặt", true),
      nguoiDuyetMaNV: maNguoiLap(nguoi),
    },
  });
  return { ok: true };
}

/** Xoá hẳn một phiếu thu (lập nhầm) rồi cộng lại tiền của hợp đồng. */
export async function xoaPhieuThu(id: string): Promise<{ loi: string } | { ok: true; hopDongId: string | null }> {
  const prisma = getPrisma();
  const p = await prisma.phieuThu.findUnique({ where: { id }, select: { hopDongId: true } });
  if (!p) return { loi: "Phiếu thu này không còn." };

  await prisma.$transaction(async (tx) => {
    await tx.phieuThu.delete({ where: { id } });
    if (p.hopDongId) await tinhLaiTien(tx, p.hopDongId);
  });
  return { ok: true, hopDongId: p.hopDongId };
}

/**
 * Xoá hẳn một hợp đồng cùng mọi thứ treo dưới nó.
 *
 * Người xoá phải GÕ LẠI ĐÚNG MÃ hợp đồng — đây là thao tác không lấy lại được
 * và nó kéo theo cả phiếu thu lẫn đầu việc, nên một cú bấm nhầm không được
 * phép đủ để xoá. Cùng tinh thần với hộp xoá album bên trang ảnh.
 *
 * Dòng chi tiết tự đi theo (`onDelete: Cascade`), còn phiếu thu, lịch và đầu
 * việc thì KHÔNG — chúng để `SetNull` nên sẽ thành mồ côi, tiền lơ lửng trong
 * sổ mà không thuộc hợp đồng nào. Vì vậy phải xoá tay ở đây.
 */
export async function xoaHopDong(
  id: string,
  maGoLai: string,
): Promise<{ loi: string } | { ok: true; maHD: string }> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({ where: { id }, select: { maHD: true } });
  if (!hd) return { loi: "Hợp đồng này không còn." };
  if (maGoLai.trim() !== hd.maHD) return { loi: "Mã gõ lại chưa khớp với mã hợp đồng." };

  await prisma.$transaction(async (tx) => {
    await tx.congViec.deleteMany({ where: { hopDongId: id } });
    await tx.lichChup.deleteMany({ where: { hopDongId: id } });
    await tx.phieuThu.deleteMany({ where: { hopDongId: id } });
    await tx.hopDong.delete({ where: { id } });
  });

  return { ok: true, maHD: hd.maHD };
}
