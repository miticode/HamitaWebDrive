/**
 * Kiểm phép tính bước từ DẤU TRÊN TỪNG BUỔI — anh yêu cầu 26/11/2026.
 *
 *   npx tsx scripts/thu-dau-buoi.mts
 *
 * Anh báo: "nếu hợp đồng có dịch vụ ngày cưới bao gồm 2 ngày cưới thì giả sử
 * thợ đã gửi ảnh gốc tiệc nhà gái rồi thì ấn đã gửi hợp đồng chuyển sang
 * trạng thái số 13 nhưng file gốc nhà trai chưa chụp… thì sao".
 *
 * Hai chỗ dễ sai, và đều kiểm ở đây:
 *   · phân nhánh buổi — gộp nhầm buổi tiệc vào nhánh chụp thì hợp đồng kẹt ở
 *     khâu ảnh cổng cho tới sau đám cưới;
 *   · "mọi buổi" phải là MỌI buổi cùng nhánh, không phải buổi đầu tiên.
 *
 * Không chạm database — chỉ gọi hàm thuần.
 */
import { nhanhCuaBuoc, nhanhCuaBuoi } from "../src/lib/nhanhBuoi";
import { buocTuDauBuoi, type DauBuoi } from "../src/lib/trangThaiBuoi";

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

const LUC = new Date("2026-11-26T10:00:00+07:00");
/** Một buổi: tên loại, đã giao váy chưa, đã gửi ảnh gốc chưa. */
const b = (loai: string, vay: boolean, goc: boolean): DauBuoi => ({
  loai,
  daGiaoVay: vay ? LUC : null,
  daGuiAnhGoc: goc ? LUC : null,
});

console.log("— Phân nhánh buổi: cả 18 loại đang dùng —");
const TIEC = ["nhà gái", "nhà trai", "Ngày cưới", "Ngày lễ gia tiên", "Đính Hôn", "chup dạm ngõ", "Chụp chịu lạy"];
const CHUP = [
  "Ngày chụp", "Nhà Su", "Hami Baby", "chụp bé", "chụp thôi nôi", "makeup",
  "chụp đầy tháng", "Chụp sự kiện", "Chụp hình cổng", "Chụp Album", "Chụp Sinh Nhật",
];
kiem(`${TIEC.length} loại ngày cưới → tiệc`, TIEC.map(nhanhCuaBuoi), TIEC.map(() => "tiec"));
kiem(`${CHUP.length} loại còn lại → chụp`, CHUP.map(nhanhCuaBuoi), CHUP.map(() => "chup"));
kiem("hoa thường không đổi kết quả", ["NHÀ GÁI", "Nhà Gái", "nhà gái"].map(nhanhCuaBuoi), ["tiec", "tiec", "tiec"]);
kiem("không dấu vẫn nhận ra", nhanhCuaBuoi("nha trai"), "tiec");
kiem("loại lạ về nhánh chụp", nhanhCuaBuoi("Chụp gì đó mới"), "chup");
kiem("loại trống về nhánh chụp", nhanhCuaBuoi(null), "chup");
kiem("makeup KHÔNG vào nhánh tiệc", nhanhCuaBuoi("makeup"), "chup");

console.log("\n— Nhánh của bước —");
kiem("bước 5 → chụp", nhanhCuaBuoc(5), "chup");
kiem("bước 10 → tiệc", nhanhCuaBuoc(10), "tiec");
kiem("bước 18 → tiệc", nhanhCuaBuoc(18), "tiec");
kiem("chưa gõ bước → null", nhanhCuaBuoc(null), null);

console.log("\n— ĐÚNG CA ANH HỎI: hai ngày cưới, mới gửi nhà gái —");
const haiNgay = (gaiGui: boolean, traiGui: boolean) => [b("nhà gái", true, gaiGui), b("nhà trai", true, traiGui)];
kiem("chỉ nhà gái đã gửi → KHÔNG lên 13", buocTuDauBuoi(12, haiNgay(true, false)), null);
kiem("chỉ nhà trai đã gửi → KHÔNG lên 13", buocTuDauBuoi(12, haiNgay(false, true)), null);
kiem("cả hai đã gửi → lên 13", buocTuDauBuoi(12, haiNgay(true, true)), 13);
kiem("chưa bên nào gửi → không đổi", buocTuDauBuoi(12, haiNgay(false, false)), null);

console.log("\n— Giao váy kéo bước 11 —");
kiem(
  "mới giao váy nhà gái → không lên 11",
  buocTuDauBuoi(10, [b("nhà gái", true, false), b("nhà trai", false, false)]),
  null,
);
kiem(
  "giao váy cả hai → lên 11",
  buocTuDauBuoi(10, [b("nhà gái", true, false), b("nhà trai", true, false)]),
  11,
);
kiem(
  "giao váy cả hai VÀ gửi gốc cả hai → lên thẳng 13, không dừng ở 11",
  buocTuDauBuoi(10, [b("nhà gái", true, true), b("nhà trai", true, true)]),
  13,
);

console.log("\n— Hợp đồng có CẢ buổi chụp trước lẫn buổi tiệc —");
/* Đúng hợp đồng "tùnghamita": hình cổng 26/11 đã gửi, tiệc 01–02/12 chưa tới. */
const tungHamita = [b("Chụp hình cổng", false, true), b("nhà gái", false, false), b("nhà trai", false, false)];
kiem("đang ở bước 2 (nhánh chụp) → lên 4, KHÔNG kẹt vì buổi tiệc", buocTuDauBuoi(2, tungHamita), 4);
kiem("đang ở bước 12 (nhánh tiệc) → chưa lên 13 vì hai buổi tiệc chưa gửi", buocTuDauBuoi(12, tungHamita), null);

console.log("\n— CHỈ NÂNG, KHÔNG HẠ —");
kiem("đang ở 13 rồi → không trả 13 nữa", buocTuDauBuoi(13, haiNgay(true, true)), null);
kiem("đang ở 15, mọi buổi đã gửi → không kéo về 13", buocTuDauBuoi(15, haiNgay(true, true)), null);
kiem("đang ở 18 → không đổi", buocTuDauBuoi(18, haiNgay(true, true)), null);
kiem("đang ở 11, mọi buổi giao váy → không trả lại 11", buocTuDauBuoi(11, [b("nhà gái", true, false)]), null);
kiem("đang ở 5 (nhánh chụp) → không kéo về 4", buocTuDauBuoi(5, [b("Chụp hình cổng", false, true)]), null);

console.log("\n— Không có cơ sở thì đừng đoán —");
kiem("hợp đồng không có buổi nào", buocTuDauBuoi(12, []), null);
kiem("bước tiệc mà chỉ có buổi nhánh chụp", buocTuDauBuoi(12, [b("Chụp hình cổng", true, true)]), null);
kiem("bước chụp mà chỉ có buổi tiệc", buocTuDauBuoi(2, [b("nhà gái", true, true)]), null);
kiem("chưa gõ bước", buocTuDauBuoi(null, haiNgay(true, true)), null);

console.log("\n— Nhánh chụp: giao váy KHÔNG kéo bước —");
kiem(
  "mọi buổi chụp đã giao váy, chưa gửi gốc → không đổi",
  buocTuDauBuoi(2, [b("Chụp hình cổng", true, false), b("Chụp Album", true, false)]),
  null,
);
kiem(
  "mọi buổi chụp đã gửi gốc → lên 4",
  buocTuDauBuoi(2, [b("Chụp hình cổng", false, true), b("Chụp Album", false, true)]),
  4,
);
kiem(
  "một trong hai buổi chụp chưa gửi → không lên 4",
  buocTuDauBuoi(2, [b("Chụp hình cổng", false, true), b("Chụp Album", false, false)]),
  null,
);

console.log("\n— Ba buổi tiệc (nhà gái, nhà trai, lễ gia tiên) —");
const ba = (x: boolean, y: boolean, z: boolean) => [
  b("nhà gái", true, x),
  b("nhà trai", true, y),
  b("Ngày lễ gia tiên", true, z),
];
kiem("hai trong ba đã gửi → chưa lên", buocTuDauBuoi(12, ba(true, true, false)), null);
kiem("cả ba đã gửi → lên 13", buocTuDauBuoi(12, ba(true, true, true)), 13);

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
