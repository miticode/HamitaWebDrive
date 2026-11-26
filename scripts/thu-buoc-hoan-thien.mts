import {
  buocSauKhiGuiAnhGoc,
  buocSauKhiGuiAnhHoanThien,
  buocSauKhiStudioGuiAnh,
  buocSauKhiGuiIn,
  laLuotGuiHoanThien,
} from "../src/lib/buocAnhGoc";

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

console.log("— Chuỗi nhánh CHỤP studio —");
for (const b of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
  kiem(`bước ${b} · studio gửi ảnh`, buocSauKhiStudioGuiAnh(b), b === 2 || b === 3 ? 4 : b === 5 ? 6 : null);
}
console.log("— Chuỗi nhánh TIỆC —");
for (const b of [10, 11, 12, 13, 14, 15, 16, 17, 18]) {
  kiem(`bước ${b} · studio gửi ảnh`, buocSauKhiStudioGuiAnh(b), [10, 11, 12].includes(b) ? 13 : b === 14 ? 15 : null);
}

console.log("— Hai dải KHÔNG chồng nhau —");
for (const b of [...Array(19).keys()]) {
  const goc = buocSauKhiGuiAnhGoc(b);
  const ht = buocSauKhiGuiAnhHoanThien(b);
  if (goc !== null && ht !== null) { truot++; console.log(`TRUOT bước ${b} rơi vào CẢ HAI dải`); }
}
console.log("  ok không bước nào rơi vào cả hai dải");

console.log("— laLuotGuiHoanThien —");
kiem("bước 5", laLuotGuiHoanThien(5), true);
kiem("bước 14", laLuotGuiHoanThien(14), true);
kiem("bước 2", laLuotGuiHoanThien(2), false);
kiem("bước 6", laLuotGuiHoanThien(6), false);
kiem("null", laLuotGuiHoanThien(null), false);
kiem("undefined", laLuotGuiHoanThien(undefined), false);

console.log("— Nối liền mạch: 5→6 rồi 6→7 —");
const sau5 = buocSauKhiStudioGuiAnh(5);
kiem("5 → ?", sau5, 6);
kiem("rồi 6 → gửi in", buocSauKhiGuiIn(sau5), 7);
const sau14 = buocSauKhiStudioGuiAnh(14);
kiem("14 → ?", sau14, 15);
kiem("rồi 15 → gửi in", buocSauKhiGuiIn(sau14), 16);

console.log("— KHÔNG nhảy cóc qua bước retouch —");
kiem("bước 4 (chờ khách chọn) không lên thẳng 6", buocSauKhiGuiAnhHoanThien(4), null);
kiem("bước 13 không lên thẳng 15", buocSauKhiGuiAnhHoanThien(13), null);

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
