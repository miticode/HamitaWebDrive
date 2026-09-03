/**
 * Chốt lời mời cài app của Chrome TRƯỚC KHI React kịp chạy.
 *
 * Chrome trên Android bắn sự kiện `beforeinstallprompt` đúng MỘT lần, ngay khi
 * trang đủ điều kiện cài — không ai nghe lúc đó thì sự kiện mất luôn, không có
 * cách nào đòi lại. Trước đây chỗ nghe nằm trong `useEffect` của `NutLuuApp`,
 * tức là phải đợi React tải xong và dựng lại cả trang mới bắt đầu nghe.
 *
 * Đo ngày 03/09/2026 trên chính trang album đang chạy, máy bàn mạng cáp quang:
 * `domInteractive` = 2.405ms. Điện thoại Android tầm trung dùng 4G còn lâu hơn
 * nhiều. Lần khách vào thứ hai trở đi, service worker đã nằm sẵn nên Chrome xét
 * đủ điều kiện gần như ngay lập tức — sự kiện bắn ra khi React còn chưa động
 * đậy, và nút "Lưu bộ ảnh ra màn hình chính" không bao giờ hiện. Đúng triệu
 * chứng anh gặp: khách Android không tạo được app.
 *
 * Đoạn script này nằm thẳng trong HTML nên trình duyệt chạy nó lúc đọc trang,
 * trước mọi thứ của React. Nó giữ sự kiện lại trên `window` rồi báo cho giao
 * diện biết; `NutLuuApp` đọc lại từ đó, không cần tự mình bắt kịp nữa.
 *
 * Đặt ở layout chứ không phải trong trang: layout dựng ra sớm hơn và bọc cả
 * trang bìa lẫn trang xem ảnh, nên dù sau này có đặt nút mời cài ở đâu thì sự
 * kiện cũng đã được giữ sẵn.
 */
const CHOT_LOI_MOI_CAI = `
(function () {
  try {
    window.__hamitaCaiApp = window.__hamitaCaiApp || null;
    window.addEventListener("beforeinstallprompt", function (e) {
      /* Chặn thanh mời cài mặc định để tự đặt nút vào đúng chỗ mình muốn. */
      e.preventDefault();
      window.__hamitaCaiApp = e;
      window.dispatchEvent(new Event("hamita:co-the-cai"));
    });
    window.addEventListener("appinstalled", function () {
      window.__hamitaCaiApp = null;
      window.dispatchEvent(new Event("hamita:da-cai"));
    });
  } catch (e) {
    /* Hỏng thì cùng lắm mất nút mời cài, album vẫn xem bình thường. */
  }
})();
`;

export default function AlbumLayout({ children }: LayoutProps<"/g/[slug]">) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: CHOT_LOI_MOI_CAI }} />
      {children}
    </>
  );
}
