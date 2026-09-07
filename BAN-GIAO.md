# Bàn giao — Web giao ảnh Hamita Studio

Tài liệu này để dán vào đầu một cuộc trò chuyện mới, giúp phía hỗ trợ nắm được
toàn bộ bối cảnh mà không phải hỏi lại từ đầu.

Cập nhật: **07/09/2026**. Web chạy tại **https://www.hamitastudio.com** trên
gói Vercel **Pro**, đang phục vụ **25 album** với **1.017 lựa chọn** của khách.
Hạ tầng khoẻ: 16/16 phép kiểm domain đạt, không còn việc nào ở mức đỏ hay cam.

**Đợt 03–07/09** sửa ba lỗi thật ảnh hưởng khách (Android không cài được app,
link rỗng không báo khi thêm ảnh, đường kiểm sức khoẻ báo nhầm), tách "Làm mới"
khỏi "Gửi thông báo", và thêm năm công cụ quan sát cho studio — xem mục 6.

*Bản cũ (27–28/08):* lên tên miền riêng và gói Pro, vá một lỗ rò rỉ danh sách
khách đã chọn, sửa mười chỗ giao diện điện thoại — xem mục 6b.

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
sharp · exceljs · client-zip · TypeScript. Deploy bằng `git push` (xem mục 9).

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

## 6. Việc lớn đã làm trong đợt này (03–07/09/2026)

Đợt này chủ yếu là **sửa lỗi tìm ra bằng đo đạc** và **thêm công cụ quan sát cho
studio**. Chi tiết từng quyết định nằm trong `CLAUDE.md` — dưới đây chỉ là bản
đồ để biết chỗ nào đã đụng tới.

### Ba lỗi thật ảnh hưởng khách, tìm ra khi rà soát (03/09)

**Khách Android không cài được app.** Hai nguyên nhân chồng nhau: nút bị giấu
khi Chrome chưa mời cài (Zalo/Facebook, Firefox, Samsung Internet đều không bắn
lời mời), và lời mời của Chrome bắn ra **trước khi React kịp nghe** — đo trên
máy bàn mạng cáp quang đã mất 2.405ms mới hydrate xong. Bằng chứng: cả 7 phiếu
thông báo trong database lúc đó đều là iPhone, **không một máy Android nào**.
Nay một `<script>` nội tuyến chốt lời mời trước khi React chạy, và điện thoại
luôn thấy nút — thiếu lời mời thì mở bảng chỉ đường thủ công. Nguyên tắc 33.

**Gửi link rỗng rồi thêm ảnh thì khách không được báo.** Điều kiện gửi có vế
"chỉ báo nếu album trước đó đã có thư mục", sai với cách studio làm việc (gửi
link trước khi có ảnh). Đo được nạn nhân đang chờ: album `hc-truc-ly-trung-tin`
0 thư mục mà đã có một máy đăng ký từ 01/09.

**`/api/suc-khoe` trả 503 liên tục trong khi Drive hoàn toàn khoẻ** — nó chọn
album "ít thư mục nhất" nên luôn vớ đúng một album rỗng rồi kết luận Drive chết.
Báo nhầm còn tệ hơn không có phép kiểm nào. Nguyên tắc 27.

### Thông báo cho khách: tách hai nút (04/09)

Trước đây bấm "Làm mới" là **vừa đọc lại Drive vừa nhắn cho khách** — nhân viên
bấm để xem ảnh đã lên chưa mà không ngờ mỗi cú bấm là một lần điện thoại khách
rung. Nay là **hai nút tách bạch**, nút gửi có bước hỏi lại và hiện rõ số máy sẽ
nhận. Nguyên tắc 34.

Kèm theo: **số đỏ trên biểu tượng app** (Badging API), cộng dồn, tự xoá khi
khách mở album. Nguyên tắc 41.

Đợt đồng bộ 5 album lệch ngày 04/09 đã gửi tin thật tới 3 máy — có bằng chứng
khách nhà Như Ý **mở album 28 giây sau khi nhận tin**.

### Công cụ mới cho studio (04–07/09)

| Thứ | Ở đâu | Nguyên tắc |
|---|---|---|
| **Bộ lọc theo tháng** | cột trái danh sách album | 36 |
| **Khung "Thông báo"** — việc studio phải tự làm | cột phải, dưới ô tạo link | 39 |
| **Khung xem ảnh to** ở trang "Ảnh khách chọn" | bấm vào ảnh | 40 |
| **Thống kê lượt tải ảnh** từng album | thẻ album + trang thống kê | 43 |
| **Gợi ý mã đầu tên album** (HC, AB, ĐH, Baby, GD, NS…) | ô "Tên khách" | 37 |

Khung Thông báo canh bốn loại: khách đã báo chọn xong, album chưa đặt gói ảnh,
khách chọn thêm sau khi đã báo xong, album mất mã bảo vệ. Bấm vào một thông báo
là đánh dấu đã đọc, dấu tích lưu trong database nên máy nào cũng thấy như nhau.

### Trang giới thiệu: khu Phim trường (03/09)

Thư mục Drive của album phim trường cũ **không còn tồn tại** (404) nên cả khu
biến mất khỏi trang giới thiệu. Anh tạo album mới "All View HamitaGarden" 60
tấm, em gắn lên và làm thêm **trang `/phim-truong`** xem đủ mọi góc chụp.

Album mới **trộn cả ảnh dọc lẫn ngang** (đo 20 tấm: 12 dọc, 8 ngang, tỉ lệ từ
0,563 tới 1,499) — khác hẳn album cũ toàn ảnh dọc. Trang chủ giữ khung 2:3 và
chỉ lấy ảnh dọc; trang xem đủ dùng lưới cột báo giữ nguyên tỉ lệ từng tấm.
Nguyên tắc 24.

### Theo yêu cầu của studio (03–07/09)

- **Khối gói ảnh** phía khách tách ra khỏi phần hướng dẫn thu gọn được, chữ to
  và rõ hơn — trước đó nó là dòng nhỏ nhất, nhạt nhất trên trang dù nói về tiền
  (nguyên tắc 38).
- **Gói ảnh nhận số 0** = gói chỉ lấy file, không kèm ảnh in.
- **Bỏ mã mẫu `123456`** khỏi ô nhập mã phía khách — ô nhập đang tự khai đáp án
  (nguyên tắc 14).
- Bộ lọc thêm mã **Baby, GD, NS**.
- Nút gửi thông báo ghi rõ **"· N máy"** thay vì số trần.

### Bản hướng dẫn dùng trang quản lý (03/09)

`docs/huong-dan-admin.html` → PDF 13 trang A4 cho nhân viên. Dựng lại bằng
`npm run pdf:huong-dan`. Hình minh hoạ là **giao diện vẽ bằng HTML/CSS**, không
phải ảnh chụp thật — trang quản lý đòi mật khẩu mà không được phép gỡ.

---

## 6b. Lịch sử các đợt trước (22–28/08/2026)

Tóm tắt theo nhóm, mới nhất trước — chi tiết kỹ thuật nằm trong lịch sử commit
Git (mỗi commit đều giải thích lý do dài, có số liệu đo thật).

### Lên tên miền riêng và gói Pro (27/08)

**https://www.hamitastudio.com**, gói Vercel **Pro**. Hai rủi ro đỏ tồn từ đầu
dự án hết cùng lúc: gói Hobby cấm dùng thương mại, và màn hình chấp thuận OAuth
còn ở chế độ Testing (Google huỷ phiếu sau 7 ngày — nếu để nguyên thì quanh
01/09 ảnh tắt cho **tất cả** khách cùng lúc). Anh đã Publish app.

Ba tên miền cùng phục vụ: `www.hamitastudio.com` là chính, `hamitastudio.com`
chuyển 308 sang www, và `hamita-gallery.vercel.app` **vẫn sống**. Cố ý chưa bật
chuyển hướng địa chỉ cũ — bật là mọi khách đang giữ link cũ phải **nhập lại mã
album**, kể cả nhà đang chọn dở.

`NEXT_PUBLIC_SITE_URL` đặt tường minh vì Vercel vẫn báo địa chỉ production là
`.vercel.app` dù đã gắn tên miền. Biến này quyết định địa chỉ trả về của Google,
sitemap và thẻ xem trước link — ba thứ không nên phụ thuộc giá trị mình không
kiểm soát. Nó nhúng **lúc build** nên đặt xong phải deploy lại.

Có script kiểm: `npm run kiem:domain -- https://...` — 16 phép kiểm, trong đó
có ba thứ **không nhìn thấy bằng mắt**: sitemap trỏ sai địa chỉ, đường kết nối
Google trỏ nhầm nơi, và link cũ đã gửi khách còn phục vụ không.

### Vá lỗ rò rỉ danh sách khách đã chọn (27/08)

Đường `GET /api/selections` vốn mở tự do: bất kỳ ai cầm link album — thứ rời
khỏi tay khách rất dễ, một lần chuyển tiếp Zalo là đủ — đọc được cả danh sách
khách đã chọn lẫn **lời dặn riêng** của họ. Ghi thì không ghi được, nhưng riêng
việc đọc đã là thứ khách không định cho ai xem ngoài studio.

Vá ở cả hai đầu: máy chủ đòi mã y như lúc ghi, và nhịp đồng bộ phía khách có
`unlocked` trong dãy phụ thuộc để nhập mã xong là tải lại ngay — thiếu chốt đó
khách nhìn màn hình trống tới 15 giây rồi tưởng lựa chọn cũ bị mất.

### Mười chỗ giao diện điện thoại (27–28/08)

Đa số khách xem bằng điện thoại, nên đo lại toàn bộ trên màn hình 375px.

**Trang bìa album nhiều thư mục** — nặng nhất. Album 8 thư mục trước đây dài
**7,9 màn hình** chỉ để xem *có những thư mục nào*: mỗi khối 573px, riêng ảnh
bìa đã 447px. Từ ba thư mục trở lên giờ xếp **hai cột**, khối còn 333px, cả
trang còn **3,7 màn hình**. Một hoặc hai thư mục vẫn giữ một cột — lúc đó không
có gì để so sánh, ảnh bìa lớn mới đáng tiền.

**Chín vùng chạm dưới 44px**, đo được từng cái:

| Chỗ | Trước | Sau |
|---|---|---|
| Nút trái tim / dấu tick | 40px, cách nhau 6px | 44px, cách 12px |
| Nút `.btn` (8 nút "Tải tất cả") | 38px | 44px |
| Nút đếm ở thanh trên | 36px | 44px |
| Nút "Đóng" khung xem ảnh | 40px | 44px |
| Nút "Nhập mã" | 16px (chữ gạch chân) | 44px, có viền |
| Số điện thoại ở thanh trên | 16px | 44px |
| Số điện thoại + email chân trang | 20px | 44px |
| Chấm chuyển ảnh (chiều ngang) | 6px | 26px |
| Link quay lại | 16px | 32px |

Nút tim và tick đáng kể nhất: hai nút **ý nghĩa ngược nhau** — tim là *in ra*,
tick là *giữ riêng* — mà đặt cách 6px. Bấm nhầm thì tấm khách muốn in rơi vào
danh sách giữ riêng, tới ngày giao ảnh mới phát hiện thiếu.

Số điện thoại cũng vậy: đó là **hành động chính của trang giới thiệu** — khách
xem xong thì việc tiếp theo là gọi — mà vùng chạm cao 16px.

Cách nới đều là `py-N -my-N`: vùng chạm dày ra mà bố cục **không xê dịch một
ly**, vì lề âm kéo lại đúng bằng phần vừa thêm.

### Ba công cụ mới cho studio (28/08)

**Nút "Chép tin nhắn"** trên thẻ album. Trước đây mỗi lần gửi album phải làm ba
việc: chép link, dán vào Zalo, rồi tự gõ mã và tự gõ lời hướng dẫn. Web đã biết
cả ba. Tin nhắn chép sẵn gồm lời chào, link, mã, hướng dẫn tim/tick, lời mời
bấm "Báo cho Hamita", và hạn giữ ảnh — bỏ dòng mã nếu album chưa đặt mã, bỏ
dòng hạn nếu không đặt hạn.

**Hàng thư mục ngang** ở đầu lưới ảnh. Trước đây đổi thư mục phải quay về trang
bìa rồi chọn lại. Điện thoại cuộn ngang trong chính hàng (không để trang xô
ngang), màn hình lớn thì xuống dòng.

**Ảnh bìa riêng cho từng thư mục con** — xem nguyên tắc 32. Gộp vào hộp chọn
bìa đang có thay vì thêm nút mới: thẻ album đã chật, mà từ góc nhìn studio hai
việc giống hệt nhau, chỉ khác ở chỗ tấm ảnh đại diện cho ai.

### Những thay đổi theo yêu cầu của studio (27–28/08)

- **Mã mặc định khi tạo link là `123456`** thay cho mã ngẫu nhiên. Anh đã gõ
  tay như vậy sau mỗi lần tạo album rồi. Đánh đổi đã nói rõ và anh chấp nhận:
  ai từng nhận mã của một nhà thì mở được album nhà khác nếu có link. Nút "Sinh
  mã mới" vẫn sinh ngẫu nhiên — nếu nó cũng trả về `123456` thì bấm xong mã
  không đổi, nút thành vô nghĩa.
- **Hướng dẫn chọn ảnh còn ba bước**, bỏ "Ngắm ảnh thật kỹ" (chỉ dạy khách chạm
  vào ảnh — thứ ai cầm điện thoại cũng tự làm). Đánh số lại 01–03 liền mạch.
- **Bỏ khối "Phân vân quá, chọn tấm nào bây giờ?"**. Hệ quả: trang album không
  còn số điện thoại ở đâu, trừ màn hình báo lỗi Drive.
- **Khu Hami Baby** đổi sang tông trắng hồng, **khu Phim trường** sang tông giấy
  da châu Âu. Cách làm là ghi đè bảng màu trong phạm vi khu (`.khu-baby`,
  `.khu-phim-truong`) chứ không đè từng lớp — nhờ `@theme inline`, mọi tiện ích
  màu của Tailwind đọc biến lúc chạy nên cả khu đổi theo, kể cả thứ thêm sau
  này. Chữ chính giữ nguyên màu đậm để đọc rõ như mọi khu khác.
- **Lời dặn của khách hiện trên từng ảnh** ở trang "Ảnh khách chọn", cả hai danh
  sách. Trước đây chỉ đọc được ở đơn giao in, mà đơn đó chỉ lấy danh sách trái
  tim — nên lời dặn trên tấm giữ riêng không hiện ở đâu cả.
- **Ô ghi chú có nút "Lưu"** — xem nguyên tắc 31.
- **Khối xác nhận "đã chọn xong" ở cuối trang thư mục**, nói rõ tên thư mục.
- **Nhãn "Đã chọn xong"** trên thẻ album giờ ghi đúng chữ đó, thay vì chỉ ghi
  tên thư mục và giấu ý nghĩa trong tooltip (trên điện thoại không rê chuột được).
- **Sao lưu bằng lệnh cũng ghi mốc**, không riêng nút bấm. Trước đó
  `npm run db:backup` không cập nhật mốc, nên nếu anh đặt lịch chạy hằng tuần
  theo hướng dẫn README thì trang quản lý sẽ báo "lần cuối cách đây 40 ngày"
  mãi mãi.

### Năm công cụ mới cho studio (26/08, chiều)

Làm theo đúng thứ tự trong bản rà soát rủi ro — cái nào cứu studio khỏi rắc rối
thật thì làm trước, không theo độ khó.

**Khung "Kho ảnh" ở đầu trang quản lý.** Hạn giữ ảnh trước đây chỉ là dòng đếm
ngược cho khách xem, không ai nhắc studio dọn — và hậu quả là Drive đầy 99,5%
mà không ai biết. Giờ đầu trang quản lý có thanh dung lượng Drive (đổi màu từ
75%, cảnh báo từ 90%), danh sách album quá hạn kèm dung lượng dọn được, và
album sắp tới hạn. Tự giấu đi khi kho còn rộng và không album nào quá hạn.

Giữ được nguyên tắc 9 (trang quản lý không gọi Drive): dung lượng từng album
chụp vào cột mới `dungLuongMB` ngay trong lần đọc Drive của "Làm mới" — lần đọc
đó vốn đã mang sẵn kích thước từng tệp. Riêng dung lượng cả tài khoản tách ra
`/api/admin/kho-anh`, gọi từ trình duyệt **sau khi** trang đã hiện.

**Sao lưu và phục hồi database.** `npm run db:backup` ghi ra `data/sao-luu/`,
giữ 8 bản gần nhất. Hoặc bấm nút **"Sao lưu ngay"** ở trang quản lý — cùng dữ
liệu, tệp tải thẳng về máy. Nút hiện luôn "Lần cuối: N ngày trước".

Ba quyết định về an toàn: **không sao lưu phiếu Google** (mở được toàn bộ Drive,
mà phục hồi xong chỉ cần bấm "Kết nối lại"); **mặc định là xem trước**, phải gõ
`--ghi` mới động vào database; **phục hồi chỉ THÊM**, không bao giờ ghi đè hay
xoá — vì tình huống thật gần như luôn là "lỡ xoá một album", cho ghi đè thì một
lần phục hồi nhầm sẽ xoá mất lựa chọn khách vừa làm hôm nay.

**Đường kiểm tra sức khoẻ** `/api/suc-khoe` — trả 200 khi khoẻ, 503 khi hỏng.
Kiểm đúng hai thứ khách cần: database đọc được, ảnh trên Drive đọc được. Không
chỉ hỏi "trang có mở được không", vì trang chủ trả 200 ngay cả khi Drive đã
đứt. Phần gọi thử và nhắn tin **phải để dịch vụ ngoài lo** — thứ canh chừng nằm
cùng chỗ với thứ nó canh thì Vercel sập là nó sập theo. Hướng dẫn nối
UptimeRobot nằm trong `README.md`.

**Đơn giao in** `/admin/[slug]/don-in` — tờ đưa cho bên in: chỉ ảnh phải in,
kèm mã số, ghi chú cỡ in của khách, và tiền phát sinh tính sẵn. In ra giấy hoặc
chép gửi đội Media. Quy tắc tính tiền lấy từ **đúng lời đã nói với khách**: chỉ
danh sách trái tim được in và tính tiền, danh sách tick là ảnh khách giữ riêng.

**Thống kê** `/admin/thong-ke` — xếp theo việc cần làm: phần đầu là danh sách
khách nên nhắn (chưa mở link / đã mở mà chưa chọn / chọn dở rồi dừng), số liệu
để dưới. Phải bắt đầu đếm lượt xem mới trả lời được câu "khách đã mở link
chưa"; chỉ đếm số lần, bỏ qua bot xem trước link.

### Rà soát toàn hệ thống lần ba (26/08, sáng)

40 phép kiểm trên bản đang chạy. Kết quả tốt: mọi cửa quản trị chặn đúng, chọn
ảnh đòi mã đúng, tải ảnh kiểm quyền đúng, đủ 5 header bảo mật, phiếu Google đã
mã hoá, ảnh bìa admin ghim không bị "Làm mới" ghi đè, 26 lựa chọn đều thuộc thư
mục còn tồn tại.

Tìm ra **hai album thật mang mã dễ đoán** (`00000` và `123456`) — vẫn chưa sửa,
xem mục 8.

Bản rà soát rủi ro và lộ trình đầy đủ nằm ở một trang riêng, có biểu đồ dung
lượng Drive: https://claude.ai/code/artifact/3fba3b55-9c9e-4398-8ab8-748d7e6c914a

### Trang giới thiệu kể chuyện thay vì liệt kê dịch vụ (26/08)

Lưới năm ô dịch vụ có icon đổi thành **năm chương theo đúng thứ tự chúng diễn
ra** với một cặp đôi: ngồi nghe trước đã → chọn váy chọn vest → sáng hôm chụp →
buổi chụp → thứ còn lại sau tất cả. Có sợi chỉ dọc nối các chương vì đây là
trình tự thật.

**Ràng buộc về sự thật, không phải lựa chọn văn phong:** không ai biết chuyện
thành lập studio nên không kể chuyện thành lập. Câu chuyện là hành trình *của
khách* — mọi câu đều kiểm chứng được từ dịch vụ có thật, và cách kể đó còn đặt
khách vào giữa câu chuyện.

Đoạn "Về Hamita" giờ nêu quan điểm (*"Ảnh cưới đẹp thì nhiều. Ảnh giống anh chị
thì hiếm."*) thay vì đọc lại danh sách dịch vụ bằng câu văn. Thêm câu mở đầu và
câu kết. Mọi chữ khách đọc nằm trong `src/lib/studio.ts`.

### Trang giới thiệu chia bốn khu (26/08)

Trước đây chỉ có hai: ảnh cưới và Hami Baby. Nay thành **bốn**:

| Khu | Nội dung | Cách lấy ảnh |
|---|---|---|
| Ảnh cưới | ảnh chụp trong buổi cưới | một ảnh bìa mỗi album |
| Album và hình cổng | sản phẩm in khách cầm về | một ảnh bìa mỗi album |
| Phim trường | bối cảnh riêng của studio | **nhiều ảnh** từ một album |
| Hami Baby | mảng chụp bé | một ảnh bìa mỗi album |

**Phim trường Hamita Garden** lấp một lỗ hổng cũ: "Phim trường độc quyền" vốn
đã nằm trong danh sách dịch vụ nhưng chỉ có một dòng chữ và cái icon — đúng y
vấn đề mà khu Hami Baby từng mắc. Khu này lấy 8 trong 16 góc chụp.

**Album và hình cổng** tách khỏi ảnh cưới theo yêu cầu của anh: khách nhìn hai
thứ đó với hai mục đích khác nhau — xem ảnh cưới là xem *phong cách chụp*, xem
album và hình cổng là xem *thứ mình sẽ cầm về*.

Ở trang quản lý, ô tích "Là ảnh bé" đổi thành **bốn ô tròn** (Ảnh cưới / Album
& hình cổng / Phim trường / Ảnh bé). Ô tròn chứ không phải ô vuông vì bốn khu
loại trừ nhau — ô vuông thì tích được hai cái cùng lúc rồi không ai đoán được
album hiện ở đâu. Trong database gộp thành **một cột chữ** `khuGioiThieu`; hai
cột cũ `laBaby`/`laPhimTruong` giữ lại nhưng không còn dùng.

Chi tiết kỹ thuật và lý do chọn khung ảnh từng khu: `CLAUDE.md` nguyên tắc 24.

### Vá lỗ hổng mất lựa chọn khi hai máy cùng chọn (26/08)

Nguyên tắc 2 nói cả nhà dùng chung một mã nên chung một danh sách chọn. Nhưng
trang khách chỉ tải danh sách đó **đúng một lần lúc mở trang**, nên cô dâu chọn
trên điện thoại thì chú rể đang mở laptop không thấy gì.

Cộng với việc máy chủ tự lật ngược trạng thái, ra một lỗi mất dữ liệu im lặng —
**đo thật trên bản đang chạy**:

```
Máy A (vợ)    thả tim tấm X  →  {"selected":true}
Máy B (chồng) thả tim tấm X  →  {"selected":false}   ← máy chủ XOÁ
```

Chồng bấm **tim** mà máy chủ **bỏ chọn**, vì máy chồng vẫn giữ trạng thái cũ.
Và vì trang khách chỉ kiểm `res.ok` chứ không đọc giá trị trả về, **cả hai màn
hình đều hiện tim đỏ trong khi database trống rỗng** — xuất Excel giao bên in
là thiếu tấm đó, không ai biết.

Vá ở ba lớp: máy khách gửi thẳng ý định (`muon: true/false`) thay vì để máy chủ
lật ngược; máy khách lấy kết quả máy chủ trả về làm chuẩn; và danh sách được
hỏi lại mỗi 15 giây khi tab đang mở, cộng một lần ngay khi khách quay lại tab.

**Đã cân nhắc WebSocket và loại** — chi tiết trong `CLAUDE.md` nguyên tắc 23.
Tóm tắt: Vercel có hỗ trợ gốc từ 22/06/2026, nhưng gói Hobby giới hạn 300 giây
cứng, và mỗi kết nối ghim vào một máy chủ nên vợ chồng rơi vào hai máy khác
nhau là tin không sang được nhau (phải thêm Redis). Hỏi lại mỗi 15 giây chỉ tốn
1.329 byte / 0,25 giây và không dính hai vấn đề đó.

Tiện thể gỡ `ws` + `@types/ws` khỏi `package.json` — không file nào dùng, và đã
đo thật (giấu gói đó đi rồi chạy truy vấn database vẫn chạy: adapter Neon đi
đường HTTP, không dùng WebSocket).

### Album mở được như một app trên điện thoại (25/08)

Khách bấm một nút là album nằm trên màn hình chính điện thoại, mở ra toàn màn
hình không có thanh địa chỉ. **Mỗi album là một app riêng** — địa chỉ khởi động
trỏ đúng album đó, tên khách nằm dưới biểu tượng, biểu tượng là logo studio.

Android bấm một cái là xong. **iPhone thì Apple không cho web tự thêm lối tắt**
— không có cách nào lách, mọi web trên đời đều vậy. Nên trên iPhone nút mở ra
bảng chỉ đường ba bước có vẽ đúng biểu tượng Chia sẻ. Khách bấm link ngay
trong Zalo/Facebook thì web tự nhận ra và bảo mở bằng Safari trước — trình
duyệt trong mấy app đó không có nút Chia sẻ, chỉ đường kiểu cũ là chỉ vào một
nút không tồn tại.

### Thông báo đẩy về máy khách (25/08)

Studio thêm thư mục vào Drive rồi bấm "Làm mới" → điện thoại khách hiện thông
báo ngay trên màn hình khoá, **kể cả khi đã đóng web**. Bấm vào là mở thẳng thư
mục vừa thêm.

Tự động hoàn toàn, và chỉ báo khi **thật sự** có thư mục mới — bấm "Làm mới" để
kiểm tra mà không thêm gì thì im lặng.

Điều kiện: khách phải cài album ra màn hình chính (iPhone bắt buộc, từ iOS
16.4) và bấm đồng ý nhận tin. Hai khoá `NEXT_PUBLIC_VAPID_PUBLIC_KEY` và
`VAPID_PRIVATE_KEY` đã có trên Vercel.

### Báo hai chiều lúc đang mở trang (25/08)

- **Khách chọn xong → studio biết ngay.** Trang quản lý tự hỏi máy chủ mỗi 20
  giây, có khách vừa báo là hiện thẻ ở góc kèm đường vào xem ảnh họ chọn.
- **Studio thêm thư mục → khách thấy chấm "Mới"** cạnh tên thư mục chưa từng
  xem. Ghi nhớ trong máy khách, không lưu database — vợ đã xem không có nghĩa
  chồng đã xem. Lần đầu vào album không đánh dấu gì.

### Trạng thái "chọn xong" tách theo từng thư mục (25/08)

Trước đây là một cột chung cả album: khách xong thư mục đầu rồi sang thư mục
thứ hai thì ở đó vẫn hiện "đã báo xong". Giờ mỗi thư mục một trạng thái riêng,
và thông báo về studio nói rõ **vừa xong thư mục nào**. Thẻ album hiện từng
nhãn mang tên thư mục.

Cột `selectionsDoneAt` cũ không còn dùng (giữ lại, không xoá). Dữ liệu cũ
**không chuyển sang được** vì cách cũ chỉ biết "xong album", không biết xong
thư mục nào.

### Giao diện khách viết lại toàn bộ giọng (25/08)

Xưng **Hamita** thay cho "chúng tôi"/"studio", câu chữ ấm hơn. Rà 12 file, kể
cả các màn hình trục trặc — đó là lúc khách dễ lo nhất nên phải mềm nhất.

Thêm **bốn bước hướng dẫn chọn ảnh** đặt ngay trên lưới ảnh trong thư mục:
ngắm ảnh → thả tim → dặn dò → nhắn Hamita. Bước hai mang thông tin gói: studio
đặt **số ảnh trong gói** cho từng album ở trang quản lý, giá ảnh thêm cố định
12.000đ (sửa trong `constants.ts`, một chỗ đổi là cả hệ thống đổi).

### Trang giới thiệu và trang khách (25/08)

- **Dải ảnh bìa chạy** thay ảnh tĩnh: bốn trang album đã dàn chữ, hiện trọn tấm
  không cắt, nền lấp bằng chính tấm đó làm mờ. Ảnh gốc 60 MB nén còn 1,4 MB.
- **Bỏ hết hiệu ứng nhấp nháy** trên toàn web. Chỗ duy nhất còn chuyển động là
  vòng xoay nút "Làm mới" — ở đó nó mang thông tin thật.
- **Ảnh bìa trang khách dùng đúng tấm studio chọn** (trước đây lấy cứng tấm đầu
  tiên, nên nút "Đổi bìa" chỉ đổi được cái studio nhìn thấy).
- **Album một thư mục vẫn hiện trang bìa**, không nhảy thẳng vào lưới ảnh nữa.
- **Ảnh in khổ lớn hiện được**: hai tấm mica 60x120 và 60x90 (18000x36000 điểm
  ảnh, 187 MB) trước đây báo lỗi sau 30 giây chờ. Đã nới trần điểm ảnh.

### Trang quản lý (25/08)

- **Chế độ nền tối**, nút ở cạnh "Đăng xuất". Đo thật: đọc số liệu ở nền tối
  còn rõ hơn nền sáng (6,15 so với 5,48).
- **Sửa được tên album** tại chỗ — không làm đổi link đã gửi khách.
- **Nút "Làm mới" báo đang chạy** và khoá lại, chặn bấm chồng lên nhau.
- **Thanh kết nối Drive thu gọn** còn một dòng, giấu hai nút nguy hiểm.

### Chia hai mảng cưới / bé trên trang giới thiệu (25/08):
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

Hai rủi ro **đỏ** tồn từ đầu dự án đã hết ngày 27/08: gói Vercel Hobby cấm dùng
thương mại (đã lên **Pro**), và màn hình chấp thuận OAuth còn ở chế độ Testing
khiến phiếu Google chết sau 7 ngày (anh đã **Publish app**).

**Hiện KHÔNG còn việc nào ở mức đỏ hay cam.** Đo 07/09/2026: 0 album quá hạn
giữ ảnh, 0 album mất mã bảo vệ, Drive và database đều đọc được, 16/16 phép kiểm
domain đạt.

**🟡 Chỗ chứa trên Google Drive.**
Từng chạm **99,5%** sáng 26/08 (còn 9,97 GB) rồi anh dọn trong ngày. Con số hiện
tại xem ở khung "Kho ảnh" đầu trang quản lý — đọc ở đây thì lỗi thời ngay.

Điều đáng nhớ: phần lớn dung lượng là ảnh của những buổi chụp **xong từ lâu**,
không phải album đang phục vụ. Nguyên nhân gốc là *không có ai nhắc dọn* — khung
"Kho ảnh" sinh ra để chữa đúng chỗ đó, nhưng nó chỉ **nhắc**, không tự xoá gì.

Hệ quả nếu để đầy hẳn: Google dùng chung một kho cho Drive, Gmail và Photos, nên
đầy là **Gmail cũng ngừng nhận thư** trên `hamita.studio@gmail.com` — tài khoản
của cả Neon lẫn Vercel. Mất thư là mất đường khôi phục mật khẩu.

**🟡 Sao lưu chưa chạy tự động.**
Đo 07/09: lần gần nhất **9 ngày trước**. Lệnh và nút đều có, mốc trên trang quản
lý cập nhật đúng cho cả hai đường. Lịch tự động thì chưa đặt — lệnh PowerShell
nằm trong `README.md`; giới hạn của nó là chỉ chạy khi máy bật.

**🟡 Chưa nối dịch vụ theo dõi vào `/api/suc-khoe`.**
Đường kiểm tra chạy đúng, nhưng phần gọi thử mỗi vài phút rồi nhắn tin phải để
dịch vụ ngoài lo (lý do kiến trúc — nguyên tắc 27). Hướng dẫn bốn dòng trong
`README.md`.

**🟡 Tên thư mục trên Drive là chữ của thợ, không phải chữ của khách.**
Khách đang nhìn thấy "File gốc nhà trai", "file gốc hc", "file gốcc". Tên này
xuất hiện ở ba chỗ: thẻ thư mục, hàng thư mục ngang, và câu hỏi *"Anh chị chọn
xong thư mục ... chưa ạ?"*. Đây là việc anh làm trên **Drive**, không cần code.

**🟡 Ảnh nhớ theo mã file suốt một năm.**
Chỉnh sửa lại một tấm rồi thay bản mới trên Drive mà giữ nguyên file thì khách
vẫn xem bản cũ. Cách tránh: xoá tấm cũ, tải tấm mới lên thành file mới.

**🟡 Trang album không còn đường liên hệ nào.**
Sau khi bỏ khối "Phân vân quá…" theo yêu cầu (28/08), trang album hiện **0 liên
kết gọi điện** — trừ màn hình báo lỗi Drive. Khách nhắn ngược Zalo được, nhưng
nếu có nhà nào bỏ dở im lặng thì đây là chỗ đầu tiên đáng xem lại.

**🟡 Album lớn: khách quay lại là mất dấu.**
Đo 28/08 trên dữ liệu thật — tỉ lệ khách chọn ảnh **giảm thẳng theo số ảnh**:

| Số ảnh | Lượt mở | Đã chọn | Tỉ lệ |
|---:|---:|---:|---:|
| 216 | 5 | 13 | 6,0% |
| 270 | 31 | 11 | 4,1% |
| 773 | 15 | 6 | 0,8% |
| 1.350 | 5 | 4 | 0,3% |
| **707** | **19** | **0** | **0,0%** |

Khách **không chọn một lèo** — có nhà chọn qua **3 buổi trong 46 tiếng**. Web
chưa có gì đánh dấu "đã xem tới đây" ở mức ảnh (mới có ở mức thư mục, là chấm
"Mới"). Quay lại lần hai trong 707 tấm là mất dấu hoàn toàn. Hàng thư mục ngang
đỡ được một phần; vạch "xem tiếp từ đây" thì **chưa làm**.

**🟡 Số liệu Drive chỉ đúng sau khi bấm "Làm mới".**
Trang quản lý không gọi Drive (nguyên tắc 9) nên nó hiện con số đã chụp lại.
Media đổ thêm ảnh mà chưa ai bấm "Làm mới" thì trang vẫn hiện số cũ — 03/09 từng
lệch tới **1.353 ảnh** ở một album. Khung Thông báo **không phát hiện được** việc
này vì nó cũng không gọi Drive. Đo 07/09: còn 1 album lệch (baby- Châu, DB 81 /
Drive 88).

**🟡 Khách bấm "Báo cho Hamita" mà không thả tim tấm nào.**
Nhà "baby- Châu" báo xong với 0 tấm tim, chỉ tick giữ riêng 7 tấm. Có thể họ
hiểu nhầm hai nút tim/tick. Khung Thông báo đã nói rõ trường hợp này để studio
hỏi lại, nhưng **giao diện chọn ảnh chưa làm gì để tránh nhầm lẫn từ đầu**.


## 9. Trạng thái hiện tại (đo thật 07/09/2026)

| Số liệu | Giá trị |
|---|---:|
| Album | **25** |
| Ảnh (số đã chụp lại trong database) | **16.046** |
| Lựa chọn của khách | **1.017** |
| Máy đăng ký nhận thông báo đẩy | **20** |
| Tấm khách đã tải về | **1.707** |
| Album khách đã báo chọn xong | **10** |
| Album chưa đặt gói ảnh | **1** (tiệc sn Ngọc Trinh) |
| Album quá hạn giữ ảnh | **0** |
| Album mất mã bảo vệ | **0** |
| Sao lưu gần nhất | **9 ngày trước** |

Số ảnh, dung lượng và khu trên trang giới thiệu của từng album xem trong trang
quản lý — đọc ở đây thì lỗi thời ngay sau lần "Làm mới" kế tiếp.

**Ba mốc bắt đầu đếm, đừng kết luận sai với album cũ hơn mốc:**

| Mốc | Từ ngày | Album cũ hơn mang số 0 nhưng KHÔNG có nghĩa "chưa có" |
|---|---|---|
| Lượt xem | 26/08/2026 | `MOC_DEM_LUOT_XEM` trong `thongKe.ts` |
| Lượt tải | 06/09/2026 | `MOC_DEM_LUOT_TAI` trong `constants.ts` |

**Mã chọn ảnh:** mọi album mới mặc định `123456` (yêu cầu studio, 28/08). Muốn
mã riêng thì gõ tay hoặc bấm "Sinh mã mới" ở trang quản lý. Danh sách mã hiện
tại đọc thẳng trên trang quản lý, không chép ra đây.

Bản sao lưu gần nhất: xem `data/sao-luu/` (thư mục đã gitignore).

### Ba tên miền cùng phục vụ

| Tên miền | Vai trò |
|---|---|
| **www.hamitastudio.com** | chính — gửi link mới từ đây |
| hamitastudio.com | chuyển 308 sang www |
| hamita-gallery.vercel.app | **vẫn sống** — link đã gửi khách không chết |

Cố ý **chưa bật chuyển hướng** địa chỉ cũ: bật là mọi khách đang giữ link cũ
phải nhập lại mã album, kể cả nhà đang chọn dở. Để nguyên cho tới khi những
album hiện tại giao xong.

### Deploy: `git push` là xong

```
git push
```

Kho `miticode/HamitaWebDrive` đã nối với dự án Vercel — anh tự nối chiều
26/08/2026 trong Settings → Git. Đẩy lên nhánh `main` là Vercel tự dựng bản
production.

⚠️ **Lịch sử, để khỏi lặp lại nhầm lẫn:** bản bàn giao 25/08 đã ghi câu này khi
kho **chưa** nối. Hậu quả: suốt ngày 25 và sáng 26, mọi cú `git push` đều không
dựng gì mà không ai biết — mã nguồn nằm trên GitHub, còn web vẫn chạy bản cũ.
Phát hiện ra ngày 26/08 khi `npx vercel ls` cho thấy bản deploy mới nhất vẫn là
17 tiếng trước.

**Nên luôn kiểm sau khi push**, đừng đoán theo thời gian:

```
npx vercel ls hamita-gallery --scope hamita
```

rồi gọi một đường API vừa đổi xem nó trả về kiểu cũ hay kiểu mới.

**Đường lui khi cần đẩy gấp** (git trục trặc, hoặc muốn dựng từ mã chưa commit):
`npx vercel deploy --prod --yes --scope hamita`. Lệnh này đôi khi báo
"Not authorized" vì phiên CLI hết hạn — chạy `npx vercel login` rồi làm lại.

Cách kiểm tra bản mới đã lên chưa: gọi một đường API vừa đổi và xem nó trả về
kiểu cũ hay kiểu mới, thay vì đoán theo thời gian.

### Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy ở máy |
| `git push` | **Đưa lên mạng** (Vercel tự dựng, đã nối từ 26/08) |
| `npx vercel deploy --prod --yes --scope hamita` | Đường lui khi git trục trặc |
| `npm run db:check` | Xem album nào khách đã chọn bao nhiêu ảnh |
| `npm run db:sync` | Chụp lại số liệu Drive cho toàn bộ album |
| `npm run db:backup` | **Sao lưu database** ra `data/sao-luu/` |
| `npm run db:restore` | Liệt kê các bản sao lưu · xem trước · phục hồi |
| `npm run db:push` | Cập nhật cấu trúc database |
| `npm run kiem:domain -- https://...` | Kiểm một tên miền đã sẵn sàng chưa (16 phép) |
| `npx prisma generate` | Sinh lại Prisma Client sau khi đổi schema |
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
