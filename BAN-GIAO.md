# Bàn giao — Web giao ảnh Hamita Studio

Tài liệu này để dán vào đầu một cuộc trò chuyện mới, giúp phía hỗ trợ nắm được
toàn bộ bối cảnh mà không phải hỏi lại từ đầu.

Cập nhật: **10/09/2026**. Web chạy tại **https://www.hamitastudio.com** trên
gói Vercel **Pro**, đang phục vụ **33 album** với **1.362 lựa chọn** của khách.
Hạ tầng khoẻ: không còn việc nào ở mức đỏ hay cam.

**Đợt 08–10/09** viết lại toàn bộ cách điện thoại tải ảnh (bỏ file nén, chia đợt
theo cú chạm cho Android, khay chia sẻ chỉ còn dành cho iPhone), thêm khung "Hỏi
Hamita" trả lời sẵn không dùng AI, cho thẻ album biết đã gửi thông báo cho khách
chưa, và dọn rác toàn hệ thống hai đợt — xem mục 6.

*Bản cũ (03–07/09):* sửa ba lỗi thật ảnh hưởng khách, tách "Làm mới" khỏi "Gửi
thông báo", thêm năm công cụ quan sát — xem mục 6b. *(27–28/08):* lên tên miền
riêng và gói Pro, vá lỗ rò rỉ danh sách khách đã chọn — xem mục 6c.

---

## 1. Dự án là gì

Web cho khách xem ảnh cưới và tự chọn ảnh, thay thế dịch vụ Gump mà studio đang
thuê (`hamitaweddinghouse.gump.gg`).

**Điểm khác biệt cốt lõi:** ảnh vẫn nằm nguyên trên Google Drive của studio,
web chỉ là lớp hiển thị. Studio không phải upload lại, không tốn tiền lưu trữ.

Khách nhận một link, xem ảnh, tim ❤️ những tấm muốn in (dấu tick ✓ đã bỏ ngày
15/09/2026), ghi chú riêng từng tấm (vd "in cỡ 40x60"), rồi bấm "Báo cho
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
| Web đang chạy | https://www.hamitastudio.com (hai tên miền cũ vẫn chạy — xem mục 9) |
| Trang quản lý | https://www.hamitastudio.com/admin |
| Kho GitHub | https://github.com/miticode/HamitaWebDrive (**Private**), nhánh `main` |
| Vercel | team `hamita`, project `hamita-gallery`, **gói Pro** (lên 27/08) |
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
nhưng phải nhập mã mới thả tim/ghi chú/báo xong được — kiểm ở phía máy chủ,
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
  xem mục 6c, đây từng là lỗ hổng thật.)
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

## 6. Việc lớn đã làm trong đợt này (08–15/09/2026)

Đợt này xoay quanh **khách dùng điện thoại**: tải ảnh về máy phải thật sự lưu
được, và khách phải tự trả lời được thắc mắc mà không cần nhắn sale. Kèm theo là
một đợt dọn rác toàn hệ thống. Chi tiết từng quyết định nằm trong `CLAUDE.md`
(nguyên tắc 44–49) — dưới đây là bản đồ.

### Điện thoại tải ảnh: viết lại toàn bộ (08–09/09)

**Bỏ file nén cho điện thoại.** Studio nói thẳng: *"tệp khách hàng của a dùng đt
nhiều và không biết gì về file zip"*. Nay bấm "Tải tất cả" trên điện thoại thì
từng tấm đi thẳng vào album ảnh của máy, không còn file `.zip` nằm trong thư mục
Tải về mà khách không biết mở. Máy tính vẫn tải file nén như cũ.

**Ba lỗi thật của Android, do khách báo, sửa lần lượt:**

| Khách báo | Nguyên nhân đo được | Cách chữa |
|---|---|---|
| Bấm tải một tấm mà máy không lưu | Code tải ảnh về rồi mới bấm thẻ — lúc đó cú chạm đã hết hiệu lực | Bấm thẻ trỏ thẳng `/api/download` **ngay trong cú chạm** |
| Tải cả thư mục xong mà album ảnh trống | Link `blob:` bị WebView của Messenger nuốt | Bỏ `blob:`, dùng URL thật kèm `Content-Disposition: attachment` |
| "tải đc nhưng chỉ đc vài tấm" — đúng **6 tấm** | Trình duyệt chỉ nhận lượt tải trong ~1,5 giây sau cú chạm | Chia đợt **6 tấm mỗi cú chạm**, khách bấm "Tải tiếp" |

Hai loại máy chia đợt vì **hai lý do khác hẳn nhau**, đừng gộp: iPhone giới hạn
**20 tấm/đợt** vì sức chứa khay chia sẻ; Android giới hạn **6 tấm/đợt** vì cửa
sổ hiệu lực của cú chạm. Con số 6 là **đo trên máy thật của anh**, muốn nâng thì
phải đo lại chứ đừng đoán.

**Thôi nói dối khách.** Bản cũ hiện "Đã lưu xong 6 tấm ạ" — web **không có cách
nào biết** máy có lưu thật hay không. Nay chỉ nói điều đo được: *"Hamita gửi
xong N tấm rồi ạ"*.

**Mời sang máy tính trước khi bắt đầu, không phải sau.** Thư mục 171 tấm chia 6
tấm mỗi đợt là **29 lần bấm**. Bảng cảnh báo nói thẳng con số đó để khách tự
quyết, thay vì để họ bấm tới lần thứ mười mới nhận ra.

**Máy tính bấm tải thì tải file, không mở khay chia sẻ.** Anh báo Windows hiện
hộp "Chia sẻ" thay vì tải. Khay chia sẻ nay **chỉ dành cho iPhone** — nơi nó là
đường duy nhất đưa ảnh vào album máy.

### Khung "Hỏi Hamita" trên trang album (08/09)

Studio muốn một chatbot vì *"tệp khách hàng của anh là khách ít đọc chữ trên
web"*. Đã làm bản **không dùng AI**: 10 câu hỏi có sẵn, câu trả lời sinh từ đúng
dữ liệu của album đó (số ảnh trong gói, giá ảnh thêm, hạn giữ ảnh), kèm nút gọi
Zalo và điện thoại. Không tốn phí, không bịa, không cần theo dõi.

**Mã chọn ảnh KHÔNG bao giờ nằm trong khung này** (nguyên tắc 48) — ai mở được
link cũng đọc được khung, mà mã là lớp bảo vệ duy nhất.

*Còn treo:* danh sách 10 câu mới chỉ phủ những gì bản thân trang web trả lời
được. Studio cần đưa **câu hỏi thật khách hay hỏi sale** để bổ sung.

### Bỏ dấu tick, chỉ giữ trái tim (15/09)

Anh yêu cầu bỏ hẳn dấu tick ("Ảnh chọn", giữ riêng) trên trang album. Trái tim
nay là nút chọn duy nhất: khách thả tim tấm muốn in, ghi chú, báo xong.

- **Không xoá dữ liệu:** 520 lượt tick cũ trên 13 album vẫn nằm trong database,
  chỉ không hiện ở đâu nữa (trang khách, trang "Ảnh khách chọn", đơn in, xuất
  Excel, thẻ album, thống kê). Máy chủ cũng từ chối lượt tick gửi lên từ trình
  duyệt còn mở bản cũ. **Không đổi tick thành tim** — tim là in và tính tiền.
- **5 lời dặn "ảnh bìa", "ảnh bàn" (album gd-thanh-ngan)** trước đây nằm trên
  lượt tick nên **đơn in của nhà này thiếu cả 5**. Đã chép sang lượt tim.
- **Một lời dặn còn lại anh cần xem:** album **baby-cam-nuong**, thư mục "pts Cẩm
  Nương", tấm **HMT07543** ghi "Ảnh lớn" — khách chỉ tick, không thả tim.
- Album tạo mới từ nay chỉ có danh sách trái tim. Tin nhắn chép gửi khách, phần
  hướng dẫn 3 bước và khung Hỏi Hamita đã bỏ câu về dấu tick.

### Bắt đầu phần quản lý studio, thay dần AppSheet (15/09)

Anh mua app AppSheet của người khác, không toàn quyền. Em đọc file dữ liệu của
nó (chỉ cấu trúc và số đếm) và phát hiện hai chuyện gấp:

- **File dữ liệu đứng tên người bán** (`admin@appquanlystudio.net`), chứa 1.973
  khách, 2.220 hợp đồng, sổ thu chi và lương. **Anh cần Tệp → Tạo bản sao vào
  Drive của Hamita, lặp lại mỗi tuần** tới khi chuyển xong.
- **Mật khẩu nhân viên nằm trần trong file, 25/26 cái là số điện thoại.**

Đã chốt: **không tốn thêm chi phí, không dùng GoClaw, giao diện kiểu Lark, chat
vẫn ở Zalo.** Kế hoạch đầy đủ: https://claude.ai/artifact/9NV66DHdfrjaFmLcZueTir

**Đã có (đợt 1, phần đầu):** trang `/quan-ly` (hoặc nút "Quản lý studio" trên
trang quản lý album), đăng nhập bằng tên + mật khẩu, danh bạ nhân viên nhập
từ AppSheet, cấp mật khẩu, phân quyền, nhật ký thao tác. Nhập 26 người; ngày
15/09 anh cho xoá **Võ Đại Dương (NV001) — người bán app AppSheet, không phải
nhân viên** (đang mang quyền quản lý, may chưa từng được cấp mật khẩu hay đăng
nhập). Script nhập nhân viên đã chặn không nhập lại mã này. Còn 25 người.

**Cách dùng lần đầu:**

1. Vào `/quan-ly`, gõ tên **admin** và mật khẩu quản lý album. Đăng nhập
   xong vào thẳng **trang quản lý album**; phần quản lý studio bấm link "Quản
   lý studio" ngay đầu trang đó. Từ 16/09 cả
   hệ thống chỉ còn **một màn hình đăng nhập** này — vào thẳng `/admin` cũng
   được đưa về đây rồi quay lại đúng trang cũ. **Mọi nhân viên đăng nhập đều
   vào được trang quản lý album** để làm việc (tạo link, ảnh bìa, gói ảnh, gửi
   thông báo, xem ảnh khách chọn, đơn giao in, thống kê). Riêng **xoá album,
   kết nối Google Drive và bản sao lưu chỉ Quản lý** mới làm được.
2. Mục **Nhân viên** → bấm **Cấp mật khẩu** từng người → **Chép tin nhắn gửi
   Zalo** (mật khẩu tạm chỉ hiện một lần).
   Cũng ở mục này có nút **"Đăng xuất mọi máy"**: đá mọi máy đang đăng nhập ra
   cùng lúc, kể cả máy còn giữ phiên bằng mật khẩu chung cũ và kể cả máy anh
   đang ngồi. Mật khẩu không đổi, ai có mật khẩu thì đăng nhập lại. Dùng khi có
   người nghỉ việc, mất điện thoại, hoặc muốn cả tiệm chuyển sang tài khoản
   riêng (anh bấm lần đầu 16/09).
3. Nhân viên đăng nhập bằng **số điện thoại** của mình + mật khẩu tạm, rồi bị
   bắt đặt mật khẩu riêng ngay.

**Đã thêm (15/09):** mục **Nội quy** (6 điều nhập từ AppSheet; mọi người xem,
quản lý sửa; không xoá, chỉ ngưng áp dụng) và **Thông tin studio** (chỉ quản
lý: tài khoản ngân hàng, giờ làm 08:30–18:00, nghỉ giữa buổi 1,5 giờ, 30 ngày
công, toạ độ để kiểm chấm công). Địa chỉ, hotline, Zalo vẫn chỉ sửa ở
`src/lib/studio.ts`. Tiệm có **hai cơ sở**: **377 Đỗ Tường Tự là Hamita Wedding
House** (cưới hỏi), **337 là Hami Baby** (bé, gia đình) — anh xác nhận 15/09.
Trang giới thiệu trước đó ghi nhầm 337 làm địa chỉ chung (cạnh bản đồ Wedding
House); đã sửa để hiện đủ hai cơ sở, cả trong khung Hỏi Hamita. Toạ độ chấm
công hiện chỉ một điểm gần Wedding House — tới đợt 4 cần hỏi nhân viên có chấm
công ở cả hai cơ sở không.

**Đã thêm (15/09) — xong đợt 1:** mục **Dịch vụ & trang phục**. Nhập đủ 1.018
mục từ AppSheet (95 dịch vụ, 887 trang phục, 36 sản phẩm) và 313/315 dòng chi
phí từng hạng mục (2 dòng trỏ tới mã TTPTB25x35, 15x21G không còn trong bảng
Dịch vụ bên AppSheet nên bỏ). Cả tiệm xem được, tìm theo mã/tên/chi tiết, lọc
theo nhóm. Quản lý và sale thêm, sửa mọi loại; nhân viên phòng Váy thêm, sửa
trang phục. Mã không đổi được, không xoá chỉ ngưng dùng. Chi phí hạng mục
(tiền công thợ) chỉ quản lý thấy. **Ảnh mẫu trang phục chưa có** — vẫn chờ người
bán chia sẻ thư mục ảnh của app. Trong lúc AppSheet còn chạy song song, mục
mới thêm bên đó thì chạy lại `npx tsx scripts/nhap-dich-vu.mts` (chỉ thêm mục
chưa có).

### Đợt 2 bắt đầu: hợp đồng, khách, phiếu thu chép từ AppSheet (15/09)

Anh chốt hai điều: **chạy song song** (nhân viên vẫn làm hợp đồng, phiếu thu bên
AppSheet, web tự chép sang mỗi đêm — không ai phải nhập hai nơi; xong đợt 3 anh
chọn ngày chuyển hẳn) và **nhân viên thường xem hết như sale**, chỉ không sửa.

**Đã có:** ba mục mới trên thanh bên — **Hợp đồng** (tìm theo tên, số điện
thoại, mã; lọc theo 18 trạng thái, theo loại, "đang chờ khách chọn / duyệt",
"còn nợ"; xem từng hợp đồng đủ dòng dịch vụ, trang phục, phiếu thu), **Khách
hàng** (xếp theo hợp đồng gần nhất, lọc còn nợ / chưa có hợp đồng), **Phiếu
thu** (theo tháng, tiền mặt / chuyển khoản, phiếu chờ duyệt tách riêng).

Chép lần đầu 13 giây: 1.978 khách, 2.225 hợp đồng, 6.673 dòng chi tiết (2 dòng
bên AppSheet trống mã hợp đồng nên bỏ), 3.950 phiếu thu. Chạy lại 5 giây,
không thêm trùng. Đối chiếu với số đo trực tiếp trên file AppSheet: còn nợ
**101 hợp đồng, 783.935.909đ**, khớp; các phép cộng tiền khớp y như bên đó.
Bản sao lưu đêm nặng lên 1,4 MB (nén), vẫn nhẹ.

**Nối album ảnh với hợp đồng (16/09):** ở trang "Ảnh khách chọn" của mỗi album
có nút **Gắn hợp đồng** — web gợi ý sẵn vài hợp đồng trùng tên khách, bấm một
cái là xong (gắn nhầm thì bấm "Bỏ gắn"). Gắn rồi thì mở hợp đồng ra là thấy
album, số tấm khách đã thả tim, lúc khách báo chọn xong và link đơn giao in.
Nếu khách đã báo chọn xong mà hợp đồng bên AppSheet còn ở bước "chờ khách
chọn", trang hợp đồng sẽ nhắc để nhân viên chuyển bước bên AppSheet.

### Trang quản lý album to và thoáng như Gump (17/09)

Anh muốn lưới album to cho dễ coi như trên Gump. Trước đó màn hình chia ba cột,
cột phải "Tạo link mới" chiếm 340px suốt ngày nên mỗi thẻ album chỉ còn khoảng
235px, chữ gãy dòng, ảnh bìa nhỏ. Giờ:

- **"Tạo link mới" thành một nút ở đầu trang**, bấm mới mở khung tạo link
  (Esc hoặc bấm ra ngoài để đóng).
- **Thẻ album to gấp đôi**: đo ở màn 2000×1060 của anh, thẻ rộng 520px, ảnh bìa
  tỉ lệ 3:2 cỡ 520×347; tên album và số liệu chữ to hơn. Màn 1280px vẫn 3 cột
  (thẻ 390px), điện thoại 1 cột.
- **Khối cài đặt thu gọn**: mỗi thẻ chỉ hiện một dòng "Mã … · gói … ảnh" và nút
  **Cài đặt** — bấm ra đủ năm dòng (mã chọn ảnh, lời nhắn, hạn giữ ảnh, gói ảnh,
  trang giới thiệu) như cũ.
- Màn từ 1536px vẫn giữ kiểu anh chọn hôm 07/09: trang không cuộn, chỉ lưới album
  cuộn. Nhưng khối Drive, sao lưu và kho ảnh dọn vào **cột trái** — nhờ vậy khung
  cuộn album cao 793px (trước 529px, không chứa nổi một thẻ lớn).
- Trang **"Ảnh khách chọn"** của từng album cũng to ra: trước cố định 6 cột trong
  khung 896px (mỗi tấm ~105px). Giờ trang rộng tới 2048px, số cột theo màn hình —
  màn 2000px 6 cột mỗi tấm 310×413, màn 1280px 5 cột, điện thoại 2 cột; tên file
  và lời dặn chữ to hơn.
- **Lọc theo tiến độ chọn ảnh** (17/09): hai nút đầu hàng lọc — *Chưa chọn xong*
  · *Đã chọn xong*, kèm số album. Tính theo bảng `MucXong` (khách bấm báo xong),
  không theo số tim. "Đã chọn xong" = khách báo xong ÍT NHẤT MỘT thư mục (anh
  chốt 17/09, bỏ luôn nút "Xong một phần"), khớp với nhãn xanh trên thẻ. Đo lúc
  làm: 24 / 25 trên 49 album. Kết hợp được với ô tìm, mã, tháng.

### Bấm mã xong không cần gõ tên nữa (23/09)

Trong hộp **Tạo link mới**: anh bấm mã (ví dụ **HC**) rồi bấm Tạo link luôn mà
không gõ tên — trước đây album ra tên trống trơn, chỉ còn mỗi chữ "HC".

Nay web **tự lấy tên thư mục trên Drive** ghép vào: bấm HC + thư mục
"Anh Thư & Rich Kim" → album tên **"HC - Anh Thư & Rich Kim"**. Bấm hai mã cũng
được: HIS + HER → "HIS - HER - Tấn Hưng & Kim Thơ".

Thư mục trên Drive mà **đã có sẵn mã trong tên** thì web bỏ mã cũ đi rồi mới
ghép, không ra kiểu "HC - HC Ngọc Thơ". Còn ô tên để trống hẳn thì vẫn như cũ:
album lấy nguyên tên thư mục.

### Sửa lỗi báo nhầm "khách chọn thêm sau khi báo xong" (23/09)

Anh phát hiện: nhà **Nhã Linh & Văn Chiêu** bị báo "khách chọn thêm sau khi báo
xong — 53 tấm", trong khi thật ra khách xong thư mục **File gốc nhà gái** rồi
sang **File gốc nhà trai** chọn tiếp. Đó là chuyện bình thường, không phải
chuyện cần cảnh báo.

Nguyên nhân: web lấy mốc báo xong **sớm nhất của cả album** rồi đếm mọi tấm
chọn sau mốc đó, kể cả tấm ở thư mục khác chưa hề báo xong. Nay web so **theo
từng thư mục**: chỉ đếm tấm chọn thêm trong chính thư mục khách đã báo xong.

Đo trên toàn bộ dữ liệu thật: trước khi sửa **18 album** bị báo, sau khi sửa
còn **7** — đúng những nhà khách thật sự chọn thêm sau khi chốt. Ví dụ nhà
"GD - Thanh Ngân" từ 12 tấm xuống còn 1, nhà Nhã Linh hết báo hẳn.

### Hamita Garden chia theo cảnh, anh tự quản (23/09)

Anh muốn vào Hamita Garden là thấy từng cảnh, bấm một cảnh thì ra ảnh của cảnh
đó. Cấu trúc này web đã chạy sẵn — vào `/dich-vu/hamita-garden` là lưới các thư
mục, bấm vào là xem ảnh bên trong. Lý do giờ chỉ thấy một ô: trên Drive, album
Hamita Garden đang có **đúng một thư mục con** ("All View HamitaGarden") chứa
cả 60 ảnh.

**Việc anh làm trên Drive:** chia 60 ảnh đó thành các thư mục theo cảnh —
`Lâu đài`, `Vườn Ý`, `Nhà thờ`, `Hồ bơi`… Mỗi thư mục là một cảnh. Sau này có
cảnh mới thì tạo thư mục mới rồi up ảnh vào, không cần đụng tới web.

**Bốn thứ em vừa thêm ở trang quản lý giới thiệu** để anh tự lo phần còn lại:

1. **Tên cảnh** — ô gõ ngay trên thẻ. *(Sửa 25/09: để trống thì **tự lấy tên
   thư mục trên Drive**, chữ mờ trong ô chính là cái tên khách sẽ đọc. Đổi tên
   thư mục trên Drive rồi bấm "Đọc lại từ Drive" là tên cảnh chạy theo. Chỉ gõ
   vào ô khi muốn khách đọc tên khác tên thư mục.)*
2. **Mô tả ngắn** — một dòng dưới tên, ví dụ *"Bối cảnh châu Âu, đẹp nhất buổi
   chiều"*. Hiện đè lên ảnh trong lưới, cắt một dòng cho khỏi che hình.
3. **Sắp thứ tự** — hai mũi tên ↑ ↓ ở góc ảnh, đưa cảnh đẹp nhất lên đầu.
4. **Đọc lại từ Drive** — up thêm ảnh vào thư mục thì bấm một cái, số ảnh cập
   nhật ngay. Trước đây phải gỡ ra thêm lại, mà gỡ ra là mất luôn tên và mô tả.

*(Thêm 25/09)* **Nút "↻ Đọc lại Drive" ở đầu hàng nút của mục** — dùng khi anh
vừa **tạo thư mục mới** trên Drive: bấm một cái là web đọc thẳng Drive (không
đợi năm phút), cập nhật số ảnh mọi thẻ và **báo có bao nhiêu thư mục chưa đưa
lên trang**. Ví dụ lúc em đo: *"Drive có 1 thư mục chưa đưa lên trang"* — đó
là thư mục "Ảnh lẻ" 60 ảnh. Thấy báo vậy thì bấm "Thêm vào trang giới thiệu"
để đưa nó lên. Trong ô chọn thư mục cũng có nút y hệt, phòng khi thư mục mới
chưa kịp hiện trong danh sách.

Cộng thêm: ô chọn thư mục giờ **tick được nhiều cái rồi đưa lên một lượt**, chia
mười cảnh không còn phải bấm mười lần.

Gõ tên hay mô tả xong chỉ cần bấm ra ngoài ô là web tự lưu, có dòng "Đã lưu ✓"
báo lại.

Ba thứ này dùng được cho mọi nhóm (Ảnh cưới, Album & hình cổng…), nhưng anh
chưa cần đụng tới — không điền gì thì mọi nhóm khác hiện y như cũ.

**Thứ tự đúng khi anh sửa ảnh trên Drive:** kéo/thêm/xoá ảnh trong thư mục xong
→ bấm **"Đọc lại từ Drive"** trên thẻ cảnh đó → rồi mới bấm "Đổi bìa". Web nhớ
danh sách ảnh trong 5 phút cho nhẹ máy, nên vừa đổi trên Drive mà đổi bìa ngay
thì có lúc bìa cũ đã biến mất, web báo "Ảnh này không còn trong thư mục".

Hôm 23/09 anh gặp đúng cảnh đó ở "lâu đài": bìa lưu trong web trỏ vào một ảnh
đã bị dời đi. Nay bấm "Đọc lại từ Drive" là web tự chữa — số ảnh cập nhật và
bìa hỏng được thay bằng ảnh đầu tiên còn lại. Câu báo lỗi cũng đã viết lại cho
rõ phải làm gì thay vì chỉ nói "không nằm trong thư mục".

### Lưới "Hamita chụp gì?" chia bốn thương hiệu (25/09)

Anh muốn trang chủ tách rõ bốn cái tên thay vì sáu thẻ nằm lẫn một lưới:

1. **Hamita Wedding** — Ảnh cưới · Hamita Garden *(lúc đầu có thêm Album &
   hình cổng, anh cho gỡ hẳn 25/09)*
2. **Hami Baby Studio** — Bé & gia đình
3. **Tiệm ảnh nhà Su**
4. **Váy cưới & trang điểm**

*(Sửa 25/09, cùng ngày)* **Hami Baby Studio bày thẳng các mục con** — Bầu, Sơ
sinh, Baby - Thôi nôi, Gia đình — thành lưới bốn ô thay vì một dải "Bé & gia
đình". Mục nào anh đã chọn thư mục ở trang quản lý thì ô đó có ảnh bìa và bấm
vào ra đúng mục; mục chưa có ảnh vẫn hiện tên trên nền hồng nhạt và bấm vào
dẫn về khu ảnh bé, **không dẫn vào trang trống**. Muốn ô nào có ảnh thì vào
`/admin/gioi-thieu`, tab *Bé & gia đình*, bấm "Thêm vào trang giới thiệu" cho
mục đó.

Ba phần dưới mỗi phần một **dải ngang** hết chiều ngang trang: ảnh bên trái,
tên và mô tả bên phải trên nền sáng. Trên điện thoại thì ảnh nằm trên, chữ nằm
dưới. Để một thẻ dọc đứng lẻ giữa hàng trông như lưới bị thiếu ảnh nên em làm
dải ngang.

Hai phần "Tiệm ảnh nhà Su" và "Váy cưới & trang điểm" không có dòng tiêu đề
riêng phía trên — vì tên phần trùng luôn tên trên dải, in ra thành đọc hai lần
một cái tên. Nếu anh muốn thấy đủ bốn dòng tiêu đề thì nói em, sửa một dòng.

Muốn đổi cách gom nhóm (thêm mảng mới, chuyển mảng sang thương hiệu khác) thì
sửa `PHAN_DICH_VU` trong `src/lib/studio.ts` — em làm cho.

### Cloudflare Worker bắn ảnh cho khách (28/09)

**Vì sao làm:** hoá đơn Vercel tháng 9 là **$77,97**, trong đó riêng đường tải
ảnh về ngốn **168 GB ≈ $45** — hơn nửa hoá đơn. Cloudflare không tính tiền
băng thông ra khách, gói miễn phí cho 100.000 lượt mỗi ngày mà studio chỉ dùng
khoảng 3.300.

**Cách chạy:** khách bấm tải → vẫn hỏi Vercel như cũ → Vercel **kiểm quyền y
nguyên** (album có cho tải không, ảnh có đúng thuộc album không) → trả về một
đường dẫn **đã ký tên, sống 10 phút** trỏ sang Worker → Worker lấy ảnh từ Drive
giao thẳng cho khách. Vercel chỉ còn tốn vài trăm byte mỗi lượt thay vì 1,5 MB.

**Worker không tự quyết được gì.** Không có đường nào để liệt kê thư mục hay
dò mã ảnh; muốn lấy tấm nào cũng phải có chữ ký của Vercel cho đúng tấm đó.

**Tắt đi lúc nào cũng được:** xoá hai biến `TAI_ANH_WORKER_URL` và
`TAI_ANH_KY_CHUNG` ở Vercel rồi redeploy — ảnh quay lại đi đường cũ ngay,
khách không mất đường tải.

**Đã đo trước khi bật:** chữ ký Vercel ký và Worker kiểm cho **kết quả khớp
tuyệt đối**; ký bằng bí mật khác thì bị chặn; phần gỡ thông tin máy ảnh của
Worker cho ra file **giống hệt từng byte** với Vercel trên 3 ảnh thật.

**Điều anh cần biết:** Worker cầm mã làm mới của tài khoản `hamita.studio@gmail.com`
với quyền đọc — tức đọc được toàn bộ Drive của tài khoản đó, không riêng thư
mục ảnh khách. Anh đã chọn cách này (thay vì dùng tài khoản máy phải chia sẻ
từng thư mục) sau khi em nêu rõ đánh đổi.

**Đã bật thật chiều 28/09.** Địa chỉ Worker:
`https://hamita-tai-anh.hamitastudio.workers.dev`. Tấm `MN_03822.jpg` tải về
ngon lành qua đường mới.

**Một chỗ dễ hiểu nhầm khi kiểm:** mục tải xuống của Chrome ghi "From
hamitastudio.com" kể cả khi ảnh đi qua Worker — đó là trang bấm nút, không
phải nơi file đi ra. Muốn nhìn tận mắt thì mở DevTools → Network, dòng
`/api/download` phải trả 302 rồi nhảy sang `workers.dev`.

**Đã vấp một lần khi dựng:** dán tay mã làm mới (103 ký tự, có cả `/` và `-`)
lên Cloudflare bị đứt ký tự → khách bấm tải gặp **502 "Không vào được Drive
lúc này"**. Không soi ra được vì Cloudflare khoá không cho xem lại. Nay có
`npm run khai-bi-mat-worker` bơm thẳng giá trị vào, khỏi dán tay.

**Cách dựng:** xem `worker/README.md` — có đủ từng bước và cách tắt. Hai lệnh
hay dùng: `npm run bi-mat-worker` (xem bí mật) và `npm run khai-bi-mat-worker`
(khai ba thứ của Google cho Worker).

### Trang giới thiệu thôi đánh thức database (28/09, tối)

Neon tính tiền theo **thời gian database thức**, không theo số câu hỏi. Mà
database ngủ sau 5 phút không ai gọi — nghĩa là chỉ cần cứ vài phút có một
lượt gọi là nó thức trọn ngày, kể cả 3 giờ sáng.

**Hai chỗ gọi lén tìm ra được:**

1. **Trang giới thiệu và các trang dịch vụ đọc database mỗi lượt ai ghé.**
   Chúng công khai nên bot tìm kiếm quét suốt ngày đêm. Nay dùng bản dựng sẵn.

2. **Ảnh đại diện nhân viên chỉ giữ 5 phút.** Chỗ này kín đáo hơn: trang tuy
   đã dựng sẵn nhưng có **9 tấm ảnh nhân viên**, cứ 5 phút lại có người ghé là
   chín lượt đọc database. Một mình nó đủ giữ database thức 24/7. Nay giữ một
   năm — làm được vì địa chỉ ảnh mang sẵn `?v=<lúc cập nhật>`, đổi ảnh là địa
   chỉ đổi theo.

**Studio sửa vẫn thấy ngay.** Mọi việc đụng tới nội dung mấy trang đó đều báo
trang dựng lại. Em đã rà từng việc một và tìm ra **hai chỗ thiếu**: thêm nhân
viên và sửa nhân viên. Không vá thì đổi tên, đổi phòng ban hay cho nghỉ việc
đều không hiện ra khu Đội ngũ, mà chẳng có lỗi nào báo — studio sẽ tưởng máy
hỏng. Đã vá.

**Đã đo bằng bản thật trên máy:** ba trang đều trả `x-nextjs-cache: HIT`,
trước đó là `no-store`. Ảnh nhân viên trả `max-age=31536000, immutable`.

**Một bẫy khi đo:** phải giết tiến trình đang giữ cổng 3000 trước, nếu không
`npm start` im lặng thất bại và mình đo trúng bản cũ mà không biết. Đã mắc
đúng lỗi này một lần hôm nay.

**CHƯA HẠ GÓI NEON VỘI.** Chạy vài ngày rồi vào Neon xem CU-giờ thật. Thước
đo nhanh có sẵn ở nguyên tắc 53: database chạy ở sàn 0,25 CU nên thức trọn
ngày = 6 CU-giờ/ngày; lấy CU-giờ mỗi ngày chia 0,25 ra số giờ thức. Gói miễn
phí cho 100 CU-giờ/tháng, tức trung bình phải dưới **3,3 CU-giờ/ngày**
(≈13 giờ thức). Trước khi sửa là ~4,1.

Dung lượng database chỉ **22 MB**, thừa sức so với hạn 0,5 GB của gói miễn phí
— nên chỗ vướng duy nhất là compute.

### Ảnh khách XEM cũng đi qua Worker (28/09, chiều)

Sau khi đường tải chạy ngon, em đo tiếp hoá đơn thật: hai ngày 27–28/09 tốn
**$2,86** hạ tầng, trong đó **Fast Origin Transfer $1,70 — 59%**. Phần còn lại
là `sharp` (CPU $0,41 + bộ nhớ $0,23), theo dõi Observability $0,24, dựng lại
mã $0,25.

Ảnh xem (`/api/img`) là thứ duy nhất còn đốt cả ba khoản đầu. Nay chuyển nốt
sang Worker, đường `/i/{mã}?w=960`.

**Điều làm được việc này:** Google có sẵn bản dựng ở mọi cỡ, thêm `-rw` vào
`thumbnailLink` là ra thẳng **WebP** — đúng thứ `sharp` vẫn phải chạy để tạo.
Worker chỉ lấy về giao lại, không nén lại lần nào.

**Đã đo chất lượng trước khi làm** (4 ảnh thật, lệch so với ảnh mốc, thang
0-255): cỡ 640 `sharp` hơn 0,4 — cỡ 960 hơn 0,2 — **cỡ 2048 Google hơn 0,4**.
Chênh dưới 0,5 ở mọi cỡ, mắt người không thấy; riêng cỡ khách bấm xem to thì
bản mới còn nét hơn. Kích thước điểm ảnh hai bên **khớp tuyệt đối**, nên bố
cục trang không xê dịch một li.

Ảnh nặng hơn 20–60% tuỳ cỡ, nhưng Cloudflare không tính tiền băng thông nên
không thành tiền. Bù lại có **bộ nhớ đệm của Cloudflare** (miễn phí): tấm nào
đã ai mở một lần thì người sau mở không phải gọi Drive nữa.

**Tắt lúc nào cũng được:** xoá `NEXT_PUBLIC_ANH_WORKER_URL` ở Vercel rồi
redeploy. Đường tải và đường xem tắt bật độc lập.

**Một lỗi em suýt để lọt:** lớp chặn nhúng ở Vercel đọc `Sec-Fetch-Site`, sang
Worker thì header đó vô dụng (khác tên miền nên luôn báo `cross-site`). Nếu
chỉ dựa vào `Referer` thì web khác viết `<img referrerpolicy="no-referrer">`
là lọt — tức **lỏng hơn bản cũ**. Đã bịt trước khi bật. Bộ kiểm sáu dòng nằm
trong `worker/README.md`.

### Phòng Media xoá được album (28/09)

Trước đây chỉ ban lãnh đạo xoá được album ảnh. Anh chốt mở cho **phòng Media**
— họ là người dựng album nên cũng là người biết cái nào tạo nhầm hay trùng.

Nay **9 trên 15 người** xoá được: 7 người Media và 2 người ban lãnh đạo. Các
phòng khác (Phòng Váy, Makeup, Tư Vấn, Marketing) vẫn không thấy nút xoá.

Hai thứ **không** đổi, vẫn chỉ ban lãnh đạo: kết nối / ngắt Google Drive, và
bản sao lưu dữ liệu.

Nhắc lại cho cả phòng Media biết: **xoá album là không lùi được.** Mất hết ảnh
khách đã thả tim, mất ghi chú "in cỡ 40x60", và link đã gửi khách chết theo.
Ảnh trên Drive thì vẫn còn nguyên — web chỉ là lớp hiển thị.

Người vừa được cấp mật khẩu tạm mà chưa đổi thì chưa xoá được, phải đổi mật
khẩu trước.

### Nút "Logs" — biết khách đã mở thư mục nào (28/09)

Anh up ảnh xong bấm "gửi thông báo" rồi ngồi đợi, không biết khách đã mở ra
xem chưa. Trước đây web chỉ biết khách đã vào **khi** họ bật thông báo hoặc
thả tim — cả hai đều đến muộn hơn nhiều, còn người xem rồi để đó thì không để
lại dấu vết nào.

Nay mỗi thẻ album có **nút "Logs"** cạnh bánh răng. Bấm vào hiện cửa sổ:

- **Gửi thông báo lần cuối** lúc nào — để đối chiếu.
- **Từng thư mục khách đã mở**, kèm giờ **lần đầu** mở nó.
- Chưa ai mở thì ghi rõ "Khách chưa mở thư mục nào".

Năm điều đã khoá sẵn:

- **Bấm ảnh bìa trên thẻ album là "xem thử"**, không vào log. Web đóng một
  dấu vào máy anh trong 4 tiếng, mọi thư mục mở trong khoảng đó đều không ghi
  — kể cả khi anh mở tiếp trên điện thoại chưa đăng nhập. Link **chép gửi
  khách** vẫn là link sạch, khách mở vẫn ghi bình thường.
- **Lượt Next tải sẵn không tính.** Khi khách mới đứng ở trang danh sách, web
  đã âm thầm tải trước từng trang thư mục cho bấm vào mở nhanh — nếu tính cả
  những lượt đó thì log báo khách đã mở hết mọi thư mục dù chưa bấm cái nào.
  Đã dính đúng lỗi này lúc dựng, nay lọc ra rồi.
- **Chỉ ghi lần đầu.** Khách mở lại thư mục cũ không sinh thêm dòng nào, nên
  giờ trong log luôn là lần đầu thật.
- **Lượt của studio không tính.** Người trong tiệm hay mở link kiểm tra — ghi
  cả vào thì thẻ nào cũng báo "khách đã xem" trong khi khách chưa hề mở.
- **Tên thư mục lưu lại lúc khách mở**, nên sau này đổi tên hay xoá thư mục
  trên Drive thì log cũ vẫn đọc được.
- **Log hỏng không làm hỏng trang khách**: việc ghi chép này tự nuốt lỗi.

Cửa sổ chỉ đọc database khi anh bấm nút, không tải sẵn cho từng thẻ — lưới có
mấy chục album, tải sẵn hết là mấy chục lượt hỏi mà phần lớn không ai xem.

### Khu "Đội ngũ" trên trang giới thiệu (25/09)

Anh muốn giới thiệu từng người trong studio. Danh sách **lấy thẳng từ mục Nhân
viên** của phần quản lý, không gõ lại lần nữa — sửa tên hay chức vụ ở đó là
ngoài trang đổi theo.

**Ba bước để một người lên trang:**

1. Người đó vào **Quản lý → Tài khoản của tôi**, bấm *Chọn ảnh* để tự tải ảnh
   đại diện. Ảnh được web tự cắt vuông và thu nhỏ ngay trên máy họ trước khi
   gửi, nên ảnh máy ảnh 8 MB cũng chỉ còn vài chục KB.
2. **Quản lý** vào mục **Nhân viên**, cột *Trang giới thiệu*, gạt công tắc cho
   người đó. Chỉ quản lý thấy công tắc này.
3. Xong. Khu "Đội ngũ" hiện ở trang chủ, ngay trên dải "Câu chuyện tiếp theo".

**Tự căn khung ảnh (thêm 25/09, cùng ngày):** chọn ảnh xong web mở khung tròn
— kéo ảnh để chọn phần muốn giữ, gạt thanh trượt để phóng to, ưng rồi mới bấm
*Lưu ảnh này*. Trước đó web cắt cứng phần giữa, mà người trong ảnh ít khi đứng
giữa khung.

**Một dòng giới thiệu:** ô ngay dưới ảnh trong "Tài khoản của tôi", mỗi người
tự viết cho mình, tối đa 120 chữ cái. Hiện dưới chức vụ ở khu Đội ngũ; để
trống thì thôi, không hiện gì.

**Sắp thứ tự:** ngoài trang xếp theo PHÒNG BAN trước, đúng thứ tự anh chốt
25/09: **Ban lãnh đạo → Media → Makeup → Tư vấn → Phòng váy** (phòng nào
không nằm trong danh sách này thì xuống cuối, ví dụ Marketing). Trong mỗi
phòng thì theo thứ tự anh sắp bằng hai mũi tên ↑ ↓ ở mục Nhân viên — mũi tên
chỉ xê dịch người trong cùng một phòng, đẩy sang phòng khác thì ngoài trang
chẳng đổi gì nên web không làm.

Muốn đổi thứ tự các phòng thì nói em (nằm ở `THU_TU_PHONG` trong
`src/lib/doiNgu.ts`).

**Bốn điều đã khoá sẵn:**

- **Mặc định không ai lên trang.** Bảng nhân viên có số điện thoại, ngày vào
  làm — đưa ai ra công khai là quyết định của quản lý, bật từng người.
- **Ảnh của người chưa được bật thì người ngoài không xem được** (web trả lỗi
  403), chỉ người đã đăng nhập mới thấy.
- **Ai nghỉ làm thì tự rơi khỏi trang** dù công tắc còn bật, khỏi phải nhớ tắt.
- **Chưa có ảnh vẫn lên trang được**: hiện chữ cái đầu tên trên nền màu, không
  phải ô xám trông như ảnh hỏng.

Chữ dưới tên lấy từ ô **Phòng ban** của nhân viên *(anh chốt 25/09 — khách cần
biết người này làm mảng nào, chức vụ là chuyện nội bộ)*; bỏ trống thì lấy vai
trò (Quản lý / Sale / Nhân viên). Muốn khách đọc chữ khác thì sửa ô Phòng ban
trong mục Nhân viên.

Phòng ban đang có trong danh sách: Media (7 người) · Phòng Váy (3) · BAN LÃNH
ĐẠO (2) · Marketing (1) · Tư Vấn (1) · Makeup (1). Lưu ý "BAN LÃNH ĐẠO" đang
viết hoa toàn bộ — khách sẽ đọc đúng như vậy, anh muốn đổi thì sửa ở mục Nhân
viên.

Cả khu tự ẩn khi chưa bật ai — không để cái tiêu đề trơ trọi giữa trang.

### Trang quản lý giới thiệu bày lại cho gọn (25/09)

Anh bảo xem kỹ lại giao diện. Đo trước khi sửa: mỗi mục cao 645px (gần hết
màn hình), mỗi thẻ cảnh 478px, cả trang 2657px — cuộn ba màn hình rưỡi mới
xem hết bốn thư mục. Nay còn **mục 510px, thẻ 389px, trang 2188px**; riêng
mục chưa có thư mục từ 183px xuống **150px**.

Đổi bốn chỗ:

1. **Hàng năm đường dẫn chữ nhỏ giống hệt nhau đã bỏ.** Giờ mỗi mục có hai
   nút thật — *Đọc lại Drive* và *+ Thêm thư mục* — còn sửa tên, đổi thứ tự,
   xoá mục nằm trong bảng **⋯**. Nút xoá trong đó màu đỏ, không còn trông y
   như nút đổi thứ tự nữa.
2. **Số thư mục thành viên tròn** cạnh tên mục: đậm là có ảnh, viền nhạt là
   còn trống — liếc một cái biết mục nào chưa làm.
3. **Thẻ cảnh gọn lại**: bỏ hai nhãn "TÊN CẢNH" / "MÔ TẢ NGẮN" (chữ mờ trong
   ô đã nói rõ), ô mô tả chỉ mở khi bấm *+ Thêm mô tả*, còn Đổi bìa / Đọc lại
   / Gỡ khỏi trang gom vào bảng **⋯** ngay trên ảnh.
4. **Mục trống chỉ còn một dòng**, và giấu luôn nút *Đọc lại Drive* — mục
   chưa có thư mục thì bấm vào chẳng ra gì.

Dòng nhắc "ẢNH CƯỚI" trên từng mục cũng bỏ: đang đứng ở tab đó rồi.

### Tự tạo mục trong trang giới thiệu (25/09)

Trước hôm nay, muốn thêm một mục như "Dạm ngõ" hay "Đính hôn" là phải sửa mã
nguồn rồi đưa bản mới lên mạng — tức phải nhờ tới em. Nay anh tự làm ở
[/admin/gioi-thieu](https://www.hamitastudio.com/admin/gioi-thieu).

**Tạo mục:** chọn tab nhóm (Ảnh cưới, Bé & gia đình…), kéo xuống cuối bấm
**"Tạo mục mới trong …"**. Điền hai ô:

- **Tên mục** — chữ khách đọc, ví dụ *Lễ vu quy*.
- **Mã album gợi ý** — mấy chữ đầu tên album trên Drive, ví dụ *VQ*. Để trống
  thì lúc bấm "Thêm vào trang giới thiệu" ô chọn hiện mọi album; điền vào thì
  nó lọc sẵn cho đỡ phải tìm. Nhiều mã thì cách nhau bằng dấu phẩy.

**Sửa về sau:** mỗi mục có hàng chữ nhỏ *Sửa tên, mã · ↑ Lên trước · ↓ Xuống
sau · Xoá mục*. Thứ tự này đúng là thứ tự hàng nút khách thấy trên trang.

Ba điều đáng biết:

1. **Đổi tên không làm hỏng link đã gửi khách.** Địa chỉ trang sinh ra lúc tạo
   (`/dich-vu/anh-cuoi/le-vu-quy`) và giữ nguyên mãi, dù sau này anh đổi tên
   thành "Lễ vu quy nhà gái".
2. **Xoá mục còn thư mục thì web không cho**, nó báo còn bao nhiêu thư mục phải
   gỡ trước — tránh xoá nhầm mất công anh đã chọn ảnh.
3. **Mục chưa có thư mục nào thì khách không thấy**, y như cũ. Tạo mục xong nhớ
   bấm "Thêm vào trang giới thiệu" thì nó mới lên trang.

Nhóm thì vẫn sáu cái cố định (đúng sáu thẻ lưới "Hamita chụp gì?" ở trang chủ)
vì mỗi thẻ có ảnh và chữ riêng trên trang chủ. Muốn thêm nhóm thứ bảy thì nói
em.

### Lập hợp đồng bằng cửa sổ, không nhảy trang (23/09)

Anh yêu cầu: bấm **Lập hợp đồng** thì hiện cửa sổ ngay trên trang danh sách,
không nhảy sang trang khác. Nay đúng vậy — cửa sổ trượt lên mượt, bên trong là
đủ bộ như cũ: chọn khách cũ hoặc điền khách mới, loại hợp đồng, ngày đặt, các
dòng dịch vụ, giảm giá, tổng tiền tự tính, ghi chú, trạng thái, tiền cọc, lịch
chụp và đầu việc.

Lưu xong thì cửa sổ tự đóng và mở thẳng hợp đồng vừa lập. Bấm ra ngoài, bấm ✕
hay phím Esc đều đóng. Đường cũ  vẫn dùng được nếu anh
quen gõ thẳng địa chỉ.

### Sửa hợp đồng, duyệt phiếu thu, giao đầu việc (23/09)

Đợt trước mở chức năng lập hợp đồng trên web nhưng để lại hai lỗ: **lập xong
không sửa được**, và **phiếu thu của sale treo ở "Chờ duyệt" mãi**. Nay bịt cả
hai, cộng thêm phần vận hành lịch và đầu việc.

**Ở trang một hợp đồng giờ có:**

- **Nút "Sửa hợp đồng"** (quản lý + sale) — sửa tên khách, loại, ngày đặt, địa
  chỉ, ghi chú, trạng thái (đủ 18 bước), và các dòng dịch vụ: đổi giá, đổi số
  lượng, đổi ngày chụp, thêm dòng, bỏ dòng. Lưu xong web **tự cộng lại** tiền
  hàng, tổng, đã thu, còn lại. Bỏ một dòng thì đầu việc **chưa ai làm** của
  dòng đó bỏ theo; việc đã giao hay đã xong thì giữ, vì người ta đã bỏ công.
- **Nút "Thêm phiếu thu"** — thu lần hai, lần ba, thu đủ. Sale lập thì phiếu
  nằm "Chờ duyệt"; quản lý lập thì ghi thẳng là đã thu.
- **Khối "Lịch chụp"** — thêm buổi, đổi ngày, đổi loại (nhà gái, nhà trai, Hami
  Baby…), đổi tình trạng, bỏ buổi. Sửa cả cụm rồi bấm "Lưu lịch" một lần.
- **Nút "Xoá hợp đồng"** (chỉ quản lý) — phải **gõ lại đúng mã hợp đồng** mới
  bấm được. Xoá kèm dòng dịch vụ, phiếu thu, lịch và đầu việc của hợp đồng đó.

**Ở trang Phiếu thu:** quản lý có nút **Duyệt** và **Xoá** ngay trên từng dòng.
Duyệt là xác nhận tiền đã vào két — nó không làm đổi con số "đã thu" vì con số
đó vốn tính cả phiếu chờ duyệt, đúng như AppSheet.

**Ở trang Đầu việc:** mỗi dòng có hai ô chọn — **giao cho ai** và **trạng thái**
(Chưa giao việc · Đang làm · Đã làm), chọn xong là lưu ngay. Giao việc cho một
người thì trạng thái tự nhảy sang "Đang làm"; chuyển sang "Đã làm" thì web ghi
ngày hoàn thành, mở lại việc thì xoá ngày đó đi. Quản lý giao cho bất kỳ ai;
người khác chỉ **tự nhận việc chưa giao** và đổi trạng thái việc của mình.

Đo trên máy dev bằng ba tài khoản tạm (quản lý · sale · nhân viên): lập một hợp
đồng thử rồi chạy đủ vòng — sửa giá 3.990.000 → 4.500.000, thêm dòng phụ thu
300.000, khuyến mãi 500.000 thì tổng ra đúng 4.300.000; thêm phiếu thu
1.500.000 → đã thu 2.500.000; duyệt một phiếu, xoá một phiếu → đã thu về
1.000.000; thêm một buổi lịch; giao việc cho người rồi chuyển "Đã làm" (web
ghi ngày 23/09); nhân viên thường bị chặn khỏi trang sửa và chỉ thấy việc chưa
giao. Cuối cùng xoá hợp đồng bằng cách gõ lại mã — **không sót một dòng mồ côi
nào**. Đã dọn sạch: còn đúng 2.240 hợp đồng, 1.992 khách, 25 nhân viên.

### Lập hợp đồng ngay trên web (21/09)

Anh chốt: **từ nay hợp đồng mới lập thẳng trên web**, AppSheet chỉ còn để tra
dữ liệu cũ. Lịch chép tự động từ AppSheet vẫn tắt — bật lại là bản cũ bên đó đè
lên hợp đồng vừa lập.

Vào **Quản lý studio → Hợp đồng → nút "Lập hợp đồng"** (quản lý và sale mới
thấy nút; nhân viên gõ thẳng đường dẫn cũng bị đưa về Tổng quan). Một trang duy
nhất, lưu một lần là xong cả bộ:

1. **Khách** — gõ tên hoặc số điện thoại để tìm nhà cũ; nhà mới thì điền tên và
   số điện thoại (mã khách chính là số đó, đúng như bên AppSheet). Số đã có
   trong bảng thì web dùng lại nhà cũ chứ không tạo hồ sơ trùng.
2. **Hợp đồng** — loại (Khách lẻ, CƯỚI, HỎI, Baby, NHÀ SU, kỉ yếu, PreWedding,
   Mâm quả, GIA ĐÌNH), ngày đặt, địa chỉ, ghi chú. Ô trạng thái tự nhảy: chưa
   điền ngày chụp thì "1. Chưa có ngày chụp", điền rồi thì "2. Đã có ngày
   chụp"; muốn chọn tay thì bấm "hiện đủ 18 bước".
3. **Dịch vụ** — gõ mã hoặc tên (tìm được cả khi gõ không dấu) trong đúng bảng
   1.018 dịch vụ của tiệm, giá tự điền và sửa được; mỗi dòng có ngày chụp
   riêng. Thứ chưa có trong bảng thì bấm "Dòng gõ tay".
4. **Tiền tự cộng** — tiền hàng, khuyến mãi, tổng, đã thu, còn lại. Không ô nào
   phải bấm máy tính.
5. **Cọc** — số tiền, tiền mặt hay chuyển khoản. Sale lập thì phiếu nằm
   **"Chờ duyệt"** cho tới khi quản lý duyệt, đúng nếp cũ; quản lý lập thì ghi
   thẳng là đã thu. Để trống số tiền thì không tạo phiếu nào.
6. **Lịch chụp** — bấm một nút là lấy hết ngày chụp ở trên vào lịch, chọn loại
   (Ngày chụp, nhà gái, nhà trai, Đính Hôn, Nhà Su, Hami Baby…). Dòng chữ hiện
   trên lịch web tự ghép: tên khách – ngày – số điện thoại.
7. **Đầu việc tự sinh** theo bảng giá hạng mục của từng dịch vụ, bỏ tick dòng
   nào thì dòng đó không tạo. Ví dụ "Album Hamita Garden" ra sẵn năm việc:
   PHOTO 250.000, stylist 100.000, Makeup 100.000, Photoshop 100.000, Hair
   125.000, hạn bằng ngày chụp, trạng thái "Chưa giao việc".

**Mã hợp đồng giữ đúng kiểu cũ**: `STT_26.0900-1_HTTN2812_16-06` — năm, tháng,
số thứ tự trong tháng, mã nhân viên người lập, giờ phút.

**Hai điều anh cần biết:**

- **Tên đầu việc là tên hạng mục** ("PHOTO", "Makeup", "Hair"…). Bên AppSheet
  tên việc nhiều khi khác ("CHỤP TIỆC", "Chụp nhà trai") — quy tắc đổi tên đó
  không đoán ra được từ dữ liệu (chỉ 121/380 việc trùng tên hạng mục), nên web
  ghi tên hạng mục cho thật thà.
- **Ai lập hợp đồng thì tài khoản phải là Sale hoặc Quản lý.** Hiện trong 25
  nhân viên chỉ có 1 sale (HTTN2812) và 2 quản lý (LHTT27, TTT142); **MT1206 —
  người lập nhiều hợp đồng nhất — đang để vai trò "Nhân viên"** nên chưa lập
  được. Anh vào **Nhân viên** đổi vai trò cho những người cần lập là xong.

Đo khi làm: lập thử hai hợp đồng trên máy dev bằng tài khoản sale tạm — mã ra
đúng kiểu, tiền khớp (3.990.000 − cọc 2.000.000 = còn 1.990.000), phiếu thu nằm
Chờ duyệt, lịch và đầu việc hiện đúng ở trang Lịch chụp và Đầu việc. Xoá sạch
sau khi thử: còn đúng 2.240 hợp đồng, 1.992 khách, 25 nhân viên như trước.

### Sáu album đầu lọt trọn một màn hình (21/09)

Anh nói mở `/admin` là ba thẻ hàng dưới bị cắt nửa. Đo trên 1920×1080: khung
cuộn cao 813px mà mỗi thẻ 682px — hai hàng cần 1388px. Nay mỗi thẻ còn **361px**,
sáu thẻ hết 745px, vừa khung và còn ló hàng thứ ba ra một chút cho biết bên dưới
còn album. Thẻ có nhãn "đã chọn xong" cũng bằng đúng chừng đó.

Cắt ở đâu:

- **Ảnh bìa thấp lại và tự co theo màn hình** — màn càng cao bìa càng cao (công
  thức `50vh − 400px`; màn 1080 ra 140px, màn 1200 ra 200px). Dưới 1536px trang
  vẫn cuộn như cũ nên bìa để nguyên cỡ to.
- **Nhãn "Đã chọn xong / Xong · tên thư mục" chuyển lên nằm đè góc dưới ảnh
  bìa** (chữ trắng nền đen trong mờ). Đứng cạnh tên album như trước thì nó đẩy
  tên xuống dòng hai, thẻ cao thêm 30px.
- **Ba dòng chữ nhỏ gộp đi, không mất thông tin:** tên các thư mục con nay nằm
  trong chú thích của con số thư mục (rê chuột vào); dòng `/g/…· ngày tạo` nằm
  trong chú thích của ảnh bìa.

> **Sửa tiếp trong ngày:** anh xem lại thấy *"ảnh bìa bị hẹp quá"* và muốn thẻ
> album **giống y hệt Gump**, nút thì nhỏ lại — xem mục ngay dưới đây.

### Rê chuột vào chỗ bấm được là hiện bàn tay (21/09)

Anh yêu cầu: chỗ nào bấm vô được thì đưa chuột vào phải hiện biểu tượng click.
Nay cả web — trang khách lẫn trang quản lý — mọi nút, ô chọn, ô tích, mục menu
và dòng mở rộng đều đổi con trỏ thành **bàn tay**. Trước đó chỉ mấy đường dẫn
mới có, còn nút bấm thì để mũi tên thường, nhìn như chữ chết.

Ba chỗ cố ý khác đi cho đúng nghĩa: nút **đang khoá** (ví dụ "Gửi thông báo ·
0 máy" khi chưa ai đăng ký) hiện **dấu cấm**; **ảnh bấm để phóng to** hiện
**kính lúp**; và khoảng trống quanh bảng "…" giữ mũi tên thường.

### Ảnh ngang không còn bị cắt thành ảnh dọc (21/09)

Anh phát hiện ở trang **Ảnh khách chọn**: ảnh chụp ngang bị nhét vào khung dọc
nên xén mất hai bên — ảnh tiệc thì mất luôn mấy người ngồi hai đầu bàn, mà đây
đúng là trang để soi trước khi giao in.

Nay mỗi ô là **hình vuông và ảnh nằm trọn trong ô**: ảnh ngang chiếm hết bề
ngang, ảnh dọc chiếm hết bề cao, không tấm nào bị cắt. Đổi lại ảnh dọc nhỏ hơn
trước chừng một phần tư, vì phải chừa chỗ cho ảnh ngang trong cùng một lưới.

Lý do không làm lưới so le đúng tỉ lệ từng tấm như trang khách: web không biết
tấm nào ngang tấm nào dọc — kích thước ảnh chỉ có trên Drive, mà trang quản lý
cố ý không hỏi Drive (hỏi thì mở trang mất gần chục giây). Muốn lưới so le thì
em cần lưu kích thước ảnh lại ngay lúc khách chọn, anh muốn thì em làm sau.

### Thẻ album dựng lại theo kiểu Gump (21/09)

Ảnh bìa từ **140px lên 285px** (đo ở màn 1920×1080), mà một màn vẫn thấy trọn
sáu album và ló hàng thứ bảy. Cách lấy chỗ cho ảnh: bỏ hàng nút và dòng
"Mã · gói · Cài đặt" khỏi mặt thẻ — hai thứ đó ngốn đúng 146px.

Thẻ bây giờ chỉ còn ba phần, đúng như Gump:

- **Ảnh bìa to**, mọi nhãn đè lên ảnh nên không tốn chiều cao: "Không cho tải"
  góc trái trên; góc phải trên là tình trạng nhắn khách (**chấm vàng** = chưa
  gửi thông báo, **chấm xanh** = đã báo tin, kèm ngày giờ); đáy ảnh là nhãn
  "Đã chọn xong" của từng thư mục.
- **Một hàng tên album** + hai nút bên phải: **bánh răng** (cài đặt) và **"…"**.
- **Một hàng số liệu nhỏ**: số ảnh · số thư mục · tim · lượt tải, và dồn về
  bên phải là **Mã chọn ảnh · gói ảnh**.

**Nút "…" gom bảy việc**: Chép tin nhắn · Ảnh khách chọn · Làm mới · Gửi thông
báo · N máy — rồi tới Chép link · Đổi ảnh bìa · Xoá album. Vì không còn phải
nhét vừa một hàng nữa, chữ trên nút **trở lại đầy đủ** ("Chép tin nhắn", "Gửi
thông báo" thay cho "Chép tin", "Gửi tin" hồi sáng). Thẻ ở hàng dưới thì bảng
tự mở ngược lên cho khỏi thò ra ngoài màn.

**Nút bánh răng mở CỬA SỔ cài đặt** (anh yêu cầu cùng ngày, sau khi thấy nút
cài đặt cũ bất tiện): một cú bấm là hiện cửa sổ giữa màn hình với đủ bốn mục —
mã chọn ảnh, lời nhắn, hạn giữ ảnh, gói ảnh. Bánh răng nằm **dính sát** nút "…"
ở mép phải, và cửa sổ **hiện ra rồi tắt đi đều có chuyển động** — nền mờ dần,
hộp trượt lên nhẹ; đóng cũng vậy chứ không biến mất đột ngột. Trước đó nó nằm trong bảng "…" và
bấm vào thì bốn ô xổ ngay trong thẻ, thẻ phình cao gấp đôi và đẩy cả hàng album
bên dưới chạy xuống. Bấm ra ngoài hoặc phím Esc là đóng; mỗi mục vẫn tự lưu
ngay khi bấm xong, không có nút lưu chung.

**Các nút nhỏ lại** như anh yêu cầu: trong thẻ và trong bảng "…" chỉ còn 32–36px
cao thay vì 44px. Riêng trên điện thoại chúng tự trở về 44px — dưới mức đó ngón
tay bấm hay trượt.

Nút **sửa tên album** nay ẩn đi, rê chuột vào thẻ mới hiện (trên điện thoại vẫn
hiện sẵn). Ở màn dưới 1536px — máy tính nhỏ, máy bảng, điện thoại — ảnh bìa để
nguyên tỉ lệ 3:2 đầy đủ vì trang cuộn bình thường, không phải nhường chỗ cho ai.

Màn hình thấp hơn (1536×864 chẳng hạn) thì khung cuộn chỉ cao 597px, không đủ
chỗ cho hai hàng thẻ dù thẻ có nhỏ tới đâu — lúc đó bìa dừng ở mức thấp nhất
112px chứ không bóp thành một vạch.

### Phân quyền phần quản lý studio (21/09)

Anh chốt lại ai xem được gì:

- **Hợp đồng:** quản lý + sale. Nhân viên không vào được, gõ thẳng đường dẫn thì
  quay về Tổng quan.
- **Khách hàng và Phiếu thu:** chỉ quản lý (tiền và số điện thoại khách).
- **Lịch chụp:** cả tiệm xem. Người không được xem hợp đồng thì tên khách hiện
  dạng chữ thường, không phải liên kết.
- **Đầu việc:** quản lý thấy hết; người khác chỉ thấy việc ghi tên mình và việc
  chưa giao cho ai, kèm dòng nhắc ngay đầu trang. Hàng chip lọc theo từng người
  chỉ quản lý mới có.
- Menu bên trái tự ẩn mục không vào được.

Đo bằng ba tài khoản tạm trên máy dev (xoá sạch sau khi thử, còn đúng 25 nhân
viên): nhân viên thấy 138/186 việc — 2 việc của mình, 136 việc chưa giao.

**Lưu ý khi cấp tài khoản:** đầu việc ghép người theo **Mã NV bên AppSheet**.
Nhân viên nào trong mục Nhân viên chưa có Mã NV thì vào Đầu việc chỉ thấy việc
chưa giao, không thấy việc của chính mình.

### Neon hết hạn mức, web sập — và đợt giảm tải sau đó (21/09)

Sáng 21/09 cả web trả lỗi 500: Neon báo tài khoản vượt hạn mức gói miễn phí. Anh
nâng lên **gói Launch** (tính theo mức dùng, chu kỳ 21/09 → 01/10), web sống lại
ngay, dữ liệu còn nguyên (58 album, 2.111 lượt khách thả tim, 25 nhân viên).

Sau đó rà lại chỗ gọi database nhiều nhất. Neon tính theo **thời gian database
thức** (mỗi lần bị gọi là thức thêm ≥ 5 phút), nên đã sửa bốn chỗ:

- **Tải ảnh:** trước đây mỗi tấm ảnh khách xem là một lần đọc database để lấy
  phiếu Google. Nay giữ phiếu trong bộ nhớ 50 phút — đo 20 lượt: 20 lần đọc
  còn **1 lần**, thời gian 3.050ms còn 1.578ms.
- **Trang quản lý album:** thẻ "khách vừa chọn xong" hỏi lại 60 giây/lần thay vì
  20 giây, và **không hỏi khi tab bị ẩn** (trước đây mở tab sau lưng cả ngày là
  database không bao giờ ngủ).
- **Khách đang chọn ảnh:** hỏi lại 30 giây/lần thay vì 15, và **ngưng hẳn sau 5
  phút khách không đụng vào trang**; chạm lại hoặc quay lại tab là hỏi ngay.
  Đã đo trên máy dev đủ chu kỳ: đang xem → 30 giây/lần; để yên 5 phút → 0 lượt;
  chạm vào → hỏi lại tức thì.
- **Đồng bộ AppSheet: TẮT lịch tự động** (anh chốt: chưa dùng CRM). Nút "Đồng bộ
  ngay" trong trang Hợp đồng và lệnh chạy tay vẫn dùng được. Muốn bật lại thì
  thêm dòng cron `dong-bo` vào `vercel.json`.

Không tìm thấy dịch vụ theo dõi ngoài nào gọi `/api/suc-khoe` (đếm nhật ký 3
phút: 0 lượt).

**Số thật ngày đầu chạy gói Launch (anh gửi ảnh Billing 22/09):** 6,06 CU-giờ =
**$0,62**, lưu trữ 45,9 MB, truyền mạng 0,4 GB trong 500 GB kèm gói. Tính ra
khoảng **$0,10 mỗi CU-giờ**, giữ nhịp đó thì chừng **$19 một tháng**. Biểu đồ
cho thấy **ban đêm database ngủ thật** (khoảng 22h tới 7h sáng), còn ban ngày
thức gần như liên tục.

**Vì sao ban ngày thức liên tục — và đã sửa (22/09):** trang quản lý album mở
cả buổi thì cứ 60 giây lại hỏi web một lần để cập nhật "khách vừa chọn xong",
kể cả lúc anh đi ăn cơm hay đang làm Photoshop. Nay nó **ngưng sau 5 phút không
ai đụng vào trang** — chạm chuột, gõ phím hay cuộn trang là chạy lại ngay, y
như trang khách đã làm hôm 21/09. Anh không thấy khác gì ngoài hoá đơn.

**Đo lại sau ba ngày (anh gửi ảnh Billing 24/09, 17h20):** 15,11 CU-giờ =
**$1,58** cộng dồn từ 21/09, tức **~4,1 CU-giờ mỗi ngày** — giảm chừng một
phần ba so với 6,06 của ngày đầu. Lưu trữ 46,05 MB (+ lịch sử 1,96 MB), truyền
mạng 0,71 GB. Giá thật: $1,58 ÷ 15,11 = **$0,105 mỗi CU-giờ**.

**Cách đọc con số này cho nhanh:** database chạy ở mức nhỏ nhất 0,25 CU, nên
**thức trọn 24 giờ là đúng 6 CU-giờ/ngày**. Ngày đầu 6,06 nghĩa là nó không
ngủ phút nào; nay 4,1 nghĩa là **mỗi ngày ngủ được chừng 8 tiếng**. Lần sau
muốn biết web có bị gọi lén không, cứ lấy số CU-giờ/ngày chia 0,25 ra số giờ
thức rồi đối chiếu với giờ studio làm việc.

Giữ nhịp này thì một tháng đủ 30 ngày vào khoảng **$11–13** (≈ 290–340 nghìn),
thấp hơn mức $19 ước hôm 22/09. Lưu trữ và truyền mạng gần như không tốn gì.

**Email "chạm $10" là cảnh báo, không phải hoá đơn.** Kỳ 21/09–01/10 chỉ 10
ngày nên tổng độ $4–5, chưa chạm. Từ kỳ đủ tháng trở đi, khoảng **ngày 25 hằng
tháng** sẽ có thư báo — không có gì hỏng. Thấy phiền thì vào Billing → Spending
notifications → Edit, nâng ngưỡng lên $20.

**Không nên siết thêm nữa.** Hạ trần autoscale vô ích vì nó chưa bao giờ vượt
0,25 CU. Trần lý thuyết là $6/tháng (nếu ngủ nửa ngày), mà 8 tiếng thức còn
lại đúng là lúc studio và khách đang dùng thật — cắt nữa chỉ làm web chậm.

### Trang Ảnh cưới + quản lý trang giới thiệu (17/09)

**Cập nhật cùng ngày — mọi dịch vụ, không riêng ảnh cưới.** Trang quản lý
`/admin/gioi-thieu` có 6 tab: Ảnh cưới (Dạm ngõ · Đính hôn · Nhà gái · Nhà trai ·
Phóng sự) · Album & hình cổng (Album · Hình cổng) · Hamita Garden · Bé & gia đình
(Thôi nôi · Bầu · Sơ sinh · Gia đình) · Váy cưới & trang điểm · Tiệm ảnh nhà Su
(mới, mã NS). Đường công khai đổi thành `/dich-vu/<nhóm>`; link `/anh-cuoi` cũ tự
chuyển. Trang chủ thêm thẻ "Tiệm ảnh nhà Su" (nhãn, mô tả để trống chờ anh), thẻ
tư vấn thành dải ngang dưới lưới.

**Bỏ ô tích trên thẻ album (cùng ngày).** Mọi thứ lên trang giới thiệu chỉ chọn
ở `/admin/gioi-thieu`. Bốn khu ảnh trên trang chủ (ảnh cưới, album & HC, phim
trường, bé) nay lấy bìa các thư mục đã chọn ở đó; khu phim trường đọc ảnh thật
trong thư mục nhóm Hamita Garden. Hai album đang tích lúc đó được chuyển sang tự
động: Hamita Garden → nhóm Hamita Garden; HC Hồng Tâm - Hoàng Minh → Album & hình
cổng / Hình cổng (giữ ảnh bìa). `/phim-truong` chuyển sang
`/dich-vu/hamita-garden`. Cột `featured`/`khuGioiThieu` không xoá.

**Còn chờ anh:** danh sách mục nhỏ cho Hamita Garden và Váy cưới (đang một mục
chung); mô tả cho Tiệm ảnh nhà Su. Thôi nôi/Bầu/Sơ sinh chưa có mã riêng nên cùng
gợi ý album mã Baby.

- Bấm thẻ "Ảnh cưới" hoặc menu "Ảnh cưới" ở trang chủ → sang `/anh-cuoi`, tự tới
  mục đầu tiên có ảnh. Hàng nút: Dạm ngõ · Đính hôn · Ngày cưới – Nhà gái ·
  Ngày cưới – Nhà trai · Phóng sự cưới; mỗi mục một link riêng
  (`/anh-cuoi/dinh-hon`…) gửi được cho khách. Mục chưa có ảnh thì ẩn.
- Trang quản lý: `/admin/gioi-thieu` (link "Trang giới thiệu" đầu trang quản lý
  album). Mỗi mục có nút "Thêm vào trang giới thiệu" → danh sách album mang mã
  của mục (DN / ĐH / HER / HIS; bỏ tích để xem mọi album) → bấm album → chọn thư
  mục "Đưa lên". Gỡ bằng "Gỡ khỏi trang" dưới thẻ.
  Nút **"Đổi bìa"** đè góc ảnh mỗi thẻ: chọn tấm bìa trong chính thư mục đó (60
  tấm mỗi đợt). Máy chủ kiểm tấm được chọn nằm đúng thư mục; thêm lại thư mục đã
  có không đè bìa đã chọn.
- Bấm một mục thì hiện các THƯ MỤC trước (thẻ ảnh bìa, tên nhà bỏ mã HIS/HER),
  bấm thẻ mới xem toàn bộ ảnh của thư mục đó (`/anh-cuoi/nha-gai/<id>`), có nút
  quay lại mục. Nên chọn thư mục ảnh ĐÃ CHỈNH, không phải file gốc.
- Bảng mới `AnhGioiThieu` đã có trong sao lưu và lệnh phục hồi. `DN` nay ghi
  nghĩa "dạm ngõ" (anh nói).
- Lúc bàn giao chưa có thư mục nào được chọn (dữ liệu thử đã gỡ) → thẻ Ảnh cưới
  vẫn đi đường cũ cho tới khi studio chọn thư mục đầu tiên. Chưa có album mã DN.
- Đo trên máy dev: lọc mã ra ĐH 1 · HER 6 · HIS 7 album; thư mục 990 tấm → trang
  hiện 24 tấm; điện thoại 375px không tràn ngang, nút mục cao 44px.

### Trang giới thiệu bày lại theo kiểu mohome.vn (16/09)

**17/09:** lưới "Hamita chụp gì?" dời lên ngay dưới đầu trang (trước "Về
Hamita"), menu để "Dịch vụ" lên đầu — anh muốn khách vào là thấy dịch vụ để dễ
bán thêm. Màn 2000×1000: tiêu đề dịch vụ ở 659px, hàng thẻ bắt đầu 751px.

Anh gửi mohome.vn để học cách bố cục. Em giữ nguyên màu, phông, bốn khu và giọng
kể của Hamita, chỉ đổi cách bày: đầu trang hai cột (chữ lớn, nửa sau khẩu hiệu
in nghiêng, nút Zalo / gọi / Messenger bo tròn, dải trang album chạy trong khung
bo góc), "Về Hamita" kèm bốn thẻ số liệu, **thẻ hai cơ sở** (377 Wedding House,
337 Hami Baby — có nút chỉ đường), lưới **"Hamita chụp gì?"** gồm năm thẻ ảnh
lớn (Ảnh cưới, Album & hình cổng, Phim trường, Bé & gia đình, Váy & trang điểm)
cộng một thẻ mời tư vấn, hành trình năm bước thành dải thẻ, dải kêu gọi cuối
trang, và **ba nút liên hệ nổi** ở góc phải. Hai phần "cảm nhận khách hàng" và
"blog" của web mẫu em không làm vì mình chưa có dữ liệu thật.

**Việc anh nên làm để trang đẹp hẳn:** hiện chưa album nào được tích "hiện lên
trang giới thiệu" cho khu **Ảnh cưới, Album và Bé** — nên mấy thẻ đó đang hiện
biểu tượng thay cho ảnh, và hai mục "Ảnh cưới", "Album" tạm ẩn khỏi menu. Anh vào
trang quản lý album, tích chọn vài album đẹp cho từng khu là trang tự có ảnh.

### Đợt 3: Lịch chụp & đầu việc (16/09)

Anh chốt thêm một điều quan trọng: **về lâu dài hợp đồng vẫn tạo bên AppSheet**,
web chỉ tự mang sang. Vậy nên web không làm nút tạo/sửa hợp đồng nữa, mà lo chạy
cho kịp: bản chép giờ chạy **mỗi giờ** (07:05–22:05, thêm một lượt 02:05 trước
khi sao lưu) thay vì mỗi đêm. Mỗi lượt hỏi Drive một câu "file có đổi không",
không đổi thì thôi — nên chạy dày mà gần như không tốn gì. Quản lý vẫn bấm
"Đồng bộ ngay" được nếu muốn thấy hợp đồng vừa tạo xuất hiện liền.

> **Đã thay đổi ngày 21/09/2026:** anh chuyển hẳn việc lập hợp đồng về web và
> lịch chép tự động đã tắt — xem mục *"Lập hợp đồng ngay trên web (21/09)"* ở
> trên. Đoạn này giữ lại để biết tại sao web từng không có nút lập hợp đồng.

Hai mục mới trên thanh bên:

- **Lịch chụp** — 1.313 buổi chép từ AppSheet. Xem theo tháng (lưới lịch trên
  máy tính, danh sách trên điện thoại), lọc theo loại buổi (ngày chụp, nhà gái,
  nhà trai, đính hôn, Hami Baby, chụp bé…), bấm vào là mở hợp đồng.
- **Đầu việc** — 4.577 đầu việc. Mặc định chỉ hiện việc **chưa xong**, xếp theo
  thời hạn gần nhất, việc quá hạn tô vàng; lọc theo người làm, có chip **"Việc
  của tôi"**. Đo lúc nhập: 125 việc chưa xong, trong đó **103 việc quá hạn** —
  anh xem lại giúp em, có thể là do bên AppSheet quên đóng việc cũ.

**Còn lại của đợt 2 và 3:** chỉ còn những thứ phải sửa trên web mới làm được
(chia việc, lịch soạn váy, khách tiềm năng) — để dành tới khi anh cần.

### Sao lưu tự động lên Drive mỗi đêm (15/09)

Mỗi đêm 3 giờ sáng, web tự chụp toàn bộ database, nén lại, cất vào thư mục
**"Hamita – Sao lưu tự động"** trong Google Drive của studio. Nút cũ ở trang
quản lý album đổi thành **"Sao lưu lên Drive ngay"**, vẫn còn lựa chọn **tải về
máy**.

Khi làm phát hiện **bản sao lưu cũ chỉ lấy 6 trong 13 bảng** — thiếu ảnh bìa
thư mục, gói ảnh thư mục, mốc đã gửi thông báo, nhân viên, nhật ký. Đã sửa, và
từ nay bảng mới nào quên khai báo thì sao lưu báo lỗi ngay.

Bản sao lưu không chứa mật khẩu nhân viên và phiếu Google — phục hồi xong phải
bấm "Kết nối lại" Google và cấp lại mật khẩu cho nhân viên.

**Đã chạy thật 15/09/2026 14:03:** anh kết nối lại Google (có quyền tạo tệp),
bản đầu tiên `hamita-2026-09-15-1403.json.gz` 125 KB. Em mở lại tệp trên Drive,
giải nén, đếm lại: đủ 11 bảng, số dòng khớp, không có mật khẩu hay phiếu Google.

Nếu một ngày dòng trạng thái cạnh nút chuyển màu cam ("lên Drive: 3 ngày
trước"), lịch chạy đêm đang hỏng — thường là kết nối Google đã bị gỡ quyền.
Bấm "Sao lưu lên Drive ngay" sẽ thấy lý do.

### Mỗi thư mục một gói ảnh riêng (10/09)

Anh nói: *"có trường hợp khách chụp hình cổng rồi 1 thời gian về sau chụp hình
cưới thì mỗi gói sẽ có số lượng ảnh khác nhau"*. Nay ở ô **"Gói ảnh"** trên thẻ
album, dưới con số chung có thêm phần **"Gói riêng từng thư mục"** — liệt kê
từng thư mục của nhà đó, gõ số vào ô nào thì thư mục ấy chạy gói riêng.

Để trống thì thư mục theo con số chung, nên **album chỉ có một gói thì không
phải đụng gì**. Phần này chỉ hiện với album từ hai thư mục trở lên.

Ba chỗ đổi theo:

- **Khách mở thư mục nào thì thấy đúng gói của thư mục đó.**
- **Khung "Hỏi Hamita" ở trang bìa** liệt kê đủ các thư mục kèm số tấm, thay vì
  nói một con số chung không đúng cho ai cả.
- **Đơn giao in tính tách từng thư mục rồi mới cộng.** Chỗ này là lý do chính
  phải làm cho đúng: cách cũ đem tổng số tấm khách thả tim so với một con số duy
  nhất. Đo thử nhà có gói chung 21 và một thư mục đặt riêng 30, khách thả 10 tấm
  ở thư mục này và 40 tấm ở thư mục kia — **tính đúng 120.000đ, tính gộp ra
  348.000đ**.

Một điểm anh cần biết: **đổi tên thư mục trên Drive sau khi đã đặt gói riêng thì
đơn giao in quay về gói chung** (nó ghép theo tên). Đổi tên xong thì mở ô "Gói
ảnh" đặt lại một lần là xong.

### Thư mục ảnh đã chỉnh xong (09/09)

Thư mục có tên chứa "hoàn thiện" hoặc "pts" nay hiện nút **"Đã ok, báo Hamita để
in"** thay vì "đã chọn xong" — vì ảnh trong đó đã chỉnh rồi, việc của khách là
duyệt chứ không phải chọn. Nút hiện **cả khi khách chưa thả tim tấm nào** (theo
yêu cầu của anh), khác hẳn thư mục thường.

### Thẻ album nói rõ đã gửi thông báo cho khách chưa (08/09)

Anh nói: *"a không biết cái nào đã ấn gửi thông báo cho khách"*. Thẻ album nay
có ba trạng thái: **chưa gửi lần nào** / **đã gửi lúc …** / **có ảnh mới sau lần
gửi cuối**. Trạng thái đọc từ bảng `Moc`, không phải đoán.

### Trang quản lý: chỉ lưới album cuộn (08/09)

Từ màn hình rộng 1536px trở lên, cuộn xuống thì **chỉ lưới album chạy**, khung
Kho ảnh và bộ lọc đứng yên. Khung Thông báo dọn sang cột trái cạnh bộ lọc theo
tháng. Màn nhỏ hơn giữ nguyên cách cuộn cũ — thử ở 1280px thì lưới album co còn
một dải ~40px, không dùng được.

### Dọn rác toàn hệ thống, hai đợt (09/09)

Rà bằng script tự viết. **Hai lỗi thật** tìm ra chứ không phải rác:

- **Một ký tự NUL lọt vào `CoverPicker.tsx`** khiến `file` báo đó là file nhị
  phân — mọi lệnh `grep` đều **bỏ qua tệp này**. Rác thì không sao, nhưng nó ẩn
  luôn cả code thật khỏi mọi lần rà soát sau.
- **Bảng `Moc` không có khoá ngoại về `Gallery`**, nên xoá album thì mốc "đã gửi
  thông báo" của album đó **ở lại vĩnh viễn**. Đã chứng minh bằng một dòng mồ côi
  thật, rồi thêm `xoaMocCuaAlbum()` gọi ngay sau lệnh xoá album.

Cùng với đó: bỏ 242 KB tệp tĩnh không ai gọi, 53 dòng hàm chết, 7 dòng dữ liệu
thừa, gộp 6 bản sao chép của cùng một hàm về `constants.ts`.

**Giữ lại có chủ ý, không phải bỏ sót:** cột `laBaby`/`laPhimTruong`/
`accessMode`/`selectionsDoneAt` (0 dòng dùng, nhưng xoá cột là thao tác phá huỷ),
`src/lib/store/json.ts` (453 dòng, là đường lui khi database chết),
`scripts/build-logo.mts`.

### Theo yêu cầu của studio (08–09/09)

- Khối "Gói ảnh của anh chị" tách thành **ba dòng** thay vì một đoạn văn: số
  lượng tấm cần tim · ghi chú vào ảnh · chi phí phát sinh mỗi tấm.
- Sửa lời dòng thứ ba thành *"Chi phí phát sinh thêm trên mỗi tấm ảnh là (giá
  ảnh) đã gồm chỉnh sửa và in ạ"*.
- Nhãn "Xong · …" trên thẻ album bị **tràn ra ngoài mép thẻ 76px rồi cắt cụt** —
  do `shrink-0` cấm khối co lại. Sửa thành `min-w-0`, đo lại 24 thẻ: 0 chỗ tràn.
  Ba dòng bị cắt ngắn trên thẻ nay đều có chú giải khi rê chuột.

*Còn treo — cần anh thử trên máy Android thật:* nút tải một tấm, việc chia đợt
khi tải cả thư mục trong Chrome, và liệu WebView của Messenger có nhận đường tải
thẳng hay không.

## 6b. Đợt trước (03–07/09/2026)

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

## 6c. Lịch sử các đợt xa hơn (22–28/08/2026)

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
- **Tấm có lời dặn lên đầu thư mục** ở trang "Ảnh khách chọn" (15/09). Chỉ đổi
  chỗ hiển thị trong từng thư mục; các tấm còn lại vẫn theo tên file, và danh
  sách tên file để chép cho bên in vẫn theo tên. Thử trên album Quốc Phong & Mỹ
  Lộc: 2 tấm có dặn (TRI06683, TRI06924) đứng đầu, 25 tấm sau theo tên, đủ 27.
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
danh sách trái tim được in và tính tiền (danh sách tick đã bỏ 15/09/2026).

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

**Hiện KHÔNG còn việc nào ở mức đỏ hay cam.** Đo 10/09/2026: 0 album quá hạn
giữ ảnh, 0 album mất mã bảo vệ, Drive và database đều đọc được.

**🟡 Chỗ chứa trên Google Drive.**
Từng chạm **99,5%** sáng 26/08 (còn 9,97 GB) rồi anh dọn trong ngày. Con số hiện
tại xem ở khung "Kho ảnh" đầu trang quản lý — đọc ở đây thì lỗi thời ngay.

Điều đáng nhớ: phần lớn dung lượng là ảnh của những buổi chụp **xong từ lâu**,
không phải album đang phục vụ. Nguyên nhân gốc là *không có ai nhắc dọn* — khung
"Kho ảnh" sinh ra để chữa đúng chỗ đó, nhưng nó chỉ **nhắc**, không tự xoá gì.

Hệ quả nếu để đầy hẳn: Google dùng chung một kho cho Drive, Gmail và Photos, nên
đầy là **Gmail cũng ngừng nhận thư** trên `hamita.studio@gmail.com` — tài khoản
của cả Neon lẫn Vercel. Mất thư là mất đường khôi phục mật khẩu.

**✅ Sao lưu đã tự động (15/09).** Mỗi đêm 3 giờ lên Drive, thư mục "Hamita –
Sao lưu tự động" — xem mục 6. Không cần máy tính của anh bật. Lệnh
`npm run db:backup` vẫn dùng được khi muốn có thêm bản trên máy.

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

**🟡 Đường liên hệ trên trang album mới chỉ nằm trong khung "Hỏi Hamita".**
Khối "Phân vân quá…" bị bỏ theo yêu cầu (28/08), để trang album **0 liên kết gọi
điện** suốt mười ngày. Khung "Hỏi Hamita" (08/09) đã trả lại nút Zalo và số điện
thoại, nhưng khách phải **mở khung ra mới thấy** — chưa đo được có bao nhiêu nhà
thật sự mở.

**🟡 Khung "Hỏi Hamita" mới chỉ trả lời được điều web tự biết.**
10 câu hiện có đều sinh từ dữ liệu album (số ảnh trong gói, giá ảnh thêm, hạn
giữ ảnh). Những câu khách hay hỏi sale — bao giờ có ảnh, in cỡ nào, sửa lại được
mấy lần — thì **studio phải đưa lời đáp thật** thì mới thêm được. Đây là việc
của anh, không phải việc code.

**🟡 Ba việc tải ảnh trên Android chưa được thử trên máy thật.**
Đã sửa theo đúng triệu chứng anh báo và đo được, nhưng chưa xác nhận lại: (1)
nút tải một tấm, (2) chia đợt 6 tấm khi tải cả thư mục trong Chrome, (3) liệu
WebView của Messenger có nhận đường tải thẳng hay không. Con số **6 tấm/đợt** là
đo trên máy anh — máy khác có thể khác, nếu khách vẫn kêu thiếu ảnh thì đo lại
rồi hạ số xuống, đừng đoán.

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

**✅ (15/09) Khách bấm "Báo cho Hamita" mà không thả tim tấm nào.** Nút tick đã
bỏ nên hết cảnh nhầm giữa hai nút; khung Thông báo vẫn nhắc nếu khách báo xong
mà chưa thả tim tấm nào. Ghi chép cũ:
Nhà "baby- Châu" báo xong với 0 tấm tim, chỉ tick giữ riêng 7 tấm. Có thể họ
hiểu nhầm hai nút tim/tick. Khung Thông báo đã nói rõ trường hợp này để studio
hỏi lại, nhưng **giao diện chọn ảnh chưa làm gì để tránh nhầm lẫn từ đầu**.


## 9. Trạng thái hiện tại (đo thật 10/09/2026)

| Số liệu | Giá trị |
|---|---:|
| Album | **33** |
| Ảnh (số đã chụp lại trong database) | **20.560** |
| Lựa chọn của khách | **1.362** |
| Máy đăng ký nhận thông báo đẩy | **28** |
| Tấm khách đã tải về | **8.730** |
| Lượt mở album | **1.751** |
| Album khách đã báo chọn xong | **16** |
| Album chưa đặt gói ảnh | **2** (tiệc sn Ngọc Trinh · HC-Her-His-Công Đạt & Tuyết Nhi) |
| Album quá hạn giữ ảnh | **0** |
| Album mất mã bảo vệ | **0** |
| Sao lưu gần nhất | **15/09 14:03, tự động mỗi đêm từ nay** |

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
