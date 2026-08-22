# Bàn giao — Web giao ảnh Hamita Wedding House

Tài liệu này để dán vào đầu một cuộc trò chuyện mới, giúp phía hỗ trợ nắm được
toàn bộ bối cảnh mà không phải hỏi lại từ đầu.

Cập nhật: 21/08/2026

---

## 1. Dự án là gì

Web cho khách xem ảnh cưới và tự chọn ảnh, thay thế dịch vụ Gump mà studio đang
thuê (`hamitaweddinghouse.gump.gg`, đang có ~398 album).

**Điểm khác biệt cốt lõi:** ảnh vẫn nằm nguyên trên Google Drive của studio,
web chỉ là lớp hiển thị. Studio không phải upload lại, không tốn tiền lưu trữ.

Khách nhận một link, xem ảnh, tim ❤️ những tấm muốn in và tick ✓ những tấm chọn
cho nhu cầu khác. Studio xem lại danh sách đó trong trang quản lý.

---

## 2. Mọi thứ nằm ở đâu

| Thứ | Ở đâu |
|---|---|
| Mã nguồn | `D:\code\photo-gallery` |
| Web đang chạy | https://hamita-gallery.vercel.app |
| Trang quản lý | https://hamita-gallery.vercel.app/admin |
| Vercel | team `hamita`, project `hamita-gallery`, **gói Hobby** |
| Database | Neon Postgres, project "Hamita Studio", **vùng Singapore** |
| Google Cloud | project `trihamita` |
| Tài khoản chung | `hamita.studio@gmail.com` (dùng cho cả Google, Neon, Vercel) |

Biến môi trường nằm trong `D:\code\photo-gallery\.env.local` (đã gitignore):
`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_OAUTH_CLIENT_ID`,
`GOOGLE_OAUTH_CLIENT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`,
`NEXT_PUBLIC_STUDIO_NAME`.

Công nghệ: Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma 7 + Neon ·
sharp · TypeScript. Deploy bằng `npx vercel deploy --prod`.

---

## 3. Cách hệ thống hoạt động

**Đọc Drive:** web đăng nhập bằng chính tài khoản Google của studio (OAuth,
phạm vi `drive.readonly`). Nhờ vậy **không phải share folder cho ai** — dán link
folder nào cũng đọc được. Service account cũ (`trihamita@trihamita.iam...`) vẫn
giữ làm đường lui nếu OAuth trục trặc.

**Link sống:** danh sách ảnh **không** được chụp vào database. Mỗi lần khách mở
trang, web đọc thẳng Drive (có cache 5 phút). Studio thả thêm folder mới vào
Drive là khách F5 thấy ngay, không cần tạo link mới.

**Cấu trúc:** mỗi thư mục con cấp 1 trong folder khách trở thành một "bộ ảnh"
(vd `file gốc`, `file hoàn thiện`, `file nhà gái`). Album chỉ có một bộ thì vào
thẳng lưới ảnh, không bắt bấm qua tấm bìa thừa.

**Mã chọn ảnh:** mỗi album có một mã dạng `HAMITA-AB12`. Khách **xem ảnh tự do**,
nhưng phải nhập mã mới tim/tick được. Mã kiểm tra ở phía máy chủ.

---

## 4. Những quyết định quan trọng và lý do

Phần này quan trọng nhất — đừng sửa những chỗ này mà không đọc lý do.

**Ảnh đi qua proxy riêng, không dùng link Drive trực tiếp.**
Link `thumbnailLink` của Drive hết hạn sau vài giờ và bị chặn khi đông người
xem. Proxy còn giúp giấu link Drive và giảm dung lượng.

**Kích thước ảnh tính theo CẠNH DÀI, không phải chiều rộng.**
Ảnh cưới phần lớn là ảnh dọc. Giới hạn theo chiều rộng thì ảnh 2048px sẽ cao tới
3072px — gấp đôi mức màn hình điện thoại cần.

**Luôn ưu tiên bản dựng sẵn của Google (tham số `=s`).**
Tải bản gốc 5,8 MB chỉ để thu nhỏ là vừa chậm vừa phí. **Cái bẫy:** xin cỡ bằng
hoặc lớn hơn ảnh gốc thì Google trả về nguyên file gốc — nên phải dùng `=s`
(cạnh dài) chứ không phải `=w` (chiều rộng).

**Không dùng `next/image`.**
Vercel giới hạn số ảnh tối ưu mỗi tháng. Việc resize đã do proxy lo.

**Chỉ nhận 5 cỡ cố định** (320/640/960/1440/2048).
Để client truyền cỡ tuỳ ý thì cache vỡ vụn và dễ bị lạm dụng.

**Số liệu album lưu sẵn trong database.**
Trang quản lý **không gọi Drive lần nào** — ảnh bìa, số ảnh, tên thư mục con đều
chụp lại lúc tạo link và mỗi lần bấm "Làm mới". Đọc thẳng Drive thì 9 album là
~70 lần gọi, chậm 8–10 giây mỗi lần mở trang.

**Ảnh bìa do người dùng chọn có cờ `coverPinned`.**
Nếu không, mỗi lần "Làm mới" sẽ ghi đè bằng tấm đầu tiên.

**Cả nhà dùng chung một mã → một danh sách chọn chung.**
Giải quyết cùng lúc hai lỗi: cô dâu chọn trên điện thoại rồi mở laptop vẫn thấy
đúng, và hai người cùng tim một tấm chỉ tính một lần (trước đây đếm theo dòng
nên in dư).

**Mọi lớp CSS dùng chung phải nằm trong `@layer components`.**
Viết ngoài layer thì CSS thường luôn thắng lớp tiện ích của Tailwind — `padding`
của `.input` sẽ nuốt mất `pl-10`. Lỗi này âm thầm, không báo build.

---

## 5. Những hướng đã thử và bị loại

Đừng đề xuất lại những cái này:

- **Nhận diện khách bằng số điện thoại** — đã code xong rồi bỏ. Anh không muốn.
  Thay bằng mã album dùng chung.
- **Ba chế độ truy cập** (mở tự do / cần mã để chọn / riêng tư hoàn toàn) — đã
  làm rồi gỡ. Anh chỉ muốn **một** chế độ: xem tự do, cần mã để chọn ảnh.
- **Duyệt thư mục Drive ngay trong trang quản lý** — đã làm rồi gỡ. Anh chỉ muốn
  **dán link thủ công**.
- **Phạm vi quyền `drive.file`** — không dùng được. Google nói rõ: chọn một thư
  mục KHÔNG cấp quyền đọc nội dung bên trong.
- **Thư mục mẹ chung trên Drive** — anh không muốn sắp xếp lại Drive.

---

## 6. Bẫy kỹ thuật đã gặp

**Prisma 7 khác hẳn bản cũ.** Không còn engine nhị phân, bắt buộc dùng driver
adapter (`@prisma/adapter-neon`). URL kết nối để trong `prisma.config.ts` chứ
không phải trong schema. Client sinh ra là TypeScript nên script rời phải chạy
bằng `tsx`, đuôi `.mts`.

**Dev server giữ Prisma Client cũ.** Sau khi đổi schema, phải dừng server, xoá
`.next`, khởi động lại. Không thì báo lỗi kiểu "Cannot read properties of
undefined" hoặc "Unknown argument".

**`fetch` không báo lỗi khi máy chủ trả về 4xx.** Nó chỉ ném lỗi khi đứt mạng.
Bỏ qua `res.ok` là giao diện sẽ hiện "đã lưu" trong khi máy chủ không lưu gì —
lỗi này đã xảy ra hai lần trong dự án.

**`cache: "no-store"` phá việc dựng sẵn ảnh.** Header đó bảo CDN đừng lưu, đúng
cái việc mình đang cố làm.

**Tab chạy nền bị ép `setTimeout` về 1 giây.** Mọi phép đo tốc độ trong tab ẩn
đều ra ~1000ms và hoàn toàn sai. Đo bằng `MutationObserver` hoặc sự kiện.

**Kho JSON (chỉ dùng khi chạy ở máy) cần khoá tuần tự cho CẢ đọc lẫn ghi.**
Chỉ khoá lúc ghi thì request đọc trúng lúc đang ghi sẽ thấy file rỗng và tưởng
là không có album nào.

**Chrome chế độ headless không nhúng được phông Bitter khi xuất PDF.** Đã thử
tăng thời gian chờ, headless mới, nhúng phông dạng data URI, đổi tên họ phông —
đều không ăn, dù trình duyệt thật hiển thị bình thường.

---

## 7. Cách anh muốn được hỗ trợ

- **Trả lời bằng tiếng Việt**, xưng "em", gọi người dùng là "anh".
- **Giải thích lý do**, không chỉ đưa kết quả. Anh muốn hiểu tại sao.
- **Đo đạc thật, không đoán.** Có số liệu thì đưa số liệu.
- **Báo lỗi trung thực**, kể cả lỗi do mình gây ra. Đừng giấu.
- **Không thêm tính năng thừa.** Anh đã gỡ nhiều thứ làm dư.
- **Không tự ý gỡ mật khẩu admin để test** — anh đã tỏ ý không thoải mái.
- Việc phá huỷ dữ liệu (xoá cột, xoá bảng) thì **hỏi trước**.

---

## 8. Trạng thái hiện tại

10 album, khoảng 7.055 ảnh trên Drive, 10 lựa chọn của khách trong database
(7,7 MB / 512 MB).

Album lớn nhất: `Thế Lam & Xuân Vy` — 2.027 ảnh, 6 thư mục con.
Album `hc Thanh Duy & Yến Vy` đang trống (0 ảnh) — chờ đổ ảnh vào.

Mã chọn ảnh của từng album xem trong trang quản lý, dòng "Mã chọn ảnh".

### Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy ở máy |
| `npx vercel deploy --prod` | Đưa lên mạng |
| `npm run db:check` | Xem album nào khách đã chọn bao nhiêu ảnh |
| `npm run db:sync` | Chụp lại số liệu Drive cho toàn bộ album |
| `npm run db:push` | Cập nhật cấu trúc database |
| `npx tsx scripts/build-logo.mts assets/logo-goc.jpg` | Dựng lại logo |

---

## 9. Việc còn treo, xếp theo mức nguy hiểm

**🔴 Vercel cấm dùng gói miễn phí cho việc kinh doanh.**
Nguyên văn: *"Hobby teams are restricted to non-commercial personal use only."*
Studio thu tiền khách nên thuộc diện thương mại → có thể bị tạm dừng tài khoản,
mọi link chết cùng lúc. Hạn mức kỹ thuật thì còn thừa nhiều (băng thông mới dùng
~1,3 GB trên 100 GB). Phương án: nâng Pro 20 USD/tháng, hoặc VPS riêng
~150–300 nghìn/tháng. **Anh chưa quyết.**

**🔴 Chưa xác nhận đã bấm "Publish App" bên Google.**
Nếu ứng dụng còn ở trạng thái *Testing*, Google huỷ phiếu đăng nhập sau 7 ngày →
mọi album ngừng hiện ảnh cho tới khi vào bấm "Kết nối lại". Kiểm tra ở
Google Auth Platform → Audience.

**🔴 Nút Xoá album không hỏi lại, không có sao lưu.**
Một cú bấm nhầm là mất album kèm toàn bộ ảnh khách đã chọn. Chưa làm.

**🟡 Hai folder Drive vẫn để công khai** (`Vũ Phương & Kim Tiên`,
`Thanh Tâm & Khánh Trinh`) — khách vẫn tải được file gốc qua link Drive.

**🟡 Mật khẩu admin là 10 chữ số** (giống số điện thoại). Đã có chặn dò mật khẩu
(sai 8 lần khoá 15 phút) nhưng vẫn nên đổi.

**🟡 Chưa có trang báo lỗi / không tìm thấy** mang thương hiệu studio.

**⚪ Chưa làm:** tải zip cả album · xuất Excel danh sách · nút "gửi lựa chọn" để
khách báo đã chọn xong · ghi chú trên từng ảnh · watermark · tên miền riêng.

**⚪ Chi tiết nhỏ:** logo ghi "hamita WEDDING HOUSE" nhưng tên hiện trên tab là
"Hamita Studio". Anh chưa quyết đổi hay giữ.

**⚪ Nợ kỹ thuật:** cột `accessMode` trong database không còn dùng, giữ lại để
tránh thao tác xoá không lùi được. Muốn dọn thì phải có anh đồng ý rõ ràng.

---

## 10. Đọc thêm

`README.md` trong cùng thư mục mô tả chi tiết kiến trúc từng file và các bước
cài đặt Google Cloud, Neon, Vercel.

`AGENTS.md` do Next.js tự sinh, nhắc phải đọc tài liệu trong
`node_modules/next/dist/docs/` trước khi viết code vì bản Next này có nhiều thay
đổi phá vỡ so với các bản trước.
