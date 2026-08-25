/*
  Service worker tối thiểu — chỉ để album đủ điều kiện cài như app.

  Chrome trên Android chỉ bắn sự kiện mời cài (`beforeinstallprompt`) khi trang
  có đăng ký một service worker CÓ xử lý fetch. Thiếu tệp này thì nút "Lưu bộ
  ảnh ra màn hình chính" không bao giờ hiện trên Android, dù bản khai báo đã
  đúng hết.

  CỐ Ý KHÔNG cache gì cả. Album là "link sống": studio thả thêm ảnh vào Drive
  là khách F5 thấy ngay. Một service worker biết cache sẽ giữ lại bản cũ và
  phá đúng tính chất đó — khách mở app thấy bộ ảnh của hôm qua mà không hiểu
  vì sao. Ảnh đã có CDN lo phần nhanh rồi, không cần thêm một lớp nữa ở đây.

  Vậy nên fetch ở đây để trình duyệt tự xử lý như bình thường. Có mặt là đủ.
*/

self.addEventListener("install", () => {
  // Nhận việc ngay, không đợi tab cũ đóng hết.
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /*
    Để trống có chủ đích: không gọi e.respondWith() nghĩa là trình duyệt đi
    lấy như thường lệ. Đây là cách nhẹ nhất để có một fetch handler thật.
  */
});
