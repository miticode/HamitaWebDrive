import { cache } from "react";
import { getPrisma } from "@/lib/db";

/**
 * Tên nhân viên theo mã bên AppSheet ("Người lập", "Người duyệt" chỉ ghi mã).
 * Mã so không phân biệt hoa thường — bên AppSheet cùng một người có lúc ghi
 * "TTT142", lúc "ttt142".
 *
 * Bọc `cache`: một trang hỏi nhiều lần vẫn chỉ đọc database một lần.
 */
export const tenTheoMaNV = cache(async (): Promise<Map<string, string>> => {
  const ds = await getPrisma().nhanVien.findMany({ select: { maNV: true, tenDangNhap: true, ten: true } });
  /*
    Người CHƯA CÓ MÃ cũng phải tra ra tên: từ 14/11/2026 quản lý giao được đầu
    việc cho học viên, và lúc đó cột "người phụ trách" ghi TÊN ĐĂNG NHẬP của
    họ thay cho mã (xem `khoaNguoi`). Không có dòng này thì bảng Đầu việc hiện
    trơ một chuỗi tên đăng nhập thay vì tên người.

    Đo 14/11: 25 mã NV và 26 tên đăng nhập, KHÔNG chuỗi nào vừa là mã của
    người này vừa là tên đăng nhập của người kia — nên gộp chung một bảng tra
    là an toàn, không ai bị tra nhầm ra tên người khác.
  */
  return new Map(ds.map((n) => [(n.maNV ?? n.tenDangNhap).toLowerCase(), n.ten]));
});

/**
 * Khoá nhận dạng một người trong các cột ghi "ai làm": mã nhân viên nếu có,
 * không thì tên đăng nhập.
 *
 * Vì sao không bắt mọi người phải có mã: mã nhân viên là thứ studio cấp khi
 * nhận chính thức, còn học viên thì chưa có (anh chốt 14/11) — mà sếp vẫn
 * giao việc cho họ được. Tên đăng nhập là thứ duy nhất chắc chắn có và duy
 * nhất với mọi người.
 *
 * Ngày học viên lên nhân viên và được cấp mã, `capMaNhanVien` trong
 * `src/app/quan-ly/actions.ts` chuyển mọi dòng cũ sang mã mới.
 */
export function khoaNguoi(nv: { maNV: string | null; tenDangNhap: string }): string {
  return nv.maNV ?? nv.tenDangNhap;
}

/** Khoá của người đang đăng nhập; null khi đăng nhập bằng mật khẩu quản lý chung. */
export function khoaCuaToi(nguoi: { maNV: string | null; tenDangNhap: string | null }): string | null {
  return nguoi.maNV ?? nguoi.tenDangNhap ?? null;
}

/** Khoá không khớp ai (người đã xoá, mã cũ) thì hiện nguyên khoá, còn hơn để trống. */
export function tenNV(bang: Map<string, string>, ma: string | null | undefined): string | null {
  if (!ma) return null;
  return bang.get(ma.toLowerCase()) ?? ma;
}
