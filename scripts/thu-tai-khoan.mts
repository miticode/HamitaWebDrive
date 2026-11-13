/**
 * Tạo ba tài khoản THỬ để kiểm phân quyền, rồi xoá.
 *
 *   npx tsx scripts/thu-tai-khoan.mts tao   → tạo, in tên đăng nhập + mật khẩu
 *   npx tsx scripts/thu-tai-khoan.mts xoa   → xoá sạch, đo lại
 *
 * ⚠ DATABASE NÀY LÀ DATABASE THẬT CỦA TIỆM. Ba tài khoản dưới đây đăng nhập
 * được vào web thật trong lúc còn tồn tại, nên:
 *   · chỉ tạo ngay trước khi thử, xoá ngay sau khi xong
 *   · mật khẩu sinh ngẫu nhiên mỗi lần, không lưu xuống đâu cả
 *   · tên đăng nhập mang tiền tố `zz-thu-` để không lẫn với người thật
 *
 * Mật khẩu in ra màn hình một lần duy nhất lúc tạo — mất thì xoá rồi tạo lại.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });
import { randomBytes } from "node:crypto";

const { getPrisma } = await import("../src/lib/db");
const { bamMatKhau } = await import("../src/lib/matKhau");
const p = getPrisma();

const TIEN_TO = "zz-thu-";
const VAI = [
  { vaiTro: "quan-tri", ten: "ZZ THU quản lý" },
  { vaiTro: "sale", ten: "ZZ THU sale" },
  { vaiTro: "nhan-vien", ten: "ZZ THU nhân viên" },
] as const;

const viec = process.argv[2] ?? "tao";

if (viec === "xoa") {
  /* Xoá phiên trước, rồi mới xoá người — phiên trỏ tới người bằng khoá ngoại. */
  const ds = await p.nhanVien.findMany({ where: { tenDangNhap: { startsWith: TIEN_TO } }, select: { id: true } });
  const { count: soPhien } = await p.phienDangNhap.deleteMany({ where: { nhanVienId: { in: ds.map((n) => n.id) } } });
  const { count } = await p.nhanVien.deleteMany({ where: { tenDangNhap: { startsWith: TIEN_TO } } });
  const con = await p.nhanVien.count({ where: { tenDangNhap: { startsWith: TIEN_TO } } });
  console.log(`Xoá ${count} tài khoản, ${soPhien} phiên đăng nhập.`);
  console.log(con === 0 ? "ĐÃ SẠCH — không còn tài khoản thử nào." : `CÒN SÓT ${con}`);
} else {
  for (const v of VAI) {
    const tenDangNhap = `${TIEN_TO}${v.vaiTro}`;
    /* 18 byte ngẫu nhiên — không phải mật khẩu người gõ, không cần dễ đọc. */
    const matKhau = randomBytes(18).toString("base64url");
    await p.nhanVien.upsert({
      where: { tenDangNhap },
      create: {
        ten: v.ten,
        tenDangNhap,
        matKhau: await bamMatKhau(matKhau),
        /* false: vào thẳng, không bị chặn ở màn hình đổi mật khẩu. */
        doiMatKhau: false,
        vaiTro: v.vaiTro,
        dangLam: true,
        phongBan: "ZZ THU",
        /* KHÔNG đặt maNV: để trống thì không dính vào bảng công, bảng lương nào. */
        hienTrenTrang: false,
      },
      update: { matKhau: await bamMatKhau(matKhau), doiMatKhau: false, vaiTro: v.vaiTro, dangLam: true },
    });
    console.log(`${tenDangNhap}\t${matKhau}`);
  }
  console.log("\nXong. Xoá bằng: npx tsx scripts/thu-tai-khoan.mts xoa");
}
