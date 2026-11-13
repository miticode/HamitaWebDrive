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
  | "dong-bo-appsheet"
  | "dang-xuat-moi-may"
  | "gan-hop-dong"
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
  /*
    Việc trên trang quản lý ALBUM ẢNH (anh yêu cầu 28/09/2026). Trước đó nhật
    ký chỉ theo dõi phần CRM, còn cả mảng ảnh — nơi làm việc chính của phòng
    Media — thì không ghi gì, nên xoá nhầm một album là không truy được ai.
  */
  | "tao-album"
  | "xoa-album"
  | "sua-album"
  | "lam-moi-album"
  | "gui-thong-bao";

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
  "dong-bo-appsheet": "Đồng bộ từ AppSheet",
  "dang-xuat-moi-may": "Đăng xuất mọi máy",
  "gan-hop-dong": "Gắn album vào hợp đồng",
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
  "tao-album": "Tạo album ảnh",
  "xoa-album": "Xoá album ảnh",
  "sua-album": "Sửa album ảnh",
  // Khong con ghi moi tu 15/10/2026 (xem refreshGalleryAction) — giu chu de
  // nhung dong CU trong so nhat ky he thong van doc duoc ra tieng Viet.
  "lam-moi-album": "Đọc lại album từ Drive",
  "gui-thong-bao": "Gửi thông báo cho khách",
};
