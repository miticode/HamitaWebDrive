import { databaseIsConfigured, getPrisma } from "@/lib/db";
import type { NguoiDung } from "@/lib/phienNhanVien";
import type { HanhDong } from "@/lib/nhatKyChung";

export { CHU_HANH_DONG, type HanhDong } from "@/lib/nhatKyChung";

/**
 * Ghi một dòng nhật ký thao tác của phần quản lý studio.
 *
 * Mọi thao tác sửa dữ liệu đều phải qua đây — nhất là những gì dính tới tiền
 * và lương sau này. Lỡ sửa sai thì truy được ai sửa, lúc nào, từ gì thành gì.
 *
 * NUỐT LỖI, có ghi ra log máy chủ: ghi nhật ký hỏng thì việc chính (nhân viên
 * vừa đổi mật khẩu, quản lý vừa cấp tài khoản) đã xảy ra rồi, không được báo
 * là thất bại. Báo thất bại lúc đó là nói sai, người dùng sẽ bấm lại lần hai.
 */
export async function ghiNhatKy(dong: {
  nguoi: Pick<NguoiDung, "id" | "ten"> | null;
  hanhDong: HanhDong;
  doiTuong?: string;
  doiTuongId?: string;
  chiTiet?: Record<string, unknown>;
}): Promise<void> {
  if (!databaseIsConfigured()) return;
  try {
    await getPrisma().nhatKy.create({
      data: {
        nguoiId: dong.nguoi?.id ?? null,
        nguoiTen: dong.nguoi?.ten ?? "(không rõ)",
        hanhDong: dong.hanhDong,
        doiTuong: dong.doiTuong ?? null,
        doiTuongId: dong.doiTuongId ?? null,
        chiTiet: dong.chiTiet ? JSON.parse(JSON.stringify(dong.chiTiet)) : undefined,
      },
    });
  } catch (loi) {
    console.error("[nhat-ky] khong ghi duoc:", loi);
  }
}

