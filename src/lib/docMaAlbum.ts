import { cache } from "react";
import { getPrisma } from "@/lib/db";
import { MA_ALBUM, type MaAlbum } from "@/lib/maAlbum";

/*
  ĐỌC BỘ MÃ ALBUM TỪ DATABASE — anh yêu cầu 19/11/2026.

  Bảng rỗng thì trả về bảng cứng trong `maAlbum.ts`, y như `LoaiBuoi` và
  `DanhMuc`: ô chọn mã không bao giờ được phép trống, kể cả khi chưa ai chép
  gì vào bảng mới.

  Tách khỏi `maAlbum.ts` vì tệp đó là hàm THUẦN, dùng được cả ở trình duyệt.
  Nhét `getPrisma` vào đó là kéo cả Prisma sang phía khách.
*/

/** Bộ mã cho Ô CHỌN — chỉ mã đang dùng. */
export const docMaAlbum = cache(async (): Promise<MaAlbum[]> => {
  const ds = await getPrisma().maAlbum.findMany({
    where: { dangDung: true },
    select: { ma: true, nghia: true },
    orderBy: [{ thuTu: "asc" }, { ma: "asc" }],
  });
  return ds.length > 0 ? ds : [...MA_ALBUM];
});

/**
 * Bộ mã ĐẦY ĐỦ, kể cả mã đã ngưng dùng.
 *
 * Dùng cho việc ĐỌC tên album: album cũ vẫn mang mã đã tắt, và `tenKhongMa`
 * phải bóc được nó ra thì trang khách mới hiện đúng tên. Ngưng dùng nghĩa là
 * "đừng cho chọn mới", không phải "quên nó đi".
 */
export const docMaAlbumDayDu = cache(async (): Promise<MaAlbum[]> => {
  const ds = await getPrisma().maAlbum.findMany({
    select: { ma: true, nghia: true },
    orderBy: [{ thuTu: "asc" }, { ma: "asc" }],
  });
  return ds.length > 0 ? ds : [...MA_ALBUM];
});
