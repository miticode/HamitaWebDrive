/** Anh nam ngay o thu muc goc khong co folder ID, dung ma nay thay the tren URL. */
export const ROOT_ALBUM = "_le";

/** Ten studio hien tren trang khach xem. Doi bang bien moi truong khi can. */
export const STUDIO_NAME =
  process.env.NEXT_PUBLIC_STUDIO_NAME?.trim() || "Hamita Studio";

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
