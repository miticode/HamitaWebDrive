import { boDau } from "@/lib/constants";

/*
  MỘT BUỔI CHỤP THUỘC NHÁNH NÀO — anh yêu cầu 26/11/2026.

  Bảng `BuocHopDong` có mười tám bước chia hai nhánh: 1–9 cho khâu chụp trước
  (hình cổng, album, chụp bé…) và 10–18 cho khâu tiệc (nhà gái, nhà trai). Một
  hợp đồng cưới đi qua CẢ HAI, lần lượt: chụp ảnh cổng → khách chọn → retouch
  → in để treo ở tiệc, rồi mới tới hai ngày tiệc.

  Từ 26/11 bước hợp đồng TÍNH RA từ dấu trên từng buổi, nên phải biết buổi nào
  thuộc nhánh nào: xét "mọi buổi đã gửi ảnh gốc chưa" mà gộp cả buổi tiệc chưa
  tới ngày vào thì hợp đồng không bao giờ lên nổi bước 4, kẹt ở khâu ảnh cổng
  cho tới sau đám cưới.

  SUY THEO TÊN, KHÔNG THÊM CỘT. Bảng `LoaiBuoi` có 18 loại và đo 26/11 thì
  0 loại nào trên lịch nằm ngoài bảng — một danh sách đóng, nhỏ, ít đổi. Thêm
  cột `nhanh` kéo theo một ô chọn nữa trong trang quản lý loại buổi và một
  việc khai báo nữa cho studio, trong khi suy theo tên đúng cả 18 loại. Cùng
  cách `MAU_MAC_DINH` trong lichChung.ts đang làm với màu.

  Loại nào mới mà tên không khớp dấu hiệu nào thì về nhánh CHỤP — nhánh ấy là
  mặc định của mọi buổi không phải ngày cưới, và đoán sai ở đây chỉ làm bước
  chậm lại một nhịp chứ không làm hợp đồng nói dối.
*/

export type Nhanh = "chup" | "tiec";

/**
 * Dấu hiệu buổi thuộc NGÀY CƯỚI.
 *
 * So trên tên đã bỏ dấu và hạ chữ thường, nên "Nhà Gái", "nhà gái", "NHÀ GÁI"
 * cùng ra một kết quả. Mười tám loại hiện có rơi vào đây đúng bảy:
 * nhà gái · nhà trai · Ngày cưới · Ngày lễ gia tiên · Đính Hôn · chup dạm ngõ
 * · Chụp chịu lạy.
 */
const DAU_HIEU_TIEC = [
  "nha gai",
  "nha trai",
  "cuoi",
  "gia tien",
  "dinh hon",
  "dam ngo",
  "chiu lay",
  "vu quy",
  "tan hon",
  "le toi",
  "ruoc dau",
];

/**
 * Buổi này thuộc nhánh nào.
 *
 * "makeup" cố ý KHÔNG vào nhánh tiệc dù phần lớn buổi makeup là của ngày
 * cưới: makeup không có ảnh gốc để gửi, nên xếp nó vào nhánh tiệc là thêm một
 * buổi mãi mãi chưa đánh dấu, khoá luôn bước 13 của những hợp đồng ấy. Đo
 * 26/11: 9 buổi makeup, 2 trong số đó nằm ở hợp đồng đang ở bước 10.
 */
export function nhanhCuaBuoi(loaiBuoi: string | null | undefined): Nhanh {
  const t = boDau(loaiBuoi ?? "");
  return DAU_HIEU_TIEC.some((d) => t.includes(d)) ? "tiec" : "chup";
}

/** Bước này thuộc nhánh nào — 1–9 là chụp, 10–18 là tiệc. */
export function nhanhCuaBuoc(buoc: number | null | undefined): Nhanh | null {
  if (typeof buoc !== "number") return null;
  return buoc >= 10 ? "tiec" : "chup";
}
