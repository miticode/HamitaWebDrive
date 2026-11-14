/* Soát phiếu thu / lịch / đầu việc mồ côi — không còn hợp đồng nào trỏ tới. */
import { readFileSync } from "node:fs";
for (const t of [".env.local", ".env"]) {
  try {
    for (const d of readFileSync(t, "utf8").split("\n")) {
      const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
}
const { getPrisma } = await import("../src/lib/db");
const p = getPrisma();

const idHD = new Set((await p.hopDong.findMany({ select: { id: true } })).map((h) => h.id));

const pt = await p.phieuThu.findMany({ select: { id: true, hopDongId: true, soTien: true, noiDung: true, ngayThu: true } });
const ptMoCoi = pt.filter((x) => x.hopDongId && !idHD.has(x.hopDongId));
console.log(`Phieu thu: ${pt.length} | khong gan hop dong nao: ${pt.filter((x) => !x.hopDongId).length} | MO COI (tro toi HD da xoa): ${ptMoCoi.length}`);
for (const x of ptMoCoi.slice(0, 10)) console.log(`   ${x.ngayThu} · ${x.soTien}d · ${x.noiDung}`);

const lich = await p.lichChup.findMany({ select: { id: true, hopDongId: true } });
console.log(`Lich chup: ${lich.length} | MO COI: ${lich.filter((x) => x.hopDongId && !idHD.has(x.hopDongId)).length}`);

const ct = await p.chiTietHopDong.count();
const ctAll = await p.chiTietHopDong.findMany({ select: { hopDongId: true } });
console.log(`Chi tiet HD: ${ct} | MO COI: ${ctAll.filter((x) => x.hopDongId && !idHD.has(x.hopDongId)).length}`);

await p.$disconnect();
