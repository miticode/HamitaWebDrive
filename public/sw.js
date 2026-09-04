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

  e.waitUntil(
    (async () => {
      await self.registration.showNotification(tieuDe, tuyChon);
      await datSoDo(await tangDem());
    })()
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  // Bam vao thong bao la da xem, xoa so do ngay.
  e.waitUntil(xoaSoDo());
  const duongDan = (e.notification.data && e.notification.data.duongDan) || "/";

  /* "/g/le-han-abc/thu-muc" -> "/g/le-han-abc": phần gốc của album. */
  const gocAlbum = duongDan.split("/").slice(0, 3).join("/");

  e.waitUntil(
    (async () => {
      const dsTab = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      /*
        Đang mở sẵn album này thì dùng lại cửa sổ đó, đừng mở thêm cái mới —
        khách bấm mấy lần sẽ có mấy cửa sổ chồng nhau.

        Nhưng phải CHUYỂN nó tới đúng thư mục mới, không chỉ đưa lên trước.
        Bản đầu chỉ gọi focus(), nên khách đang để app ở trang bìa mà bấm thông
        báo thì app hiện lên vẫn nguyên trang bìa cũ — đúng lỗi studio gặp khi
        thử: "ấn vào nó chưa cập nhật, phải khởi động lại mới có".

        So theo GỐC album chứ không so cả đường dẫn: tab đang ở trang bìa
        (/g/slug) không thể khớp với đường dẫn thư mục (/g/slug/xyz), mà đó lại
        chính là trường hợp hay gặp nhất.
      */
      for (const tab of dsTab) {
        if (!tab.url.includes(gocAlbum)) continue;

        // Đã đứng đúng chỗ rồi thì chỉ cần đưa lên trước.
        if (tab.url.endsWith(duongDan)) return tab.focus();

        if ("navigate" in tab) {
          const moi = await tab.navigate(duongDan).catch(() => null);
          if (moi) return moi.focus();
        }
        // Không chuyển được thì thà mở cửa sổ mới còn hơn hiện sai trang.
        break;
      }

      if (self.clients.openWindow) return self.clients.openWindow(duongDan);
    })()
  );
});

/* ── Số đỏ trên biểu tượng app ──────────────────────────────────────────── */

/*
  Studio yêu cầu ngày 04/09/2026: có thư mục mới thì biểu tượng app trên màn
  hình khách phải mang một con số đỏ, giống app nhắn tin. Thông báo trên màn
  hình khoá rất dễ vuốt qua rồi quên; con số thì nằm lì đó tới khi khách mở ra.

  Chỉ chạy trên máy đã CÀI app ra màn hình chính — trình duyệt thường không có
  chỗ nào để vẽ con số. Máy không hỗ trợ thì lặng lẽ bỏ qua, không hỏng gì.
*/

/** Nơi giữ số thông báo khách chưa xem. */
const KHO_DEM = "hamita-so-do";
const KHOA_DEM = "/so";

/*
  Dùng Cache API để giữ MỘT CON SỐ, không phải để cache nội dung web.

  Nguyên tắc 21 cấm service worker này cache — cấm là cấm giữ lại ảnh và trang,
  vì thế sẽ phá "link sống" (khách mở app thấy bộ ảnh hôm qua). Ở đây không có
  ảnh hay trang nào được giữ, chỉ một con số đếm; nó phải sống qua những lần
  service worker bị hệ điều hành tắt đi giữa hai thông báo, mà biến trong bộ
  nhớ thì không. Dùng Cache API thay IndexedDB vì việc này chỉ cần ba dòng.

  ĐỪNG mở rộng kho này ra để giữ thêm thứ gì khác.
*/
async function docDem() {
  try {
    const kho = await caches.open(KHO_DEM);
    const co = await kho.match(KHOA_DEM);
    return co ? Number(await co.text()) || 0 : 0;
  } catch {
    return 0;
  }
}

async function tangDem() {
  const moi = (await docDem()) + 1;
  try {
    const kho = await caches.open(KHO_DEM);
    await kho.put(KHOA_DEM, new Response(String(moi)));
  } catch {
    /* Ghi hỏng thì con số không cộng dồn được, nhưng vẫn đặt được số đỏ. */
  }
  return moi;
}

async function xoaDem() {
  try {
    await caches.delete(KHO_DEM);
  } catch {
    /* Bỏ qua. */
  }
}

async function datSoDo(so) {
  try {
    if (self.navigator.setAppBadge) await self.navigator.setAppBadge(so);
  } catch {
    /* Máy không hỗ trợ hoặc app chưa cài — không phải lỗi. */
  }
}

async function xoaSoDo() {
  await xoaDem();
  try {
    if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch {
    /* Bỏ qua. */
  }
}

/*
  Trang báo về "khách đang xem rồi" thì xoá số. Trang tự gọi clearAppBadge()
  được, nhưng BỘ ĐẾM thì nằm bên này — không xoá thì thông báo kế tiếp cộng
  tiếp từ số cũ, khách thấy "3" trong khi chỉ có một tin mới.
*/
self.addEventListener("message", (e) => {
  if (e.data && e.data.kieu === "xoaSoDo") e.waitUntil(xoaSoDo());
});
