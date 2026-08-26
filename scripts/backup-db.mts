/**
 * Sao luu toan bo database ra mot tep JSON.
 *
 *   npm run db:backup
 *
 * VI SAO CAN: anh cua khach nam tren Drive, con thu KHONG THE TAO LAI nam trong
 * database — khach da tha tim nhung tam nao, ghi chu "in co 40x60" o tam nao,
 * ma chon anh cua tung album. Xoa nham mot album la mat sach nhung thu do, va
 * xoa keo theo day chuyen (onDelete: Cascade) nen khong lui duoc.
 *
 * KHONG SAO LUU PHIEU GOOGLE. Ban GoogleAccount co giu, nhung cot refreshToken
 * bi bo lai co chu dich: phieu do mo duoc TOAN BO Drive cua studio va khong het
 * han. Mot tep sao luu nam tren o dia, duoc chep di chep lai, khong phai cho de
 * giu mot chia khoa nhu the — nhat la khi phuc hoi no cung khong can thiet: vao
 * trang quan ly bam "Ket noi lai" la xong trong mot phut.
 *
 * Cung khong sao luu LoginAttempt: do la ban ghi tam de chan do mat khau, mat
 * di cang tot.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const { getPrisma, databaseIsConfigured } = await import("../src/lib/db");

/** Giu lai bao nhieu ban gan nhat. 8 ban tuan la khoang hai thang lich su. */
const GIU_LAI = 8;

const THU_MUC = join(process.cwd(), "data", "sao-luu");

/** Ten tep dang hamita-2026-08-26-1533.json — sap xep chu la ra dung thu tu thoi gian. */
function tenTep(luc: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `hamita-${luc.getFullYear()}-${p(luc.getMonth() + 1)}-${p(luc.getDate())}` +
    `-${p(luc.getHours())}${p(luc.getMinutes())}.json`
  );
}

function doc(n: number): string {
  return n.toLocaleString("vi-VN");
}

if (!databaseIsConfigured()) {
  console.error(
    "Thieu DATABASE_URL trong .env.local — khong co database nao de sao luu."
  );
  process.exit(1);
}

const prisma = getPrisma();
const luc = new Date();

console.log("Dang doc database…\n");

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

const banSaoLuu = {
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

await mkdir(THU_MUC, { recursive: true });
const duongDan = join(THU_MUC, tenTep(luc));
const noiDung = JSON.stringify(banSaoLuu, null, 2);
await writeFile(duongDan, noiDung, "utf8");

console.log(`Da luu: ${duongDan}`);
console.log(`  ${doc(Math.round(noiDung.length / 1024))} kB\n`);
for (const [ten, so] of Object.entries(banSaoLuu.soLuong)) {
  console.log(`  ${ten.padEnd(15)} ${String(so).padStart(6)} dong`);
}

/*
  Don ban cu. Ten tep mang ngay gio theo dinh dang sap xep duoc bang chu cai,
  nen chi can sap xep nguoc roi bo tu ban thu GIU_LAI+1 tro di.
*/
const tatCa = (await readdir(THU_MUC))
  .filter((t) => t.startsWith("hamita-") && t.endsWith(".json"))
  .sort()
  .reverse();

const canXoa = tatCa.slice(GIU_LAI);
for (const t of canXoa) await unlink(join(THU_MUC, t));

console.log(
  `\nDang giu ${Math.min(tatCa.length, GIU_LAI)} ban gan nhat` +
    (canXoa.length ? `, vua don ${canXoa.length} ban cu.` : ".")
);

if (selection.length === 0) {
  console.log(
    "\nLuu y: khong co lua chon nao trong database. Neu day la bat ngo thi " +
      "DUNG ghi de ban sao luu cu — kiem tra lai truoc."
  );
}
