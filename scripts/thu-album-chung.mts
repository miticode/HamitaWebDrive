/**
 * Kiểm phép phân thư mục về hợp đồng cho ALBUM DÙNG CHUNG — anh chốt
 * 27/11/2026.
 *
 *   npx tsx scripts/thu-album-chung.mts
 *
 * Chỗ nguy hiểm nhất của tính năng này: đoán sai hợp đồng thì một nhà khách
 * KHÁC nhảy bước oan. Nên mọi ca không chắc đều phải trả về lý do, không
 * được trả bừa một hợp đồng.
 *
 * Không chạm database — chỉ gọi hàm thuần.
 */
import { hopDongCuaMuc, type PhanHopDong } from "../src/lib/albumChung";

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};
const hd = (id: string, ...thuMuc: string[]): PhanHopDong => ({ hopDongId: id, thuMuc });

console.log("— Album MỘT hợp đồng: mọi thư mục đều của nó —");
kiem("chưa khai thư mục nào", hopDongCuaMuc([hd("A")], "file gốc"), { hopDongId: "A" });
kiem("tên thư mục lạ vẫn của nó", hopDongCuaMuc([hd("A")], "thư mục nào đó"), { hopDongId: "A" });
kiem("đã khai và khớp", hopDongCuaMuc([hd("A", "file gốc")], "file gốc"), { hopDongId: "A" });
kiem(
  "đã khai nhưng KHÔNG khớp → nói ra",
  hopDongCuaMuc([hd("A", "file gốc")], "file gốc baby"),
  { lyDo: "khong-khop" },
);

console.log("\n— Album chung NHIỀU hợp đồng —");
const chung = [hd("CUOI", "file gốc nhà gái", "file gốc nhà trai"), hd("BABY", "file gốc baby")];
kiem("thư mục của hợp đồng cưới", hopDongCuaMuc(chung, "file gốc nhà gái"), { hopDongId: "CUOI" });
kiem("thư mục của hợp đồng baby", hopDongCuaMuc(chung, "file gốc baby"), { hopDongId: "BABY" });
kiem(
  "thư mục KHÔNG ai nhận → KHÔNG đoán",
  hopDongCuaMuc(chung, "file gốc"),
  { lyDo: "nhieu-hop-dong" },
);
kiem(
  "hai hợp đồng cùng nhận một thư mục (gắn nhầm) → nói ra",
  hopDongCuaMuc([hd("A", "file gốc"), hd("B", "file gốc")], "file gốc"),
  { lyDo: "nhieu-hop-dong" },
);
kiem(
  "một hợp đồng chưa khai gì, một cái khai rồi → vẫn KHÔNG đoán",
  hopDongCuaMuc([hd("A"), hd("B", "file gốc baby")], "file gốc"),
  { lyDo: "nhieu-hop-dong" },
);

console.log("\n— Album chưa gắn hợp đồng nào —");
kiem("danh sách rỗng", hopDongCuaMuc([], "file gốc"), { lyDo: "chua-gan" });

console.log("\n— Ba lần chụp của cùng một khách (ca NGỌC THUỲ thật) —");
const ngocThuy = [
  hd("HOI-2023", "file gốc hỏi", "file hoàn thiện hỏi"),
  hd("BABY-2026", "file gốc baby"),
  hd("NHASU-2026", "file gốc nhà su"),
];
kiem("ảnh hỏi 2023", hopDongCuaMuc(ngocThuy, "file gốc hỏi"), { hopDongId: "HOI-2023" });
kiem("ảnh baby 2026", hopDongCuaMuc(ngocThuy, "file gốc baby"), { hopDongId: "BABY-2026" });
kiem("ảnh nhà su 2026", hopDongCuaMuc(ngocThuy, "file gốc nhà su"), { hopDongId: "NHASU-2026" });
kiem("thư mục hoàn thiện hỏi", hopDongCuaMuc(ngocThuy, "file hoàn thiện hỏi"), { hopDongId: "HOI-2023" });
kiem("thư mục mới ai đó tạo tay → không đoán", hopDongCuaMuc(ngocThuy, "ảnh thêm"), { lyDo: "nhieu-hop-dong" });

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
