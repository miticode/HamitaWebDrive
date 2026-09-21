import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
import { laVaiTro, type VaiTro } from "@/lib/nhanVienChung";

/**
 * Phiên đăng nhập của phần quản lý studio (/quan-ly).
 *
 * Hai loại người dùng:
 * - NHÂN VIÊN: tên đăng nhập + mật khẩu riêng, phiên lưu trong bảng
 *   PhienDangNhap.
 * - QUẢN TRỊ CHUNG: người đang cầm mật khẩu quản lý album (ADMIN_PASSWORD).
 *   Đó là sếp, nên được toàn quyền ở đây luôn — không bắt nhớ thêm một mật
 *   khẩu nữa, và cũng không có cách nào tự khoá mình ngoài hệ thống mới.
 */

const COOKIE = "nv_phien";
/** Ba mươi ngày: nhân viên mở trên điện thoại cả ngày, bắt đăng nhập lại mỗi tuần là phiền. */
const HAN_MS = 30 * 24 * 60 * 60 * 1000;

export type { VaiTro };

export type NguoiDung = {
  /** null = quản trị chung (mật khẩu quản lý album), không phải một nhân viên cụ thể. */
  id: string | null;
  ten: string;
  vaiTro: VaiTro;
  /** Vừa được cấp mật khẩu tạm — phải đổi trước khi làm gì khác. */
  doiMatKhau: boolean;
  /**
   * Phòng ban, đúng chữ trong mục Nhân viên. Dùng cho quyền theo phòng — hiện
   * chỉ có phòng Váy được sửa trang phục (xem loaiDuocSua trong dichVuChung.ts).
   */
  phongBan: string | null;
  /**
   * Mã nhân viên bên AppSheet. Dữ liệu chép từ AppSheet (đầu việc, phiếu thu,
   * lịch) chỉ ghi mã này, nên cần nó mới lọc được "việc của tôi".
   */
  maNV: string | null;
};

/** Database chỉ giữ dấu băm của chuỗi trong cookie — lộ database cũng không ai dùng được phiên. */
function bamPhien(chuoi: string): string {
  return createHash("sha256").update(chuoi).digest("hex");
}

/**
 * Tạo phiên mới cho một nhân viên và đặt cookie.
 *
 * Chỉ gọi được trong server action hoặc route handler — Next không cho đặt
 * cookie lúc đang dựng trang.
 */
export async function taoPhien(nhanVienId: string): Promise<void> {
  const chuoi = randomBytes(32).toString("base64url");
  const hetHan = new Date(Date.now() + HAN_MS);
  const prisma = getPrisma();

  await prisma.phienDangNhap.create({
    data: { id: bamPhien(chuoi), nhanVienId, hetHan },
  });
  // Dọn phiên hết hạn nhân tiện, không thì bảng này phình mãi.
  await prisma.phienDangNhap.deleteMany({ where: { hetHan: { lt: new Date() } } });

  (await cookies()).set(COOKIE, chuoi, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: HAN_MS / 1000,
    path: "/",
  });
}

/**
 * Người đang dùng trang, hoặc null nếu chưa đăng nhập.
 *
 * Bọc `cache` của React: layout và trang cùng hỏi trong MỘT lượt tải, không
 * bọc thì mỗi lượt tốn hai lần hỏi database cho cùng một câu trả lời.
 */
export const layNguoiDung = cache(async (): Promise<NguoiDung | null> => {
  const chuoi = (await cookies()).get(COOKIE)?.value;

  if (chuoi && databaseIsConfigured()) {
    const phien = await getPrisma().phienDangNhap.findUnique({
      where: { id: bamPhien(chuoi) },
      include: { nhanVien: true },
    });
    /*
      Kiểm lại cả nhân viên ở MỖI lần, không tin phiên đã tạo: người đã nghỉ
      việc hay đã bị thu mật khẩu thì phải bị chặn ngay, kể cả khi cookie trên
      máy họ còn hạn.
    */
    if (
      phien &&
      phien.hetHan > new Date() &&
      phien.nhanVien.dangLam &&
      phien.nhanVien.matKhau
    ) {
      const nv = phien.nhanVien;
      return {
        id: nv.id,
        ten: nv.ten,
        // Chữ lạ trong cột vai trò thì coi là nhân viên — quyền thấp nhất, không bao giờ là cao nhất.
        vaiTro: laVaiTro(nv.vaiTro) ? nv.vaiTro : "nhan-vien",
        doiMatKhau: nv.doiMatKhau,
        phongBan: nv.phongBan,
        maNV: nv.maNV,
      };
    }
  }

  if (await isAdmin()) {
    return { id: null, ten: "Quản lý", vaiTro: "quan-tri", doiMatKhau: false, phongBan: null, maNV: null };
  }
  return null;
});

/**
 * Người đang dùng trang — chưa đăng nhập thì chuyển về trang đăng nhập, đang
 * dùng mật khẩu tạm thì chuyển sang trang đổi mật khẩu.
 *
 * MỖI TRANG phải tự gọi hàm này, không trông vào layout của nhóm (he-thong).
 * Trong Next, layout và trang dựng SONG SONG chứ không nối tiếp: layout chuyển
 * hướng thì trang vẫn chạy. Đã vấp thật ngày 15/09/2026 — bốn lượt thử không
 * đăng nhập đều làm trang Tổng quan văng lỗi "null" vì tin là layout đã chặn.
 * Lần đó may không lộ gì, nhưng một trang đọc dữ liệu rồi mới kiểm quyền thì
 * sẽ lộ.
 */
export async function batBuocDangNhap(): Promise<NguoiDung> {
  const nguoi = await layNguoiDung();
  if (!nguoi) redirect("/quan-ly/dang-nhap");
  if (nguoi.doiMatKhau) redirect("/quan-ly/doi-mat-khau");
  return nguoi;
}

export function laQuanTri(nguoi: NguoiDung | null): boolean {
  return nguoi?.vaiTro === "quan-tri";
}

/** Đăng xuất máy đang dùng. */
export async function xoaPhienHienTai(): Promise<void> {
  const jar = await cookies();
  const chuoi = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (chuoi && databaseIsConfigured()) {
    await getPrisma().phienDangNhap.deleteMany({ where: { id: bamPhien(chuoi) } });
  }
}

/**
 * Đăng xuất MỌI máy của một nhân viên.
 *
 * Gọi khi cấp lại mật khẩu, khi đánh dấu đã nghỉ việc, và khi chính họ đổi
 * mật khẩu — trường hợp cuối là để máy bị mất hay máy người khác đang giữ
 * phiên cũ bị văng ra ngay.
 */
export async function xoaMoiPhien(nhanVienId: string): Promise<void> {
  if (!databaseIsConfigured()) return;
  await getPrisma().phienDangNhap.deleteMany({ where: { nhanVienId } });
}

/*
  Ai xem duoc gi trong phan quan ly studio (anh chot 21/09/2026, thay cho luat
  cu "ai dang nhap cung xem het" o nguyen tac 52).

  Ly do doi: hop dong keo theo tien va cong no cua ca tiem, con phieu thu va
  danh sach khach hang thi vua la tien vua la so dien thoai cua hang tram nha
  khach — khong phai thu de ca tiem mo ra xem.
*/

/** Hop dong: quan ly + sale (sale la nguoi tao hop dong ben AppSheet). */
export function xemHopDong(nguoi: NguoiDung | null): boolean {
  return nguoi?.vaiTro === "quan-tri" || nguoi?.vaiTro === "sale";
}

/** Khach hang va phieu thu: CHI quan ly. */
export function xemTienVaKhach(nguoi: NguoiDung | null): boolean {
  return laQuanTri(nguoi);
}

/**
 * Chan mot trang khong duoc phep xem.
 *
 * Dua ve Tong quan chu khong nem loi: nhan vien bam nham mot duong link cu
 * trong Zalo thi thay man hinh quen thuoc, khong phai trang do.
 */
export function batBuocQuyen(duoc: boolean): void {
  if (!duoc) redirect("/quan-ly");
}
