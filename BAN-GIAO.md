# Bàn giao — Web giao ảnh Hamita Studio

Tài liệu này để dán vào đầu một cuộc trò chuyện mới, giúp phía hỗ trợ nắm được
toàn bộ bối cảnh mà không phải hỏi lại từ đầu.

Cập nhật: 26/08/2026 (vá lỗ hổng mất lựa chọn khi hai máy cùng chọn ảnh, nối
kho GitHub với Vercel, và sửa lại hướng dẫn deploy vốn ghi sai ở bản 25/08).

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

## 6. Việc lớn đã làm trong đợt này (22–26/08/2026)

Tóm tắt theo nhóm, mới nhất trước — chi tiết kỹ thuật nằm trong lịch sử commit
Git (mỗi commit đều giải thích lý do dài, có số liệu đo thật).

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

**🟡 `/api/selections?slug=...` trả dữ liệu cho bất kỳ ai, không cần mã.**
Gọi từ ngoài không kèm gì cả vẫn nhận đủ danh sách ảnh khách đã chọn kèm ghi
chú riêng của họ.

Hạ từ đỏ xuống vàng vì lý do bên dưới: giờ mọi album đều mang slug có đuôi
ngẫu nhiên, nên phải **đoán trúng cả slug** mới gọi được — không còn chỉ cần
biết tên khách như trước. Anh chọn chưa bịt. Muốn bịt thì thêm kiểm tra
`daMoKhoa()` vào hàm `GET` trong `src/app/api/selections/route.ts` — hệ quả:
khách chưa nhập mã sẽ không thấy các lựa chọn cũ.

**✅ Link đoán được — đã hết.** Trước ngày 25/08, slug lấy thẳng tên khách bỏ
dấu nên ai biết tên cô dâu chú rể là xem được cả bộ ảnh (đã thử thật:
`/g/le-han`, `/g/vu-phuong-kim-tien` đều mở ra). Từ 25/08 mọi slug mới đều có
đuôi ngẫu nhiên 6 ký tự, và anh đã dọn hết album cũ trong ngày — **cả 5 album
hiện có đều mang slug kiểu mới**, không còn cái nào đoán được.

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

**🟡 Băng thông khi khách tải cả bộ ảnh.**
Ảnh gốc đi qua máy chủ chứ không tải thẳng từ Drive, nên bộ 1,6 GB tính trọn
vào hạn mức Vercel (gói miễn phí: 100 GB/tháng). Vài lượt tải cả bộ là hết
tháng. Gói Pro cho 1 TB nên nếu nâng Pro thì hết lo luôn khoản này.

**⚪ Chưa làm:** watermark trên ảnh xem trước · tên miền riêng
(hamitawedding.vn) · nút Zalo cho Hami Baby riêng.

**✅ Đã xong trong ngày 25/08, không còn treo:**
- `TOKEN_KEY` đã có trên Vercel, phiếu Google trong database đã ở dạng mã hoá.
- Hai khoá VAPID đã có trên Vercel, thông báo đẩy chạy thật (3 máy đã đăng ký).
- Thêm album ra màn hình chính (PWA) — đã làm xong.
- Deploy giờ tự động qua GitHub, không cần lệnh CLI nữa (xem mục 9).

**⚪ Nợ kỹ thuật:** cột `accessMode` trong database không còn dùng, giữ lại
để tránh thao tác xoá không lùi được.

**Đã xong, không còn treo nữa (so với bản bàn giao trước):** xoá album không
hỏi lại · trang lỗi/không tìm thấy · tải zip cả album · xuất Excel · nút báo
đã chọn xong · ghi chú trên từng ảnh · tên gọi lẫn lộn "Hamita Wedding House"
vs "Hamita Studio".

---

## 9. Trạng thái hiện tại (đo thật cuối ngày 25/08/2026)

**5 album**, 3.417 ảnh, database 8.104 kB / 512 MB. 23 lựa chọn của khách.
**3 máy đã đăng ký nhận thông báo đẩy** — nghĩa là tính năng đó chạy thật.

| Album | Ảnh | Mục | Bìa lên trang chủ | Mảng |
|---|---:|---:|:---:|---|
| `hc-vu-phuong-kim-tien-2e4kqn` | 765 | 1 | ✓ | cưới |
| `his-dong-trieu-thuy-tien-kiqvtm` | 994 | 2 | ✓ | cưới |
| `hc-her-his-ngoc-tho-ba-ben-93r9gb` | 1.350 | 8 | ✓ | cưới |
| `baby-thuy-tien-qwsc4p` | 92 | 2 | ✓ | **bé** |
| `sn-duyen-ngo-xn4hj7` | 216 | 1 | | cưới |

Số album giảm so với bản trước (9 → 5) là do anh tự dọn bớt trong ngày, không
phải mất mát. **Mọi album hiện có đều đã mang slug kiểu mới** (có đuôi ngẫu
nhiên) — mối lo "link đoán được" ở mục 8 nhờ vậy đã tự hết theo.

Một album đã đặt số ảnh trong gói; bốn album còn lại để trống nên phần hướng
dẫn không nói tới giá.

Mã chọn ảnh của từng album xem trong trang quản lý, dòng "Mã chọn ảnh".

### Deploy: `git push` là xong (từ chiều 26/08/2026)

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
