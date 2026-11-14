/** Kiem muc dich vu thu tao tu form hop dong, roi don sach. --don de xoa. */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFileSync } from "node:fs";

for (const ten of [".env.local", ".env"]) {
  try {
    for (const d of readFileSync(ten, "utf8").split("\n")) {
      const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}

const p = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
const don = process.argv.includes("--don");
const loc = { OR: [{ maDV: { startsWith: "ZZTHU" } }, { ten: { startsWith: "ZZ THU" } }] };

const muc = await p.dichVu.findMany({ where: loc, select: { maDV: true, ten: true, loai: true, nhom: true, donGia: true, taoLuc: true } });
console.log(`Muc dich vu thu: ${muc.length}`);
for (const m of muc) console.log(`  ${m.maDV} | ${m.ten} | loai ${m.loai} | nhom ${m.nhom ?? "-"} | ${m.donGia}d | tao ${m.taoLuc.toISOString()}`);

const ct = await p.chiTietHopDong.count({ where: { maDV: { startsWith: "ZZTHU" } } });
console.log(`Dong chi tiet hop dong dung ma ZZTHU: ${ct}`);

if (don) {
  const xCT = await p.chiTietHopDong.deleteMany({ where: { maDV: { startsWith: "ZZTHU" } } });
  const xDV = await p.dichVu.deleteMany({ where: loc });
  console.log(`\nDa xoa: ${xCT.count} chi tiet | ${xDV.count} muc dich vu`);
  console.log(`Kiem lai: con ${await p.dichVu.count({ where: loc })} muc thu (phai la 0)`);
}
await p.$disconnect();
