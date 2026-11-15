/**
 * Bộ mã studio đặt ở đầu tên album.
 *
 * MỘT nguồn duy nhất cho hai chỗ, và phải là một nguồn thì hai chỗ mới không
 * lệch nhau:
 *
 * - Ô "Tên khách" lúc tạo link gợi ý sẵn cả bộ, bấm một cái là chèn vào đầu
 *   tên. Nhân viên khỏi phải nhớ studio đang dùng mã nào, và quan trọng hơn là
 *   khỏi gõ mỗi người một kiểu ("ĐH -", "DH-", "đh ").
 * - Trang quản lý dựng nút lọc từ chính bộ này.
 *
 * Gõ tay mỗi nơi một bảng thì thêm mã mới sẽ nhớ sửa chỗ này quên chỗ kia —
 * lúc đó nhân viên đặt tên bằng mã mà lọc lại không ra.
 *
 * `nghia` để null khi KHÔNG BIẾT CHẮC mã đó viết tắt của gì. Ghi bừa một chú
 * thích sai còn hại hơn để trống: nhân viên đọc rồi đặt tên theo cái nghĩa bịa
 * đó. `TET` đang ở tình trạng này — mã có sẵn từ trước, chưa ai nói
 * rõ nghĩa. (`DN` = dạm ngõ, anh nói rõ ngày 17/09/2026.)
 */
export type MaAlbum = {
  ma: string;
  /** Viết tắt của gì, hiện trong phần gợi ý. null = chưa rõ, đừng đoán. */
  nghia: string | null;
};

export const MA_ALBUM: readonly MaAlbum[] = [
  { ma: "HC", nghia: "hình cổng" },
  { ma: "AB", nghia: "album" },
  { ma: "ĐH", nghia: "đính hôn" },
  { ma: "HIS", nghia: "nhà trai" },
  { ma: "HER", nghia: "nhà gái" },
  { ma: "Baby", nghia: "chụp bé" },
  /* Anh thêm 25/09/2026, cùng nhóm Hami Baby Studio với `Baby` và `GD`. */
  { ma: "NP", nghia: "sơ sinh" },
  { ma: "Bầu", nghia: "chụp bầu" },
  { ma: "GD", nghia: "gia đình" },
  { ma: "NS", nghia: "nhà Su" },
  { ma: "DN", nghia: "dạm ngõ" },
  { ma: "TET", nghia: null },
] as const;

/**
 * Dấu nối giữa mã và tên khách.
 *
 * Lấy theo cách studio đang đặt trên những album mới nhất — "ĐH - Trúc Mai &
 * Minh Tiến", "HC - Minh Thư & Khắc Huy". Trong kho vẫn còn vài kiểu cũ
 * ("AB- Thuý An", "His-Kim Chi") vì trước đây gõ tay mỗi lần một khác; nút gợi
 * ý sinh ra chính là để từ nay chỉ còn một kiểu.
 */
export const NOI_MA = " - ";

/**
 * Gắn mã vào đầu tên khách, trả về tên mới.
 *
 * Ba trường hợp, đều là thao tác nhân viên sẽ làm thật:
 * - Chưa có mã nào → thêm vào đầu.
 * - Đang mang đúng mã đó → gỡ ra. Bấm nhầm thì bấm lại là xong, không phải xoá
 *   tay từng ký tự.
 * - Đang mang mã khác → thay bằng mã mới, giữ nguyên phần tên. Đây mới là
 *   trường hợp hay gặp: gõ tên xong mới nhớ ra chọn nhầm mã.
 */
export function ganMa(ten: string, ma: string): string {
  const con = boMa(ten);
  if (laMa(ten, ma)) return con;
  /*
    Ô còn trống thì vẫn kèm sẵn dấu nối — "ĐH - " chứ không phải "ĐH".

    Đây là thứ tự nhân viên hay làm nhất: bấm mã trước, gõ tên sau. Trả về
    "ĐH" trơn thì họ gõ tiếp ra "ĐHTrúc Mai & Minh Tiến", dính liền. Đã thử
    trên trình duyệt và ra đúng chuỗi đó. Dấu nối thừa lúc chưa gõ gì không
    hại: `createGalleryAction` dọn đuôi trước khi ghi database.
  */
  return con ? `${ma}${NOI_MA}${con}` : `${ma}${NOI_MA}`;
}

/** Tên này có đang mang đúng mã đó ở đầu không. */
export function laMa(ten: string, ma: string): boolean {
  return maDangCo(ten)?.toLowerCase() === ma.toLowerCase();
}

/**
 * Mã đang đứng ở đầu tên, nếu có.
 *
 * So với bộ mã đã biết chứ không nhận bừa cụm chữ đầu tiên: tên "Khmer- Y Bình"
 * có dạng giống hệt một mã cộng dấu nối, mà "Khmer" không phải mã — nhận bừa
 * thì bấm nút gợi ý sẽ nuốt mất một phần tên khách.
 */
function maDangCo(ten: string): string | null {
  const dau = ten.trimStart();
  for (const { ma } of MA_ALBUM) {
    if (!dau.toLowerCase().startsWith(ma.toLowerCase())) continue;
    // Phải có dấu ngăn ngay sau, không thì "AB" khớp cả tên "Abigail".
    const sau = dau.slice(ma.length);
    if (sau === "" || /^[\s\-–—]/.test(sau)) return ma;
  }
  return null;
}

/** Phần tên còn lại sau khi bỏ mã ở đầu (nếu có). */
function boMa(ten: string): string {
  const ma = maDangCo(ten);
  if (!ma) return ten.trim();
  return ten
    .trimStart()
    .slice(ma.length)
    .replace(/^[\s\-–—]+/, "")
    .trim();
}

/**
 * Tên album bỏ HẾT các mã ở đầu — "HIS - HER - Công Hiếu & Ngọc Hằng" thành
 * "Công Hiếu & Ngọc Hằng". Dùng cho chữ khách đọc (trang Ảnh cưới): mã là
 * ký hiệu nội bộ, khách không hiểu.
 */
export function tenKhongMa(ten: string): string {
  let con = ten.trim();
  while (maDangCo(con)) {
    const tiep = boMa(con);
    if (tiep === con) break;
    con = tiep;
  }
  return con || ten.trim();
}

/**
 * Tên này CHỈ gồm mã, chưa có tên khách nào — "HC - ", "HIS - HER -".
 *
 * Đây là trạng thái ô "Tên khách" ngay sau khi nhân viên bấm một hai nút mã mà
 * chưa gõ gì thêm.
 */
export function chiCoMa(ten: string): boolean {
  const goc = ten.trim();
  if (!goc) return false;

  let con = goc;
  let thayMa = false;
  while (maDangCo(con)) {
    thayMa = true;
    const tiep = boMa(con);
    if (tiep === con) break;
    con = tiep;
  }
  return thayMa && con === "";
}

/**
 * Ghép mấy mã đã bấm với tên thư mục trên Drive — "HC" + "Ngọc Thơ & Minh Anh"
 * thành "HC - Ngọc Thơ & Minh Anh".
 *
 * Anh yêu cầu 23/09/2026: bấm mã xong mà không gõ tên rồi bấm Tạo link thì
 * album ra tên trống trơn (chỉ còn mỗi mã). Nay web tự lấy tên thư mục điền
 * vào chỗ còn thiếu.
 *
 * Tên thư mục MANG SẴN MÃ thì bỏ mã của nó đi rồi mới ghép, không thì ra
 * "HC - HC Ngọc Thơ" — mã lặp hai lần. Mã giữ là mã nhân viên vừa bấm, vì đó
 * là thứ họ vừa chọn có chủ ý.
 */
export function ghepMaVoiTenThuMuc(maDaBam: string, tenThuMuc: string): string {
  const ma = maDaBam.replace(/[\s\-–—]+$/, "").trim();
  const ten = tenKhongMa(tenThuMuc).trim() || tenThuMuc.trim();
  if (!ma) return ten;
  if (!ten) return ma;
  return `${ma}${NOI_MA}${ten}`;
}

/**
 * Gắn NHIỀU mã vào đầu tên — "HIS - HER - Minh Trí & Tấn Đạt".
 *
 * Thêm 15/11/2026 khi anh chốt: gói cưới hai ngày ra MỘT album mang hai mã,
 * không phải hai album. Ảnh của một nhà nằm một chỗ; hai mã chỉ nói album đó
 * có cả phần nhà trai lẫn nhà gái.
 *
 * Không phải nếp mới: tiệm vốn đã đặt kiểu này — "HIS - HER - Nhã hân & Tân
 * Lộc", tạo ngày 11/11/2026.
 *
 * Bộ lọc mã ở trang quản lý album tách tên thành TỪ RỜI rồi khớp theo đầu từ
 * (xem `cac_tu` trong AlbumList.tsx), nên album hai mã tự hiện ở cả hai nút
 * lọc — không phải sửa gì bên đó.
 *
 * Thứ tự theo `MA_ALBUM` chứ không theo thứ tự người gọi truyền vào: hai hợp
 * đồng giống nhau phải ra cùng một tên, dù lịch bên nào điền trước.
 */
export function ganNhieuMa(ten: string, ma: readonly string[]): string {
  /* `tenKhongMa` chứ không `boMa`: tên có sẵn hai mã thì phải bóc hết cả hai,
     không thì gắn lại ra "HIS - HER - HER - Minh Trí". */
  const con = tenKhongMa(ten);
  const thuTu = MA_ALBUM.filter((m) => ma.some((x) => x.toLowerCase() === m.ma.toLowerCase())).map((m) => m.ma);
  if (thuTu.length === 0) return con;
  const dau = thuTu.join(NOI_MA);
  return con ? `${dau}${NOI_MA}${con}` : `${dau}${NOI_MA}`;
}
