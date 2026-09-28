/*
  Bo thong tin may anh/GPS khoi file JPEG ma KHONG giai nen lai anh.

  BAN SAO cua src/lib/jpeg.ts, doi Buffer sang Uint8Array vi Worker khong co
  Buffer cua Node. Logic giu nguyen tung dong — sua mot ben thi phai sua ben
  kia, neu khong anh khach tai tu Worker va tai tu Vercel se khac nhau.

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
 * Anh co the huong khac 1 (can xoay) khong.
 *
 * Bo EXIF cua mot tam can xoay la anh hien ra nam ngang — Worker khong xoay
 * duoc pixel (khong co thu vien anh), nen gap tam do thi GIU NGUYEN ca EXIF.
 * Dung cach Vercel dang lam: chi cat khi huong la 1 hoac khong khai bao.
 */
function huongKhac1(goc: Uint8Array, dauApp1: number, dai: number): boolean {
  // Than APP1 bat dau bang "Exif\0\0" roi toi phan TIFF.
  const than = dauApp1 + 2;
  if (than + 14 > goc.length) return false;
  const laExif =
    goc[than] === 0x45 && goc[than + 1] === 0x78 && goc[than + 2] === 0x69 && goc[than + 3] === 0x66;
  if (!laExif) return false;

  const tiff = than + 6;
  const bigEndian = goc[tiff] === 0x4d;
  const doc16 = (p: number) => (bigEndian ? (goc[p] << 8) | goc[p + 1] : goc[p] | (goc[p + 1] << 8));
  const doc32 = (p: number) =>
    bigEndian
      ? ((goc[p] << 24) | (goc[p + 1] << 16) | (goc[p + 2] << 8) | goc[p + 3]) >>> 0
      : ((goc[p + 3] << 24) | (goc[p + 2] << 16) | (goc[p + 1] << 8) | goc[p]) >>> 0;

  const ifd0 = tiff + doc32(tiff + 4);
  if (ifd0 + 2 > goc.length) return false;
  const soMuc = doc16(ifd0);
  for (let k = 0; k < soMuc; k++) {
    const muc = ifd0 + 2 + k * 12;
    if (muc + 12 > goc.length || muc + 12 > dauApp1 + dai) break;
    if (doc16(muc) === 0x0112) {
      const huong = doc16(muc + 8);
      return huong !== 0 && huong !== 1;
    }
  }
  return false;
}

/**
 * Tra ve file JPEG da bo thong tin may anh, hoac `null` neu file khong dung
 * dinh dang mong doi hoac anh can xoay — luc do nguoi goi giao nguyen ban goc.
 */
export function boMetadataJpeg(goc: Uint8Array): Uint8Array | null {
  if (goc.length < 4 || goc[0] !== 0xff || goc[1] !== 0xd8) return null;

  const giuLai: Uint8Array[] = [goc.subarray(0, 2)];
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
      return noiLai(giuLai);
    }

    if (KHONG_CO_THAN(ma)) {
      i = viTriMa + 1;
      continue;
    }

    const dauThan = viTriMa + 1;
    if (dauThan + 1 >= goc.length) return null;

    // Hai byte dau la do dai, tinh ca chinh hai byte do.
    const dai = (goc[dauThan] << 8) | goc[dauThan + 1];
    const het = dauThan + dai;
    if (dai < 2 || het > goc.length) return null;

    if (ma === APP1 && huongKhac1(goc, dauThan, dai)) return null;
    if (ma !== APP1 && ma !== APP13) giuLai.push(goc.subarray(i, het));
    i = het;
  }

  return null;
}

function noiLai(phan: Uint8Array[]): Uint8Array {
  const tong = phan.reduce((s, p) => s + p.length, 0);
  const ra = new Uint8Array(tong);
  let v = 0;
  for (const p of phan) {
    ra.set(p, v);
    v += p.length;
  }
  return ra;
}
