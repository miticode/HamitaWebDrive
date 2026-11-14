/**
 * Soát các dòng chi tiết hợp đồng mang LOẠI khác với bảng Dịch vụ.
 *
 * Lý do soát: từ 14/11/2026 form hợp đồng cho bấm đổi loại trên MỌI dòng, kể
 * cả dòng đã chọn từ bảng — anh chỉ ra cùng ngày. Nếu có ai kịp bấm thì dòng
 * đó đang nói khác bảng, và nhãn ô ngày của nó cũng sai theo ("Ngày thuê" hoá
 * "Ngày chụp"). Script này đếm xem có dòng nào như vậy chưa.
 *
 * Chạy: npx tsx scripts/thu-lech-loai.mts
 */
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

const ct = await p.chiTietHopDong.findMany({
  select: { id: true, maDV: true, tenDV: true, loai: true, dichVuId: true, hopDongId: true },
});
const dv = await p.dichVu.findMany({ select: { id: true, maDV: true, ten: true, loai: true } });
const theoId = new Map(dv.map((d) => [d.id, d]));

const coNoi = ct.filter((c) => c.dichVuId && theoId.has(c.dichVuId));
const lech = coNoi.filter((c) => {
  const g = theoId.get(c.dichVuId!)!;
  return (c.loai ?? "") !== "" && (c.loai ?? "") !== g.loai;
});

console.log(`Tong dong chi tiet: ${ct.length}`);
console.log(`  noi duoc voi bang Dich vu: ${coNoi.length}`);
console.log(`  khong noi (go tay / ma la): ${ct.length - coNoi.length}`);
console.log(`\nDONG MANG LOAI KHAC BANG: ${lech.length}`);
for (const c of lech.slice(0, 20)) {
  const g = theoId.get(c.dichVuId!)!;
  console.log(`  ${c.maDV} "${c.tenDV}" — dong ghi "${c.loai}", bang ghi "${g.loai}"`);
}
if (lech.length > 20) console.log(`  ... con ${lech.length - 20} dong nua`);

await p.$disconnect();
