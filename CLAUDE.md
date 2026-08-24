@AGENTS.md

# Web giao ảnh Hamita Wedding House

Web cho khách xem ảnh cưới và tự chọn ảnh. **Ảnh nằm nguyên trên Google Drive
của studio**, web chỉ là lớp hiển thị — không upload lại, không tốn chỗ chứa.
Thay thế dịch vụ Gump studio đang thuê.

Đang chạy tại https://hamita-gallery.vercel.app · trang quản lý ở `/admin`.
Tài khoản dùng chung cho Google, Neon và Vercel: `hamita.studio@gmail.com`.

Chi tiết đầy đủ về trạng thái, việc còn treo và bối cảnh: đọc **`BAN-GIAO.md`**.
Kiến trúc từng file và các bước cài đặt: đọc **`README.md`**.

---

## Giao tiếp

- **Tên của trợ lý trong dự án này là Tris** — do anh đặt. Dùng khi tự giới
  thiệu hoặc khi được hỏi tên.
- **Luôn trả lời bằng tiếng Việt.** Xưng "em", gọi người dùng là "anh".
- Giải thích **lý do**, không chỉ đưa kết quả.
- **Đo đạc thật, không đoán.** Có số liệu thì đưa số liệu.
- **Báo lỗi trung thực**, kể cả lỗi do chính mình gây ra.

---

## Nguyên tắc tuyệt đối không được đổi

Đây là những quyết định đã chốt sau khi thử và loại các phương án khác. Muốn
thay đổi thì phải hỏi trước và nêu rõ lý do.

**1. Chỉ có MỘT chế độ truy cập: xem tự do, cần mã để chọn ảnh.**
Khách mở link là xem được toàn bộ ảnh. Muốn tim/tick thì phải nhập mã của album
(dạng `HAMITA-AB12`). Đã từng làm ba chế độ rồi gỡ đi — đừng thêm lại.

**2. Cả album dùng chung MỘT mã, nên chung MỘT danh sách chọn.**
Nhờ vậy cô dâu chọn trên điện thoại rồi mở laptop vẫn thấy đúng, và hai người
cùng tim một tấm chỉ tính một lần. Đừng nhận diện từng khách riêng (đã thử bằng
số điện thoại rồi bỏ).

**3. Kiểm tra mã ở PHÍA MÁY CHỦ, không chỉ giấu nút.**
`/api/selections` phải tự xác thực. Giấu nút ở giao diện là vô nghĩa.

**4. Không chụp danh sách ảnh vào database.**
Mỗi lần khách mở trang thì đọc thẳng Drive (cache 5 phút). Đây là thứ làm nên
"link sống": studio thả folder mới vào Drive là khách F5 thấy ngay.

**5. Kích thước ảnh tính theo CẠNH DÀI, không phải chiều rộng.**
Ảnh cưới phần lớn là ảnh dọc; giới hạn theo chiều rộng sẽ cho ra ảnh cao gấp
rưỡi mức màn hình cần.

**6. Luôn ưu tiên bản dựng sẵn của Google, dùng tham số `=s`.**
Xin cỡ **bằng hoặc lớn hơn** ảnh gốc thì Google trả về nguyên file gốc (có thể
6 MB). Dùng `=w` là dính bẫy này.

**7. Không dùng `next/image`.** Vercel giới hạn số ảnh tối ưu mỗi tháng; việc
resize đã do `/api/img` lo.

**8. Chỉ nhận 5 cỡ ảnh cố định** (320/640/960/1440/2048). Cho truyền cỡ tuỳ ý
thì cache vỡ vụn và dễ bị lạm dụng.

**9. Trang quản lý KHÔNG gọi Drive.**
Ảnh bìa, số ảnh, tên thư mục con đều lưu sẵn trong database, chụp lại lúc tạo
link và mỗi lần bấm "Làm mới". Đọc thẳng Drive thì 10 album là ~70 lần gọi,
chậm 8–10 giây mỗi lần mở trang.

**10. Ảnh bìa do người dùng chọn có cờ `coverPinned`** — nếu không, mỗi lần
"Làm mới" sẽ ghi đè bằng tấm đầu tiên.

**11. Mọi lớp CSS dùng chung phải nằm trong `@layer components`.**
Viết ngoài layer thì CSS thường luôn thắng lớp tiện ích của Tailwind — `padding`
của `.input` sẽ nuốt mất `pl-10`. Lỗi này âm thầm, không báo lúc build.

**12. Giao diện cố định tông sáng**, không đổi theo cài đặt máy khách. Album gửi
khách là bộ mặt studio nên phải giống nhau trên mọi máy. Riêng khung xem ảnh to
vẫn nền đen.

**13. `/api/download/[fileId]` bắt buộc kèm `?slug=`.**
Máy chủ tra ngược slug → gallery → kiểm `allowDownload` và ảnh có thật sự nằm
trong album đó không. Thiếu slug hoặc ảnh không thuộc album là 400/403/404.
Từng có lỗ hổng: route cũ nhận bất kỳ mã ảnh nào, không kiểm tra gì — ai xem
trang album cũng ghép được link tải bản gốc dù studio đã tắt quyền tải.

**14. Ô nhập mã album dùng chung `rateLimit.ts` với khoá tiền tố `code:`.**
Mã chỉ có 33.856 tổ hợp (2 chữ + 2 số) — không khoá thì máy dò hết trong vài
phút. Sai 8 lần/15 phút thì khoá, giống hệt trang đăng nhập admin.

---

## Đã thử và bị loại — đừng đề xuất lại

- **Nhận diện khách bằng số điện thoại** → đã code xong rồi bỏ theo yêu cầu.
- **Ba chế độ truy cập** (mở tự do / cần mã / riêng tư) → chỉ giữ một.
- **Duyệt thư mục Drive trong trang quản lý** → chỉ giữ ô dán link thủ công.
- **Phạm vi quyền `drive.file`** → Google nói rõ: chọn một thư mục KHÔNG cấp
  quyền đọc nội dung bên trong. Bắt buộc dùng `drive.readonly`.
- **Tạo thư mục mẹ chung trên Drive** → người dùng không muốn sắp xếp lại Drive.

---

## Bẫy kỹ thuật đã gặp

**Prisma 7 khác hẳn bản cũ.** Không còn engine nhị phân, bắt buộc dùng driver
adapter (`@prisma/adapter-neon`). URL kết nối để trong `prisma.config.ts` chứ
không phải trong schema. Client sinh ra là TypeScript nên script rời phải chạy
bằng `tsx` với đuôi `.mts`.

**Đổi schema xong phải dừng dev server, xoá `.next`, chạy lại.** Không thì server
giữ Prisma Client cũ và báo lỗi kiểu "Unknown argument" hay "Cannot read
properties of undefined".

**`fetch` không ném lỗi khi máy chủ trả về 4xx** — chỉ ném khi đứt mạng. **Luôn
kiểm tra `res.ok`.** Bỏ qua là giao diện hiện "đã lưu" trong khi máy chủ không
lưu gì. Lỗi này đã xảy ra hai lần trong dự án.

**`cache: "no-store"` phá việc dựng sẵn ảnh** — header đó bảo CDN đừng lưu, đúng
cái việc đang cố làm.

**Tab chạy nền bị ép `setTimeout` về 1 giây.** Mọi phép đo tốc độ trong tab ẩn
đều ra ~1000ms và hoàn toàn sai. Đo bằng `MutationObserver` hoặc sự kiện.

**Kho JSON (chỉ dùng khi chạy ở máy) cần khoá tuần tự cho CẢ đọc lẫn ghi.**
Chỉ khoá lúc ghi thì request đọc trúng lúc đang ghi sẽ thấy file rỗng.

**Chrome headless không nhúng được phông Bitter khi xuất PDF** — đã thử mọi cách,
trình duyệt thật thì bình thường. Bản in dùng Be Vietnam Pro đậm cho tiêu đề.

---

## Ranh giới khi thao tác

- **Không tự ý gỡ `ADMIN_PASSWORD`** khỏi `.env.local` để xem giao diện. Người
  dùng đã tỏ ý không thoải mái. Nhờ họ tự kiểm tra thay vì tự mở khoá.
- **Thao tác phá huỷ dữ liệu phải hỏi trước** — xoá cột, xoá bảng, xoá album.
  Cột `accessMode` hiện không dùng nhưng vẫn giữ, vì xoá là không lùi được.
- **Không thêm tính năng không được yêu cầu.** Người dùng đã gỡ nhiều thứ dư.

---

- Deploy bằng `npx vercel deploy --prod`. Vercel đẩy lên rồi build trên máy
  của họ, không nối tự động với GitHub.
- **Tài khoản Vercel phải nối với tài khoản GitHub** (Settings → Authentication →
  Login Connections). Từ khi kho có remote GitHub, Vercel đối chiếu email người
  tạo commit với tài khoản GitHub đã nối; chưa nối thì mọi bản deploy đều bị
  chặn ở trạng thái BLOCKED, không có log build nào để lần ra. Email git của kho
  này đặt là địa chỉ noreply của GitHub nên chắc chắn khớp.

---

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy ở máy |
| `npx vercel deploy --prod` | Đưa lên mạng |
| `npm run db:check` | Xem album nào khách đã chọn bao nhiêu ảnh |
| `npm run db:sync` | Chụp lại số liệu Drive cho toàn bộ album |
| `npm run db:push` | Cập nhật cấu trúc database |
