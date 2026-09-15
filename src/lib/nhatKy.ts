import { databaseIsConfigured, getPrisma } from "@/lib/db";
import type { NguoiDung } from "@/lib/phienNhanVien";

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

/**
 * Tên thao tác. Viết dạng mã để lọc, còn chữ hiện cho người đọc nằm ở
 * `CHU_HANH_DONG` — sửa câu chữ không phải đụng tới dữ liệu đã ghi.
 */
export type HanhDong =
  | "dang-nhap"
  | "dang-nhap-sai"
  | "dang-xuat"
  | "doi-mat-khau"
  | "cap-mat-khau"
  | "them-nhan-vien"
  | "sua-nhan-vien"
  | "nhap-du-lieu"
  | "sua-thong-tin-studio"
  | "them-noi-quy"
  | "sua-noi-quy";

export const CHU_HANH_DONG: Record<HanhDong, string> = {
  "dang-nhap": "Đăng nhập",
  "dang-nhap-sai": "Đăng nhập sai mật khẩu",
  "dang-xuat": "Đăng xuất",
  "doi-mat-khau": "Đổi mật khẩu",
  "cap-mat-khau": "Cấp mật khẩu tạm",
  "them-nhan-vien": "Thêm nhân viên",
  "sua-nhan-vien": "Sửa thông tin nhân viên",
  "nhap-du-lieu": "Nhập dữ liệu từ AppSheet",
  "sua-thong-tin-studio": "Sửa thông tin studio",
  "them-noi-quy": "Thêm nội quy",
  "sua-noi-quy": "Sửa nội quy",
};
