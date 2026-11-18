/*
  GÓI NHIỀU NGÀY → MẤY BUỔI, BUỔI NÀO — anh yêu cầu 15/11/2026.

  "Gói tiệc cưới 2 ngày BASIC2" là hai buổi chụp: một bên nhà gái, một bên nhà
  trai. Trước đây web không biết chuyện đó, nên người lập phải tự bấm "Thêm
  dòng lịch" hai lần rồi tự chọn loại — mà quên thì hợp đồng chỉ có một buổi,
  và album trên Drive cũng chỉ ra một cái.

  ━━ Vì sao đọc TÊN gói, không đọc mã ━━

  Đo 15/11/2026 trên 1.020 dịch vụ đang dùng:

    · 12 dịch vụ ghi số ngày trong TÊN ("… 2 ngày LUXURY", "Gói ảnh cổng và
      thuê đồ 2 ngày cưới", "CHỤP PHÓNG SỰ SLIVER NGÀY CƯỚI/HỎI 1 NGÀY")
    · chỉ 6 dịch vụ mang "DAY" trong MÃ (GTC2DAY …)

  Đọc mã thì bỏ sót `Hamita2` — "Gói ảnh cổng và thuê đồ 2 ngày cưới" — vốn
  cũng là hai buổi. Tên bao được cả hai, và tên là thứ người bán gõ theo thói
  quen chứ mã thì mỗi thời một kiểu.

  Chỉ đọc TÊN, KHÔNG đọc phần chi tiết: chi tiết gói có những câu như "khách
  giữ váy 3 ngày", "đổi lại trước ngày dùng 1 tuần" — đọc vào là ra gói ba
  buổi, sai hoàn toàn.
*/

/** Nhiều hơn chừng này buổi thì gần như chắc là đọc nhầm, không phải gói thật. */
const TOI_DA_BUOI = 5;

/**
 * Tên gói nói là mấy buổi chụp. Không nói gì thì 1.
 *
 * Khớp "2 ngày", "2ngày", "1 NGÀY" — người bán gõ cả ba kiểu.
 */
export function soBuoiCuaGoi(ten: string | null | undefined): number {
  const m = (ten ?? "").match(/(\d+)\s*ng[àa]y/i);
  if (!m) return 1;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 && n <= TOI_DA_BUOI ? n : 1;
}

/**
 * Loại buổi gợi ý cho từng dòng lịch của gói.
 *
 * Gói hai ngày cưới của tiệm luôn là một buổi nhà gái, một buổi nhà trai —
 * cả 6 gói GTC2DAY đều ghi rõ "Nhà gái : chụp phóng sự" và "Nhà trai : …"
 * trong phần chi tiết (đo 15/11/2026). Dò ĐÚNG hai chữ đó trong chi tiết chứ
 * không suy từ số buổi: gói hai ngày của mảng khác có thể là hai ngày khác
 * hẳn, đoán bừa thì người lập phải sửa lại từng dòng, mệt hơn là để trống.
 *
 * Trả về mảng dài đúng `soBuoi`; chỗ nào không đoán được thì trả chuỗi rỗng,
 * người gọi tự lấy mặc định của mình.
 */
export function loaiBuoiGoiY(chiTiet: string | null | undefined, soBuoi: number): string[] {
  const ct = (chiTiet ?? "").toLowerCase();
  const gai = /nh[àa]\s*g[áa]i/.test(ct);
  const trai = /nh[àa]\s*trai/.test(ct);
  if (soBuoi >= 2 && gai && trai) {
    /* Nhà gái trước: đám cưới miền Tây rước dâu từ nhà gái, nên buổi đó đứng trước. */
    return ["nhà gái", "nhà trai", ...Array(Math.max(0, soBuoi - 2)).fill("")];
  }
  return Array(soBuoi).fill("");
}

/**
 * Loại buổi → mã album của tiệm.
 *
 * Lấy đúng nghĩa đã ghi trong `maAlbum.ts`: HIS là nhà trai, HER là nhà gái.
 * Bảng này là chỗ DUY NHẤT nối hai thứ đó, nên đổi nghĩa một mã thì sửa ở
 * `maAlbum.ts` rồi sửa đây, không rải ra nơi khác (nguyên tắc 37).
 *
 * Loại nào không có trong bảng thì album không mang mã — cố ý. "Ngày chụp"
 * có thể là hình cổng, là album, là gì cũng được; đoán bừa một mã thì bộ lọc
 * theo mã ở trang quản lý album bắt trượt.
 */
export const MA_ALBUM_THEO_BUOI: Readonly<Record<string, string>> = {
  "nhà gái": "HER",
  "nhà trai": "HIS",
  /*
    Bốn dòng dưới thêm 18/11/2026, sau khi anh hỏi về mấy gói "NGÀY CƯỚI/HỎI
    1 NGÀY" — cùng một gói dùng cho cả cưới lẫn hỏi, nên không gắn mã cố định
    lên dịch vụ được.

    Đo 325 dòng dùng bốn gói đó: lịch chụp của chúng ghi nhà gái 152, nhà
    trai 126, Đính Hôn 30, dạm ngõ 1 — tức người lập VỐN ĐÃ ghi đúng việc vào
    lịch, chỉ là web chưa biết đọc. Khai thêm hai loại này đưa tỉ lệ suy ra
    được từ 185/325 (57%) lên 215/325 (66%).

    Và 139 hợp đồng loại HỎI thì lịch ghi "Đính Hôn" 68 lần, "chup dạm ngõ"
    9 lần — đúng hai loại này.
  */
  "đính hôn": "ĐH",
  "chup dạm ngõ": "DN",
  "chụp dạm ngõ": "DN",
  /* Hai mảng kia: loại buổi đã nói thẳng là mảng nào. */
  "nhà su": "NS",
  "hami baby": "Baby",
  "chụp bé": "Baby",
  "chụp thôi nôi": "Baby",
  "chụp đầy tháng": "Baby",
};

/*
  BA LOẠI BUỔI CỐ Ý KHÔNG CÓ MÃ, anh chốt 18/11/2026:

    "Ngày chụp"         461 buổi — chung chung, có thể là bất cứ việc gì
    "Ngày cưới"          25 buổi — chụp cả hai nhà hay một nhà thì không rõ
    "Ngày lễ gia tiên"   13 buổi — không có mã nào tương ứng trong bộ

  Đoán bừa cho chúng thì bộ lọc theo mã ở trang quản lý album bắt trượt, mà
  nhìn tên album vẫn thấy đúng — loại lỗi khó phát hiện nhất. Những hợp đồng
  rơi vào đây thì người lập tự chọn mã ngay trong form lập hợp đồng.
*/

/** Mã album ứng với một loại buổi, hoặc null nếu loại đó không suy ra mã nào. */
export function maAlbumTheoBuoi(loai: string | null | undefined): string | null {
  if (!loai) return null;
  return MA_ALBUM_THEO_BUOI[loai.trim().toLowerCase()] ?? null;
}
