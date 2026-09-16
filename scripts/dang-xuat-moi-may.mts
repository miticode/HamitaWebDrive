/**
 * Đá mọi máy ra khỏi hệ thống — đúng việc nút "Đăng xuất mọi máy" ở mục Nhân
 * viên làm, chạy từ máy.
 *
 *   npx tsx scripts/dang-xuat-moi-may.mts
 *
 * Mật khẩu không đổi: ai còn mật khẩu thì đăng nhập lại như thường.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

const { dangXuatMoiMay } = await import("../src/lib/auth");
const { ghiNhatKy } = await import("../src/lib/nhatKy");

const { soPhien } = await dangXuatMoiMay();
await ghiNhatKy({
  nguoi: { id: null, ten: "Lệnh đăng xuất mọi máy" },
  hanhDong: "dang-xuat-moi-may",
  chiTiet: { ten: "Đăng xuất mọi máy", so: { "phiên tài khoản bị xoá": soPhien } },
});
console.log(`Da da moi may ra: xoa ${soPhien} phien tai khoan, moi phieu mat khau chung het gia tri.`);
