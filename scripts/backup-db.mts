/**
 * Sao luu toan bo database ra mot tep JSON tren may nay.
 *
 *   npm run db:backup
 *
 * Trang quan ly cung co nut "Sao luu ngay" lam dung viec nay nhung tra tep ve
 * trinh duyet. Ca hai dung chung ham taoBanSaoLuu() trong src/lib/saoLuu.ts —
 * xem chu thich o do de biet vi sao KHONG sao luu phieu dang nhap Google.
 *
 * Lenh nay giu them phan ma nut khong lam duoc: ghi ra o dia va don ban cu.
 */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", quiet: true });

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const { databaseIsConfigured } = await import("../src/lib/db");
const { taoBanSaoLuu, tenTepSaoLuu } = await import("../src/lib/saoLuu");

/** Giu lai bao nhieu ban gan nhat. 8 ban tuan la khoang hai thang lich su. */
const GIU_LAI = 8;

const THU_MUC = join(process.cwd(), "data", "sao-luu");

if (!databaseIsConfigured()) {
  console.error(
    "Thieu DATABASE_URL trong .env.local — khong co database nao de sao luu."
  );
  process.exit(1);
}

console.log("Dang doc database…\n");

const luc = new Date();
const ban = await taoBanSaoLuu(luc);

await mkdir(THU_MUC, { recursive: true });
const duongDan = join(THU_MUC, tenTepSaoLuu(luc));
const noiDung = JSON.stringify(ban, null, 2);
await writeFile(duongDan, noiDung, "utf8");

console.log(`Da luu: ${duongDan}`);
console.log(`  ${Math.round(noiDung.length / 1024).toLocaleString("vi-VN")} kB\n`);
for (const [ten, so] of Object.entries(ban.soLuong)) {
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

if (ban.soLuong.selection === 0) {
  console.log(
    "\nLuu y: khong co lua chon nao trong database. Neu day la bat ngo thi " +
      "DUNG ghi de ban sao luu cu — kiem tra lai truoc."
  );
}
