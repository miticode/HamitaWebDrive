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
import { databaseIsConfigured, getPrisma } from "@/lib/db";

/**
 * Ghi lai moc "vua lam xong viec nay".
 *
 * PHAI dung chung cho MOI duong sao luu, dung chep logic upsert ra tung noi.
 * Truoc day chi duong API (nut "Sao luu ngay") ghi moc, con `npm run db:backup`
 * thi khong — nen sao luu bang lenh xong, trang quan ly van bao ngay cu. Lech
 * do vo hai cho toi khi studio dat lich chay lenh hang tuan theo huong dan
 * trong README: luc ay sao luu chay deu moi tuan ma trang quan ly bao "lan
 * cuoi cach day 40 ngay" mai mai, roi mat niem tin vao chinh con so do.
 *
 * Nuot loi: ghi moc hong thi cung khong duoc lam hong viec sao luu. Tep moi la
 * thu can giu, cai moc chi de nhac.
 */
export async function ghiMoc(ten: string, luc: Date): Promise<void> {
  if (!databaseIsConfigured()) return;
  try {
    await getPrisma().moc.upsert({
      where: { ten },
      create: { ten, luc },
      update: { luc },
    });
  } catch {
    // Cung ly do voi docMoc: bang Moc them sau, ban cu co the chua co.
  }
}

/*
  Khoa ghi "da bam Gui thong bao cho album nay", moi album mot dong.

  Muon lai bang Moc voi mot tien to rieng, y het cach khung Thong bao ghi dau
  da doc (nguyen tac 39): bang do von de ghi "lan cuoi lam viec X", dung hinh
  dang, khoi phai them cot vao Gallery.
*/
const TIEN_TO_BAO_TIN = "bao-tin:";

export function khoaBaoTin(galleryId: string): string {
  return TIEN_TO_BAO_TIN + galleryId;
}

/**
 * Lan cuoi gui tin cua TUNG album, tra theo id.
 *
 * Doc mot lan cho ca trang roi tra theo id, khong hoi tung the mot: hai muoi
 * bay album la hai muoi bay lan hoi database cho mot con so nho.
 */
export async function docLanBaoTinMoiAlbum(): Promise<Record<string, Date>> {
  if (!databaseIsConfigured()) return {};
  try {
    const ds = await getPrisma().moc.findMany({
      where: { ten: { startsWith: TIEN_TO_BAO_TIN } },
    });
    const ra: Record<string, Date> = {};
    for (const m of ds) ra[m.ten.slice(TIEN_TO_BAO_TIN.length)] = m.luc;
    return ra;
  } catch {
    // Cung ly do voi docMoc: ban deploy cu co the chua co bang Moc.
    return {};
  }
}

/**
 * Xoa moi dau moc dinh toi mot album, goi khi xoa album do.
 *
 * VI SAO PHAI GOI TAY: cac bang con (MucXong, BiaMuc, PushSub...) deu khai
 * `onDelete: Cascade` nen tu bien mat theo album. Bang `Moc` thi KHONG co quan
 * he nao toi Gallery — no chi la mot bang khoa/gia tri dung chung — nen dong
 * cua no nam lai vinh vien sau khi album da xoa.
 *
 * Da xay ra that: do ngay 09/09/2026 thay mot dong `bao-tin:` tro toi album
 * khong con ton tai. Moi dong rac chi vai chuc byte, nhung chung chi tang chu
 * khong bao gio giam, va lam moi phep dem tren bang Moc sai dan.
 *
 * Doi chieu bang `contains` chu khong theo tung tien to: khoa dinh toi album
 * hien co hai dang — `bao-tin:<id>` (nguyen tac 47) va `da-doc-tb:goi-<id>`,
 * `da-doc-tb:xong-<id>-<n>`... (nguyen tac 39) — va se con them dang moi. Ma
 * album la cuid dai 25 ky tu nen khong the trung nham voi khoa nao khac.
 *
 * Nuot loi: album da xoa roi thi khong duoc bao that bai chi vi don dep hut.
 */
export async function xoaMocCuaAlbum(galleryId: string): Promise<void> {
  if (!databaseIsConfigured()) return;
  try {
    await getPrisma().moc.deleteMany({ where: { ten: { contains: galleryId } } });
  } catch {
    // Cung ly do voi docMoc: ban cu co the chua co bang Moc.
  }
}

/** Lan cuoi lam viec nay la luc nao. null = chua lan nao. */
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
