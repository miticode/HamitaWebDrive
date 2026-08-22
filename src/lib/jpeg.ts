/*
  Bo thong tin may anh/GPS khoi file JPEG ma KHONG giai nen lai anh.

  Truoc day viec nay giao cho sharp, nhung sharp giai nen roi nen lai — anh goc
  1 MB ra con 96 KB, chi con 9,6%. Khach nhan ve mot tam anh da bi ep, trong khi
  chu thich trong code van ghi la "giu nguyen chat luong".

  File JPEG la mot chuoi cac doan noi duoi nhau. Thong tin may anh nam trong vai
  doan rieng, cat bo chung di la xong — tung byte cua phan anh giu nguyen tuyet
  doi, khong mat mot chut chat luong nao.
*/

/** EXIF (co ca toa do GPS) va XMP. */
const APP1 = 0xe1;
/** IPTC / Photoshop — ten tac gia, chu thich, du lieu bien tap. */
const APP13 = 0xed;
/** Bat dau phan anh nen. Tu day tro di khong con doan nao de cat. */
const SOS = 0xda;
/** Ket thuc file. */
const EOI = 0xd9;
/** Doan khong co than: TEM va cac diem dong bo lai RST0–RST7. */
const KHONG_CO_THAN = (m: number) => m === 0x01 || (m >= 0xd0 && m <= 0xd7);

/*
  Co y GIU lai:
  - APP0  (JFIF)  — thong so mat do diem anh.
  - APP2  (ICC)   — ho mau. Bo di la anh doi mau tren may khac.
  - APP14 (Adobe) — bao cach ma hoa mau; bo di anh CMYK se sai mau.
*/

/**
 * Tra ve file JPEG da bo thong tin may anh, hoac `null` neu file khong dung
 * dinh dang mong doi — luc do nguoi goi phai tu chon duong lui, tuyet doi
 * khong doan bua.
 */
export function boMetadataJpeg(goc: Buffer): Buffer | null {
  if (goc.length < 4 || goc[0] !== 0xff || goc[1] !== 0xd8) return null;

  const giuLai: Buffer[] = [goc.subarray(0, 2)];
  let i = 2;

  while (i + 1 < goc.length) {
    if (goc[i] !== 0xff) return null;

    // Chuoi 0xFF lien tiep la byte dem, dau doan that nam o byte khac 0xFF.
    let viTriMa = i + 1;
    while (goc[viTriMa] === 0xff && viTriMa + 1 < goc.length) viTriMa++;
    const ma = goc[viTriMa];

    // Toi phan anh nen roi thi chep thang phan con lai, khong dong vao nua.
    if (ma === SOS || ma === EOI) {
      giuLai.push(goc.subarray(i));
      return Buffer.concat(giuLai);
    }

    if (KHONG_CO_THAN(ma)) {
      i = viTriMa + 1;
      continue;
    }

    const dauThan = viTriMa + 1;
    if (dauThan + 1 >= goc.length) return null;

    // Hai byte dau la do dai, tinh ca chinh hai byte do.
    const dai = goc.readUInt16BE(dauThan);
    const het = dauThan + dai;
    if (dai < 2 || het > goc.length) return null;

    if (ma !== APP1 && ma !== APP13) giuLai.push(goc.subarray(i, het));
    i = het;
  }

  return null;
}
