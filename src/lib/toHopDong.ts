import { getPrisma } from "@/lib/db";
import { HAMI_BABY, STUDIO } from "@/lib/studio";
import { tenNV, tenTheoMaNV } from "@/lib/hopDongMayChu";

/*
  TỜ HỢP ĐỒNG IN RA GIẤY — anh yêu cầu 15/11/2026.

  Bên AppSheet mỗi lần lập xong sinh một file PDF như tờ này để khách ký. Web
  phải làm được đúng việc đó, nếu không thì vẫn phải mở AppSheet, mà đợt 7 là
  bỏ hẳn AppSheet (nguyên tắc 52).

  CÁCH DỰNG: trang HTML khổ A4 + hộp in của trình duyệt (Ctrl+P), KHÔNG dựng
  PDF ở máy chủ. Lý do đo được, không phải sở thích:

    · Vercel chạy serverless. Gói Chromium để dựng PDF nặng hơn 50MB, vượt giới
      hạn gói hàm của Vercel ở nhiều cấu hình và khởi động lạnh mất vài giây —
      mỗi lần in một tờ giấy mà phải bật cả một trình duyệt trên máy chủ.
    · Thư viện PDF thuần JS (pdfkit, jsPDF) không có sẵn chữ tiếng Việt: phải
      nhúng font vài trăm KB, rồi tự tính vị trí từng ô của bảng. Sai một ly là
      chữ đè lên nhau mà không ai thấy cho tới lúc khách cầm tờ giấy.
    · Trình duyệt in sẵn ra PDF ("Lưu dưới dạng PDF") và in thẳng ra máy in.
      Sửa mẫu = sửa HTML/CSS, không đụng thư viện nào.

  Đánh đổi, nói thẳng: tờ này KHÔNG tự sinh ra file .pdf nằm sẵn đâu đó như
  AppSheet. Người lập phải bấm In rồi chọn "Lưu dưới dạng PDF". Muốn có file tự
  động thì phải có máy chủ dựng PDF — tốn tiền và tốn công giữ, nên chưa làm.
*/

/**
 * Tên pháp nhân in trên tờ hợp đồng.
 *
 * KHÁC `STUDIO_NAME` ("Hamita Studio") một cách có chủ đích, nên không vi phạm
 * nguyên tắc 15: nguyên tắc đó nói tên studio hiện cho KHÁCH XEM ẢNH chỉ có
 * một nguồn. Còn đây là tên trên giấy tờ, chép đúng mẫu AppSheet đang dùng.
 *
 * Mẫu AppSheet in tên này cho MỌI loại hợp đồng, kể cả hợp đồng chụp bé — nên
 * ở đây cũng vậy. Muốn tách riêng Hami Baby thì sửa ở hàm `docToHopDong`, chỗ
 * dựng `ben`, chứ đừng rải thêm tên ra nhiều chỗ.
 */
export const TEN_TREN_GIAY = "HAMITA WEDDING HOUSE";

/**
 * Phần "Lưu ý" cuối tờ — chép từ mẫu AppSheet, anh chốt 15/11/2026 dùng chung
 * cho mọi loại hợp đồng.
 *
 * Hai chỗ em sửa so với bản AppSheet, đều là lỗi gõ chứ không phải đổi nội
 * dung: dòng về giữ váy bên kia lặp "vui lòng" hai lần, và dòng đền bù kết
 * thúc bằng hai dấu chấm.
 *
 * ĐÂY LÀ CHỮ RÀNG BUỘC VỚI KHÁCH. Sửa phải do anh bảo sửa, đừng tự viết lại
 * cho xuôi tai — một chữ ở đây là một lần cãi nhau ở quầy.
 */
export const LUU_Y_HOP_DONG: readonly string[] = [
  "Khách lấy đồ trước 1-2 ngày.",
  "Khách hàng giữ váy 3 ngày tính từ ngày lấy đồ.",
  "Khi đến mang theo CCCD hoặc hộ khẩu.",
  "Đồ đã thuê có thể đổi lại trước ngày dùng 1 tuần.",
  "Không được trả lại với bất kỳ lý do gì (nếu trả lại sẽ mất cọc).",
  "Các dịch vụ có quà tặng không quy đổi thành tiền mặt.",
  "Khách vui lòng giữ váy không để cháy, rách hoặc dính các chất không giặt tẩy được.",
  "Nếu hư hỏng khách hàng phải đền bù theo giá trị của sản phẩm.",
  "Trả đồ trễ hạn vui lòng trả thêm phí cho mỗi ngày phát sinh.",
];

/** Ba ô ký cuối tờ, đúng thứ tự mẫu AppSheet. */
export const O_KY: readonly string[] = ["Khách hàng", "Nhân viên tư vấn", "Giám đốc"];

export type DongTo = {
  stt: number;
  /** Tên dịch vụ — dòng đầu, in đậm khi có chi tiết bên dưới. */
  ten: string;
  /** Chi tiết gói, mỗi phần tử một dòng. Rỗng = dòng gọn một hàng. */
  chiTiet: string[];
  soLuong: number;
  donGia: number;
  thanhTien: number;
};

export type ToHopDong = {
  maHD: string;
  tenKhach: string;
  soDienThoai: string;
  diaChi: string;
  nhanVien: string;
  ngayDat: string;
  dong: DongTo[];
  thanhTien: number;
  khuyenMai: number;
  tongTien: number;
  daThu: number;
  conLai: number;
};

/** "YYYY-MM-DD" → "15/11/2026". Chuỗi rỗng hoặc sai dạng thì trả về "—". */
function ngayGiay(s: string | null | undefined): string {
  const m = (s ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
}

/** Hai cơ sở in trên đầu tờ — lấy từ `studio.ts`, không chép lại số nào. */
export const BEN_STUDIO = {
  ten: TEN_TREN_GIAY,
  diaChi: [STUDIO.diaChi, HAMI_BABY.diaChi],
  dienThoai: [STUDIO.dienThoaiSo, HAMI_BABY.dienThoaiSo],
};

/**
 * Gom đúng những gì tờ giấy cần. Trả `null` khi không có hợp đồng đó — người
 * gọi tự quyết `notFound()`.
 *
 * Số tiền lấy nguyên từ bảng `HopDong`, KHÔNG cộng lại ở đây: con số trên giấy
 * phải trùng từng đồng với con số trên web và trong sổ quỹ. Cộng lại lần nữa ở
 * chỗ này là mở đường cho hai nơi lệch nhau mà không ai biết nơi nào đúng.
 */
export async function docToHopDong(id: string): Promise<ToHopDong | null> {
  const prisma = getPrisma();
  const [hd, bangTen] = await Promise.all([
    prisma.hopDong.findUnique({
      where: { id },
      include: {
        khachHang: true,
        chiTiet: {
          where: { matBenAppSheet: null },
          orderBy: [{ ngayChup: { sort: "asc", nulls: "last" } }, { taoLuc: "asc" }],
        },
      },
    }),
    tenTheoMaNV(),
  ]);
  if (!hd) return null;

  return {
    maHD: hd.maHD,
    tenKhach: hd.tenKhach || hd.khachHang?.ten || "",
    soDienThoai: hd.khachHang?.soDienThoai ?? "",
    diaChi: hd.diaChi ?? "",
    /*
      Qua `tenNV` chứ không `bangTen.get` thẳng: bảng tra dùng khoá viết
      thường, mà `nguoiLapMaNV` chép từ AppSheet có cả chữ hoa. Tra thẳng là ra
      rỗng với đúng những mã viết hoa — tức tên nhân viên biến mất khỏi tờ giấy
      của một nhóm hợp đồng, mà trang web vẫn hiện bình thường.
    */
    nhanVien: tenNV(bangTen, hd.nguoiLapMaNV) ?? "",
    ngayDat: ngayGiay(hd.ngayDat),
    dong: hd.chiTiet.map((d, i) => ({
      stt: i + 1,
      ten: d.tenDV ?? d.maDV ?? "",
      /*
        Chi tiết gói xuống dòng bằng "\n" (xem `gon()` trong hopDongChung.ts —
        nó gộp khoảng trắng nhưng CỐ Ý giữ nguyên xuống dòng). Tách ở đây để
        tờ giấy in mỗi mục một dòng như mẫu AppSheet, thay vì một khối chữ dài.
      */
      chiTiet: (d.chiTiet ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
      soLuong: d.soLuong,
      donGia: d.donGia,
      thanhTien: d.thanhTien,
    })),
    thanhTien: hd.thanhTien,
    khuyenMai: hd.khuyenMai,
    tongTien: hd.tongTien,
    daThu: hd.daThu,
    conLai: hd.conLai,
  };
}
