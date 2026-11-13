"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/lib/db";
import { laQuanTri, layNguoiDung } from "@/lib/phienNhanVien";
import { ghiNhatKy } from "@/lib/nhatKy";
import { chuanGio, chuanToaDo, cheSo, docTien } from "@/lib/studioNoiBo";

/**
 * Thao tác của hai mục "Thông tin studio" và "Nội quy". Tách khỏi actions.ts
 * cho tệp đó khỏi phình theo từng mục mới.
 *
 * Mọi thao tác ở đây chỉ QUẢN LÝ làm được — kiểm lại ở máy chủ mỗi lần, không
 * tin việc trang đã giấu nút.
 */

export type DuLieuThongTin = {
  nguoiDaiDien: string;
  soTaiKhoan1: string;
  soTaiKhoan2: string;
  gioBatDau: string;
  gioKetThuc: string;
  gioNghiGiuaBuoi: string;
  ngayCongThang: string;
  toaDo: string;
  toaDo2: string;
};

const CHU_THONG_TIN: Record<keyof DuLieuThongTin, string> = {
  nguoiDaiDien: "người đại diện",
  soTaiKhoan1: "số tài khoản 1",
  soTaiKhoan2: "số tài khoản 2",
  gioBatDau: "giờ bắt đầu",
  gioKetThuc: "giờ kết thúc",
  gioNghiGiuaBuoi: "giờ nghỉ giữa buổi",
  ngayCongThang: "ngày công / tháng",
  toaDo: "toạ độ Wedding House",
  toaDo2: "toạ độ Hami Baby",
};

export async function suaThongTinStudioAction(du: DuLieuThongTin): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới sửa được thông tin studio." };

  const rong = (s: string) => s.trim() === "";
  const gioBatDau = rong(du.gioBatDau) ? null : chuanGio(du.gioBatDau);
  const gioKetThuc = rong(du.gioKetThuc) ? null : chuanGio(du.gioKetThuc);
  if (!rong(du.gioBatDau) && !gioBatDau) return { loi: "Giờ bắt đầu chưa đúng (ví dụ 08:30)." };
  if (!rong(du.gioKetThuc) && !gioKetThuc) return { loi: "Giờ kết thúc chưa đúng (ví dụ 18:00)." };
  if (gioBatDau && gioKetThuc && gioBatDau >= gioKetThuc) {
    return { loi: "Giờ kết thúc phải sau giờ bắt đầu." };
  }

  const nghi = rong(du.gioNghiGiuaBuoi) ? null : Number(du.gioNghiGiuaBuoi.replace(",", "."));
  if (nghi !== null && (!Number.isFinite(nghi) || nghi < 0 || nghi > 6)) {
    return { loi: "Giờ nghỉ giữa buổi là số giờ từ 0 tới 6 (ví dụ 1,5)." };
  }
  const ngayCong = rong(du.ngayCongThang) ? null : Number(du.ngayCongThang);
  if (ngayCong !== null && (!Number.isInteger(ngayCong) || ngayCong < 1 || ngayCong > 31)) {
    return { loi: "Ngày công mỗi tháng là số nguyên từ 1 tới 31." };
  }
  const toaDo = rong(du.toaDo) ? null : chuanToaDo(du.toaDo);
  if (!rong(du.toaDo) && !toaDo) {
    return { loi: "Toạ độ Wedding House chưa đúng — dạng “vĩ độ, kinh độ”, ví dụ 10.437096, 106.476095." };
  }
  /*
    Toạ độ cơ sở thứ hai (Hami Baby, 337 Đỗ Tường Tự) — thêm 13/11/2026 cho
    chấm công. Không phải đoán là tiệm có hai nơi: gom cụm 6.114 lượt chấm bên
    AppSheet ra một cụm 1.248 lượt cách Wedding House 411m.
  */
  const toaDo2 = rong(du.toaDo2) ? null : chuanToaDo(du.toaDo2);
  if (!rong(du.toaDo2) && !toaDo2) {
    return { loi: "Toạ độ Hami Baby chưa đúng — dạng “vĩ độ, kinh độ”, ví dụ 10.438454, 106.472579." };
  }
  for (const k of ["nguoiDaiDien", "soTaiKhoan1", "soTaiKhoan2"] as const) {
    if (du[k].length > 200) return { loi: `Ô ${CHU_THONG_TIN[k]} dài quá.` };
  }

  const moi = {
    nguoiDaiDien: du.nguoiDaiDien.trim() || null,
    soTaiKhoan1: du.soTaiKhoan1.trim() || null,
    soTaiKhoan2: du.soTaiKhoan2.trim() || null,
    gioBatDau,
    gioKetThuc,
    gioNghiGiuaBuoi: nghi,
    ngayCongThang: ngayCong,
    toaDo,
    toaDo2,
  };

  const prisma = getPrisma();
  const cu = await prisma.thongTinStudio.findUnique({ where: { id: "studio" } });

  /*
    Nhật ký ghi rõ đổi gì — riêng số tài khoản thì CHE BỚT: nhật ký hiện trên
    màn hình, chép đi đâu cũng được, không cần mang nguyên số tài khoản theo.
  */
  const doi: Record<string, { truoc: unknown; sau: unknown }> = {};
  for (const k of Object.keys(moi) as (keyof typeof moi)[]) {
    const truoc = cu ? cu[k] : null;
    if (truoc === moi[k]) continue;
    const laSoTK = k === "soTaiKhoan1" || k === "soTaiKhoan2";
    doi[CHU_THONG_TIN[k]] = {
      truoc: laSoTK ? cheSo(truoc as string | null) : truoc,
      sau: laSoTK ? cheSo(moi[k] as string | null) : moi[k],
    };
  }
  if (Object.keys(doi).length === 0) return {};

  await prisma.thongTinStudio.upsert({
    where: { id: "studio" },
    create: { id: "studio", ...moi },
    update: moi,
  });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-thong-tin-studio",
    doiTuong: "ThongTinStudio",
    doiTuongId: "studio",
    chiTiet: { ten: "Thông tin studio", doi },
  });
  revalidatePath("/quan-ly/thong-tin");
  return {};
}

export type DuLieuNoiQuy = { noiDung: string; mucPhat: string; dangApDung: boolean };

function kiemNoiQuy(du: DuLieuNoiQuy): { loi: string } | { noiDung: string; mucPhat: number } {
  const noiDung = du.noiDung.trim();
  if (!noiDung) return { loi: "Thiếu nội dung nội quy." };
  if (noiDung.length > 300) return { loi: "Nội quy dài quá, viết gọn lại giúp em." };
  const mucPhat = du.mucPhat.trim() === "" ? 0 : docTien(du.mucPhat);
  if (mucPhat === null) return { loi: "Mức phạt là số tiền, ví dụ 50000 hoặc 50.000." };
  return { noiDung, mucPhat };
}

export async function themNoiQuyAction(du: DuLieuNoiQuy): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới thêm được nội quy." };
  const kq = kiemNoiQuy(du);
  if ("loi" in kq) return kq;

  const prisma = getPrisma();
  const cuoi = await prisma.noiQuy.aggregate({ _max: { thuTu: true } });
  const nq = await prisma.noiQuy.create({
    data: { ...kq, thuTu: (cuoi._max.thuTu ?? -1) + 1 },
  });
  await ghiNhatKy({
    nguoi,
    hanhDong: "them-noi-quy",
    doiTuong: "NoiQuy",
    doiTuongId: nq.id,
    chiTiet: { ten: `${nq.noiDung} — ${nq.mucPhat}đ` },
  });
  revalidatePath("/quan-ly/noi-quy");
  return {};
}

export async function suaNoiQuyAction(id: string, du: DuLieuNoiQuy): Promise<{ loi?: string }> {
  const nguoi = await layNguoiDung();
  if (!laQuanTri(nguoi)) return { loi: "Chỉ quản lý mới sửa được nội quy." };
  const kq = kiemNoiQuy(du);
  if ("loi" in kq) return kq;

  const prisma = getPrisma();
  const cu = await prisma.noiQuy.findUnique({ where: { id } });
  if (!cu) return { loi: "Không tìm thấy nội quy." };

  const moi = { ...kq, dangApDung: du.dangApDung };
  const doi: Record<string, { truoc: unknown; sau: unknown }> = {};
  if (cu.noiDung !== moi.noiDung) doi["nội dung"] = { truoc: cu.noiDung, sau: moi.noiDung };
  if (cu.mucPhat !== moi.mucPhat) doi["mức phạt"] = { truoc: cu.mucPhat, sau: moi.mucPhat };
  if (cu.dangApDung !== moi.dangApDung) doi["đang áp dụng"] = { truoc: cu.dangApDung, sau: moi.dangApDung };
  if (Object.keys(doi).length === 0) return {};

  await prisma.noiQuy.update({ where: { id }, data: moi });
  await ghiNhatKy({
    nguoi,
    hanhDong: "sua-noi-quy",
    doiTuong: "NoiQuy",
    doiTuongId: id,
    chiTiet: { ten: cu.noiDung, doi },
  });
  revalidatePath("/quan-ly/noi-quy");
  return {};
}
