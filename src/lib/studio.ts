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
  /** So lieu tin cay tu trang Facebook, chi de hien thi — khong tinh toan gi. */
  soNguoiTheoDoi: "28K",
  soDanhGia: 289,
} as const;

/**
 * Ten "icon" ung voi bo net ve trong StudioIcon.tsx.
 * Tach rieng khoi component de studio.ts khong dinh JSX.
 */
export const DICH_VU = [
  {
    ten: "Trọn gói ngày cưới",
    mo: "Lo trọn từ lễ hỏi tới tiệc cưới, anh chị chỉ việc có mặt.",
    icon: "rings",
  },
  {
    ten: "Phim trường độc quyền",
    mo: "Bối cảnh riêng của studio, không đụng hàng với nơi khác.",
    icon: "camera",
  },
  {
    ten: "Chụp album cưới",
    mo: "Album cưới, ảnh cổng và ảnh phóng sự trong ngày tiệc.",
    icon: "album",
  },
  {
    ten: "Trang điểm cô dâu",
    mo: "Makeup và làm tóc theo từng gương mặt, giữ nét tự nhiên.",
    icon: "sparkle",
  },
  {
    ten: "Váy cưới · vest · áo dài",
    mo: "Cho thuê váy cưới, vest chú rể và áo dài cho hai bên gia đình.",
    icon: "dress",
  },
] as const;

/** Thuong hieu thu hai cua studio — chup be va gia dinh. */
export const HAMI_BABY = {
  ten: "Hami Baby Studio",
  moTa: "Mảng chụp bé yêu và gia đình của Hamita Studio — thôi nôi, bầu, sơ sinh tại Long An.",
  dienThoai: "079 772 2972",
  dienThoaiSo: "0797722972",
  facebook: "https://www.facebook.com/hamibabylongan",
  soNguoiTheoDoi: "3,1K",
} as const;
