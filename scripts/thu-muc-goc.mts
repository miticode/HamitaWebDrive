/**
 * Kiểm phép đếm "khách đã chọn xong hết file gốc chưa" — anh hỏi 26/11/2026:
 * "còn nếu khách đã chọn xong hình nhà gái và ấn báo nhưng nhà trai thì chưa
 * chọn xong thì sao".
 *
 *   npx tsx scripts/thu-muc-goc.mts
 *
 * Không chạm database — chỉ gọi hàm thuần.
 */
import { laMucChonGoc, mucGocConThieu } from "../src/lib/mucGocDaChon";

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

console.log("— Thư mục nào là chỗ khách chọn file gốc —");
for (const t of ["file gốc nhà gái", "File gốc hình cổng", "file gốc HC", "file gốc AB", "file gốc"]) {
  kiem(`"${t}" → là`, laMucChonGoc(t), true);
}
for (const t of ["file hoàn thiện ảnh cổng", "hoàn thiện nhà gái", "hamita 26g 15x21 mica titan", "ptb", "Trung Thu"]) {
  kiem(`"${t}" → KHÔNG`, laMucChonGoc(t), false);
}

console.log("\n— ĐÚNG CA ANH HỎI: xong nhà gái, chưa nhà trai —");
const haiBen = ["file gốc nhà gái", "file gốc nhà trai"];
kiem(
  "mới xong nhà gái → còn thiếu nhà trai",
  mucGocConThieu(haiBen, new Set(["file gốc nhà gái"]), "tiec"),
  ["file gốc nhà trai"],
);
kiem(
  "mới xong nhà trai → còn thiếu nhà gái",
  mucGocConThieu(haiBen, new Set(["file gốc nhà trai"]), "tiec"),
  ["file gốc nhà gái"],
);
kiem("xong cả hai → không thiếu gì", mucGocConThieu(haiBen, new Set(haiBen), "tiec"), []);
kiem("chưa bên nào → thiếu cả hai", mucGocConThieu(haiBen, new Set(), "tiec"), haiBen);

console.log("\n— Album có cả thư mục nhánh chụp lẫn nhánh tiệc —");
/* Đúng album "Minh Trọng & Kiều Nhi" đo được trên web. */
const trọn = ["file gốc hc", "File gốc nhà gái", "file gốc nhà trai"];
kiem(
  "xét nhánh TIỆC: thư mục hình cổng không tính",
  mucGocConThieu(trọn, new Set(["File gốc nhà gái", "file gốc nhà trai"]), "tiec"),
  [],
);
kiem(
  "xét nhánh CHỤP: hai thư mục tiệc không tính",
  mucGocConThieu(trọn, new Set(["file gốc hc"]), "chup"),
  [],
);
kiem(
  "xét nhánh CHỤP mà hình cổng chưa xong → còn thiếu",
  mucGocConThieu(trọn, new Set(["File gốc nhà gái"]), "chup"),
  ["file gốc hc"],
);

console.log("\n— Thư mục ảnh sản phẩm không làm kẹt —");
kiem(
  "có ptb và mica titan nằm cùng, vẫn đủ",
  mucGocConThieu(
    ["file gốc nhà gái", "file gốc nhà trai", "hamita 26g 15x21 mica titan", "ptb"],
    new Set(["file gốc nhà gái", "file gốc nhà trai"]),
    "tiec",
  ),
  [],
);
kiem(
  "thư mục hoàn thiện cũng không làm kẹt",
  mucGocConThieu(
    ["file gốc nhà gái", "file hoàn thiện nhà gái"],
    new Set(["file gốc nhà gái"]),
    "tiec",
  ),
  [],
);

console.log("\n— Album không có thư mục con —");
kiem("subfolders rỗng → không thiếu gì (giữ hành vi cũ)", mucGocConThieu([], new Set(), "tiec"), []);
kiem("subfolders null", mucGocConThieu(null, new Set(), "tiec"), []);
kiem("album chỉ có thư mục hoàn thiện", mucGocConThieu(["hoàn thiện"], new Set(), "tiec"), []);

console.log("\n— Ba thư mục tiệc —");
const ba = ["file gốc nhà gái", "file gốc nhà trai", "file gốc lễ gia tiên"];
kiem("xong hai trong ba", mucGocConThieu(ba, new Set(ba.slice(0, 2)), "tiec"), ["file gốc lễ gia tiên"]);
kiem("xong cả ba", mucGocConThieu(ba, new Set(ba), "tiec"), []);

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
