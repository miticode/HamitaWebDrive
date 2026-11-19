import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { MUI_GIO } from "@/lib/constants";
import { docCacBuoc } from "@/lib/buocHopDong";
import {
  kiemHopDongMoi,
  ngayVN,
  trangThaiThu,
  type DuLieuHopDongMoi,
  type HopDongSach,
} from "@/lib/hopDongChung";

/**
 * Lập hợp đồng NGAY TRÊN WEB — anh chốt 21/09/2026, đảo lại nếp cũ "AppSheet là
 * nơi tạo" (nguyên tắc 52). Từ nay AppSheet chỉ còn để tra dữ liệu cũ, nên lịch
 * đồng bộ phải ở nguyên trạng thái TẮT: bật lại là bản AppSheet cũ đè lên hợp
 * đồng vừa lập trên web.
 *
 * Một lần lập sinh đủ bộ như bên AppSheet: khách (nếu là nhà mới) → hợp đồng →
 * từng dòng dịch vụ → phiếu thu cọc → lịch chụp → đầu việc. Tất cả nằm trong
 * MỘT giao dịch: hỏng giữa chừng thì không để lại hợp đồng cụt không có dòng
 * dịch vụ nào, mà tiền thì đã ghi.
 */

/** Năm, tháng, giờ, phút theo giờ studio — không theo giờ máy chủ (nguyên tắc 35). */
function phanNgayVN(luc: Date): { nam: string; thang: string; gio: string; phut: string } {
  const phan = new Intl.DateTimeFormat("en-GB", {
    timeZone: MUI_GIO,
    year: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(luc);
  const lay = (loai: string) => phan.find((p) => p.type === loai)?.value ?? "00";
  return { nam: lay("year"), thang: lay("month"), gio: lay("hour"), phut: lay("minute") };
}

/**
 * Mã hợp đồng giữ đúng hình dạng bên AppSheet (anh chọn 21/09/2026):
 * `STT_26.0900-3_MT1206_14-30` = năm 26, tháng 09, hợp đồng thứ ba của tháng,
 * mã nhân viên người lập, giờ-phút lúc lập.
 *
 * Bên AppSheet cụm bốn số cũng chính là tháng ("26.0300", "25.1200"…), còn con
 * số sau dấu gạch chạy 1–58 và LẶP LẠI giữa các tháng — riêng tháng 1/2026 có
 * 46 mã trùng con số đó (đo 21/09). Nghĩa là tính duy nhất của mã nằm ở cả cụm
 * năm-tháng, mã nhân viên và giờ phút, chứ không ở riêng con số. Web đánh số
 * tăng dần trong tháng cho dễ đọc, và vẫn để database chặn trùng lần cuối.
 */
export function dauMaHopDong(luc: Date): string {
  const { nam, thang } = phanNgayVN(luc);
  return `STT_${nam}.${thang}00-`;
}

export function maHopDong(luc: Date, soTrongThang: number, maNV: string): string {
  const { gio, phut } = phanNgayVN(luc);
  // Mã nhân viên nằm giữa hai dấu gạch dưới nên phải bỏ hết dấu gạch và dấu lạ.
  const ma = (maNV || "NV").replace(/[^A-Za-z0-9]/g, "").slice(0, 20) || "NV";
  return `${dauMaHopDong(luc)}${soTrongThang}_${ma}_${gio}-${phut}`;
}

/** Số thứ tự tiếp theo trong tháng — đọc chính những mã đã có, không đếm dòng. */
async function soTiepTheo(luc: Date): Promise<number> {
  const dau = dauMaHopDong(luc);
  const da = await getPrisma().hopDong.findMany({
    where: { maHD: { startsWith: dau } },
    select: { maHD: true },
  });
  let max = 0;
  for (const h of da) {
    const so = Number(h.maHD.slice(dau.length).split("_")[0]);
    if (Number.isFinite(so) && so > max) max = so;
  }
  return max + 1;
}

export type NguoiLap = {
  id: string;
  ten: string;
  maNV: string | null;
  tenDangNhap: string;
  laQuanLy: boolean;
};

/** Mã ghi vào các cột "Người lập", "Người tạo" — bên AppSheet chúng ghi MÃ NV. */
export function maNguoiLap(nguoi: NguoiLap): string {
  return nguoi.maNV || nguoi.tenDangNhap;
}

/**
 * Ghi cả bộ xuống database. `sach` là dữ liệu ĐÃ qua `kiemHopDongMoi` — tiền
 * trong đó do máy chủ cộng, không phải con số form gửi lên.
 */
async function ghiHopDong(sach: HopDongSach, nguoi: NguoiLap, luc: Date, so: number) {
  const prisma = getPrisma();
  const maNV = maNguoiLap(nguoi);
  const maHD = maHopDong(luc, so, maNV);

  return prisma.$transaction(async (tx) => {
    /*
      Khách mới: mã khách CHÍNH LÀ số điện thoại, đúng nếp AppSheet (1.992/1.992
      khách đang như vậy). Số đã có trong bảng thì dùng lại nhà cũ chứ không tạo
      thêm một nhà trùng số — hai hồ sơ cùng một người là chỗ công nợ bắt đầu sai.
    */
    let khachHangId = sach.khachHangId;
    let soDienThoai: string | null = null;
    if (!khachHangId && sach.khachMoi) {
      soDienThoai = sach.khachMoi.soDienThoai;
      const daCo = await tx.khachHang.findUnique({
        where: { maAppSheet: soDienThoai },
        select: { id: true },
      });
      khachHangId =
        daCo?.id ??
        (
          await tx.khachHang.create({
            data: {
              maAppSheet: soDienThoai,
              ten: sach.khachMoi.ten,
              soDienThoai,
              tinh: sach.khachMoi.tinh || null,
              ghiChu: sach.khachMoi.ghiChu || null,
              nguoiTaoMaNV: maNV,
            },
            select: { id: true },
          })
        ).id;
    } else if (khachHangId) {
      const k = await tx.khachHang.findUnique({
        where: { id: khachHangId },
        select: { soDienThoai: true },
      });
      soDienThoai = k?.soDienThoai ?? null;
    }

    const hd = await tx.hopDong.create({
      data: {
        maHD,
        khachHangId,
        tenKhach: sach.tenKhach,
        loaiDV: sach.loaiDV,
        danhSachDV: sach.danhSachDV,
        ngayDat: sach.ngayDat,
        thanhTien: sach.thanhTien,
        khuyenMai: sach.khuyenMai,
        tongTien: sach.tongTien,
        daThu: sach.daThu,
        conLai: sach.conLai,
        trangThai: sach.trangThai,
        buoc: sach.buoc,
        diaChi: sach.diaChi,
        ghiChu: sach.ghiChu,
        nguoiLapMaNV: maNV,
        taoLuc: luc,
      },
      select: { id: true, maHD: true },
    });

    // Mã dòng chi tiết giữ đúng kiểu AppSheet: mã hợp đồng + "_1", "_2"…
    await tx.chiTietHopDong.createMany({
      data: sach.dong.map((d, i) => ({
        maAppSheet: `${maHD}_${i + 1}`,
        hopDongId: hd.id,
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
        nguoiLapMaNV: maNV,
        taoLuc: luc,
      })),
    });

    if (sach.thu.length) {
      await tx.phieuThu.createMany({
        data: sach.thu.map((t) => ({
          hopDongId: hd.id,
          hinhThuc: t.hinhThuc,
          noiDung: t.noiDung,
          ngayThu: t.ngayThu,
          soTien: t.soTien,
          trangThai: trangThaiThu(t.hinhThuc, nguoi.laQuanLy),
          ghiChu: t.ghiChu || null,
          nguoiTaoMaNV: maNV,
          // Quản lý tự lập phiếu thì chính họ là người duyệt, khỏi treo chờ ai.
          nguoiDuyetMaNV: nguoi.laQuanLy ? maNV : null,
          taoLuc: luc,
        })),
      });
    }

    if (sach.lich.length) {
      await tx.lichChup.createMany({
        data: sach.lich.map((l) => ({
          hopDongId: hd.id,
          ngay: l.ngay || null,
          gio: l.gio || null,
          loai: l.loai,
          lyDoTrong: l.lyDoTrong || null,
          ghiChu: l.ghiChu || null,
          trangThai: "Chưa làm",
          /*
            "Hiển thị" là dòng chữ vẽ lên lịch. Bên AppSheet gõ tay theo kiểu
            "Tên cô dâu chú rể 23-24-25/10/2026-0933867396"; để trống thì web
            ghép tạm tên khách, ngày và số điện thoại — sửa lại được sau.
          */
          hienThi:
            l.hienThi ||
            [sach.tenKhach, l.ngay ? ngayVN(l.ngay) : "chưa có ngày", soDienThoai]
              .filter(Boolean)
              .join(" - "),
          nguoiTaoMaNV: maNV,
          taoLuc: luc,
        })),
      });
    }

    if (sach.viec.length) {
      // Cần id từng dòng chi tiết để gắn đầu việc — đọc lại theo mã vừa đặt.
      const dsCT = await tx.chiTietHopDong.findMany({
        where: { hopDongId: hd.id },
        select: { id: true, maAppSheet: true },
      });
      const theoMa = new Map(dsCT.map((c) => [c.maAppSheet, c.id]));
      await tx.congViec.createMany({
        data: sach.viec.map((v) => ({
          hopDongId: hd.id,
          chiTietId: theoMa.get(`${maHD}_${v.dong + 1}`) ?? null,
          loai: v.loai,
          soLuong: v.soLuong,
          donGia: v.donGia,
          thanhTien: v.thanhTien,
          thoiHan: v.thoiHan || null,
          trangThai: "Chưa giao việc",
          taoLuc: luc,
        })),
      });
    }

    return hd;
  });
}

/**
 * Lập hợp đồng. Trả câu báo lỗi bằng tiếng Việt cho người dùng đọc, hoặc id và
 * mã hợp đồng vừa lập.
 *
 * Mã trùng (hai người bấm lưu cùng một phút) thì lấy số kế tiếp rồi thử lại,
 * tối đa năm lần — thà chậm một nhịp còn hơn báo lỗi cho người vừa gõ xong cả
 * trang hợp đồng.
 */
export async function lapHopDongMoi(
  du: DuLieuHopDongMoi,
  nguoi: NguoiLap,
): Promise<{ loi: string } | { id: string; maHD: string }> {
  /* Bước hợp đồng đọc từ database (đợt 6) — studio thêm bước mới thì web nhận ngay. */
  const kq = kiemHopDongMoi(du, await docCacBuoc());
  if ("loi" in kq) return kq;

  const luc = new Date();
  let so = await soTiepTheo(luc);
  for (let lan = 0; lan < 5; lan++) {
    try {
      const hd = await ghiHopDong(kq, nguoi, luc, so);
      return { id: hd.id, maHD: hd.maHD };
    } catch (loi) {
      if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
        so++;
        continue;
      }
      throw loi;
    }
  }
  return { loi: "Mã hợp đồng bị trùng liên tục, anh chị thử lưu lại giúp em." };
}
