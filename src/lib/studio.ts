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
  /*
    Dia chi Hamita Wedding House (cuoi hoi). Tiem co HAI co so: so 337 cung
    duong la Hami Baby — xem HAMI_BABY.diaChi. Anh xac nhan 15/09/2026.

    Truoc ngay do o day ghi "337" — tuc dia chi cua Hami Baby — trong khi ban
    do nhung ngay canh (mapEmbed) lai la Wedding House: khach cuoi doc trang
    gioi thieu se di nham sang co so chup be.
  */
  diaChi: "377 Đỗ Tường Tự, Tầm Vu, Châu Thành, Long An",
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
 * Dong nho chu hoa ngay duoi cau mo dau o dau trang (bo cuc hoc tu mohome.vn,
 * 16/09/2026). Chi ke nhung thu kiem chung duoc: hai co so, phim truong rieng,
 * tron goi ngay cuoi — deu da co o cac khu ben duoi.
 */
export const DAU_TRANG = {
  dongPhu: "Hai cơ sở · Phim trường riêng · Trọn gói ngày cưới",
  /*
    Bon cai ten studio dang dung, anh yeu cau ghi ngay dau trang 25/09/2026 —
    khach den tu Facebook cua mot nhanh can biet ba nhanh kia cung la Hamita.
    Thu tu theo dung loi anh dan.
  */
  thuongHieu: ["Hamita Wedding", "Hami Baby Studio", "Tiệm ảnh nhà Su", "Hamita Garden"],
} as const;

/**
 * Hai co so — hai the canh nhau, nhu "he thong chi nhanh" o mohome.vn.
 *
 * Dia chi, so dien thoai lay tu STUDIO va HAMI_BABY, khong chep lai o day: hai
 * noi giu cung mot so dien thoai la co ngay lech nhau (nguyen tac 51).
 */
/**
 * Khu "Doi ngu" tren trang gioi thieu (anh yeu cau 25/09/2026).
 *
 * CHI CO CHU KHUNG o day — ten va vai tro tung nguoi lay tu bang NhanVien,
 * khong chep lai. Chu o day khong khen ai, khong noi so nam kinh nghiem: nhung
 * thu do chua ai kiem chung (nguyen tac 25).
 */
export const DOI_NGU = {
  tieuDe: "Hamita có những ai",
  moTa:
    "Người cầm máy, người trang điểm, người ngồi dàn từng trang album — " +
    "ngày cưới của anh chị có cả Hamita đi cùng.",
} as const;

export const CO_SO = {
  nhan: "Hai cơ sở",
  tieuDe: "Hai cơ sở trên đường Đỗ Tường Tự",
  moTa: "Cưới hỏi ở số 377, bé và gia đình ở số 337 — cùng một con đường ở Tầm Vu.",
} as const;

/**
 * Luoi "Hamita chup gi?" — moi the la mot mang dich vu, bam vao nhay toi khu
 * anh cua mang do.
 *
 * Moi chu o day lay tu nhung gi trang da noi o cho khac
 * PHIM_TRUONG, HAMI_BABY) — khong them loi hua moi nao.
 *
 * "khu" chi cho trang biet lay anh bia cua khu nao dat len the; "vay" khong co
 * khu anh rieng nen muon tam anh cuoi thu hai.
 */
export const DICH_VU = {
  nhan: "Dịch vụ",
  tieuDe: "Hamita chụp gì?",
  muc: [
    { khu: "cuoi", icon: "rings", nhan: "Trọn gói ngày cưới", ten: "Ảnh cưới", moTa: "Từ lễ hỏi tới lúc tan tiệc", href: "#anh" },
    { khu: "phimtruong", icon: "camera", nhan: "Phim trường độc quyền", ten: "Hamita Garden", moTa: "Bối cảnh châu Âu ngay tại Long An", href: "#phim-truong" },
    { khu: "baby", icon: "sparkle", nhan: "Hami Baby Studio", ten: "Bé & gia đình", moTa: "Thôi nôi, bầu, sơ sinh", href: "#baby" },
    { khu: "vay", icon: "dress", nhan: "Có sẵn tại studio", ten: "Váy cưới & trang điểm", moTa: "Mặc thử ngay tại chỗ, tới lúc ưng thì thôi", href: "#lien-he" },
    /* Anh thêm 17/09/2026. Nhãn và mô tả CỐ Ý để trống — anh sẽ tự viết, đừng điền đoán. */
    { khu: "nhasu", icon: "camera", nhan: "", ten: "Tiệm ảnh nhà Su", moTa: "", href: "#lien-he" },
  ],
  /** The thu sau, lap cho luoi du hang — moi go cua thay vi de trong mot o. */
  tuVan: {
    tieuDe: "Chưa biết nên bắt đầu từ đâu?",
    ke: "Anh chị kể Hamita nghe ngày cưới định làm thế nào — chuyện gói, chuyện giá mình tính sau.",
  },
} as const;

/**
 * Bon thuong hieu cua studio, dung de chia luoi "Hamita chup gi?" (anh yeu cau
 * 25/09/2026). Truoc do sau the nam chung mot luoi, khach khong thay duoc
 * Hamita Wedding, Hami Baby Studio va Tiem anh nha Su la ba cai ten khac nhau.
 *
 * `khu` khop `DICH_VU.muc[].khu`. Thu tu o day la thu tu hien tren trang.
 *
 * Phan nao chi co MOT the va the do trung ten phan thi trang KHONG in ten phan
 * nua (xem page.tsx) — in ra thanh doc hai lan cung mot cai ten.
 */
export const PHAN_DICH_VU = [
  { ten: "Hamita Wedding", khu: ["cuoi", "phimtruong"] },
  { ten: "Hami Baby Studio", khu: ["baby"] },
  { ten: "Tiệm ảnh nhà Su", khu: ["nhasu"] },
  { ten: "Váy cưới & trang điểm", khu: ["vay"] },
] as const satisfies readonly { ten: string; khu: readonly string[] }[];

/**
 * Phim truong rieng cua studio.
 *
 * Khu nay la phan ANH THAT cua phim truong — nguoi dang tim cho chup can nhin
 * thay boi canh, chu doc chu khong hinh dung ra duoc.
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
  /** Co so rieng cua Hami Baby — cung duong voi Wedding House, so 337. */
  diaChi: "337 Đỗ Tường Tự, Tầm Vu, Châu Thành, Long An",
  facebook: "https://www.facebook.com/hamibabylongan",
  soNguoiTheoDoi: "3,1K",
  mapEmbed:
    "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3923.7852423002405!2d106.47000407682195!3d10.438609365330311!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x310ab3af09b27cd3%3A0xb5f7fc7310688edd!2sHami%20Baby%20Studio!5e0!3m2!1svi!2s!4v1787558693834!5m2!1svi!2s",
} as const;

/**
 * Trang dịch vụ /dich-vu/<nhóm> (nhóm và mục ở src/lib/nhomGioiThieu.ts, ảnh do
 * studio chọn ở /admin/gioi-thieu). Tiêu đề và nhãn lấy từ thẻ tương ứng trong
 * DICH_VU; ở đây chỉ giữ phần riêng của trang. Không kể chuyện gì chưa kiểm
 * chứng được (nguyên tắc 25).
 */
export const TRANG_DICH_VU = {
  /** Mô tả dài hơn dòng trên thẻ, theo `khu`. Không có thì dùng mô tả của thẻ. */
  moTaRieng: {
    cuoi: "Từ buổi dạm ngõ, lễ đính hôn tới ngày cưới ở nhà gái, nhà trai — anh chị xem Hamita đã chụp cho những nhà khác thế nào.",
  } as Record<string, string>,
  moiGoi: "Ưng phong cách nào, anh chị nhắn Hamita một tiếng nhé.",
} as const;
