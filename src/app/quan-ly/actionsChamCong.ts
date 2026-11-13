"use server";

import { revalidatePath } from "next/cache";
import { ghiLenKho } from "@/lib/khoAnh";
import { layNguoiDung } from "@/lib/phienNhanVien";
import { docCaiDatCham, raCa, vaoCa } from "@/lib/chamCong";

/**
 * Chấm công — vào ca, ra ca. Thêm 13/11/2026 (`KE-HOACH-CRM.md` đợt 4).
 *
 * AI ĐƯỢC CHẤM: **mọi người đã đăng nhập và có mã nhân viên.** Đây là chỗ
 * khác hẳn mọi trang khác trong `/quan-ly` — hợp đồng, tiền, lương đều giới
 * hạn theo vai trò, nhưng chấm công thì cả tiệm bấm mỗi ngày hai lần. Giới
 * hạn ở đây là chặn người ta đi làm.
 *
 * Tài khoản `admin` của sếp KHÔNG có mã nhân viên nên không chấm được — đó là
 * đúng, nó là tài khoản hệ thống chứ không phải một người đi làm.
 */

const CO_ANH_TOI_DA = 6 * 1024 * 1024;
const KIEU_ANH = ["image/jpeg", "image/png", "image/webp", "image/heic"];

/** "10.437091, 106.476072" hoặc null. Nhận từ trình duyệt nên phải kiểm lại. */
function sachViTri(v: string | null): string | null {
  if (!v) return null;
  const [a, b] = String(v).split(",").map((x) => Number(x.trim()));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
  return `${a.toFixed(6)}, ${b.toFixed(6)}`;
}

async function nguoiCham(): Promise<{ maNV: string; phongBan: string | null } | null> {
  const nguoi = await layNguoiDung();
  if (!nguoi?.maNV) return null;
  return { maNV: nguoi.maNV, phongBan: nguoi.phongBan ?? null };
}

export async function vaoCaAction(
  viTri: string | null,
  anh: File | null,
): Promise<{ loi: string } | { ok: true; daCham: boolean }> {
  const nguoi = await nguoiCham();
  if (!nguoi) {
    return { loi: "Tài khoản này không có mã nhân viên nên không chấm công được." };
  }

  /*
    Ảnh ghi lên Drive TRƯỚC khi ghi dòng chấm công — cùng lý do với chứng từ
    thu chi: hỏng Drive thì chưa có gì được ghi, thay vì để lại một dòng trỏ
    tới tệp không tồn tại.

    Nhưng khác một chỗ quan trọng: ảnh chấm công KHÔNG BẮT BUỘC, nên ghi ảnh
    hỏng thì vẫn cho chấm, chỉ là không có ảnh. Chặn người ta chấm công vì
    Drive trục trặc là sai hẳn — bên AppSheet cũng chỉ 11% lượt có ảnh.
  */
  let anhKho: string | null = null;
  if (anh && anh.size > 0 && anh.size <= CO_ANH_TOI_DA && KIEU_ANH.includes(anh.type)) {
    anhKho = await ghiLenKho(
      "cham-cong",
      `${nguoi.maNV}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.jpg`,
      anh.type,
      new Uint8Array(await anh.arrayBuffer()),
    ).catch(() => null);
  }

  const caiDat = await docCaiDatCham();
  const kq = await vaoCa(nguoi.maNV, nguoi.phongBan, sachViTri(viTri), anhKho, caiDat);
  if ("loi" in kq) return kq;

  /*
    KHÔNG ghi nhật ký thao tác cho mỗi lượt chấm công.

    25 người × 2 lần/ngày = 50 dòng mỗi ngày, 1.500 dòng mỗi tháng — nhật ký
    sẽ ngập và không ai đọc được gì nữa. Đúng cái bẫy đã dính với "Đọc lại
    album từ Drive" (435/847 dòng, phải xoá tay hồi 05/11). Bảng ChamCong tự
    nó đã là nhật ký của việc này rồi.
  */
  revalidatePath("/quan-ly/cham-cong");
  return kq;
}

export async function raCaAction(viTri: string | null): Promise<{ loi: string } | { ok: true }> {
  const nguoi = await nguoiCham();
  if (!nguoi) {
    return { loi: "Tài khoản này không có mã nhân viên nên không chấm công được." };
  }

  const caiDat = await docCaiDatCham();
  const kq = await raCa(nguoi.maNV, sachViTri(viTri), caiDat);
  if ("loi" in kq) return kq;

  revalidatePath("/quan-ly/cham-cong");
  return { ok: true };
}
