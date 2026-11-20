/**
 * Tên thao tác và chữ hiện cho người đọc — KHÔNG nhập gì dính tới Prisma
 * (nguyên tắc 43).
 *
 * Tách khỏi nhatKy.ts ngày 28/09/2026: cửa sổ "Logs" trên thẻ album chạy ở máy
 * khách và cần bảng chữ này; để chung với hàm ghi (có Prisma) thì cả Prisma bị
 * kéo vào gói máy khách và build hỏng ngay — đã dính đúng lỗi đó.
 */
/**
 * Tên thao tác. Viết dạng mã để lọc, còn chữ hiện cho người đọc nằm ở
 * `CHU_HANH_DONG` — sửa câu chữ không phải đụng tới dữ liệu đã ghi.
 */
export type HanhDong =
  | "dang-nhap"
  | "dang-nhap-sai"
  | "dang-xuat"
  | "doi-mat-khau"
  | "cap-mat-khau"
  | "them-nhan-vien"
  | "sua-nhan-vien"
  | "xoa-nhan-vien"
  | "nhap-du-lieu"
  | "sua-thong-tin-studio"
  | "them-noi-quy"
  | "sua-noi-quy"
  | "them-dich-vu"
  | "sua-dich-vu"
  | "them-danh-muc"
  | "sua-danh-muc"
  | "xoa-danh-muc"
  | "them-loai-buoi"
  | "sua-loai-buoi"
  | "xoa-loai-buoi"
  | "dong-bo-appsheet"
  | "dang-xuat-moi-may"
  | "gan-hop-dong"
  /* Khách hàng độc lập với hợp đồng — đợt 6 (13/11/2026). */
  | "them-khach"
  | "sua-khach"
  | "them-khach-tiem-nang"
  | "sua-khach-tiem-nang"
  | "ghi-su-co"
  | "dong-su-co"
  | "lap-hop-dong"
  | "sua-hop-dong"
  | "xoa-hop-dong"
  | "them-phieu-thu"
  | "duyet-phieu-thu"
  | "xoa-phieu-thu"
  /* Sổ chi — đối trọng của phiếu thu, thêm 13/11/2026 (KE-HOACH-CRM.md đợt 3). */
  | "them-khoan-chi"
  | "duyet-khoan-chi"
  | "xoa-khoan-chi"
  /* Nhân sự — đợt 5 (13/11/2026). Chấm công CỐ Ý không ghi nhật ký: 25 người
     × 2 lần/ngày là 1.500 dòng mỗi tháng, nhật ký sẽ ngập. */
  | "gui-don-tu"
  | "duyet-don-tu"
  | "tu-choi-don-tu"
  | "tinh-luong"
  | "chot-ky-luong"
  | "mo-lai-ky-luong"
  | "sua-tien-luong"
  | "giao-dau-viec"
  | "doi-trang-thai-viec"
  | "sua-lich-chup"
  | "them-viec-lich"
  | "sua-viec-lich"
  | "xoa-viec-lich"
  /*
    Việc trên trang quản lý ALBUM ẢNH (anh yêu cầu 28/09/2026). Trước đó nhật
    ký chỉ theo dõi phần CRM, còn cả mảng ảnh — nơi làm việc chính của phòng
    Media — thì không ghi gì, nên xoá nhầm một album là không truy được ai.
  */
  | "tao-album"
  /* Thu muc Drive + album sinh tu hop dong (anh yeu cau 14/11/2026). */
  | "tao-album-tu-hop-dong"
  | "tao-album-tu-hop-dong-loi"
  | "xoa-album"
  | "sua-album"
  | "lam-moi-album"
  | "gui-thong-bao"
  /*
    Đổi bước hợp đồng từ TRANG ALBUM (anh yêu cầu 19/11/2026) — bấm "Gửi
    thông báo" hoặc "Đã gửi file gốc" là hợp đồng nhảy sang bước đã gửi ảnh
    gốc. Ghi riêng một hành động chứ không gộp vào "sua-hop-dong": người mở
    hợp đồng ra thấy bước đã nhảy mà không ai gõ thì phải tra được nó đến từ
    trang album.
  */
  | "doi-buoc-anh-goc"
  /*
    KHACH tu bam "da chon xong" → buoc 4 sang 5, hoac 13 sang 14 (anh yeu cau
    19/11/2026). Ghi rieng khoi "doi-buoc-anh-goc" vi NGUOI BAM khac han: dong
    nay luon co `nguoi = null`, va do la su that dang ghi chu khong phai thieu
    du lieu.
  */
  | "doi-buoc-khach-chon"
  /*
    Media dan link Drive da gui cho xuong in roi chuyen buoc (anh yeu cau
    19/11/2026). Ghi rieng vi day la viec CO TRACH NHIEM: hinh in sai thi phai
    truy duoc ai da gui cai gi.
  */
  | "gui-in";

export const CHU_HANH_DONG: Record<HanhDong, string> = {
  "dang-nhap": "Đăng nhập",
  "dang-nhap-sai": "Đăng nhập sai mật khẩu",
  "dang-xuat": "Đăng xuất",
  "doi-mat-khau": "Đổi mật khẩu",
  "cap-mat-khau": "Cấp mật khẩu tạm",
  "them-nhan-vien": "Thêm nhân viên",
  "sua-nhan-vien": "Sửa thông tin nhân viên",
  "xoa-nhan-vien": "Xoá nhân viên",
  "nhap-du-lieu": "Nhập dữ liệu từ AppSheet",
  "sua-thong-tin-studio": "Sửa thông tin studio",
  "them-noi-quy": "Thêm nội quy",
  "sua-noi-quy": "Sửa nội quy",
  "them-dich-vu": "Thêm dịch vụ / trang phục",
  "sua-dich-vu": "Sửa dịch vụ / trang phục",
  "them-danh-muc": "Thêm giá trị danh mục",
  "sua-danh-muc": "Sửa giá trị danh mục",
  "xoa-danh-muc": "Xoá giá trị danh mục",
  "them-loai-buoi": "Thêm loại buổi chụp",
  "sua-loai-buoi": "Sửa loại buổi chụp",
  "xoa-loai-buoi": "Xoá loại buổi chụp",
  "dong-bo-appsheet": "Đồng bộ từ AppSheet",
  "dang-xuat-moi-may": "Đăng xuất mọi máy",
  "gan-hop-dong": "Gắn album vào hợp đồng",
  "them-khach": "Thêm khách hàng",
  "sua-khach": "Sửa khách hàng",
  "them-khach-tiem-nang": "Thêm khách tiềm năng",
  "sua-khach-tiem-nang": "Sửa khách tiềm năng",
  "ghi-su-co": "Ghi sự cố",
  "dong-su-co": "Đóng sự cố",
  "lap-hop-dong": "Lập hợp đồng",
  "sua-hop-dong": "Sửa hợp đồng",
  "xoa-hop-dong": "Xoá hợp đồng",
  "gui-don-tu": "Gửi đơn từ",
  "duyet-don-tu": "Duyệt đơn từ",
  "tu-choi-don-tu": "Không duyệt đơn từ",
  "tinh-luong": "Tính lương",
  "chot-ky-luong": "Chốt kỳ lương",
  "mo-lai-ky-luong": "Mở lại kỳ lương",
  "sua-tien-luong": "Sửa tạm ứng / đã thanh toán",
  "them-khoan-chi": "Ghi khoản chi",
  "duyet-khoan-chi": "Duyệt khoản chi",
  "xoa-khoan-chi": "Xoá khoản chi",
  "them-phieu-thu": "Thêm phiếu thu",
  "duyet-phieu-thu": "Duyệt phiếu thu",
  "xoa-phieu-thu": "Xoá phiếu thu",
  "giao-dau-viec": "Giao đầu việc",
  "doi-trang-thai-viec": "Đổi trạng thái đầu việc",
  "sua-lich-chup": "Sửa lịch chụp",
  "them-viec-lich": "Thêm việc vào lịch",
  "sua-viec-lich": "Sửa việc trên lịch",
  "xoa-viec-lich": "Xoá việc trên lịch",
  "tao-album": "Tạo album ảnh",
  "tao-album-tu-hop-dong": "Tạo thư mục Drive và album từ hợp đồng",
  "tao-album-tu-hop-dong-loi": "Tạo thư mục Drive từ hợp đồng KHÔNG THÀNH",
  "xoa-album": "Xoá album ảnh",
  "sua-album": "Sửa album ảnh",
  // Khong con ghi moi tu 15/10/2026 (xem refreshGalleryAction) — giu chu de
  // nhung dong CU trong so nhat ky he thong van doc duoc ra tieng Viet.
  "lam-moi-album": "Đọc lại album từ Drive",
  "gui-thong-bao": "Gửi thông báo cho khách",
  "doi-buoc-anh-goc": "Đổi bước: đã gửi ảnh gốc",
  "doi-buoc-khach-chon": "Đổi bước: khách đã chọn xong",
  "gui-in": "Gửi in cho xưởng",
};
