import {
  randomBytes,
  randomInt,
  scrypt as scryptGoc,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
import { DO_DAI_TOI_THIEU } from "@/lib/nhanVienChung";

/**
 * Mật khẩu nhân viên của phần quản lý studio.
 *
 * Băm bằng scrypt có muối riêng từng người, KHÔNG BAO GIỜ lưu dạng đọc được.
 * Lý do phải cẩn thận hơn mức "đủ dùng": bên AppSheet cũ, mật khẩu nằm trần
 * trong một file Google Sheet đứng tên người bán app, và 25/26 cái chính là số
 * điện thoại của người đó (đo 15/09/2026). Ai mở được file là vào được tài
 * khoản của cả tiệm.
 *
 * Dùng scrypt có sẵn trong Node chứ không kéo thêm thư viện: một thư viện mật
 * mã nữa là một thứ nữa phải theo dõi bản vá, trong khi scrypt đã đủ chuẩn.
 */

const scrypt = (
  matKhau: string,
  muoi: Buffer,
  doDai: number,
  thongSo: ScryptOptions,
): Promise<Buffer> =>
  new Promise((xong, loi) =>
    scryptGoc(matKhau, muoi, doDai, thongSo, (e, kq) => (e ? loi(e) : xong(kq))),
  );

/*
  N = 16384 tốn chừng 16 MB bộ nhớ và vài chục mili giây mỗi lần kiểm — nhanh
  với một người đăng nhập, nhưng đủ chậm để dò mật khẩu hàng loạt không đáng.
  Thông số được ghi LUÔN vào chuỗi đã băm, nên sau này tăng lên thì mật khẩu
  cũ vẫn kiểm được bằng thông số cũ của nó.
*/
const THONG_SO = { N: 16384, r: 8, p: 1 };
const DO_DAI = 64;

/**
 * Chữ NFC trước khi băm: cùng chữ "ạ" nhưng gõ trên iPhone và trên Windows có
 * thể ra hai chuỗi byte khác nhau. Không chuẩn hoá thì đổi máy là sai mật khẩu
 * dù gõ đúng từng chữ.
 */
function chuan(matKhau: string): string {
  return matKhau.normalize("NFC");
}

export async function bamMatKhau(matKhau: string): Promise<string> {
  const muoi = randomBytes(16);
  const bam = await scrypt(chuan(matKhau), muoi, DO_DAI, THONG_SO);
  return [
    "scrypt",
    THONG_SO.N,
    THONG_SO.r,
    THONG_SO.p,
    muoi.toString("base64"),
    bam.toString("base64"),
  ].join("$");
}

export async function khopMatKhau(matKhau: string, daLuu: string): Promise<boolean> {
  const [kieu, N, r, p, muoiB64, bamB64] = daLuu.split("$");
  if (kieu !== "scrypt" || !muoiB64 || !bamB64) return false;

  const can = Buffer.from(bamB64, "base64");
  const bam = await scrypt(chuan(matKhau), Buffer.from(muoiB64, "base64"), can.length, {
    N: Number(N),
    r: Number(r),
    p: Number(p),
  });
  // So bằng timingSafeEqual: so từng byte kiểu thường thì thời gian trả lời để
  // lộ ra mật khẩu đoán đúng được bao nhiêu byte đầu.
  return bam.length === can.length && timingSafeEqual(bam, can);
}

/**
 * Một chuỗi đã băm sẵn, chỉ để kiểm "cho có" khi tên đăng nhập không tồn tại.
 *
 * Không kiểm gì thì câu trả lời "sai" về nhanh hơn hẳn so với tên có thật —
 * đo thời gian là dò ra được ai có tài khoản. Kiểm với chuỗi này thì hai
 * trường hợp tốn thời gian như nhau.
 */
let bamGia: Promise<string> | null = null;
export async function kiemChoCo(matKhau: string): Promise<void> {
  bamGia ??= bamMatKhau(randomBytes(12).toString("hex"));
  await khopMatKhau(matKhau, await bamGia);
}

/*
  Bỏ những chữ dễ nhìn nhầm khi đọc qua điện thoại hay chép tay: i, l, o, 0, 1.
  Mật khẩu tạm được gửi qua Zalo rồi gõ lại trên điện thoại — gõ nhầm "l" với
  "1" là một cuộc gọi hỏi lại.
*/
const BANG_CHU = "abcdefghjkmnpqrstuvwxyz23456789";

/** Mật khẩu tạm quản lý cấp cho nhân viên. Nhân viên phải đổi ngay lần đầu vào. */
export function taoMatKhauTam(): string {
  let kq = "";
  for (let i = 0; i < 10; i++) kq += BANG_CHU[randomInt(BANG_CHU.length)];
  return kq;
}

/**
 * Kiểm mật khẩu nhân viên tự đặt. Trả về câu báo lỗi, hoặc null nếu dùng được.
 *
 * Chỉ chặn đúng những kiểu đã thấy gây hại thật, không bắt chữ hoa, ký tự đặc
 * biệt: luật rắc rối chỉ khiến người ta ghi mật khẩu ra giấy dán cạnh máy.
 * Riêng số điện thoại thì cấm hẳn — đó chính là lỗ hổng của hệ thống cũ.
 */
export function kiemMatKhauMoi(
  matKhau: string,
  nguoi: { tenDangNhap: string; soDienThoai: string | null },
): string | null {
  if (matKhau.length < DO_DAI_TOI_THIEU) {
    return `Mật khẩu cần ít nhất ${DO_DAI_TOI_THIEU} ký tự.`;
  }
  if (matKhau.length > 200) return "Mật khẩu dài quá.";

  const chiSo = (s: string) => s.replace(/\D/g, "");
  const so = chiSo(matKhau);
  const sdt = chiSo(nguoi.soDienThoai ?? "");
  if (
    matKhau.toLowerCase() === nguoi.tenDangNhap.toLowerCase() ||
    (sdt.length >= 8 && so.includes(sdt.slice(-8)))
  ) {
    return "Không dùng tên đăng nhập hay số điện thoại làm mật khẩu — ai biết số của anh chị là đoán ra.";
  }
  if (/^(.)\1+$/.test(matKhau) || /^(0123|1234|2345|abcd)/i.test(matKhau)) {
    return "Mật khẩu này dễ đoán quá, anh chị chọn cái khác giúp em.";
  }
  return null;
}
