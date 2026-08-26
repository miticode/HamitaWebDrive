import { databaseIsConfigured, getPrisma } from "@/lib/db";

/**
 * Moc thoi gian cua nhung viec dinh ky studio lam bang tay.
 *
 * Chi mot khoa dang dung: "saoLuu". Xem chu thich o model Moc trong
 * schema.prisma de biet vi sao can nho moc nay.
 *
 * Tach ra day thay vi goi getPrisma() thang trong trang quan ly: trang do von
 * chi doc qua lop store, de mot loi goi prisma tran vao giua thi lan sau kho
 * doc ra la trang cham vi cai gi.
 */
export async function docMoc(ten: string): Promise<Date | null> {
  if (!databaseIsConfigured()) return null;
  try {
    const m = await getPrisma().moc.findUnique({ where: { ten } });
    return m?.luc ?? null;
  } catch {
    /*
      Bang Moc them sau nen mot ban deploy cu hoac database chua chay db:push
      co the chua co bang nay. Coi nhu chua tung sao luu, khong lam chet trang
      quan ly chi vi mot dong nhac nho.
    */
    return null;
  }
}
