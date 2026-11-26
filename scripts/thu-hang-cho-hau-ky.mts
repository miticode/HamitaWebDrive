/**
 * Kiểm phép đếm ngày chờ của màn "Hàng chờ hậu kỳ" — anh yêu cầu 26/11/2026.
 *
 *   npx tsx scripts/thu-hang-cho-hau-ky.mts
 *
 * Chỗ dễ sai nhất không phải phép trừ, mà là CHỌN MỐC: hợp đồng cưới thường
 * còn một buổi tiệc ở tương lai, lấy nhầm buổi ấy thì ra số ngày âm và màn
 * hình nói nhà đang chờ bốn tám ngày là "chưa tới lượt".
 *
 * Không chạm database — chỉ gọi hàm thuần, nên chạy được cả khi Neon ngủ.
 */
import { BUOC_HAU_KY, CHO_LAU, mocDaQua, soNgayCho, tenBuocHauKy } from "../src/lib/hangChoHauKy";

let truot = 0;
const kiem = (ten: string, duoc: unknown, mong: unknown) => {
  const ok = JSON.stringify(duoc) === JSON.stringify(mong);
  if (!ok) truot++;
  console.log(`${ok ? "  ok " : "TRUOT"} ${ten} → ${JSON.stringify(duoc)} (mong ${JSON.stringify(mong)})`);
};

const NAY = "2026-11-26";

console.log("— Chọn mốc: buổi cuối cùng ĐÃ QUA —");
kiem("một buổi đã qua", mocDaQua(["2026-10-09"], NAY), "2026-10-09");
kiem("hai buổi đã qua, lấy cái SAU", mocDaQua(["2026-10-09", "2026-11-12"], NAY), "2026-11-12");
kiem(
  "có buổi tiệc ở TƯƠNG LAI, bỏ qua nó",
  mocDaQua(["2026-11-12", "2026-12-31"], NAY),
  "2026-11-12",
);
kiem("thứ tự đảo lộn vẫn ra đúng", mocDaQua(["2026-12-31", "2026-10-09", "2026-11-12"], NAY), "2026-11-12");
kiem("buổi đúng HÔM NAY vẫn tính là đã qua", mocDaQua(["2026-11-26"], NAY), "2026-11-26");
kiem("mọi buổi đều ở tương lai", mocDaQua(["2026-12-01", "2027-01-15"], NAY), null);
kiem("không có buổi nào", mocDaQua([], NAY), null);
kiem("lịch có ngày để trống", mocDaQua([null, "2026-10-09", null], NAY), "2026-10-09");
kiem("toàn ngày trống", mocDaQua([null, null], NAY), null);

console.log("\n— Đếm ngày chờ, theo giờ studio —");
kiem("chụp hôm nay", soNgayCho(NAY, NAY), 0);
kiem("chụp hôm qua", soNgayCho("2026-11-25", NAY), 1);
kiem("chụp 09/10 (ca thật trên web)", soNgayCho("2026-10-09", NAY), 48);
kiem("chụp 17/10 (ca thật trên web)", soNgayCho("2026-10-17", NAY), 40);
kiem("chụp 23/11 (ca thật trên web)", soNgayCho("2026-11-23", NAY), 3);

/*
  Qua mốc đổi giờ mùa hè của múi giờ máy chạy script: nếu phép trừ dùng giờ
  máy thay vì +07:00 thì một trong mấy khoảng dưới đây lệch đúng một ngày.
*/
console.log("\n— Không lệch khi bắc qua ranh giới tháng và năm —");
kiem("31/12 → 01/01", soNgayCho("2025-12-31", "2026-01-01"), 1);
kiem("28/02 → 01/03 (năm thường)", soNgayCho("2026-02-28", "2026-03-01"), 1);
kiem("cả một năm", soNgayCho("2025-11-26", "2026-11-26"), 365);
kiem("qua tháng ba (mùa đổi giờ ở Âu Mỹ)", soNgayCho("2026-03-07", "2026-03-10"), 3);
kiem("qua tháng mười một", soNgayCho("2026-10-30", "2026-11-03"), 4);

console.log("\n— Ngưỡng tô vàng —");
kiem(`CHO_LAU = ${CHO_LAU}`, CHO_LAU, 14);
kiem("chờ 13 ngày chưa tô", soNgayCho("2026-11-13", NAY) >= CHO_LAU, false);
kiem("chờ 14 ngày thì tô", soNgayCho("2026-11-12", NAY) >= CHO_LAU, true);

console.log("\n— Hai bước của hàng chờ —");
kiem("đúng hai bước", [...BUOC_HAU_KY], [5, 14]);
kiem("tên bước 5", tenBuocHauKy(5), "Đang Retouch");
kiem("tên bước 14", tenBuocHauKy(14), "Chỉnh sửa tiệc");

console.log(truot === 0 ? "\nTẤT CẢ ĐỀU ĐÚNG" : `\nCÓ ${truot} PHÉP TRƯỢT`);
process.exit(truot === 0 ? 0 : 1);
