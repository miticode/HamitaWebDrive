"use server";

import { revalidatePath } from "next/cache";
import { ghiLenKho } from "@/lib/khoAnh";
import { ghiNhatKy } from "@/lib/nhatKy";
import { lapHopDong, layNguoiDung } from "@/lib/phienNhanVien";
import { duyetChi, themChi, xoaChi } from "@/lib/soQuy";
import type { NguoiLap } from "@/lib/taoHopDong";
import type { DuLieuChi } from "@/lib/soQuyChung";

/**
 * Sổ chi — lập, duyệt, xoá. Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 3).
 *
 * Quyền kiểm Ở ĐÂY mỗi lượt gọi, không tin việc trang đã giấu nút: server
 * action là một đường mạng công khai, ai biết tên hàm cũng gọi được
 * (nguyên tắc 3).
 *
 * AI ĐƯỢC LÀM GÌ — em đặt theo đúng cách phiếu thu đang làm, chưa hỏi anh:
 *   lập   quản lý + sale  (giống `lapHopDong`)
 *   duyệt CHỈ quản lý
 *   xoá   CHỈ quản lý, và chỉ xoá được dòng lập trên web
 * Thực tế tiệm có thể cần rộng hơn — bên AppSheet nhiều phòng cũng ghi chi
 * (lấy váy, giặt đồ, mua vật liệu). Đổi thì sửa đúng hàm `nguoiDuocGhi` dưới.
 */

async function nguoiDuocGhi(): Promise<NguoiLap | null> {
  const nguoi = await layNguoiDung();
  if (!lapHopDong(nguoi) || !nguoi) return null;
  return {
    id: nguoi.id ?? "",
    ten: nguoi.ten,
    maNV: nguoi.maNV,
    tenDangNhap: nguoi.tenDangNhap ?? "QUANLY",
    laQuanLy: nguoi.vaiTro === "quan-tri",
  };
}

/* Ảnh chứng từ: chặn ở đây chứ không chỉ ở ô chọn tệp của trình duyệt. */
const CO_ANH_TOI_DA = 8 * 1024 * 1024;
const KIEU_CHO_PHEP = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

function lamSachTen(ten: string): string {
  /* Bỏ đường dẫn và ký tự lạ — tên tệp này đi thẳng lên Drive. */
  const chi = ten.split(/[\\/]/).pop() ?? "chung-tu";
  return chi.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 120) || "chung-tu";
}

export async function themChiAction(
  du: DuLieuChi,
  anh: File | null,
): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocGhi();
  if (!nguoi) return { loi: "Tài khoản này chưa được ghi sổ chi, hoặc phiên đăng nhập đã hết." };

  /*
    Ghi ảnh lên Drive TRƯỚC khi ghi dòng sổ.

    Ngược lại thì lúc Drive hỏng mình đã có một dòng sổ trỏ tới tệp không tồn
    tại — người xem bấm vào ảnh ra lỗi mà không hiểu vì sao. Làm theo thứ tự
    này thì lỗi Drive chỉ làm hỏng đúng lượt bấm đó, chưa có gì được ghi.

    Cái giá: Drive ghi xong mà database hỏng thì thừa một tệp mồ côi trên ổ 5
    TB. Chấp nhận được — một tệp thừa nhẹ hơn một dòng sổ sai.
  */
  let anhKho: string | null = null;
  if (anh && anh.size > 0) {
    if (anh.size > CO_ANH_TOI_DA) return { loi: "Ảnh chứng từ nặng quá, tối đa 8 MB." };
    if (!KIEU_CHO_PHEP.includes(anh.type)) {
      return { loi: "Chứng từ phải là ảnh JPG, PNG, WEBP, HEIC hoặc tệp PDF." };
    }
    try {
      anhKho = await ghiLenKho(
        "chung-tu",
        `${du.ngayChi ?? "khong-ngay"}-${lamSachTen(anh.name)}`,
        anh.type,
        new Uint8Array(await anh.arrayBuffer()),
      );
    } catch (loi) {
      return { loi: loi instanceof Error ? loi.message : "Không ghi được ảnh chứng từ." };
    }
  }

  const kq = await themChi(du, nguoi, anhKho);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "them-khoan-chi",
    doiTuong: "ChiTieu",
    doiTuongId: kq.id,
    chiTiet: { soTien: du.soTien, khoanChi: du.khoanChi, hinhThuc: du.hinhThuc },
  });
  revalidatePath("/quan-ly/so-quy");
  return { ok: true };
}

export async function duyetChiAction(id: string): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocGhi();
  if (!nguoi?.laQuanLy) return { loi: "Chỉ quản lý mới duyệt được khoản chi." };

  const kq = await duyetChi(id, nguoi);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "duyet-khoan-chi",
    doiTuong: "ChiTieu",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/so-quy");
  return { ok: true };
}

export async function xoaChiAction(id: string): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiDuocGhi();
  if (!nguoi?.laQuanLy) return { loi: "Chỉ quản lý mới xoá được khoản chi." };

  const kq = await xoaChi(id);
  if ("loi" in kq) return kq;

  await ghiNhatKy({
    nguoi: { id: nguoi.id || null, ten: nguoi.ten },
    hanhDong: "xoa-khoan-chi",
    doiTuong: "ChiTieu",
    doiTuongId: id,
  });
  revalidatePath("/quan-ly/so-quy");
  return { ok: true };
}
