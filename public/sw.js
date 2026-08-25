/*
  Service worker của album.

  Làm hai việc:

  1. Có mặt để album đủ điều kiện cài như app. Chrome trên Android chỉ bắn sự
     kiện mời cài khi trang có một service worker CÓ xử lý fetch.

  2. Nhận thông báo studio đẩy về và hiện lên màn hình khoá, kể cả khi khách đã
     đóng web. Đây là phần duy nhất chạy được lúc web không mở.

  CỐ Ý KHÔNG cache gì cả. Album là "link sống": studio thả thêm ảnh vào Drive
  là khách F5 thấy ngay. Một service worker biết cache sẽ giữ lại bản cũ và phá
  đúng tính chất đó — khách mở app thấy bộ ảnh của hôm qua mà không hiểu vì
  sao. Ảnh đã có CDN lo phần nhanh rồi, không cần thêm một lớp nữa ở đây.
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
    Để trống có chủ đích: không gọi e.respondWith() nghĩa là trình duyệt đi lấy
    như thường lệ. Đây là cách nhẹ nhất để có một fetch handler thật.
  */
});

/* ── Thông báo đẩy ──────────────────────────────────────────────────────── */

self.addEventListener("push", (e) => {
  /*
    Nội dung do máy chủ gửi kèm. Bọc trong try: nếu vì lý do gì đó gói tin
    không đọc được thì vẫn hiện một thông báo chung chung, còn hơn im lặng để
    khách không biết studio vừa nhắn gì.
  */
  let tin = {};
  try {
    tin = e.data ? e.data.json() : {};
  } catch {
    tin = {};
  }

  const tieuDe = tin.tieuDe || "Hamita Studio";
  const tuyChon = {
    body: tin.loi || "Anh chị vào xem ảnh nhé ạ.",
    icon: tin.bieuTuong || "/logo.png",
    badge: "/logo.png",
    // Rung nhẹ hai nhịp cho khách để ý, không kéo dài gây khó chịu.
    vibrate: [120, 60, 120],
    data: { duongDan: tin.duongDan || "/" },
    /*
      Gom theo album: studio nhắn hai lần liên tiếp thì thông báo sau thay chỗ
      thông báo trước, thay vì chồng một đống lên màn hình khoá của khách.
    */
    tag: tin.duongDan || "hamita",
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(tieuDe, tuyChon));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const duongDan = (e.notification.data && e.notification.data.duongDan) || "/";

  e.waitUntil(
    (async () => {
      const dsTab = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      /*
        Đang mở sẵn album đó thì đưa cửa sổ cũ lên, đừng mở thêm cái mới —
        khách bấm mấy lần sẽ có mấy cửa sổ chồng nhau.
      */
      for (const tab of dsTab) {
        if (tab.url.includes(duongDan) && "focus" in tab) return tab.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(duongDan);
    })()
  );
});
