# Bàn giao — Web giao ảnh Hamita Studio

Tài liệu này để dán vào đầu một cuộc trò chuyện mới, giúp phía hỗ trợ nắm được
toàn bộ bối cảnh mà không phải hỏi lại từ đầu.

Cập nhật: 24/08/2026 (sau một đợt làm việc dài — rà bảo mật, thêm nhiều tính
năng theo gợi ý, làm trang giới thiệu, và một đợt chỉnh giao diện).

---

## 1. Dự án là gì

Web cho khách xem ảnh cưới và tự chọn ảnh, thay thế dịch vụ Gump mà studio đang
thuê (`hamitaweddinghouse.gump.gg`).

**Điểm khác biệt cốt lõi:** ảnh vẫn nằm nguyên trên Google Drive của studio,
web chỉ là lớp hiển thị. Studio không phải upload lại, không tốn tiền lưu trữ.

Khách nhận một link, xem ảnh, tim ❤️ những tấm muốn in và tick ✓ những tấm chọn
cho nhu cầu khác, ghi chú riêng từng tấm (vd "in cỡ 40x60"), rồi bấm "Báo cho
studio" khi chọn xong. Studio xem lại trong trang quản lý, xuất Excel hoặc chép
danh sách tên/mã file để giao cho bên in ảnh.

Từ 22/08/2026, địa chỉ gốc `hamita-gallery.vercel.app` là **trang giới thiệu
studio** (không còn nhảy thẳng vào `/admin` như trước) — có dịch vụ, số liệu
tin cậy từ Facebook, bản đồ, và mảng Hami Baby Studio (chụp bé và gia đình).

---

## 2. Mọi thứ nằm ở đâu

| Thứ | Ở đâu |
|---|---|
| Mã nguồn | `D:\code\photo-gallery` |
| Web đang chạy | https://hamita-gallery.vercel.app |
| Trang quản lý | https://hamita-gallery.vercel.app/admin |
| Kho GitHub | https://github.com/miticode/HamitaWebDrive (**Private**) |
| Vercel | team `hamita`, project `hamita-gallery`, **gói Hobby** |
| Database | Neon Postgres, project "Hamita Studio", vùng Singapore |
| Google Cloud | project `trihamita` |
| Tài khoản chung | `hamita.studio@gmail.com` (Google, Neon, Vercel) |

Biến môi trường nằm trong `D:\code\photo-gallery\.env.local` (đã gitignore):
`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_OAUTH_CLIENT_ID`,
`GOOGLE_OAUTH_CLIENT_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD`,
`NEXT_PUBLIC_STUDIO_NAME`.

Công nghệ: Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma 7 + Neon ·
sharp · exceljs · client-zip · TypeScript. Deploy bằng `npx vercel deploy --prod`.

---

## 3. Cách hệ thống hoạt động

**Đọc Drive:** web đăng nhập bằng chính tài khoản Google của studio (OAuth,
phạm vi `drive.readonly`). Không phải share folder cho ai — dán link folder
nào cũng đọc được. Service account cũ vẫn giữ làm đường lui nếu OAuth trục trặc.

**Link sống:** danh sách ảnh **không** được chụp vào database. Mỗi lần khách mở
trang, web đọc thẳng Drive (cache 5 phút). Studio thả thêm folder mới vào Drive
là khách F5 thấy ngay.

**Cấu trúc:** mỗi thư mục con cấp 1 trong folder khách trở thành một "bộ ảnh".
Album chỉ có một bộ thì vào thẳng lưới ảnh.

**Mã chọn ảnh:** mỗi album có một mã dạng `HAMITA-AB12`. Khách xem ảnh tự do,
nhưng phải nhập mã mới tim/tick/ghi chú/báo xong được — kiểm ở phía máy chủ,
và ô nhập mã có khoá chống dò (sai 8 lần/15 phút).

**Tải ảnh:** đi qua `/api/download`, cắt sạch metadata máy ảnh/GPS mà **không
giải nén lại ảnh** (giữ ~99,9% chất lượng gốc). Trên iPhone, nút tải mở khay
chia sẻ hệ điều hành thay vì thẻ tải xuống thường (iOS không cho web ghi thẳng
vào app Ảnh). Tải cả thư mục nén thành zip ngay trên máy khách, cảnh báo trước
nếu máy không ghi thẳng được xuống ổ đĩa và thư mục nặng hơn 400 MB.

---

## 4. Những quyết định quan trọng và lý do

Phần này quan trọng nhất — đừng sửa những chỗ này mà không đọc lý do. Đánh số
đầy đủ (14 mục) nằm trong `CLAUDE.md`, đây chỉ tóm lược những mục lớn nhất:

- **Ảnh đi qua proxy riêng** (`/api/img`), không dùng link Drive trực tiếp —
  `thumbnailLink` hết hạn sau vài giờ và bị chặn khi đông người xem.
- **Kích thước tính theo CẠNH DÀI**, không phải chiều rộng — ảnh cưới phần lớn
  là ảnh dọc.
- **Luôn ưu tiên bản dựng sẵn của Google** (`=s`, không phải `=w`) — xin cỡ
  bằng/lớn hơn gốc thì Google trả nguyên file gốc.
- **Chỉ nhận 5 cỡ ảnh cố định**, không cho truyền tuỳ ý.
- **Trang quản lý không gọi Drive** — mọi số liệu chụp sẵn trong database.
- **Cả nhà dùng chung một mã → một danh sách chọn chung.**
- **`/api/download` bắt buộc kèm `?slug=`** — máy chủ tra ngược gallery, kiểm
  `allowDownload` và ảnh có thật sự thuộc album đó không. (Vá tháng 8/2026 —
  xem mục 6, đây từng là lỗ hổng thật.)
- **`/api/img` chặn nhúng từ web khác** (dựa `Sec-Fetch-Site`/`Referer`) nhưng
  **luôn cho qua khi thiếu cả hai header** — đó là cách hệ thống "dựng ảnh sẵn"
  (`warm.ts`) tự gọi từ máy chủ, và cách Facebook/Zalo xem trước link. Chặn
  nhầm chỗ này là phá tính năng "link sống".

---

## 5. Những hướng đã thử và bị loại

- **Nhận diện khách bằng số điện thoại** — đã code xong rồi bỏ.
- **Ba chế độ truy cập** — chỉ giữ một: xem tự do, cần mã để chọn ảnh.
- **Duyệt thư mục Drive trong trang quản lý** — chỉ giữ dán link thủ công.
- **Phạm vi quyền `drive.file`** — không cấp quyền đọc nội dung bên trong,
  bắt buộc dùng `drive.readonly`.
- **Thư mục mẹ chung trên Drive** — không muốn sắp xếp lại Drive.
- **Chặn crawl `/g/[slug]` trong robots.txt** — đã thử nghĩ tới rồi bỏ: các
  trang đó tự khai `noindex` trong metadata rồi, chặn crawl sẽ khiến Google
  không đọc được chỉ thị đó.

---

## 6. Việc lớn đã làm trong đợt này (22–25/08/2026)

Tóm tắt theo nhóm, mới nhất trước — chi tiết kỹ thuật nằm trong lịch sử commit
Git (mỗi commit đều giải thích lý do dài, có số liệu đo thật).

**Chia hai mảng cưới / bé trên trang giới thiệu (25/08):**
Trang giới thiệu trước đây gom mọi ảnh vào một khu "Một vài bộ ảnh", còn phần
Hami Baby chỉ có chữ không một tấm ảnh nào — người đi tìm chỗ chụp thôi nôi
đọc xong vẫn không biết studio chụp bé ra sao. Giờ mỗi album có thêm ô tích
**"Là ảnh bé — xếp vào khu Hami Baby"** (chỉ hiện sau khi đã bật đưa lên trang
giới thiệu). Ảnh tích thì vào khu Hami Baby, không tích thì vào khu ảnh cưới.
Thanh điều hướng tách thành hai mục riêng: *Ảnh cưới* và *Chụp bé*.
Cột mới trong database: `laBaby`, mặc định `false` nên mọi album cũ giữ nguyên
ở mảng cưới.

**Rà soát lần hai, ngày 25/08 (soi cả mã nguồn lẫn bản đang chạy thật):**
- **Link album đoán được** — slug lấy thẳng tên khách, thử thật thì `/g/le-han`
  và `/g/vu-phuong-kim-tien` đều mở ra. Từ nay mọi album mới có đuôi ngẫu nhiên
  6 ký tự. 9 album cũ giữ nguyên theo ý anh (xem mục 8).
- **Thiếu header bảo mật** — web chỉ có HSTS do Vercel tự thêm. Đã thêm chống
  nhúng iframe, chống đoán kiểu tệp, và quan trọng nhất là `Referrer-Policy`:
  trước đây khách bấm từ trang album sang Facebook/Zalo là địa chỉ album riêng
  tư đi theo sang bên đó.
- **Phiếu Google lưu nguyên văn trong database** — phiếu đó mở được toàn bộ
  Drive của studio. Đã mã hoá (AES-256-GCM), tự nâng cấp bản cũ, không cần kết
  nối lại Google.
- **Drive trục trặc là khách thấy trang lỗi đỏ** — dễ hiểu nhầm studio đã xoá
  ảnh. Đã thay bằng màn hình nói rõ ảnh vẫn còn nguyên, kèm số điện thoại.
- **3 lỗi ESLint thật**, trong đó số ngày còn lại ở trang quản lý có thể lệch
  giữa máy chủ và máy anh. Đã sửa cả ba, giờ lint sạch hoàn toàn.
- Đã thử phá từ ngoài vào 6 cửa (API quản trị, tải ảnh, chọn ảnh, nhúng ảnh):
  tất cả chặn đúng. Build sạch, không lỗi TypeScript, trang album 0,3 giây.

**Bảo mật (đã rà soát toàn diện, vá xong tất cả mục đỏ/vàng tìm được):**
- `/api/download` từng không kiểm tra quyền gì — ai xem trang album cũng ghép
  được link tải bản gốc dù studio đã tắt quyền tải. Đã vá.
- Ô nhập mã album từng không giới hạn số lần thử (33.856 tổ hợp, dò được trong
  vài phút bằng script). Đã áp khoá chống dò.
- `/api/img` từng cho phép web khác nhúng ảnh thoải mái (tốn băng thông). Đã
  chặn, chừa đường cho hệ thống nội bộ và bot xem trước link.
- Xoá album từng một cú bấm là mất, không hỏi lại. Đã đổi sang popup xác nhận.
- Chưa có trang 404/lỗi mang thương hiệu. Đã làm.
- Chưa có robots.txt/sitemap.xml, trang admin từng có thể bị Google index. Đã
  làm cả ba.

**Tính năng theo gợi ý trong báo cáo rà soát:**
- Ghi chú riêng từng ảnh đã chọn (database đã có cột `note` từ trước, giờ mới
  dùng tới).
- Nút "Đã chọn xong" — khách tự báo, studio thấy ngay trong trang quản lý
  (cột `selectionsDoneAt` trên Gallery), không phải đoán.
- Xuất Excel danh sách ảnh đã chọn (`exceljs`) — gồm danh sách, thư mục, tên
  ảnh, ghi chú, thời gian chọn.
- Nút "Chép mã số ảnh" — tách phần số khỏi tên file (`HMT06704.jpg` →
  `06704`), đúng định dạng đội Media đang quen dùng (theo ảnh Gump anh gửi).
- Tải cả thư mục dưới dạng zip, nén ngay trên máy khách (`client-zip`).
- Đếm ngược hạn giữ ảnh (`expiresAt`, mặc định 90 ngày) — chỉ là lời nhắc,
  không tự khoá link.

**Trang giới thiệu (làm mới hoàn toàn, thay cho việc nhảy thẳng vào `/admin`):**
- Nội dung lấy thật từ hai trang Facebook (`facebook.com/hamitaweddinghouse`,
  `facebook.com/hamibabylongan`), gom một chỗ trong `src/lib/studio.ts`.
- Ảnh bìa cố định là poster "HAMITA Media" do anh cung cấp
  (`public/gioi-thieu-bia.jpg`), không lấy tự động từ album khách.
- Có bản đồ Google Maps hai địa điểm (Hamita Studio, Hami Baby Studio).
- Có nút Zalo — **xem việc còn treo, mục 8**, link hiện tại chưa hoạt động
  đúng khi bấm từ trình duyệt ngoài.
- Tên thống nhất còn lại đúng một nguồn: **"Hamita Studio"** (bỏ hẳn "Hamita
  Wedding House" khỏi mọi nơi khách nhìn thấy).

**Một đợt chỉnh giao diện (24/08), theo yêu cầu "chỉn chu và tinh tế":**
- Thẻ album trong trang quản lý: gộp 4 dòng cài đặt rời rạc (mã chọn ảnh, lời
  nhắn, hạn giữ ảnh, ảnh tiêu biểu) thành một khung, nhãn thẳng cột. Trạng
  thái "đã chọn xong" đổi thành huy hiệu nổi bật cạnh tên album.
- Trang quản lý nới rộng (1152px → 1440px), lưới album lên 3 cột trên màn
  hình lớn — trước đó để trống quá nhiều hai bên.
- Thanh trạng thái đầu trang khách xem: trước có thể xếp chồng tới 3 dải màu
  cùng lúc, giờ gộp còn tối đa 1.
- Sửa khoảng trắng thừa ở trang liệt kê nhiều thư mục con (dùng `space-y`
  thay div đệm cố định — xem bẫy kỹ thuật mục 7).

---

## 7. Bẫy kỹ thuật đã gặp

**Prisma 7 khác hẳn bản cũ.** Không còn engine nhị phân, bắt buộc driver
adapter (`@prisma/adapter-neon`). URL kết nối trong `prisma.config.ts`, không
phải trong schema. Client sinh ra là TypeScript, script rời chạy bằng `tsx`
đuôi `.mts`.

**Dev server giữ Prisma Client cũ.** Sau khi đổi schema, phải dừng server, xoá
`.next`, khởi động lại.

**`fetch` không báo lỗi khi máy chủ trả về 4xx.** Chỉ ném lỗi khi đứt mạng.
Luôn kiểm `res.ok`.

**`cache: "no-store"` phá việc dựng sẵn ảnh.**

**Tab chạy nền bị ép `setTimeout` về 1 giây** — đo tốc độ trong tab ẩn luôn sai.

**Kho JSON (chỉ dùng khi chạy ở máy) cần khoá tuần tự cho cả đọc lẫn ghi.**

**Chrome headless không nhúng được phông Bitter khi xuất PDF.**

**Tailwind v4 đổi `divide-y` sang dùng `border-bottom`** (trừ phần tử cuối)
thay vì `border-top` (trừ phần tử đầu) như bản cũ quen dùng. Đo nhầm thuộc
tính lúc kiểm tra layout tưởng lỗi, đo lại đúng thuộc tính thì ra đúng.

**CDN cache (`Cache-Control: immutable`, 1 năm) làm việc chặn hotlink theo
Referer chỉ có tác dụng với ảnh CHƯA từng được xem** — ảnh đã có người xem
hợp lệ trước đó thì Vercel phục vụ thẳng từ cache, không chạy lại hàm kiểm
tra nữa. Đây là giới hạn chấp nhận được (không phải lỗi), không có cách sửa
tiếp mà không phá luôn lợi ích của cache.

**`dispatchEvent(new Event('blur'))` giả không kích hoạt `onBlur` của React.**
Blur không nổi bọt (bubble) tự nhiên; phải gọi thật `element.blur()`.

**State cũ trong closure (stale closure):** dùng state để "nhớ đã xác nhận"
rồi gọi lại hàm ngay trong cùng lượt render sẽ đọc phải giá trị cũ (React
chưa kịp cập nhật). Sửa bằng cách truyền thẳng tham số vào hàm, không dựa vào
state cho quyết định cần đúng ngay lập tức.

**Link QR Zalo (`zaloapp.com/qr/p/...`) chỉ mở đúng khi quét/mở TỪ TRONG app
Zalo.** Bấm từ trình duyệt ngoài (Messenger, Chrome…) sẽ rơi về trang chủ
Zalo chung, không tới đúng hồ sơ. Không phải link chia sẻ dùng cho web được —
cần lấy đúng link "Chia sẻ" / "Copy link" (khác QR) từ trong app.

---

## 8. Việc còn treo, xếp theo mức nguy hiểm

**🔴 9 album cũ vẫn mang link đoán được.**
Slug của chúng lấy thẳng từ tên khách bỏ dấu, không có phần ngẫu nhiên nào —
đã thử thật ngày 25/08: `/g/le-han`, `/g/vu-phuong-kim-tien`,
`/g/the-lam-xuan-vy` đều mở ra bình thường. Ai biết tên cô dâu chú rể là xem
được cả bộ ảnh cưới của họ. Album tạo **từ 25/08 trở đi đã có đuôi ngẫu nhiên**
(`le-han-k7m2xq`) nên hết đoán được; anh chọn giữ nguyên 9 album cũ để link đã
gửi khách không chết. Muốn bịt luôn thì đổi slug của chúng — đổi lúc nào cũng
được, chỉ là phải gửi lại link mới cho từng nhà.

**🔴 `/api/selections?slug=...` trả dữ liệu cho bất kỳ ai, không cần mã.**
Gọi từ ngoài không kèm gì cả vẫn nhận đủ danh sách ảnh khách đã chọn kèm ghi
chú riêng của họ. Với 9 album cũ (slug đoán được) thì chỉ cần biết tên khách.
Anh chọn chưa bịt trong đợt này. Sửa thì thêm kiểm tra `daMoKhoa()` vào hàm
`GET` trong `src/app/api/selections/route.ts` — hệ quả: khách chưa nhập mã sẽ
không thấy các lựa chọn cũ, phải nhập mã trước.

**🔴 Vercel gói miễn phí cấm dùng cho việc kinh doanh.**
Nguyên văn: *"Hobby teams are restricted to non-commercial personal use
only."* Studio thu tiền khách nên thuộc diện thương mại → có thể bị tạm dừng
tài khoản, mọi link chết cùng lúc. Phương án: nâng Pro (20 USD/tháng) hoặc
VPS riêng. **Anh chưa quyết — treo từ đầu dự án tới giờ.**

**✅ Google đã Publish App — đã xác nhận tận mắt ngày 25/08/2026.**
Google Auth Platform → Audience của project **`trihamita`** ghi *Publishing
status: **In production***, User type *External*, dùng 1/100 suất người dùng.
Nghĩa là phiếu đăng nhập **không còn bị huỷ sau 7 ngày** — mối lo lớn nhất
trong bản bàn giao trước hoá ra đã được xử lý từ trước, chỉ chưa ai xác nhận.

⚠️ Ngay dưới dòng trạng thái có nút **"Back to testing"** — bấm nhầm là quay
lại đúng cái bẫy 7 ngày. Đừng đụng vào.

App chưa qua xác minh của Google (Verification Center) nhưng **không cần
làm gì**: chỉ mình anh đăng nhập bằng chính tài khoản chủ Drive. Chưa xác
minh chỉ khiến màn hình đăng nhập hiện cảnh báo "Google hasn't verified this
app" (bấm *Advanced → Go to…* là qua), hoàn toàn không ảnh hưởng độ bền của
phiếu.

**🟡 Nút Zalo trên trang giới thiệu chưa hoạt động đúng.**
Link hiện tại giải mã từ ảnh QR anh gửi, chỉ chạy khi mở trong app Zalo. Cần
anh mở app Zalo, tìm nút "Chia sẻ" trên trang cá nhân hoặc Official Account
của studio, tìm mục "Sao chép liên kết" (khác mã QR) rồi gửi link đó.

**🟡 Hai folder Drive từng ghi nhận vẫn để công khai** (`Vũ Phương & Kim
Tiên`, `Thanh Tâm & Khánh Trinh`) — chưa đo lại lần này, anh tự kiểm tra
giúp trong Drive.

**🟡 Mật khẩu admin là 10 chữ số** (giống số điện thoại). Đã có chặn dò
(sai 8 lần khoá 15 phút) nhưng vẫn nên đổi.

**🟡 Chưa thêm `TOKEN_KEY` lên Vercel.**
Web đã biết mã hoá phiếu Google trước khi ghi vào database, nhưng chỉ có tác
dụng khi biến này tồn tại. Ở máy đã đặt rồi (trong `.env.local`); trên Vercel
thì **chưa** — phải copy đúng chuỗi đó sang Vercel → Settings → Environment
Variables, rồi deploy lại. Chưa làm thì bản trên mạng vẫn lưu nguyên văn như
trước, không hỏng gì, chỉ là chưa được bảo vệ.

**🟡 Băng thông khi khách tải cả bộ ảnh.**
Ảnh gốc đi qua máy chủ chứ không tải thẳng từ Drive, nên bộ 1,6 GB tính trọn
vào hạn mức Vercel (gói miễn phí: 100 GB/tháng). Vài lượt tải cả bộ là hết
tháng. Gói Pro cho 1 TB nên nếu nâng Pro thì hết lo luôn khoản này.

**⚪ Chưa làm:** watermark trên ảnh xem trước · tên miền riêng
(hamitawedding.vn) · nút Zalo cho Hami Baby riêng · thêm vào màn hình chính
(PWA).

**⚪ Nợ kỹ thuật:** cột `accessMode` trong database không còn dùng, giữ lại
để tránh thao tác xoá không lùi được.

**Đã xong, không còn treo nữa (so với bản bàn giao trước):** xoá album không
hỏi lại · trang lỗi/không tìm thấy · tải zip cả album · xuất Excel · nút báo
đã chọn xong · ghi chú trên từng ảnh · tên gọi lẫn lộn "Hamita Wedding House"
vs "Hamita Studio".

---

## 9. Trạng thái hiện tại (đo thật ngày 25/08/2026)

**9 album**, 7.270 ảnh, database 7.944 kB / 512 MB. 5 album đang bật "đưa ảnh
bìa lên trang giới thiệu". Cả 9 album đều có mã chọn ảnh, đều cho tải, đều đã
đồng bộ, chưa album nào quá hạn (hạn 19–22/11/2026).

| Album | Ảnh | Mục | Bìa lên trang chủ |
|---|---:|---:|:---:|
| `vu-phuong-kim-tien` | 765 | 1 | ✓ |
| `dong-trieu-thuy-tien` | 990 | 1 | ✓ |
| `thanh-tam-khanh-trinh` | 1.304 | 1 | |
| `le-han` | 285 | 1 | |
| `tan-hau-ngoc-nhi` | 489 | 5 | ✓ |
| `hc-ngoc-tho-ba-ben` | 337 | 4 | |
| `the-lam-xuan-vy` | 2.027 | 6 | ✓ |
| `minh-sang-thuy-sang` | 109 | 2 | |
| `dh-thuy-vi-quoc-dai` | 964 | 5 | ✓ |

**Đính chính:** bản viết ngày 24/08 ghi "8 album, 6.306 ảnh, 4 featured" — con
số đó **sai**, đo lại thẳng từ database ngày 25/08 ra 9 album / 7.270 ảnh /
5 featured. Không có album nào bị mất như đã lo; lỗi nằm ở phép đo hôm đó.

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

## 10. Cách anh muốn được hỗ trợ

- **Trả lời bằng tiếng Việt**, xưng "em", gọi người dùng là "anh". Tên trợ lý
  trong dự án này là **Tris**.
- **Giải thích lý do**, không chỉ đưa kết quả.
- **Đo đạc thật, không đoán.** Có số liệu thì đưa số liệu — kể cả khi phải
  dựng trang thử tạm hoặc thao tác thật trên dữ liệu rồi dọn sạch ngay sau.
- **Báo lỗi trung thực**, kể cả lỗi do mình gây ra. Đừng giấu, đừng đoán bừa
  khi không chắc (ví dụ: từng phải hỏi lại anh về định dạng link Zalo thay vì
  đoán liều).
- **Không thêm tính năng thừa** ngoài yêu cầu.
- **Không tự ý gỡ mật khẩu admin để tự kiểm tra giao diện** — dùng trang thử
  tạm không cần đăng nhập (dựng xong rồi xoá) hoặc script đọc thẳng database
  thay thế.
- **Thao tác phá huỷ dữ liệu, hoặc chỉnh sửa dữ liệu thật của khách để kiểm
  thử, phải hỏi trước** — hoặc dùng dữ liệu thật rồi dọn sạch ngay, kiểm tra
  lại bằng script để chắc chắn đã sạch.

---

## 11. Đọc thêm

`README.md` mô tả chi tiết kiến trúc từng file và các bước cài đặt Google
Cloud, Neon, Vercel.

`AGENTS.md` do Next.js tự sinh, nhắc đọc tài liệu trong
`node_modules/next/dist/docs/` trước khi viết code vì bản Next này có nhiều
thay đổi phá vỡ so với các bản trước.

Lịch sử commit Git (`git log`) có giải thích lý do rất chi tiết cho từng thay
đổi, kèm số liệu đo thật — đọc khi cần hiểu sâu một quyết định cụ thể.
