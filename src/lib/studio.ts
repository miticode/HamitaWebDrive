/*
  Thông tin studio hiện trên trang giới thiệu.

  Lấy từ hai trang Facebook chính thức của studio (đọc ngày 22/08/2026):
  facebook.com/hamitaweddinghouse và facebook.com/hamibabylongan.
  Sửa ở đây là đổi trên toàn trang, không phải đi tìm từng chỗ.
*/

import { STUDIO_NAME } from "./constants";

export const STUDIO = {
  /*
    Lay chung ten voi cac trang xem anh (constants.ts) thay vi tu dinh nghia
    rieng — truoc day hai noi ghi hai ten khac nhau ("Hamita Studio" vs "Hamita
    Wedding House"), khach thay ten khac nhau tuy trang. Studio co nhieu mang
    (cuoi, be, gia dinh...) nen ten chung phai la ten chung, khong rieng cho
    mang cuoi.
  */
  ten: STUDIO_NAME,
  khauHieu: "Sang trọng từ tâm — tận tình như nhà",
  moTa: "Chụp ảnh cưới, gia đình & bé yêu tại Tầm Vu, Long An",
  dienThoai: "098 234 1989",
  /** Dang dung cho the <a href="tel:"> — khong dau cach. */
  dienThoaiSo: "0982341989",
  email: "hamita.studio@gmail.com",
  diaChi: "337 Đỗ Tường Tự, Tầm Vu, Châu Thành, Long An",
  gioMoCua: "Mở cửa tất cả các ngày",
  facebook: "https://www.facebook.com/hamitaweddinghouse",
  tiktok: "https://www.tiktok.com/@hamitawedding",
  /*
    Giai ma truc tiep tu ma QR Zalo that cua studio (anh gui), khong tu doan
    dinh dang so dien thoai — thu qua zalo.me/{so} khong cho ket qua ro rang
    de phan biet dung/sai.
  */
  zalo: "https://zaloapp.com/qr/p/c3fjjs1rqlmy",
  /** So lieu tin cay tu trang Facebook, chi de hien thi — khong tinh toan gi. */
  soNguoiTheoDoi: "28K",
  soDanhGia: 289,
  /** Link nhung Google Maps, lay tu dung ho so doanh nghiep da xac minh cua studio. */
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.804160937801!2d106.4736751768222!3d10.437109765357222!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x310ab39117b32b6b%3A0xc73f3ea590e38789!2sHamita%20Wedding%20House!5e0!3m2!1svi!2s!4v1787558664314!5m2!1svi!2s",
} as const;

/*
  Anh bia chay o dau trang gioi thieu.

  Day la TRANG ALBUM DA DAN (co chu, co bo cuc rieng), khong phai anh don — nen
  o trang gioi thieu chung duoc hien tron tam chu khong cat theo khung.

  File nam san trong public/bia/, moi ten hai ban: ban to 2048px cho may tinh
  va ban "-nho" 1280px cho dien thoai. Anh goc nang 5-23 MB moi tam nen bat
  buoc phai nen truoc khi dua vao (ca bo con duoi 1,4 MB) — de nguyen thi trang
  gioi thieu tai rat cham va ngon bang thong.

  Doi anh thi thay file trong public/bia/ roi sua danh sach nay; thu tu o day
  la thu tu hien ra.
*/
export const ANH_BIA = [
  { ten: "bia-1", mo: "Ảnh cưới trong phim trường của Hamita Studio" },
  { ten: "bia-2", mo: "Ảnh cưới áo dài truyền thống" },
  { ten: "bia-3", mo: "Ảnh cưới ngoài trời" },
  { ten: "bia-4", mo: "Trang album cưới do Hamita Studio thiết kế" },
] as const;

/**
 * Nam dich vu cua studio, ke lai theo DUNG THU TU chung dien ra voi mot cap doi.
 *
 * Truoc day day la mot luoi nam o vuong co icon — dung nhung doc nhu to rao
 * gia. Xep lai theo thoi gian thi tu no thanh mot mach: buoi gap dau, thu vay,
 * sang hom chup, buoi chup, roi cuon album cam ve. Khach doc theo mach do se
 * hinh dung duoc minh sap trai qua nhung gi, thay vi phai tu ghep.
 *
 * QUAN TRONG khi sua: moi cau o day phai la thu KIEM CHUNG DUOC tu dich vu that
 * cua studio. Khong biet chuyen thanh lap studio thi khong ke chuyen thanh lap
 * — nen cau chuyen o day la hanh trinh CUA KHACH, khong phai lich su cua
 * studio. Vua that vua dat khach vao giua cau chuyen.
 *
 * Ten "icon" ung voi bo net ve trong StudioIcon.tsx.
 */
export const HANH_TRINH = {
  nhan: "Hành trình",
  tieuDe: "Từ buổi ngồi nghe đầu tiên, tới cuốn album anh chị cầm về",
  chuong: [
    {
      so: "01",
      ten: "Ngồi nghe trước đã",
      ke:
        "Buổi gặp đầu Hamita chưa bàn tới gói nào, giá nào. Hamita hỏi anh chị " +
        "quen nhau thế nào, ngày cưới định làm ở nhà hay nhà hàng, hai bên nội " +
        "ngoại có gì cần lưu ý. Nghe xong mới biết nên chụp kiểu gì — và từ đó " +
        "Hamita lo được trọn ngày cưới, từ lễ hỏi tới lúc tan tiệc.",
      icon: "rings",
    },
    {
      so: "02",
      ten: "Chọn váy, chọn vest",
      ke:
        "Váy cưới, vest chú rể, áo dài cho hai bên gia đình đều có sẵn tại " +
        "studio để anh chị mặc thử ngay tại chỗ. Không phải chạy mỗi nơi mượn " +
        "một thứ, và thử tới lúc ưng thì thôi.",
      icon: "dress",
    },
    {
      so: "03",
      ten: "Sáng hôm chụp",
      ke:
        "Trang điểm và làm tóc theo từng gương mặt, không rập một kiểu cho tất " +
        "cả. Hamita giữ nét tự nhiên của cô dâu — để mấy năm sau mở ảnh ra, anh " +
        "chị vẫn nhận ra chính mình chứ không phải một người nào khác.",
      icon: "sparkle",
    },
    {
      so: "04",
      ten: "Buổi chụp",
      ke:
        "Phim trường riêng của Hamita có nhiều bối cảnh dựng theo phong cách " +
        "châu Âu, đủ cho trọn một buổi mà không phải di chuyển đi đâu. Anh chị " +
        "thích ngoài trời hay thích áo dài truyền thống thì Hamita đi cùng.",
      icon: "camera",
    },
    {
      so: "05",
      ten: "Thứ còn lại sau tất cả",
      ke:
        "Tiệc tan, khách về hết. Cái còn lại là tấm hình cổng từng đứng trước " +
        "nhà hôm ấy, và cuốn album Hamita tự tay dàn từng trang. Mười năm nữa " +
        "mở ra, ngày hôm ấy vẫn còn nguyên.",
      icon: "album",
    },
  ],
} as const;

/**
 * Cau mo dau va cau ket cua trang gioi thieu.
 *
 * Giu rieng o day chu khong viet thang vao JSX: hai cau nay la giong noi cua
 * studio, sua chu nghia thi khong phai mo file giao dien ra sua.
 */
/**
 * Doan "Ve Hamita", dat NGAY TRUOC phan hanh trinh.
 *
 * Nhiem vu cua no la neu QUAN DIEM, khong phai liet ke dich vu — dich vu da co
 * ca mot mach ke ngay duoi roi, noi lai o day thi thanh lap. Mot trang ke
 * chuyen can co mot cau dam nhan, va day la cho dat cau do.
 *
 * Ban cu viet "Hamita la noi lo tron goi ngay cuoi tai Tam Vu, Long An — tu le
 * hoi, anh cuoi, trang diem cho toi chiec vay..." tuc la doc lai danh sach
 * dich vu mot lan nua bang cau van.
 */
export const VE_HAMITA = {
  nhan: "Về Hamita",
  /** Cau dam nhan — neu quan diem, khong mo ta dich vu. */
  tieuDe: "Ảnh cưới đẹp thì nhiều. Ảnh giống anh chị thì hiếm.",
  ke:
    "Hamita ở Tầm Vu, Long An, và đã quen với đám cưới miền Tây — có lễ hỏi, " +
    "có nhà gái nhà trai, có tấm hình cổng dựng trước sân. Hamita không đưa anh " +
    "chị một bộ mẫu rồi bảo chụp theo. Ngồi nghe chuyện của hai người trước đã, " +
    "rồi mới bàn tới bối cảnh, tới váy, tới ngày.",
} as const;

export const LOI_KE = {
  /** Cau hook ngay duoi ten studio — dat ky vong cho ca trang. */
  moDau:
    "Ngày cưới chỉ có một lần và trôi rất nhanh. Việc của Hamita là giữ nó lại — " +
    "đủ rõ để nhiều năm sau anh chị mở ra vẫn thấy nguyên vẹn.",
  /** Cau ket, dat ngay truoc phan lien he. */
  ketTieuDe: "Câu chuyện tiếp theo là của anh chị",
  ket:
    "Hamita đã đi cùng rất nhiều đám cưới ở Tầm Vu và quanh Long An. Không đám " +
    "nào giống đám nào, nên cũng không bộ ảnh nào nên giống bộ ảnh nào. Anh chị " +
    "gọi Hamita một tiếng, mình ngồi nghe nhau trước đã.",
} as const;

/**
 * Khu Album va hinh cong — SAN PHAM IN khach cam ve tay.
 *
 * Tach rieng khoi khu anh cuoi vi khach nhin hai thu do voi hai muc dich khac
 * nhau: xem anh cuoi la xem PHONG CACH CHUP, con xem album va hinh cong la
 * xem thu minh se nhan duoc. Gop chung mot luoi thi ca hai deu bi loang.
 *
 * "HC" trong ten album cua studio la hinh cong — doc duoc tu chinh ten thu muc
 * Drive ("File gốc hình cổng" trong album mang ma HC).
 */
export const ALBUM_HC = {
  nhan: "Sản phẩm in",
  tieuDe: "Album và hình cổng",
  moTa:
    "Ngoài file ảnh, anh chị còn cầm về những thứ có thể chạm vào: từng trang " +
    "album do Hamita tự dàn, và tấm hình cổng đặt trước nhà ngày cưới.",
} as const;

/**
 * Phim truong rieng cua studio.
 *
 * Phim truong da duoc nhac o chuong 04 cua HANH_TRINH, nhung o do chi co chu.
 * Nguoi dang tim cho chup doc xong van khong biet boi canh trong do ra sao —
 * dung cai loi ma khu Hami Baby tung mac phai. Khu nay la phan anh that.
 *
 * Chu o day co tinh giu dung nhung gi kiem chung duoc: so goc chup lay tu
 * chinh ten thu muc Drive cua album ("PhimTruongHamitaGarden - 16 view"),
 * phong cach chau Au la do studio noi. KHONG ta chi tiet tung boi canh —
 * chua ai o day nhin tan mat, ta bua ra la sai voi khach.
 */
export const PHIM_TRUONG = {
  ten: "Phim trường Hamita Garden",
  nhan: "Phim trường độc quyền",
  tieuDe: "Bối cảnh châu Âu ngay tại Long An",
  moTa:
    "Phim trường riêng của Hamita, dựng theo phong cách châu Âu. Anh chị có " +
    "trọn một buổi chụp với nhiều bối cảnh khác nhau mà không phải đi đâu xa — " +
    "và không đụng hàng với bất cứ nơi nào khác.",
  /** Cau chot duoi luoi anh, moi khach goi dat lich xem phim truong. */
  moiGoi: "Muốn xem trực tiếp trước khi quyết? Anh chị gọi Hamita một tiếng nhé.",
} as const;

/** Thuong hieu thu hai cua studio — chup be va gia dinh. */
export const HAMI_BABY = {
  ten: "Hami Baby Studio",
  moTa: "Mảng chụp bé yêu và gia đình của Hamita Studio — thôi nôi, bầu, sơ sinh tại Long An.",
  dienThoai: "079 772 2972",
  dienThoaiSo: "0797722972",
  facebook: "https://www.facebook.com/hamibabylongan",
  soNguoiTheoDoi: "3,1K",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.7852423002405!2d106.47000407682195!3d10.438609365330311!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x310ab3af09b27cd3%3A0xb5f7fc7310688edd!2sHami%20Baby%20Studio!5e0!3m2!1svi!2s!4v1787558693834!5m2!1svi!2s",
} as const;
