/** Anh nam ngay o thu muc goc khong co folder ID, dung ma nay thay the tren URL. */
export const ROOT_ALBUM = "_le";

/** Ten studio hien tren trang khach xem. Doi bang bien moi truong khi can. */
export const STUDIO_NAME =
  process.env.NEXT_PUBLIC_STUDIO_NAME?.trim() || "Hamita Studio";

/**
 * Loi chuc hien o dau album khi studio khong viet loi nhan rieng.
 *
 * Phai chung chung: mot album co the la chup hinh cong, chup album, chup ben
 * nha gai hay nha trai — nhac dich danh "ngay cuoi" se tro khap voi phan lon
 * cac buoi chup.
 */
export const LOI_CHUC_MAC_DINH =
  "Cảm ơn anh chị đã tin tưởng và đồng hành cùng chúng tôi. " +
  "Chúc anh chị trăm năm hạnh phúc — mong bộ ảnh này giữ trọn " +
  "những khoảnh khắc đẹp nhất của anh chị.";

/**
 * Dia chi goc cua web, dung cho anh xem truoc khi gui link qua Zalo/Facebook.
 * Vercel tu dat VERCEL_PROJECT_PRODUCTION_URL cho ban chinh thuc.
 */
export function siteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

/**
 * Tran so diem anh cho phep khi doc mot tam anh.
 *
 * Thu vien xu ly anh (sharp) mac dinh chi nhan toi 268 trieu diem anh de tranh
 * "bom nen" — mot tep nho xiu nhung giai nen ra khong lo, du lam het bo nho may
 * chu. Anh in kho lon that su vuot moc do: mot tam mica 60x120cm trong album
 * cua khach do duoc 18000x36000 = 648 trieu diem anh, va truoc khi noi tran nay
 * thi route anh tra ve loi "Input image exceeds pixel limit" sau 30 giay cho.
 *
 * Da do that voi chinh tam do: tai ve 4,5 giay, thu nho 1,9 giay, bo nho dinh
 * diem chi 340 MB — nhe vi thu vien giai nen JPEG thang o ti le thu nho san
 * (shrink-on-load) chu khong bung ca tam ra bo nho.
 *
 * Van dat mot con so cu the thay vi tat han: gap ba lan tam anh lon nhat tung
 * gap, du cho anh in kho lon hon nua ma khong bo han lop chan bom nen.
 */
export const TRAN_DIEM_ANH = 2_000_000_000;

/**
 * Gia mac dinh cho moi tam anh vuot goi, tinh bang dong.
 * Da gom ca chinh sua lan in. Sua duoc cho tung album o trang quan ly.
 */
export const GIA_ANH_THEM_MAC_DINH = 12_000;

/**
 * So ngay giu anh mac dinh — sau moc nay studio du dinh xoa anh khoi Drive.
 * Chi la loi nhac de khach tranh thu tai; het han khong tu chan link.
 */
export const SO_NGAY_GIU_ANH_MAC_DINH = 90;

/** Moc het han mac dinh cho album vua tao: hom nay cong so ngay giu anh. */
export function hanMacDinh(): Date {
  const d = new Date();
  d.setDate(d.getDate() + SO_NGAY_GIU_ANH_MAC_DINH);
  return d;
}
