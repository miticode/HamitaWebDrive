import { getPrisma } from "@/lib/db";

/**
 * Dung noi dung mot ban sao luu database.
 *
 * DUNG CHUNG cho ca hai duong lay ban sao luu — lenh `npm run db:backup` va nut
 * "Sao luu ngay" o trang quan ly. De moi ben tu viet mot ban thi som muon cung
 * lech nhau: them mot cot moi ma chi sua mot ben la ban kia thanh thieu du
 * lieu, va khong ai phat hien ra cho toi luc can phuc hoi.
 *
 * KHONG LAY PHIEU DANG NHAP GOOGLE. Ban GoogleAccount co giu, nhung cot
 * refreshToken bi bo lai co chu dich: phieu do mo duoc TOAN BO Drive cua studio
 * va khong het han. Mot tep sao luu nam tren o dia, duoc chep di chep lai, tai
 * qua trinh duyet — khong phai cho de giu mot chia khoa nhu the. Ma bo di cung
 * chang mat gi: phuc hoi xong chi can vao trang quan ly bam "Ket noi lai".
 *
 * Cung khong lay LoginAttempt: do la ban ghi tam de chan do mat khau.
 */

export type BanSaoLuu = {
  phienBan: number;
  luc: string;
  ghiChu: string;
  soLuong: Record<string, number>;
  bang: Record<string, unknown[]>;
};

/** Ten tep dang hamita-2026-08-26-1614.json — sap xep chu la ra dung thu tu thoi gian. */
export function tenTepSaoLuu(luc: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `hamita-${luc.getFullYear()}-${p(luc.getMonth() + 1)}-${p(luc.getDate())}` +
    `-${p(luc.getHours())}${p(luc.getMinutes())}.json`
  );
}

export async function taoBanSaoLuu(luc = new Date()): Promise<BanSaoLuu> {
  const prisma = getPrisma();

  const [gallery, selectionList, selection, mucXong, pushSub, googleAccount] =
    await Promise.all([
      prisma.gallery.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.selectionList.findMany({ orderBy: { position: "asc" } }),
      prisma.selection.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.mucXong.findMany(),
      prisma.pushSub.findMany(),
      prisma.googleAccount.findMany({
        // Co tinh KHONG lay refreshToken — xem chu thich dau tep.
        select: { id: true, email: true, connectedAt: true },
      }),
    ]);

  return {
    phienBan: 1,
    luc: luc.toISOString(),
    ghiChu:
      "Sao luu database web giao anh Hamita Studio. KHONG chua phieu dang nhap " +
      "Google — phuc hoi xong phai vao trang quan ly bam 'Ket noi lai'.",
    soLuong: {
      gallery: gallery.length,
      selectionList: selectionList.length,
      selection: selection.length,
      mucXong: mucXong.length,
      pushSub: pushSub.length,
      googleAccount: googleAccount.length,
    },
    bang: { gallery, selectionList, selection, mucXong, pushSub, googleAccount },
  };
}
