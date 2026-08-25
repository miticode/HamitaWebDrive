import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Ma hoa nhung chuoi bi mat truoc khi ghi vao database.
 *
 * Cho cai gi: hien chi co refresh token cua Google. Phieu do khong het han, va
 * pham vi quyen la doc TOAN BO Google Drive cua studio — nghia la ai cam duoc
 * chuoi do thi doc duoc moi thu trong Drive, khong rieng anh cuoi. Database va
 * ung dung la hai he thong khac nhau (Neon va Vercel), nen de nguyen van trong
 * database la dat tat ca vao mot ro.
 *
 * Dung AES-256-GCM: vua giau noi dung vua kem ma kiem tra, sua mot byte trong
 * database la luc giai ma bao loi ngay chu khong tra ve rac.
 */

/*
  Tien to danh dau chuoi da ma hoa.

  Bat buoc phai co de con doc duoc nhung phieu luu tu truoc khi co lop nay:
  khong mang tien to nghia la ban cu, tra ve nguyen van.
*/
const TIEN_TO = "enc:v1:";

/** Do dai co dinh cua AES-GCM, tinh bang byte. */
const IV_BYTE = 12;
const TAG_BYTE = 16;

/**
 * Khoa lay tu bien moi truong TOKEN_KEY.
 *
 * Bam sha256 thay vi doi dung 32 byte: nho vay anh dat chuoi dai ngan the nao
 * cung chay, khong phai canh do dai cho dung.
 */
function khoa(): Buffer | null {
  const raw = process.env.TOKEN_KEY?.trim();
  if (!raw) return null;
  return createHash("sha256").update(raw).digest();
}

/** Da khai bao TOKEN_KEY chua — trang quan tri dung de nhac neu chua co. */
export function coKhoaMaHoa(): boolean {
  return khoa() !== null;
}

/**
 * Ma hoa mot chuoi. Chua khai bao TOKEN_KEY thi tra ve nguyen van.
 *
 * Co tinh KHONG nem loi khi thieu khoa: neu nem, mot studio dang chay binh
 * thuong se mat ket noi Drive chi vi chua kip them bien moi truong. Thieu khoa
 * la lui ve dung nhu truoc khi co lop nay, khong te hon.
 */
export function maHoa(noiDung: string): string {
  const k = khoa();
  if (!k) return noiDung;

  const iv = randomBytes(IV_BYTE);
  const may = createCipheriv("aes-256-gcm", k, iv);
  const phan = Buffer.concat([may.update(noiDung, "utf8"), may.final()]);
  return TIEN_TO + Buffer.concat([iv, may.getAuthTag(), phan]).toString("base64");
}

/** Doc lai chuoi da ma hoa. Chuoi khong mang tien to duoc tra ve nguyen van. */
export function giaiMa(daLuu: string): string {
  if (!daLuu.startsWith(TIEN_TO)) return daLuu;

  const k = khoa();
  if (!k) {
    throw new Error(
      "Trong database co phieu da ma hoa nhung thieu bien TOKEN_KEY. Dat lai dung khoa cu, hoac vao trang quan tri bam Ket noi lai Google Drive."
    );
  }

  const goi = Buffer.from(daLuu.slice(TIEN_TO.length), "base64");
  const may = createDecipheriv("aes-256-gcm", k, goi.subarray(0, IV_BYTE));
  may.setAuthTag(goi.subarray(IV_BYTE, IV_BYTE + TAG_BYTE));
  return Buffer.concat([
    may.update(goi.subarray(IV_BYTE + TAG_BYTE)),
    may.final(),
  ]).toString("utf8");
}

/** Chuoi nay da o dang ma hoa chua — dung de biet co can nang cap ban cu khong. */
export function daMaHoa(daLuu: string): boolean {
  return daLuu.startsWith(TIEN_TO);
}
