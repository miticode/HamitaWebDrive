import { getPrisma } from "@/lib/db";
import { homNayStudio } from "@/lib/constants";
import { docCacBuoc } from "@/lib/buocHopDong";
import { tenBuocTheoSo } from "@/lib/buocAnhGoc";
import { nhanhCuaBuoc, nhanhCuaBuoi } from "@/lib/nhanhBuoi";
import { ghiNhatKy } from "@/lib/nhatKy";
import type { NguoiDung } from "@/lib/phienNhanVien";

/*
  BUỔI CHỤP TỰ NHẢY TRẠNG THÁI THEO ĐẦU VIỆC — anh báo 25/11/2026:

  "khi tất cả thợ đều tích đã làm nhưng lịch chụp vẫn là chưa làm vì không có
  ai chuyển trạng thái trên buổi chụp hết".

  Đúng vậy: trạng thái buổi và trạng thái việc là hai ô rời nhau, mà người đi
  chụp chỉ đụng tới ô việc của mình. Buổi nằm lại "Chưa làm" mãi, rồi lịch
  tháng nhìn như cả tiệm chưa làm gì.

  ━━ CHỈ NÂNG, KHÔNG HẠ ━━

  Đo 25/11 trên hai buổi đang có đầu việc gắn vào:

    24/11 Chụp hình cổng  · đang "Chưa làm" · 4/4 việc Đã làm
    11/01/2027 Ngày chụp  · đang "Đang làm" · 4 việc chưa ai bắt đầu

  Dòng thứ hai là lý do không được hạ. Ai đó đã đặt "Đang làm" bằng tay —
  khách dời ngày, thợ đã đi tiền trạm, trăm thứ web không biết. Hạ nó về "Chưa
  làm" là xoá mất điều người ta biết mà máy không biết.

  Nâng thì ngược lại: bốn người đã bấm xong việc của mình rồi, buổi ấy chắc
  chắn không còn là "Chưa làm" nữa.

  ━━ KHÔNG ĐỤNG TRẠNG THÁI LẠ ━━

  Bên AppSheet buổi có thể mang chữ ngoài ba giá trị web biết ("Đã hủy", "Hoãn"
  …). Gặp chữ lạ thì để yên: chữ đó do người gõ, và nó mang nghĩa mà phép đếm
  đầu việc không nói được.
*/

/** Chữ đánh dấu một buổi đã chụp xong, dùng ở ba nơi nên để một chỗ. */
const XONG = "Hoàn thành";

/** Ba giá trị web hiểu, đúng thứ tự từ chưa tới xong. */
const BAC = ["Chưa làm", "Đang làm", "Hoàn thành"] as const;

/**
 * Trạng thái buổi SUY TỪ đầu việc, hoặc null khi không nên đụng.
 *
 * `null` trả về ở ba cảnh: buổi không có việc nào gắn vào, trạng thái đang có
 * là chữ lạ, hoặc phép suy ra thấp hơn chữ đang có (đó là phần "không hạ").
 */
export function trangThaiTuViec(
  viec: readonly { trangThai: string | null }[],
  dangCo: string | null,
): string | null {
  if (viec.length === 0) return null;

  const bacDangCo = BAC.indexOf((dangCo ?? "") as (typeof BAC)[number]);
  if (bacDangCo < 0) return null;

  const xongHet = viec.every((v) => v.trangThai === "Đã làm");
  const daDongVao = viec.some((v) => v.trangThai === "Đã làm" || v.trangThai === "Đang làm");
  const nen = xongHet ? "Hoàn thành" : daDongVao ? "Đang làm" : "Chưa làm";

  return BAC.indexOf(nen) > bacDangCo ? nen : null;
}

/**
 * Tính lại trạng thái một buổi sau khi đầu việc của nó đổi. Trả về trạng thái
 * mới nếu có ghi, null nếu để yên.
 *
 * CHỈ ĐẾM VIỆC GẮN THẲNG VÀO BUỔI. Việc hậu kỳ (Photoshop, Xưởng in…) không
 * gắn buổi nào — xem `buoiThu` trong bảng đầu việc của dịch vụ — nên buổi chụp
 * không phải chờ xưởng in xong mới được coi là chụp xong.
 */
export async function capNhatTrangThaiBuoi(
  lichChupId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const buoi = await prisma.lichChup.findUnique({
    where: { id: lichChupId },
    select: { hopDongId: true, trangThai: true, congViec: { select: { trangThai: true } } },
  });
  if (!buoi) return null;

  const moi = trangThaiTuViec(buoi.congViec, buoi.trangThai);
  if (!moi) return null;

  await prisma.lichChup.update({ where: { id: lichChupId }, data: { trangThai: moi } });
  /* Buổi vừa xong thì hợp đồng có thể sang chặng Chụp — xem hàm dưới. */
  if (moi === XONG && buoi.hopDongId) await capNhatBuocDaChup(buoi.hopDongId, nguoi);
  return moi;
}

/**
 * Số bước đích khi hợp đồng vừa chụp xong, hoặc null khi chưa tới lúc.
 *
 * Tách khỏi phần ghi database để kiểm được từng điều kiện, vì ba điều kiện ở
 * đây đều là chỗ dễ sai:
 *
 * 1. MỌI BUỔI ĐỀU "Hoàn thành". Còn một buổi dở thì chưa chụp xong.
 *
 * 2. MỌI BUỔI ĐỀU ĐÃ QUA NGÀY. Bên AppSheet nhiều buổi mang sẵn chữ "Hoàn
 *    thành" từ lúc tạo — 1.275/1.488 buổi, đo 25/11/2026 — nên riêng chữ ấy
 *    không đủ. Buổi chưa có ngày cũng không đẩy: không biết ngày thì không
 *    biết đã chụp chưa, mà đoán sai ở đây là cả bảng tiến độ sai theo.
 *    So chuỗi "YYYY-MM-DD" là so đúng thứ tự ngày, khỏi dựng Date.
 *
 * 3. CHỈ TỪ CHẶNG CHUẨN BỊ SANG CHẶNG CHỤP. Hợp đồng đã đi quá bước 3 thì nó
 *    đang ở chặng sau — kéo ngược về "Đã chụp" là xoá mất tiến độ thật. Bước
 *    lạ hay chưa gõ bước nào cũng để yên.
 */
export function buocDaChup(
  buoc: number | null,
  lich: readonly { trangThai: string | null; ngay: string | null }[],
  homNay: string,
): number | null {
  if (lich.length === 0) return null;
  if (!lich.every((l) => l.trangThai === XONG)) return null;
  if (!lich.every((l) => l.ngay && l.ngay <= homNay)) return null;
  if (buoc === 1 || buoc === 2) return 3;
  if (buoc === 10 || buoc === 11) return 12;
  return null;
}

/**
 * BƯỚC HỢP ĐỒNG TỰ SANG "ĐÃ CHỤP" khi mọi buổi đều xong — anh báo 25/11/2026:
 * buổi đã Hoàn thành mà hợp đồng vẫn nằm ở "2. Đã có ngày chụp".
 *
 * Hai nhánh của bảng mười tám bước đi song song, nên đích cũng có hai:
 *
 *     nhánh chụp ở studio   1, 2   → 3   "Đã chụp"
 *     nhánh tiệc           10, 11  → 12  "Đã xong tiệc"
 *
 * Điều kiện nằm cả trong `buocDaChup` ngay trên. Tên bước đọc từ bảng
 * `BuocHopDong` chứ không viết cứng — studio sửa chữ trên
 * web được, mà viết cứng thì web ghi một chữ không có trong ô chọn.
 */
export async function capNhatBuocDaChup(
  hopDongId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: {
      maHD: true,
      tenKhach: true,
      buoc: true,
      trangThai: true,
      lich: { select: { trangThai: true, ngay: true } },
    },
  });
  if (!hd) return null;

  const dich = buocDaChup(hd.buoc, hd.lich, homNayStudio());
  if (dich === null) return null;

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return null;

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  /*
    Ghi nhật ký vì đây là đổi tiến độ của cả một nhà khách, và nó xảy ra ở
    NGOÀI trang hợp đồng — người mở ra thấy bước đã nhảy mà không ai gõ thì
    phải tra được là ai làm, lúc nào. Cùng lẽ với `doiBuocAlbum`.
  */
  await ghiNhatKy({
    nguoi,
    hanhDong: "doi-buoc-da-chup",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });
  return ten;
}

/* ── Bước tính từ DẤU TRÊN TỪNG BUỔI — anh yêu cầu 26/11/2026 ─────────── */

/**
 * Một buổi, rút gọn còn đúng những gì phép tính bước cần.
 */
export type DauBuoi = {
  loai: string | null;
  daGiaoVay: Date | null;
  daGuiAnhGoc: Date | null;
};

/** Bước 11 — "Đã giao váy tiệc". */
const DA_GIAO_VAY = 11;
/** Bước 13 — "Đã gửi ảnh gốc tiệc, chờ Khách chọn". */
const DA_GUI_GOC_TIEC = 13;
/** Bước 4 — "Đã gửi ảnh gốc, chờ Khách chọn" (nhánh chụp). */
const DA_GUI_GOC_CHUP = 4;

/**
 * Bước đích tính từ dấu trên từng buổi — null nghĩa là ĐỪNG ĐỔI.
 *
 * Anh báo 26/11/2026: "nếu hợp đồng có dịch vụ ngày cưới bao gồm 2 ngày cưới
 * thì giả sử thợ đã gửi ảnh gốc tiệc nhà gái rồi thì ấn đã gửi hợp đồng
 * chuyển sang trạng thái số 13 nhưng file gốc nhà trai chưa chụp hoặc đã chụp
 * rồi nhưng chưa gửi file gốc thì sao".
 *
 * Đúng vậy, và đang sai thật. Đo 26/11: hợp đồng "PHƯỚC VINH - QUỲNH HƯƠNG"
 * đứng ở bước 13 trong khi buổi nhà trai 29/11 chưa tới ngày; 18 hợp đồng
 * khác cùng cảnh ấy.
 *
 * Nên bước KHÔNG còn đổi theo một cú bấm, mà TÍNH RA từ dấu của từng buổi:
 * chỉ lên khi MỌI buổi cùng nhánh đã đánh dấu. Một nhà hai ngày tiệc thì nhà
 * gái gửi xong vẫn chưa đủ.
 *
 * XÉT RIÊNG TỪNG NHÁNH (xem `nhanhBuoi.ts`): gộp cả buổi tiệc chưa tới ngày
 * vào phép tính của nhánh chụp thì hợp đồng không bao giờ lên nổi bước 4, kẹt
 * ở khâu ảnh cổng cho tới sau đám cưới.
 *
 * CHỈ NÂNG, KHÔNG HẠ — cùng một lẽ với `trangThaiTuViec`: ai đó gỡ nhầm một
 * dấu tick không được phép kéo cả hợp đồng lùi mấy bước.
 *
 * Không có buổi nào thuộc nhánh ấy thì trả null: không có cơ sở để kết luận
 * gì, mà đoán ở đây là đổi tiến độ của cả một nhà khách.
 */
export function buocTuDauBuoi(buoc: number | null | undefined, buoi: readonly DauBuoi[]): number | null {
  const nhanh = nhanhCuaBuoc(buoc);
  if (nhanh === null || typeof buoc !== "number") return null;

  const cungNhanh = buoi.filter((b) => nhanhCuaBuoi(b.loai) === nhanh);
  if (cungNhanh.length === 0) return null;

  const moiBuoiDaGui = cungNhanh.every((b) => b.daGuiAnhGoc !== null);

  if (nhanh === "tiec") {
    /* Gửi ảnh gốc xét trước: nó ở xa hơn trên cùng một đường. */
    if (moiBuoiDaGui && buoc < DA_GUI_GOC_TIEC) return DA_GUI_GOC_TIEC;
    /*
      Giao váy CHỈ kéo bước ở nhánh tiệc, vì chỉ nhánh ấy có bước mang nghĩa
      đó. Nhánh chụp vẫn tick được "đã giao váy" — studio có giao váy cho buổi
      chụp ảnh cổng — nhưng dấu ấy chỉ để tra lại, không đụng tới bước.
    */
    if (cungNhanh.every((b) => b.daGiaoVay !== null) && buoc < DA_GIAO_VAY) return DA_GIAO_VAY;
    return null;
  }

  if (moiBuoiDaGui && buoc < DA_GUI_GOC_CHUP) return DA_GUI_GOC_CHUP;
  return null;
}

/**
 * Đọc hợp đồng, tính lại bước từ dấu của từng buổi, ghi nếu đổi.
 *
 * Trả về tên bước mới, hoặc null khi không đổi gì. Cùng khuôn với
 * `capNhatBuocDaChup` ngay trên.
 */
export async function capNhatBuocTuDauBuoi(
  hopDongId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: {
      maHD: true,
      tenKhach: true,
      buoc: true,
      trangThai: true,
      lich: { select: { loai: true, daGiaoVay: true, daGuiAnhGoc: true } },
    },
  });
  if (!hd) return null;

  const dich = buocTuDauBuoi(hd.buoc, hd.lich);
  if (dich === null) return null;

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return null;

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  await ghiNhatKy({
    nguoi,
    hanhDong: dich === DA_GIAO_VAY ? "doi-buoc-giao-vay" : "doi-buoc-anh-goc",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });
  return ten;
}

/* ── Bước 1 ↔ 2: có ngày chụp hay chưa (anh yêu cầu 27/11/2026) ──────── */

/** Bước 1 — "Chưa có ngày chụp". */
const CHUA_CO_NGAY = 1;
/** Bước 2 — "Đã có ngày chụp". */
const DA_CO_NGAY = 2;

/**
 * Bước đích theo việc lịch ĐÃ CÓ NGÀY hay chưa — null nghĩa là đừng đổi.
 *
 * Anh yêu cầu 27/11/2026 sau bản rà soát: trong mười bốn mối nối của hệ mười
 * tám bước, 1 → 2 là mối DUY NHẤT không có đường nào đẩy. Đo cùng ngày và nó
 * sai cả hai chiều:
 *
 *     4 hợp đồng ghi "Chưa có ngày chụp" mà lịch ĐÃ CÓ ngày
 *     5 hợp đồng ghi "Đã có ngày chụp"  mà KHÔNG buổi nào có ngày
 *
 * ĐÂY LÀ MỐI NỐI HAI CHIỀU DUY NHẤT, và cố ý khác mọi phép đổi bước khác
 * (`trangThaiTuViec`, `buocTuDauBuoi`, `buocDaChup` đều chỉ nâng).
 *
 * Lý do: mười sáu bước kia nói về VIỆC ĐÃ LÀM — đã chụp, đã gửi, đã in —
 * những thứ xảy ra rồi thì không thể chưa xảy ra, nên kéo lùi là nói dối.
 * Còn 1 và 2 chỉ nói MỘT SỰ THẬT KIỂM CHỨNG ĐƯỢC NGAY: lịch có ngày hay
 * không. Khách hoãn cưới, người sửa xoá ngày đi, thì "Đã có ngày chụp" thành
 * sai ngay lúc đó — giữ nguyên mới là nói dối.
 *
 * CHỈ CHẠM ĐÚNG HAI BƯỚC ẤY. Hợp đồng ở bước 5 mà khách dời ngày thì không
 * được kéo về 1: ảnh đã chụp, đã gửi, đã chỉnh — mất ngày không xoá được
 * những việc đó.
 *
 * Buổi "đã có ngày" tính cả ngày Ở TƯƠNG LAI: bước 2 là "đã có ngày chụp",
 * không phải "đã tới ngày chụp".
 */
export function buocTheoNgayChup(
  buoc: number | null | undefined,
  lich: readonly { ngay: string | null }[],
): number | null {
  if (buoc !== CHUA_CO_NGAY && buoc !== DA_CO_NGAY) return null;
  const coNgay = lich.some((l) => !!l.ngay);
  if (buoc === CHUA_CO_NGAY && coNgay) return DA_CO_NGAY;
  if (buoc === DA_CO_NGAY && !coNgay) return CHUA_CO_NGAY;
  return null;
}

/**
 * Đọc hợp đồng, chỉnh bước 1 ↔ 2 cho khớp lịch, ghi nếu đổi.
 *
 * Gọi TRƯỚC `capNhatBuocDaChup` và `capNhatBuocTuDauBuoi`: nó ở nấc thấp nhất,
 * nên 1 → 2 xong thì hai hàm kia còn đẩy tiếp được lên 3 hoặc 4 trong cùng
 * một lượt lưu. Chạy ngược thứ tự thì phải lưu hai lần mới tới đích.
 */
export async function capNhatBuocTheoNgay(
  hopDongId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: { maHD: true, tenKhach: true, buoc: true, trangThai: true, lich: { select: { ngay: true } } },
  });
  if (!hd) return null;

  const dich = buocTheoNgayChup(hd.buoc, hd.lich);
  if (dich === null) return null;

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return null;

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  await ghiNhatKy({
    nguoi,
    hanhDong: "doi-buoc-ngay-chup",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });
  return ten;
}

/* ── Chuyển từ nhánh CHỤP sang nhánh TIỆC (anh yêu cầu 27/11/2026) ────── */

/** Bước 9 — "Hoàn thành" của nhánh chụp. */
const XONG_NHANH_CHUP = 9;
/** Bước 10 — "Chờ ngày tiệc", cửa vào nhánh tiệc. */
const CHO_NGAY_TIEC = 10;

/**
 * Bước đích khi hợp đồng cần CHUYỂN SANG NHÁNH TIỆC — null nghĩa là đừng đổi.
 *
 * Anh dặn 27/11/2026 test bốn nhóm hợp đồng thật, và hai nhóm lòi ra cùng một
 * lỗ hổng: KHÔNG CÓ MỐI NỐI NÀO đi từ nhánh chụp (1–9) sang nhánh tiệc (10–18).
 *
 * Hai cảnh gặp phải, đo cùng ngày:
 *
 *   · Hợp đồng CHỈ CÓ BUỔI TIỆC mà người lập chọn nhầm bước nhánh chụp — 2
 *     hợp đồng ("Văn Thương & Thúy Vy", "Kim ngân - Tuấn thuận"). Chúng đứng
 *     ở bước 2 và không gì đẩy nổi: `buocDaChup` đòi buổi đã qua ngày (tiệc
 *     còn ở tháng 1/2027), `buocTuDauBuoi` thì tìm buổi CÙNG NHÁNH với bước —
 *     mà bước ở nhánh chụp còn buổi thì toàn nhánh tiệc, nên không thấy gì.
 *
 *   · Hợp đồng có CẢ chụp trước lẫn tiệc, xong nhánh chụp rồi đứng ở bước 9
 *     "Hoàn thành" trong khi tiệc chưa diễn ra. Chưa hợp đồng nào chạm tới,
 *     nhưng 28 hợp đồng đang chạy có cả hai nhánh và 7 cái đã ở bước 7–8, tức
 *     sắp tới.
 *
 * ĐÂY KHÔNG PHẢI LÙI BƯỚC dù nhìn qua giống: 10 lớn hơn 9, và bước 9 "Hoàn
 * thành" với một nhà còn nguyên hai ngày tiệc phía trước là NÓI SAI chứ không
 * phải một thành tựu bị xoá. Chuyển nhánh là đi tiếp, không phải đi lùi.
 *
 * Hai điều kiện, phải đủ cả hai:
 *   1. hợp đồng CÓ buổi thuộc nhánh tiệc — không thì chẳng có gì ở nhánh ấy;
 *   2. nhánh chụp KHÔNG CÒN VIỆC — hoặc vì không có buổi chụp nào, hoặc vì đã
 *      đi hết tới bước 9.
 *
 * Mốc 9 chứ không phải 8: bước 8 là "đã nhận hình in", hình còn ở tiệm chưa
 * giao khách — kéo sang nhánh tiệc lúc đó là bỏ quên một việc đang dở.
 */
export function buocChuyenNhanh(
  buoc: number | null | undefined,
  lich: readonly { loai: string | null }[],
): number | null {
  if (typeof buoc !== "number" || buoc > XONG_NHANH_CHUP) return null;

  const coTiec = lich.some((l) => nhanhCuaBuoi(l.loai) === "tiec");
  if (!coTiec) return null;

  const coChup = lich.some((l) => nhanhCuaBuoi(l.loai) === "chup");
  /* Không buổi chụp nào: nhánh chụp vô nghĩa với nhà này, sang thẳng. */
  if (!coChup) return CHO_NGAY_TIEC;
  /* Có buổi chụp và đã đi hết nhánh ấy. */
  if (buoc === XONG_NHANH_CHUP) return CHO_NGAY_TIEC;
  return null;
}

/**
 * Đọc hợp đồng, chuyển sang nhánh tiệc nếu cần, ghi nếu đổi.
 *
 * Gọi TRƯỚC `capNhatBuocTheoNgay`: nhà chỉ có buổi tiệc mà đứng ở bước 1 thì
 * phải sang 10 chứ không phải sang 2 — để phép kia chạy trước là đẩy nó sâu
 * thêm một nấc vào nhánh sai.
 */
export async function capNhatChuyenNhanh(
  hopDongId: string,
  nguoi: Pick<NguoiDung, "id" | "ten"> | null = null,
): Promise<string | null> {
  const prisma = getPrisma();
  const hd = await prisma.hopDong.findUnique({
    where: { id: hopDongId },
    select: { maHD: true, tenKhach: true, buoc: true, trangThai: true, lich: { select: { loai: true } } },
  });
  if (!hd) return null;

  const dich = buocChuyenNhanh(hd.buoc, hd.lich);
  if (dich === null) return null;

  const ten = tenBuocTheoSo(await docCacBuoc(), dich);
  if (!ten) return null;

  const cu = hd.trangThai ?? "chưa gõ bước";
  await prisma.hopDong.update({ where: { id: hopDongId }, data: { trangThai: ten, buoc: dich } });

  await ghiNhatKy({
    nguoi,
    hanhDong: "doi-buoc-sang-tiec",
    doiTuong: "HopDong",
    doiTuongId: hopDongId,
    chiTiet: {
      ten: `${hd.tenKhach} (${hd.maHD})`,
      doi: { "trạng thái": { truoc: cu, sau: ten } },
    },
  });
  return ten;
}

/* ── Nhắc khi hợp đồng đã xong mà lịch còn buổi (anh yêu cầu 27/11/2026) ─ */

/**
 * Hợp đồng đã đi hết nhánh mà lịch CÒN BUỔI CHƯA CHỤP XONG — trả về những
 * buổi ấy, rỗng nghĩa là không có gì phải nhắc.
 *
 * Anh yêu cầu sau bản rà soát: khách quay lại book thêm thì có người thêm
 * thẳng buổi mới vào hợp đồng cũ. Nếu hợp đồng ấy đã ở bước 9 hoặc 18, bước
 * đứng nguyên — đúng theo phép chỉ-nâng, nhưng buổi mới KHÔNG CÓ BƯỚC NÀO
 * THEO DÕI: nhà đang chụp mà hợp đồng nói "hoàn thành".
 *
 * Khác hẳn ca bước 9 có buổi tiệc mới: cái đó `buocChuyenNhanh` lo được, vì
 * còn nguyên nhánh tiệc phía trước để đi. Bước 18 thì hết đường, và bước 9
 * với một buổi CHỤP mới thêm cũng vậy — nhánh chụp đã đi hết rồi.
 *
 * WEB KHÔNG TỰ XỬ, CHỈ NÓI RA. Hai cách giải quyết đều hợp lệ tuỳ nhà — lập
 * hợp đồng riêng cho lần book sau (tiền tính riêng, đúng nghiệp vụ), hoặc gỡ
 * buổi thừa nếu nhập nhầm. Web đoán hộ là chọn thay người đang ngồi với khách.
 *
 * Chỉ tính buổi CHƯA chụp xong: buổi cũ đã "Hoàn thành" thì nằm lại trên lịch
 * là chuyện bình thường, đó là lịch sử của nhà ấy.
 */
export function buoiConSauKhiXong(
  buoc: number | null | undefined,
  lich: readonly { loai: string | null; ngay: string | null; trangThai: string | null }[],
): { loai: string | null; ngay: string | null }[] {
  if (buoc !== XONG_NHANH_CHUP && buoc !== 18) return [];
  /*
    Bước 9 mà buổi còn lại thuộc nhánh TIỆC thì KHÔNG nhắc: `buocChuyenNhanh`
    sẽ đưa hợp đồng sang bước 10 ngay lượt lưu tới, nên nhắc ở đây là báo động
    một thứ web đang tự lo.
  */
  const nhanh = buoc === XONG_NHANH_CHUP ? "chup" : "tiec";
  return lich
    .filter((l) => nhanhCuaBuoi(l.loai) === nhanh && l.trangThai !== XONG)
    .map((l) => ({ loai: l.loai, ngay: l.ngay }));
}
