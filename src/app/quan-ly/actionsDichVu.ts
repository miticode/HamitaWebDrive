"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { docTien } from "@/lib/studioNoiBo";
import { duocSuaDichVu, kiemDichVu, TEN_LOAI, type DichVuSach, type DuLieuDichVu, type LoaiDichVu } from "@/lib/dichVuChung";

/**
 * Thêm, sửa mục trong bảng dịch vụ & trang phục.
 *
 * Quyền kiểm lại ở máy chủ mỗi lần (loaiDuocSua trong dichVuChung.ts), không
 * tin việc trang đã giấu nút. Không có thao tác xoá — xem chú thích model DichVu.
 */

const CHU: Record<Exclude<keyof DichVuSach, "maDV">, string> = {
  loai: "loại",
  ten: "tên",
  nhom: "nhóm",
  chiTiet: "chi tiết",
  donGia: "đơn giá",
  donVi: "đơn vị",
  dangDung: "đang dùng",
};

async function nguoiDangDung() {
  const nguoi = await layNguoiDung();
  // Người đang dùng mật khẩu tạm chưa được làm gì khác ngoài đổi mật khẩu.
  return nguoi && !nguoi.doiMatKhau ? nguoi : null;
}

export async function themDichVuAction(du: DuLieuDichVu): Promise<{ loi?: string; id?: string }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };
  const kq = kiemDichVu(du);
  if ("loi" in kq) return kq;
  if (!duocSuaDichVu(nguoi, kq.loai)) {
    return { loi: `Tài khoản này chưa được thêm ${TEN_LOAI[kq.loai].toLowerCase()}.` };
  }

  const prisma = getPrisma();
  // Trùng mã khác hoa thường cũng chặn: "adq01" và "ADQ01" nhìn là một, hợp đồng sẽ chọn nhầm.
  const trung = await prisma.dichVu.findFirst({
    where: { maDV: { equals: kq.maDV, mode: "insensitive" } },
    select: { maDV: true, ten: true },
  });
  if (trung) return { loi: `Mã ${trung.maDV} đã có (${trung.ten}).` };

  try {
    const dv = await prisma.dichVu.create({ data: kq });
    await ghiNhatKy({
      nguoi,
      hanhDong: "them-dich-vu",
      doiTuong: "DichVu",
      doiTuongId: dv.id,
      chiTiet: { ten: `${dv.maDV} — ${dv.ten} — ${dv.donGia}đ` },
    });
    revalidatePath("/quan-ly/dich-vu");
    return { id: dv.id };
  } catch (loi) {
    // Hai người cùng thêm một mã trong cùng một giây.
    if (loi instanceof Prisma.PrismaClientKnownRequestError && loi.code === "P2002") {
      return { loi: `Mã ${kq.maDV} vừa có người thêm.` };
    }
    throw loi;
  }
}

export async function suaDichVuAction(id: string, du: DuLieuDichVu): Promise<{ loi?: string }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };

  const prisma = getPrisma();
  const cu = await prisma.dichVu.findUnique({ where: { id } });
  if (!cu) return { loi: "Không tìm thấy mục này." };

  // Mã không đổi được: luôn giữ mã cũ, bỏ qua ô mã gửi lên.
  const kq = kiemDichVu({ ...du, maDV: cu.maDV });
  if ("loi" in kq) return kq;
  // Phải được sửa CẢ loại cũ lẫn loại mới — phòng Váy không đổi được trang phục thành dịch vụ.
  if (!duocSuaDichVu(nguoi, cu.loai) || !duocSuaDichVu(nguoi, kq.loai)) {
    return { loi: "Tài khoản này chưa được sửa mục này." };
  }

  const doi: Record<string, { truoc: unknown; sau: unknown }> = {};
  for (const k of Object.keys(CHU) as (keyof typeof CHU)[]) {
    if (cu[k] !== kq[k]) doi[CHU[k]] = { truoc: cu[k], sau: kq[k] };
  }
  if (Object.keys(doi).length === 0) return {};

  await prisma.dichVu.update({ where: { id }, data: kq });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: id,
    chiTiet: { ten: `${cu.maDV} — ${cu.ten}`, doi },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath(`/quan-ly/dich-vu/${id}`);
  return {};
}

/**
 * Đặt danh sách buổi chụp mặc định cho một dịch vụ — anh yêu cầu 18/11/2026.
 *
 * Nhận MẢNG id loại buổi theo đúng thứ tự người bấm. Lặp lại một id là có
 * thật: gói hai ngày có thể là hai buổi cùng loại "Ngày chụp".
 *
 * Xoá hết rồi ghi lại thay vì so từng dòng: danh sách này nhiều lắm bốn năm
 * dòng, so sánh cho khéo chỉ tốn code mà không nhanh hơn. Nằm trong một
 * transaction để không có lúc nào dịch vụ còn nửa danh sách.
 */
export async function datBuoiDichVuAction(
  dichVuId: string,
  loaiBuoiIds: string[],
): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };

  const prisma = getPrisma();
  const dv = await prisma.dichVu.findUnique({ where: { id: dichVuId }, select: { maDV: true, ten: true, loai: true } });
  if (!dv) return { loi: "Mục này không còn." };
  if (!duocSuaDichVu(nguoi, dv.loai)) {
    return { loi: `Tài khoản này chưa được sửa ${TEN_LOAI[dv.loai as LoaiDichVu]?.toLowerCase() ?? "mục này"}.` };
  }

  /* Chỉ nhận id có thật — trình duyệt gửi gì cũng phải kiểm (nguyên tắc 3). */
  const co = await prisma.loaiBuoi.findMany({
    where: { id: { in: [...new Set(loaiBuoiIds)] } },
    select: { id: true, ten: true },
  });
  const ten = new Map(co.map((x) => [x.id, x.ten]));
  const sach = loaiBuoiIds.filter((x) => ten.has(x));
  if (sach.length !== loaiBuoiIds.length) return { loi: "Có loại buổi không còn trong danh mục." };
  if (sach.length > 10) return { loi: "Nhiều buổi quá, tối đa 10." };

  await prisma.$transaction(async (tx) => {
    await tx.dichVuBuoi.deleteMany({ where: { dichVuId } });
    for (const [i, id] of sach.entries()) {
      await tx.dichVuBuoi.create({ data: { dichVuId, loaiBuoiId: id, thuTu: i } });
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: dichVuId,
    chiTiet: {
      ten: `${dv.maDV} — ${dv.ten}`,
      doi: { buoiChup: sach.map((id) => ten.get(id)) },
    },
  });
  revalidatePath("/quan-ly/dich-vu");
  revalidatePath(`/quan-ly/dich-vu/${dichVuId}`);
  return { ok: true };
}

/* ── Bảng giá hạng mục = ĐẦU VIỆC TỰ SINH (anh yêu cầu 20/11/2026) ───────── */

/**
 * Một dòng bảng giá, đúng như người dùng gõ.
 *
 * `id` rỗng nghĩa là dòng mới. Dòng cũ giữ nguyên id để KHÔNG MẤT
 * `maAppSheet` — script nhập (`scripts/nhap-dich-vu.mts`) tra theo cột đó,
 * xoá sạch rồi ghi lại là lần nhập sau sinh ra 313 dòng trùng.
 */
export type DongGiaNhap = {
  id: string;
  hangMuc: string;
  /** Chữ người gõ: "300.000", "300000", "300,000đ" — `docTien` lo phần còn lại. */
  donGia: string;
  /** Buổi thứ mấy của gói, hoặc "" = không gắn buổi (việc hậu kỳ). */
  buoiThu: string;
};

/**
 * Đặt lại cả bảng giá hạng mục của một dịch vụ — anh chốt 20/11/2026.
 *
 * Vì sao cần sửa được trên web: 313 dòng bảng giá chép từ AppSheet dùng tên
 * đánh số ("Photo 1", "Photo 2", "makeup 1", "hoa cầm tay 2") mà chính anh
 * cũng không còn nhớ số đó là buổi thứ mấy hay người thứ mấy. Không làm rõ
 * được bằng cách đoán, nên phải cho sửa thẳng ở đây.
 *
 * CHỈ QUẢN TRỊ: bảng này là tiền công thợ (xem chú thích model GiaHangMuc).
 * `duocSuaDichVu` cho cả sale sửa dịch vụ, nhưng sale không được xem lương,
 * nên ở đây siết thêm một tầng.
 */
export async function datBangGiaAction(
  dichVuId: string,
  dong: DongGiaNhap[],
): Promise<{ loi?: string; ok?: true }> {
  const nguoi = await nguoiDangDung();
  if (!nguoi) return { loi: "Phiên đăng nhập đã hết, anh chị đăng nhập lại giúp em." };
  if (nguoi.vaiTro !== "quan-tri") return { loi: "Chỉ quản lý sửa được bảng giá hạng mục." };

  const prisma = getPrisma();
  const dv = await prisma.dichVu.findUnique({
    where: { id: dichVuId },
    select: { maDV: true, ten: true, _count: { select: { buoi: true } } },
  });
  if (!dv) return { loi: "Mục này không còn." };

  if (dong.length > 40) return { loi: "Nhiều hạng mục quá, tối đa 40 dòng." };

  const soBuoi = dv._count.buoi;
  const sach: { id: string | null; hangMuc: string; donGia: number; buoiThu: number | null }[] = [];
  for (const [i, d] of dong.entries()) {
    const ten = d.hangMuc.trim();
    if (!ten) return { loi: `Dòng ${i + 1} chưa có tên hạng mục.` };
    if (ten.length > 60) return { loi: `Tên hạng mục dòng ${i + 1} dài quá (tối đa 60 chữ).` };

    const gia = docTien(d.donGia);
    if (gia === null || gia < 0) return { loi: `Tiền công dòng ${i + 1} chưa đúng.` };
    if (gia > 50_000_000) return { loi: `Tiền công dòng ${i + 1} lớn bất thường, anh chị xem lại.` };

    let buoi: number | null = null;
    if (d.buoiThu.trim() !== "") {
      buoi = Number(d.buoiThu);
      if (!Number.isInteger(buoi) || buoi < 1) return { loi: `Buổi của dòng ${i + 1} chưa đúng.` };
      /*
        Chặn buổi vượt quá số buổi gói đã khai. Gắn "buổi 2" cho gói mới khai
        một buổi thì việc đó sinh ra sẽ không buổi nào nhận — im lặng rơi mất,
        đúng kiểu lỗi không ai phát hiện cho tới lúc thiếu người ở hiện trường.
      */
      if (buoi > soBuoi) {
        return {
          loi:
            soBuoi === 0
              ? "Gói này chưa khai buổi chụp nào. Gắn buổi cho gói ở bảng Dịch vụ trước đã."
              : `Gói này có ${soBuoi} buổi, không gắn hạng mục vào buổi ${buoi} được.`,
        };
      }
    }
    sach.push({ id: d.id || null, hangMuc: ten, donGia: gia, buoiThu: buoi });
  }

  const cu = await prisma.giaHangMuc.findMany({ where: { dichVuId }, select: { id: true } });
  const idCu = new Set(cu.map((c) => c.id));
  const idGiu = new Set(sach.map((s) => s.id).filter((x): x is string => !!x));
  /* Id lạ (dòng của dịch vụ khác, hoặc vừa bị ai xoá) thì coi như dòng mới. */
  for (const s of sach) if (s.id && !idCu.has(s.id)) s.id = null;
  const boDi = [...idCu].filter((x) => !idGiu.has(x));

  await prisma.$transaction(async (tx) => {
    if (boDi.length) await tx.giaHangMuc.deleteMany({ where: { id: { in: boDi } } });
    for (const s of sach) {
      if (s.id) {
        await tx.giaHangMuc.update({
          where: { id: s.id },
          data: { hangMuc: s.hangMuc, donGia: s.donGia, buoiThu: s.buoiThu },
        });
      } else {
        await tx.giaHangMuc.create({
          data: { dichVuId, hangMuc: s.hangMuc, donGia: s.donGia, buoiThu: s.buoiThu },
        });
      }
    }
  });

  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-dich-vu",
    doiTuong: "DichVu",
    doiTuongId: dichVuId,
    chiTiet: {
      ten: `${dv.maDV} — ${dv.ten}`,
      doi: {
        bangGia: {
          truoc: `${cu.length} hạng mục`,
          sau: `${sach.length} hạng mục`,
        },
      },
    },
  });
  revalidatePath(`/quan-ly/dich-vu/${dichVuId}`);
  revalidatePath("/quan-ly/hop-dong/moi");
  return { ok: true };
}
