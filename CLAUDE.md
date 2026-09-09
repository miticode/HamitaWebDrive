@AGENTS.md

# Web giao ảnh Hamita Studio

Web cho khách xem ảnh cưới và tự chọn ảnh. **Ảnh nằm nguyên trên Google Drive
của studio**, web chỉ là lớp hiển thị — không upload lại, không tốn chỗ chứa.
Thay thế dịch vụ Gump studio đang thuê.

Đang chạy tại **https://www.hamitastudio.com** · trang quản lý ở `/admin`.
Gói Vercel **Pro** từ 27/08/2026. Địa chỉ cũ `hamita-gallery.vercel.app` **vẫn
phục vụ** — link đã gửi khách không chết, và cố ý chưa bật chuyển hướng để nhà
nào đang chọn dở không bị hỏi lại mã.
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

**Cả GET cũng phải hỏi mã, không riêng POST/PATCH.** Đây là lỗ đã có thật, vá
ngày 27/08/2026: đường GET vốn mở tự do, nên bất kỳ ai cầm link album — thứ rời
khỏi tay khách rất dễ, một lần chuyển tiếp Zalo là đủ — đọc được cả danh sách
khách đã chọn lẫn ghi chú riêng của họ ("in cỡ 40x60"). Đã đo trên bản đang
chạy: gọi thẳng đường đó không có gì trong tay vẫn trả về đủ. Đừng nghĩ "đọc
thì có sao đâu" mà mở lại — nguyên tắc 1 nói ai có link đều **xem ảnh** được,
không nói ai có link đều xem được **khách đã chọn gì**.

Vá ở máy chủ thì phải vá kèm ở máy khách: nhịp đồng bộ trong `Selection.tsx`
có `unlocked` trong dãy phụ thuộc để khách nhập mã xong là tải lại ngay. Thiếu
chốt đó, khách ngồi nhìn màn hình trống tới 15 giây rồi tưởng những tấm cả nhà
đã chọn bị mất. Đo thật sau khi vá: nhập mã xong **873ms** là danh sách về,
và thư mục có sẵn lựa chọn cũ vẫn hiện đúng "Ảnh in 1 · Ảnh chọn 1".

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

*Ngoại lệ có chủ đích:* khối chỉnh màu cứng cho chế độ tối ở cuối
`globals.css` (`[data-admin-theme="dark"] .text-red-700 {…}`) **cố ý viết
ngoài mọi layer**, vì ở đó cần **thắng** lớp tiện ích chứ không phải nhường
nó — trang quản lý có vài chỗ viết màu thẳng bằng `bg-amber-100`,
`text-red-700`… và trên nền tối chúng thành mảng chói hoặc chữ không đọc nổi.
Selector có thêm thuộc tính nên chỉ đè đúng trong trang quản lý ở chế độ tối.

**12. Giao diện cố định tông sáng**, không đổi theo cài đặt máy khách. Album gửi
khách là bộ mặt studio nên phải giống nhau trên mọi máy. Riêng khung xem ảnh to
vẫn nền đen.

*Ngoại lệ duy nhất, thêm ngày 25/08/2026:* **trang quản lý `/admin` có nút đổi
tông sáng/tối.** Điều khoản trên nói về album gửi khách; trang quản lý chỉ mình
studio dùng và thường mở lâu để dò số liệu, nên để tự chọn là đúng. Phạm vi
được khoá bằng chính cách gắn: `data-admin-theme` nằm trên một **thẻ bọc bên
trong `/admin`** (`src/app/admin/layout.tsx`), **không phải trên `<html>`** —
rời khỏi trang quản lý là thẻ đó biến mất nên trang khách không có đường nào
dính tông tối. Đừng chuyển thuộc tính này lên `<html>`.
Lựa chọn lưu bằng **cookie** (`admin-tong`) chứ không phải localStorage, để máy
chủ dựng sẵn đúng tông ngay dòng HTML đầu — dùng localStorage thì trang luôn
hiện ra sáng rồi mới nháy sang tối.
Đã đo thật: ở tông tối, số liệu trên thẻ album đạt tỉ lệ tương phản 6,15 (bản
sáng 5,48) và dòng đường dẫn nhỏ đạt 4,73 (bản sáng chỉ 2,77) — tức là tối
đọc số **rõ hơn** sáng, đúng mục đích khi làm. Trang khách đã kiểm chứng vẫn
sáng nguyên (#fdfcfa) kể cả khi cookie đang bật chế độ tối.

**13. `/api/download/[fileId]` bắt buộc kèm `?slug=`.**
Máy chủ tra ngược slug → gallery → kiểm `allowDownload` và ảnh có thật sự nằm
trong album đó không. Thiếu slug hoặc ảnh không thuộc album là 400/403/404.
Từng có lỗ hổng: route cũ nhận bất kỳ mã ảnh nào, không kiểm tra gì — ai xem
trang album cũng ghép được link tải bản gốc dù studio đã tắt quyền tải.

**14. Ô nhập mã album dùng chung `rateLimit.ts` với khoá tiền tố `code:`.**
Mã chỉ có 33.856 tổ hợp (2 chữ + 2 số) — không khoá thì máy dò hết trong vài
phút. Sai 8 lần/15 phút thì khoá, giống hệt trang đăng nhập admin.

**Ô nhập mã phía KHÁCH tuyệt đối không được ghi mã mẫu.** Chỗ đó từng để sẵn
`placeholder="123456"` cho khách dễ hình dung — mà đó đúng là `MA_MAC_DINH` của
mọi album. Ô nhập tự khai luôn đáp án: ai cầm được link chỉ cần gõ lại dòng chữ
mờ đang hiện là chọn ảnh được, vô hiệu hoá cả lớp mã sinh ra để chặn đúng
chuyện đó (nguyên tắc 1). Anh phát hiện ngày 06/09/2026.

Nay ghi `"Mã studio gửi anh chị"`. **Đổi mã mặc định rồi cũng đừng đặt lại mẫu
ở đây** — mã nào rồi cũng có ngày trùng với thứ ai đó đoán ra.

Chữ hoa và giãn ký tự chỉ áp cho mã khách gõ vào, không áp cho dòng gợi ý
(`placeholder:normal-case placeholder:tracking-normal`): mã dạng `HAMITA-AB12`
viết hoa giãn ra thì dễ đọc, còn một câu tiếng Việt bị kéo giãn thì vừa dài vừa
khó đọc.

*Riêng ô đổi mã ở TRANG QUẢN LÝ vẫn giữ mẫu `123456`* — trang đó có mật khẩu,
và nhân viên cần biết mã mặc định là gì để đọc cho khách.

**15. Tên studio chỉ có MỘT nguồn duy nhất: `STUDIO_NAME` trong
`src/lib/constants.ts`.**
`src/lib/studio.ts` (trang giới thiệu) lấy lại từ đây (`ten: STUDIO_NAME`)
thay vì tự định nghĩa — trước đây hai nơi từng ghi hai tên khác nhau ("Hamita
Studio" vs "Hamita Wedding House"). Đổi tên studio thì chỉ sửa một chỗ.

**16. `/api/img` chặn nhúng từ web khác nhưng LUÔN cho qua khi thiếu cả
`Sec-Fetch-Site` lẫn `Referer`.**
Đây không phải lỗ hổng bỏ sót — hệ thống "dựng ảnh sẵn" (`src/lib/warm.ts`)
gọi route này từ máy chủ ngay sau khi tạo/làm mới album, không gửi hai header
đó. Bot xem trước link (Facebook, Zalo) cũng vậy. Siết chặt thêm ở đây sẽ phá
tính năng "link sống" hoặc phá ảnh xem trước khi khách gửi link cho nhau.

**17. Mọi slug album đều có đuôi ngẫu nhiên 6 ký tự** (`le-han-k7m2xq`), không
phải chỉ khi trùng tên.
Trước đây slug lấy thẳng tên khách bỏ dấu, nghĩa là ai biết tên cô dâu chú rể
là đoán ra link và xem được cả bộ ảnh cưới — đã thử thật, `/g/le-han` và
`/g/vu-phuong-kim-tien` đều mở được. Nguyên tắc 1 ("ai có link đều xem được")
chỉ đúng khi link là bí mật; đuôi ngẫu nhiên là thứ duy nhất làm nó bí mật.
Hàm `duoiSlug()` trong `src/lib/store/shared.ts`, dùng chung cho cả kho
Postgres lẫn kho JSON. Bảng chữ bỏ `l/o/0/1` cho khỏi nhìn nhầm khi đọc link
qua điện thoại. **9 album tạo trước ngày 25/08/2026 vẫn mang slug cũ đoán
được** — anh đã chọn giữ nguyên để link đã gửi khách không chết.

**18. Refresh token Google phải mã hoá trước khi ghi vào database.**
Phiếu đó không hết hạn và mở được TOÀN BỘ Drive của studio, nên để nguyên văn
trong database là đặt tất cả vào một rổ (database ở Neon, ứng dụng ở Vercel —
hai hệ thống khác nhau). Dùng `src/lib/maHoa.ts` (AES-256-GCM), khoá lấy từ
biến `TOKEN_KEY`.
Thiếu `TOKEN_KEY` thì **vẫn chạy bình thường**, chỉ là lưu nguyên văn như
trước — cố tình không ném lỗi, để một studio đang chạy không mất kết nối Drive
chỉ vì chưa kịp thêm biến môi trường. Chuỗi đã mã hoá mang tiền tố `enc:v1:`;
không có tiền tố nghĩa là bản cũ, đọc nguyên văn và tự ghi đè bằng bản mã hoá
ở lần dùng kế tiếp. **Đổi `TOKEN_KEY` là phiếu cũ không đọc lại được** — phải
vào trang quản trị bấm "Kết nối lại".

**20. Trạng thái "đã chọn xong" tính RIÊNG từng thư mục con.**
Bảng `MucXong`, mỗi thư mục một dòng, giữ cả tên thư mục lúc báo. Trước đây là
một cột `selectionsDoneAt` chung cả album, nên khách xong thư mục đầu rồi sang
thư mục thứ hai thì ở đó vẫn hiện "đã báo xong" — đúng lỗi anh phát hiện ngày
25/08. Con số hỏi khách ("chọn xong N tấm rồi phải không ạ?") cũng phải đếm số
tấm **riêng biệt trong thư mục đang mở**, không phải cả album và không đếm
trùng khi một tấm nằm ở hai danh sách. Cột `selectionsDoneAt` giữ lại nhưng
không còn ai dùng.

**21. Service worker (`public/sw.js`) TUYỆT ĐỐI không cache.**
Nó tồn tại vì hai việc: để album đủ điều kiện cài như app (Chrome trên Android
chỉ mời cài khi có service worker biết xử lý fetch), và để nhận thông báo đẩy
lúc web đã đóng. Thêm cache vào đây là phá nguyên tắc 4 — khách mở app sẽ thấy
bộ ảnh của hôm qua mà không hiểu vì sao. Ảnh đã có CDN lo phần nhanh rồi.

**22. Biểu tượng app là LOGO STUDIO, không phải ảnh của khách.**
Tệp tĩnh dựng sẵn trong `public/icon-app-*.png`. Hai điều bắt buộc: nền phải
đặc (logo gốc trong suốt, iOS lấp khoảng trong suốt bằng màu đen), và bản
`maskable` cho Android phải để logo nhỏ hơn hẳn (56% thay vì 74%) vì hệ điều
hành tự cắt theo hình của máy. Bản đầu dùng ảnh bìa album để khách phân biệt
được, nhưng studio muốn giữ nhận diện thương hiệu — tên khách nằm dưới biểu
tượng nên vẫn không lẫn.

**23. Khi chọn ảnh, máy khách gửi Ý ĐỊNH lên máy chủ, không để máy chủ lật ngược.**
`/api/selections` POST mang theo `muon: true/false` — trạng thái khách muốn có
sau cú bấm. Trước đây máy chủ tự lật ngược theo database, và vì nguyên tắc 2
(cả nhà chung một danh sách) nên hai máy cùng bấm một tấm là **mất lựa chọn của
nhau**. Đo thật ngày 26/08/2026 trên bản đang chạy:

```
Máy A (vợ)    thả tim tấm X  →  {"selected":true}
Máy B (chồng) thả tim tấm X  →  {"selected":false}   ← máy chủ XOÁ
```

Chồng bấm **tim** mà máy chủ **bỏ chọn**, vì máy chồng vẫn giữ trạng thái cũ
"tấm này chưa chọn". Ba lớp phải giữ đủ, thiếu một lớp là lỗi quay lại:
- Gửi `muon` thay vì để lật ngược (idempotent — bấm mấy lần cũng ra một kết quả).
- **Đọc giá trị máy chủ trả về** rồi lấy đó làm chuẩn. Chỉ kiểm `res.ok` là
  chưa đủ: 200 vẫn có thể mang kết quả ngược với thứ giao diện đang hiện, và
  đó chính là cách lỗi cũ ẩn mình — hai màn hình đều đỏ tim, database trống rỗng.
- Hỏi lại danh sách mỗi 15 giây khi tab đang mở (`NHIP_DONG_BO`), cộng một lần
  ngay khi khách quay lại tab.

`muon` **không bắt buộc** — máy khách đang mở sẵn trang với bản JavaScript cũ
vẫn gửi thiếu, và vẫn phải chạy đúng như trước. Đừng bắt buộc trường này.

Chốt `dangGhi` trong `Selection.tsx` đếm số cú bấm đang trên đường tới máy chủ;
nhịp đồng bộ thấy khác 0 thì bỏ qua lượt đó, nếu không khách bấm tim đúng lúc
sắp tới nhịp sẽ thấy tim hiện rồi biến mất rồi hiện lại.

**Đã cân nhắc WebSocket cho việc này và loại** (26/08/2026). Vercel có hỗ trợ
gốc từ 22/06/2026 và dự án này đã bật Fluid compute, nhưng: gói Hobby giới hạn
**300 giây cứng** nên kết nối rớt và nối lại 9 lần trong một buổi khách ngắm
ảnh; mỗi kết nối ghim vào **một** function instance nên vợ và chồng rơi vào hai
instance là tin không sang được nhau, muốn phát tán phải thêm Redis. Hỏi lại
mỗi 15 giây tốn 1.329 byte / 0,25 giây mỗi lượt — rẻ hơn, và chạy đúng cả khi
hai máy ở hai instance khác nhau.

**24. Trang giới thiệu chia BỐN khu, chọn bằng MỘT cột chữ `khuGioiThieu`.**
Giá trị: `cuoi` · `albumhc` · `phimtruong` · `baby`. Chỉ có nghĩa khi `featured`
bật. Hai cột cũ `laBaby`/`laPhimTruong` **không còn dùng**, giữ lại theo tiền lệ
`accessMode` (xoá cột là không lùi được).

Vì sao một cột chữ chứ không phải nhiều cột đúng/sai: bốn khu **loại trừ nhau**,
mà ba cột đúng/sai sinh ra tám tổ hợp trong đó bốn cái vô nghĩa ("vừa là bé vừa
là phim trường"). Ở trang quản lý cũng vì thế mà dùng **ô tròn**, không phải ô
vuông. Muốn thêm khu thứ năm thì thêm một giá trị, không thêm cột.

Ba khu đọc dữ liệu kiểu "gom ảnh bìa" — mỗi album góp đúng **một** tấm bìa, vì
mỗi album là buổi chụp của một nhà khách. Riêng `phimtruong` đọc **thẳng nhiều
ảnh từ trong một album duy nhất**: đó là bối cảnh của studio, một tấm bìa không
khoe được gì. Đây cũng là lời gọi Drive **duy nhất** của trang giới thiệu — chấp
nhận được vì `loadTree` cache 5 phút dùng chung với trang khách, và phải bọc
`try/catch` để Drive trục trặc không giết cả trang quảng bá.

Khung ảnh mỗi khu khác nhau **theo tỉ lệ thật của ảnh trong đó**, đã đo chứ
không chọn cho đẹp: `cuoi`/`baby` dùng 3/4, `phimtruong` dùng **2/3** (cả 16 tấm
đều là ảnh dọc 1365×2048 — bản đầu em dựng khung 16:9 thì `object-cover` xén mất
khoảng 63% chiều cao, mà đó là ảnh khoe không gian), `albumhc` dùng **4/5** (trang
album và hình cổng rộng bản hơn ảnh chân dung). Thêm khu mới thì **đo tỉ lệ ảnh
thật trước rồi mới chọn khung**.

*Cập nhật 03/09/2026 — album phim trường đổi, và cái luật trên vừa cứu một bàn:*
studio thay album cũ (16 tấm, **toàn ảnh dọc** 2:3) bằng "All View HamitaGarden"
**60 tấm trộn cả dọc lẫn ngang** — đo 20 tấm ra 12 dọc / 8 ngang, tỉ lệ trải từ
**0,563 tới 1,499**. Không một khung cố định nào vừa cả hai kiểu: nhét tấm ngang
3:2 vào khung 2:3 thì `object-cover` xén mất khoảng **55% chiều rộng**, mà đây
là ảnh khoe KHÔNG GIAN. Hai nơi giải hai kiểu:

- **Trang chủ giữ khung 2:3 nhưng chỉ lấy ẢNH DỌC**, tám tấm. Lưới mời gọi cần
  tám ô đều tăm tắp; đo lại sau khi sửa: 6 tấm xén 0%, 2 tấm xén 17%. Thiếu ảnh
  dọc thì bù bằng tấm còn lại — thà một hai ô bị xén còn hơn khu này trống.
- **`/phim-truong` bỏ hẳn khung cố định**, dùng lưới cột báo (`columns`) và đặt
  `aspect-ratio` đúng kích thước Drive trả về cho từng tấm. Không tấm nào bị
  cắt, và vì tỉ lệ đặt sẵn nên trang không giật nhảy lúc ảnh lần lượt hiện.
  Drive **có sẵn** `imageMediaMetadata(width,height)` trong cùng lời gọi liệt kê
  tệp — không tốn thêm lần gọi nào, đừng đi đo lại bằng cách tải ảnh về.

**`/phim-truong` là trang riêng, KHÔNG dùng lại `/g/[slug]`.** Trang album là
chỗ riêng tư của một nhà khách: có nhập mã, thả tim, tick giữ riêng, đếm ngược
hạn giữ ảnh, và tự khai `noindex`. Phim trường thì ngược hẳn — công khai, càng
nhiều người tìm thấy càng tốt (nên có trong `sitemap.ts`), và khách xem nó
không chọn ảnh gì cả. Trang chủ khoe tám tấm; ai muốn xem hết thì sang đây.

`NavGioiThieu` nhận thêm cờ `trangKhac`: các mục là neo trong trang (`#anh`) khi
ở trang chủ, phải thành `/#anh` khi dùng ở trang khác, không thì bấm vào đứng im.

Tách `albumhc` khỏi `cuoi` là theo yêu cầu ngày 26/08: khách nhìn hai thứ đó với
hai mục đích khác nhau — xem ảnh cưới là xem **phong cách chụp**, xem album và
hình cổng là xem **thứ mình sẽ cầm về**. "HC" = hình cổng (đọc được từ tên thư
mục Drive "File gốc hình cổng"), là tiếng lóng trong nghề nên **không đưa vào
chữ khách đọc** — thanh điều hướng chỉ ghi "Album".

**25. Trang giới thiệu kể chuyện HÀNH TRÌNH CỦA KHÁCH, không kể lịch sử studio.**
Đây không phải lựa chọn văn phong mà là ràng buộc về sự thật: **không ai ở đây
biết chuyện thành lập studio**, nên viết ra là bịa. Còn hành trình của cặp đôi
thì mọi câu đều kiểm chứng được từ dịch vụ có thật — và cách kể đó còn đặt
khách vào giữa câu chuyện thay vì bắt họ đọc về người khác.

Năm dịch vụ xếp lại thành năm chương theo **đúng thứ tự chúng diễn ra**: ngồi
nghe → chọn váy → trang điểm → buổi chụp → album cầm về (`HANH_TRINH` trong
`studio.ts`). Đánh số 01–05 ở đây **có nghĩa thật** — chương 02 xảy ra sau
chương 01 — nên sợi chỉ dọc nối các chương cũng nói đúng một điều: đây là mạch
liền, không phải năm món rời. Chương cuối **không** có sợi chỉ, nếu không sẽ
thừa một đoạn chạy vào khoảng trống.

Mọi chữ khách đọc nằm trong `src/lib/studio.ts` (`HANH_TRINH`, `VE_HAMITA`,
`LOI_KE`, `ALBUM_HC`, `PHIM_TRUONG`, `HAMI_BABY`), **không viết thẳng vào JSX** —
sửa giọng văn thì không phải mở file giao diện.

Đoạn `VE_HAMITA` phải nêu **quan điểm**, không liệt kê dịch vụ: ngay dưới nó đã
có cả một mạch kể dịch vụ rồi, nói lại là lặp. Bản cũ chính là lỗi đó ("Hamita
là nơi lo trọn gói… từ lễ hỏi, ảnh cưới, trang điểm cho tới chiếc váy").

**26. Bản sao lưu KHÔNG được chứa phiếu đăng nhập Google.**
`npm run db:backup` xuất mọi bảng trừ hai thứ: cột `refreshToken` của
`GoogleAccount`, và cả bảng `LoginAttempt`.

Phiếu Google mở được **toàn bộ** Drive của studio và không hết hạn. Một tệp sao
lưu nằm trên ổ đĩa, được chép đi chép lại, gửi qua chỗ này chỗ kia — không phải
chỗ để giữ một chìa khoá như thế. Mà bỏ nó đi cũng chẳng mất gì: phục hồi xong
chỉ cần vào trang quản lý bấm "Kết nối lại", một phút là xong. Vẫn giữ `email`
và `connectedAt` để người phục hồi biết là đã từng có kết nối.

**Phục hồi CHỈ THÊM, không bao giờ ghi đè hay xoá.** Bản ghi nào còn tồn tại
thì bỏ qua và báo rõ. Lý do: trường hợp cần phục hồi trong thực tế gần như luôn
là "xoá nhầm một album", chứ không phải "quay cả database về hôm qua". Cho ghi
đè thì một lần phục hồi nhầm sẽ xoá mất những lựa chọn khách vừa làm hôm nay —
đúng cái mà bản sao lưu sinh ra để bảo vệ.

**Mặc định là xem trước**, phải gõ thêm `--ghi` mới động vào database. Một lệnh
phục hồi gõ nhầm mà chạy ngay còn tai hại hơn là không có lệnh nào.

`PushSub` có xuất ra tệp nhưng **không phục hồi lại**: phiếu đó gắn với một
trình duyệt cụ thể và hết hiệu lực khi khách gỡ app, phục hồi chỉ tạo ra dòng
rác mà lần gửi đầu tiên sẽ xoá đi (xem `phieuChet()` trong `push.ts`).

Đã đo thật ngày 26/08/2026 bằng một album thử dựng riêng — sao lưu, xoá, phục
hồi — **11/11 trường khớp chính xác**, kể cả ghi chú "in cỡ 40x60" của khách.
Dọn sạch sau khi thử, không đụng album nào của khách.

**27. `/api/suc-khoe` kiểm ĐÚNG hai thứ khách cần, không phải "trang có mở được không".**
Database đọc được, và ảnh trên Drive đọc được. Trả 200 khi khoẻ, **503** khi
hỏng — mọi dịch vụ theo dõi đều dựa vào mã trạng thái này.

Vì sao không chỉ gọi trang chủ: trang chủ trả 200 ngay cả khi kết nối Drive đã
đứt, lúc đó khách vẫn mở được link nhưng thấy màn hình `DriveLoi` thay vì ảnh.
Kiểu hỏng đó dễ xảy ra hơn hẳn việc cả Vercel sập, mà phép kiểm "có 200 không"
lại bỏ sót đúng nó.

Album đem ra thử chọn theo `albumCount` **nhỏ nhất** — mỗi thư mục con là một
lần gọi Drive, thử album 8 thư mục thay vì 1 thư mục là tốn gấp tám lần cho
cùng một câu trả lời. Phải dùng album **thật**: mã thư mục bịa thì Drive trả
404 ngay cả khi kết nối hoàn toàn khoẻ.

**Nhưng chỉ lấy album ĐÃ CÓ THƯ MỤC (`albumCount > 0`).** Thiếu điều kiện này
thì `orderBy` luôn chọn đúng một album **rỗng** — 0 là nhỏ nhất — đọc ra cây
không có thư mục nào rồi kết luận Drive hỏng. Mà album rỗng là trạng thái bình
thường và cố ý: studio gửi link cho khách **trước** khi có ảnh (xem nguyên tắc
34). Đã xảy ra thật ngày 03/09/2026 — đường này trả **503 liên tục** trong khi
ảnh vẫn tải về 77 KB trong 1,9 giây và cả ba trang album đều mở 200. **Báo
nhầm còn tệ hơn không có phép kiểm nào**: dịch vụ theo dõi kêu suốt cho tới lúc
studio tắt nó đi, rồi hỏng thật cũng không ai biết. Không còn album nào đủ điều
kiện thì coi là **khoẻ**, cùng nhánh với trường hợp chưa tạo album nào.

Cùng một cái bẫy ở `scripts/kiem-domain.mts`: nó lấy cứng `gallery[0]` của bản
sao lưu mới nhất, mà bản sao lưu là ảnh chụp một thời điểm — album đó có thể đã
bị xoá, và thế là bốn phép kiểm cùng báo hỏng oan. Nay thử lần lượt các slug,
lấy cái đầu tiên domain còn phục vụ thật.

Để công khai, không đòi mã, nên dịch vụ theo dõi nào cũng gọi được ngay. Đổi
lại phần trả về **cố ý nghèo nàn** — không tên album, không số liệu, không
thông báo lỗi gốc. Cache 60 giây nên gọi dồn không tốn thêm lần gọi Drive.

**Phần gọi thử và nhắn tin PHẢI để dịch vụ bên ngoài lo** — không phải lười mà
là kiến trúc: thứ canh chừng nằm cùng chỗ với thứ nó canh thì Vercel sập là nó
sập theo. Một cron chạy trên chính Vercel vô dụng đúng vào lúc cần nhất. Đừng
đề xuất lại phương án đó.

*Hệ quả kèm theo:* trang quản lý không gọi Drive (nguyên tắc 9) nên Drive đứt
là trang vẫn mở bình thường, không gì tố cáo. Vì vậy khung `KhoAnh` phân biệt
**chưa nối Google** (giấu khung đi) với **gọi Drive hỏng** (hiện dòng đỏ) — gộp
chung thì khung lặng lẽ biến mất và studio chỉ biết khi khách gọi điện.

**28. Đơn giao in CHỈ tính danh sách "Ảnh in" (trái tim), không tính "Ảnh chọn" (tick).**
Đây không phải lựa chọn kỹ thuật mà là **lời đã nói với khách**, nguyên văn ở
bước 01 trong `HuongDanChon.tsx` (là bước 02 cho tới 28/08/2026, khi studio
bỏ hẳn bước "Ngắm ảnh thật kỹ" đứng trước nó):

> *"Thấy tấm nào ưng, anh chị bấm **trái tim** để Hamita **in ra** nhé. Còn
> **dấu tick** dành cho những tấm anh chị muốn **giữ riêng cho mình**."*

Suy ra ba điều mà `src/lib/anhIn.ts` phải giữ đúng:
- Chỉ danh sách trái tim được in và được tính tiền. Đưa danh sách tick vào đơn
  là in thừa, mà tính tiền thì là **thu tiền thứ khách không đặt**.
- Đếm theo **tấm riêng biệt**. Một tấm vừa thả tim vừa tick vẫn chỉ là một tấm
  cần in.
- `soAnhTrongGoi = null` thì **không đưa ra con số tiền nào** — lúc đó phần
  hướng dẫn phía khách cũng đã bỏ qua đoạn giá, tự tính tiền là nói khác với
  thứ khách đọc được.

Chọn danh sách theo **biểu tượng** (`icon === "heart"`), không phải theo vị trí
đầu tiên: thứ tự có thể đổi, còn biểu tượng thì gắn với ý nghĩa.

Đã đo trên dữ liệu thật ngày 26/08/2026: `sn Duyen Ngo` có 13 tim / gói 10 →
vượt 3 tấm → **36.000đ**. Biên cũng đúng: 0 tấm → 0đ, đúng 10 tấm → 0đ, không
đặt gói → không tính.

*Quy tắc CSS cho bản in* nằm cuối `globals.css`, viết **ngoài mọi layer** cùng
lý do với khối chỉnh màu nền tối: cần thắng lớp tiện ích để xoá nền và kéo chữ
xám về đen. Máy in mặc định không in nền màu, nên mọi chữ xám nhạt trên giấy sẽ
mờ hơn hẳn trên màn hình.

**29. Thống kê xếp theo VIỆC CẦN LÀM, không theo con số đẹp.**
Phần đầu `/admin/thong-ke` là danh sách khách nên nhắn, số liệu để ở dưới. Một
trang thống kê chỉ toàn biểu đồ thì xem một lần rồi thôi; mở ra mà biết ngay
hôm nay phải gọi cho ai thì mới có người mở lại.

**Đếm lượt xem chỉ đếm SỐ LẦN**, không lưu ai xem hay xem từ đâu — studio không
cần biết, và không thu thập thì không phải giữ gìn. Ghi trong `after()` ở
`/g/[slug]` nên khách không phải đợi một phép ghi database; nuốt lỗi vì không
đếm được thì cùng lắm thiếu một con số, còn làm hỏng trang xem ảnh thì không
chấp nhận được.

**Bỏ qua bot xem trước link** (`laBot()` trong `constants.ts`). Facebook/Zalo
gọi vào trang mỗi lần ai đó dán link vào khung chat; đếm cả vào thì con số
"khách đã mở link chưa" thành vô nghĩa — mà đó mới là câu hỏi cần trả lời. Đã
đo: 3 lượt trình duyệt thật được đếm, 2 lượt bot bị bỏ.

**`luotXem = 0` KHÔNG đồng nghĩa với "khách chưa mở"** cho album tạo trước
`MOC_DEM_LUOT_XEM` (26/08/2026) — lúc đó chưa có cột này. Phải phân biệt bằng
ngày tạo, nếu không trang sẽ khuyên gọi làm phiền những khách đã xem từ lâu.

`ghiLuotXem` viết bằng SQL thẳng vì cần `COALESCE`: `xemLanDau` chỉ đặt **một
lần** rồi giữ nguyên mãi, `xemLanCuoi` thì lần nào cũng đổi. Prisma không diễn
đạt được "chỉ đặt nếu đang trống" trong một lệnh update, mà đọc-rồi-ghi thì hai
khách mở cùng lúc sẽ đếm thiếu.

**19. Trang khách không được chết vì Drive trục trặc.**
Danh sách ảnh đọc thẳng từ Drive mỗi lần khách mở trang (nguyên tắc 4), nên một
nhịp Drive không phản hồi là cả trang ném lỗi. Hai trang `/g/[slug]` và
`/g/[slug]/[albumId]` bọc riêng lời gọi `loadTree` và trả về
`src/components/DriveLoi.tsx` — màn hình nói rõ **ảnh vẫn còn nguyên**, kèm số
điện thoại studio. Không được để khách rơi vào trang lỗi đỏ chung: khách đang
chờ xem ảnh cưới của mình rất dễ hiểu nhầm là studio đã xoá mất ảnh.

**30. Ba kích thước trên trang khách là chuyện AN TOÀN, không phải thẩm mỹ.**
Đo ngày 27/08/2026 trên màn hình 375px, cả ba đều là số đo được.

- **Nút trái tim và nút tick: 44px, cách nhau 12px.** Trước là 40px cách 6px,
  trong khi đầu ngón tay người lớn rộng 45–57px. Hai nút này mang **ý nghĩa
  ngược nhau** — tim là *in ra*, tick là *giữ riêng* — nên bấm nhầm không phải
  phiền một chút: tấm khách muốn in rơi vào danh sách giữ riêng, tới ngày giao
  ảnh mới phát hiện thiếu và không ai biết vì sao. Đừng thu `gap-3` lại cho
  "gọn mắt".
- **Nút "Nhập mã": 44px cao, có viền.** Trước là chữ gạch chân cao 16px —
  thứ nhỏ nhất trên màn hình, mà chưa nhập mã thì khách không thả tim được
  tấm nào.
- **Ba bước hướng dẫn thu lại khi khách đã từng chọn.** Để mở sẵn thì khách
  phải cuộn **1.506px** — gần hai màn hình — mới thấy tấm ảnh đầu tiên, và
  cuộn lại từng ấy mỗi lần đổi thư mục. Thu lại còn **438px**, tức là ảnh nằm
  ngay trong màn hình đầu.
  *Đo lại 03/09/2026* sau khi tách khối gói ảnh ra riêng (nguyên tắc 38):
  mở sẵn **1.394px**, thu lại **670px**. Mở sẵn ngắn đi vì thẻ bước 01 nhẹ bớt
  một đoạn; thu lại dài thêm vì khối gói nằm ngoài phần gấp. Điều phải giữ
  không phải con số mà là **ảnh đầu tiên vẫn nằm trong màn hình đầu** — 670 <
  812. Đổi gì ở khối này thì đo lại mốc đó.

Việc thu/mở dùng **`<details>` của HTML, không phải state React** — và đây là
phần dễ bị "sửa cho hiện đại" nhất. Lý do không phải ít code hơn: trạng thái
mở/thu phải **đúng ngay dòng HTML đầu tiên**. Làm bằng React thì component phải
đợi danh sách đã chọn tải về mới biết khách đã từng chọn chưa — khách đã chọn
rồi sẽ thấy các bước hiện ra rồi tự gấp lại, kéo cả trang giật một cái và nhảy
mất vị trí đang cuộn. `daTungChon` đọc ở máy chủ trong `[albumId]/page.tsx`
và tính trên **cả album**, không riêng thư mục đang mở: khách đọc hướng dẫn ở
thư mục đầu là đã biết cách, sang thư mục thứ hai không phải đọc lại.

**31. Ô ghi chú phải có nút xác nhận nhìn thấy được — lưu ngầm là chưa đủ.**
Ô này vẫn lưu lúc rời khỏi ô (blur) và lúc bấm Enter như trước, nhưng **không
được bỏ nút "Lưu" đi** với lý do "blur lo rồi".

Anh phát hiện ngày 27/08/2026: ô ghi chú trên ảnh to không có nút nào, mà ngay
dưới nó là ba nút tròn — tim, **tick**, tải về. Khách gõ xong "Bóp eo", nhìn
xuống thấy dấu tick thì hiểu đó là nút xác nhận, bấm vào. Hậu quả: tấm ảnh bị
thêm vào danh sách **"Ảnh chọn" (giữ riêng)** — việc họ không hề định làm — mà
câu hỏi thật sự của họ ("ghi chú của mình lưu chưa?") vẫn không ai trả lời.

Ba chi tiết trong `OGhiChu` đều có lý do, đừng gỡ:

- **Nút luôn có mặt**, chỉ đổi trạng thái (mờ → sáng → "Đã lưu" → mờ lại sau
  2 giây). Cho nút hiện ra lúc bắt đầu gõ thì ô nhập co lại giữa chừng, chữ
  đang viết nhảy một cái.
- **`onPointerDown` chứ không phải `onClick`.** Ô nhập đang có con trỏ; bấm
  vào nút làm nó blur **trước** khi click kịp chạy, mà blur đã gọi `luu()` rồi
  nên cú bấm rơi vào khoảng không — nút bấm mà như không bấm. `pointerdown`
  chạy trước blur, kèm `preventDefault()` để giữ con trỏ lại.
- **Chưa mở khoá thì KHÔNG báo "Đã lưu".** Lúc đó `guiGhiChu` không gửi gì cả,
  nó treo thao tác lại chờ khách nhập mã. Báo đã lưu là nói dối, mà nói dối ở
  đây còn tệ hơn không có nút nào: khách yên tâm đóng máy, đến ngày in mới biết
  lời dặn không tới nơi. Trường hợp gửi đi rồi mà mạng hỏng thì thanh đỏ "Có
  tấm chưa lưu kịp" ở đầu trang tự hiện — để cho nó lo, đừng nhân đôi một lời
  báo nữa.

Hàng ghi chú dùng `max-w-sm` chứ không phải `max-w-xs`: phải chừa chỗ cho nút.
Đo trên bản thật ở màn hình 375px — ô nhập 222×44, nút 49×44, cùng hàng.

**32. Thứ gì gắn với một THƯ MỤC CON thì phải là bảng riêng, tra theo `albumId`.**
Thư mục con **không có bản ghi nào** trong database — danh sách thư mục đọc
thẳng từ Drive mỗi lần khách mở trang (nguyên tắc 4). Muốn gắn thêm gì cho một
thư mục thì phải có bảng trỏ tới nó bằng mã thư mục. `MucXong` làm vậy trước,
`BiaMuc` (ảnh bìa riêng từng thư mục, 28/08/2026) làm theo.

**Tra theo MÃ thư mục, không phải tên.** Studio đổi tên thư mục trên Drive là
mọi liên kết đứt — mà đổi tên thì họ đổi luôn chứ không báo ai. Vì cột
`subfolders` chỉ lưu tên chứ không lưu mã, đường `/api/admin/photos` phải trả
kèm danh sách thư mục có mã cho ô chọn ảnh bìa dùng.

**Không có dòng nào = rơi về mặc định**, đừng bắt studio phải đặt cho đủ. Thư
mục chưa đặt bìa vẫn lấy tấm đầu tiên như trước, nên mọi thư mục đều có bìa kể
cả cái chưa ai đụng tới.

*Bài học kèm theo, ghi vì đã vấp:* em từng chặn ô chọn bìa thư mục ở điều kiện
"album có từ hai thư mục trở lên", với lý do tự suy ra là *"một thư mục thì bìa
album và bìa thư mục là một"*. Sai — khách nhìn thấy **cả hai** trên trang bìa:
ảnh lớn ở đầu trang, và thẻ thư mục ngay bên dưới. **Đừng chặn một tính năng
bằng suy luận về cách người dùng nhìn màn hình; mở trang ra mà xem.**

**33. Lời mời cài app phải chốt TRƯỚC khi React chạy, và Android không bao giờ
bị giấu nút.**
Sửa ngày 03/09/2026 sau khi anh báo khách Android không tạo được app.

Chrome bắn `beforeinstallprompt` đúng **một lần**, ngay khi trang đủ điều kiện —
không ai nghe lúc đó thì mất luôn. Chỗ nghe cũ nằm trong `useEffect`, tức phải
đợi React tải và dựng xong. Đo trên trang album đang chạy, **máy bàn mạng cáp
quang**: `domInteractive` = **2.405ms**; điện thoại Android tầm trung dùng 4G
còn lâu hơn nhiều. Lần khách vào thứ hai trở đi, service worker đã nằm sẵn nên
Chrome xét đủ điều kiện gần như tức thì — sự kiện bắn ra lúc React chưa động
đậy. Nay một đoạn `<script>` nội tuyến trong `g/[slug]/layout.tsx` giữ sự kiện
lại trên `window.__hamitaCaiApp` rồi báo bằng `hamita:co-the-cai`. Nó **đồng
bộ**, còn mọi tệp của Next đều `async`, nên nó luôn chạy trước. **Đừng dời chỗ
nghe này về lại React.**

**Không được giấu nút trên Android vì thiếu sự kiện.** Bản cũ có
`if (!may.ios && !suKien) return null` — hệ quả là khách iPhone luôn được chỉ
tận nơi còn khách Android không thấy gì, trong khi sự kiện của Chrome vắng mặt
ở đủ tình huống thường gặp: mở link ngay trong Zalo/Facebook (trình duyệt nhúng
không bắn), Firefox, Samsung Internet, hoặc chỉ là bắn trước khi React nghe kịp.
Số liệu xác nhận: **cả 7 phiếu thông báo trong database đều là `web.push.apple.com`
— không một máy Android nào**. Nay điện thoại luôn thấy nút; thiếu sự kiện thì
mở bảng chỉ đường Android ("⋮ → Thêm vào Màn hình chính"), y như iPhone. Chỉ
**máy bàn** không có lời mời mới giấu nút — ở đó lời chỉ đường kia là chỉ sai.

`prompt()` phải bọc `try/catch`: nó ném thật khi sự kiện đã dùng một lần. Bản
cũ không bắt, nên lỗi rơi vào khoảng không và khách bấm nút thấy **không có gì
xảy ra** — không cách nào biết là hỏng. Hỏng thì lùi về bảng chỉ đường.

**34. "Làm mới" và "Gửi thông báo" là HAI NÚT TÁCH BẠCH.**
Tách ngày 04/09/2026 theo yêu cầu. **Đừng gộp lại.**

| Nút | Làm gì | Chạm tới ai |
|---|---|---|
| **Làm mới** | đọc lại Drive, chụp số liệu, dựng sẵn ảnh đầu | chỉ dữ liệu trong nhà |
| **Gửi thông báo** | nhắn cho khách đã bật nhận tin | điện thoại khách |

Vì sao phải tách: gộp chung thì nhân viên bấm "Làm mới" để xem ảnh đã lên chưa
mà **không ngờ mỗi cú bấm là một lần điện thoại khách rung**. Hai việc khác hẳn
nhau về hậu quả — một cái sai thì sửa lại được, một cái sai thì không thu hồi.

Nút gửi có **bước hỏi lại**, cho xem trước đúng câu khách sẽ đọc và nói rõ sẽ
gửi tới mấy máy. Album chưa ai đăng ký thì nút vẫn **hiện nhưng mờ** kèm lý do,
không giấu đi — giấu thì studio tưởng tính năng hỏng.

**Nhãn trên nút luôn là `Gửi thông báo · N máy`**, kể cả khi N = 0. Hai điều
đừng đổi:

- **Đừng bỏ chữ "máy".** Bản đầu chỉ in số trần (`Gửi thông báo 3`) và studio
  phải hỏi lại nó là gì — số ảnh mới? số lần đã gửi? Một con số đứng một mình
  cạnh chữ thì đọc kiểu nào cũng được.
- **Đừng viết dài hơn** cho trường hợp 0. Đã thử `· chưa ai đăng ký`: đo trong
  thẻ album thật (325px) thì nút phình lên **236px** và hàng nút vỡ thành **ba
  dòng**, mà 13/22 album đang ở trạng thái đó nên đa số thẻ sẽ rối. Dạng
  `· N máy` giữ nút ở **172–181px** cho mọi giá trị từ 0 tới 10, hàng nút gọn
  hai dòng, các thẻ cao bằng nhau. Lý do đầy đủ để trong chú thích khi rê chuột.

Không chạy trong `after()` như "Làm mới": studio cần biết ngay tin đã tới mấy
máy. Gửi xong mà im lặng thì lần sau không ai dám bấm.

**Lời nhắn CỐ ĐỊNH, dẫn về trang bìa album**, không nêu tên thư mục. Tách hai
nút ra thì lúc studio bấm gửi, số liệu đã cập nhật xong từ đời nào — không còn
gì để so ra "thư mục nào vừa thêm". Dựng một kho trạng thái riêng chỉ để giữ
"lần trước đã báo tới đâu" là thêm một thứ có thể sai, đổi lấy một dòng chữ.
Khách vẫn nhận ra chỗ mới: ở trang bìa, thư mục họ chưa từng mở mang sẵn chấm
"Mới" (`DauMoi.tsx`).

*Lịch sử, ghi để đừng dựng lại:* trước đó `syncAndWarm` tự đoán có đáng báo
không — thư mục mới, hay số ảnh tăng — kèm khoảng lặng sáu tiếng chống bấm liên
tục. Cỗ máy đoán ấy đã bỏ hết khi tách nút, không phải vì sai mà vì **câu hỏi
nó trả lời không còn ai hỏi nữa**: studio tự quyết lúc nào gửi. Giữ lại một cỗ
máy đoán mà không ai dùng thì lần sau đọc code sẽ tưởng "Làm mới" vẫn gửi tin —
đúng cái nhầm lẫn đang muốn dẹp.

Riêng bài học từ nó thì giữ: **thứ tự các phép kiểm là chỗ dễ sai nhất.** Bản
đầu đặt khoảng lặng lên trên cùng nên nó chặn cả thư mục mới; studio thử và gặp
ngay — thêm thư mục thứ nhất thì khách nhận tin, thêm thư mục thứ hai vài phút
sau thì im bặt.

**42. Không tìm thấy thư mục thì ĐỌC LẠI Drive rồi mới kết luận `notFound()`.**
Cache cây thư mục là một `Map` trong bộ nhớ của **từng máy chạy hàm**, mà Vercel
chạy nhiều máy song song. Studio bấm "Làm mới" thì chỉ máy nhận cú bấm đó xoá
cache; máy khác vẫn giữ cây cũ thêm tới năm phút.

Đã xảy ra thật (04/09/2026): studio thêm thư mục mới, khách bấm thông báo vào
thẳng thư mục đó, request rơi vào một máy còn giữ cây cũ — trang trả về **"không
tìm thấy trang"**. Thử lại lần nữa thì được, vì rơi vào máy khác. Đúng lúc khách
vừa được mời vào xem thì lại gặp trang lỗi.

`loadTreeMoi()` trong `gallery.ts` xoá cache rồi đọc lại. **Chỉ gọi khi đã tìm
mà không thấy**, không gọi cho mọi lượt xem — một lần đọc Drive đắt hơn nhiều so
với đọc cache. Thư mục thật sự không tồn tại thì tốn một lần đọc rồi vẫn về
`notFound()`; chấp nhận được vì đó là trường hợp hiếm.

*Cùng bản chất với bẫy đã ghi ở `rateLimit`:* đếm trong bộ nhớ trên Vercel không
đáng tin. Bất cứ chỗ nào dựa vào bộ nhớ của một máy để quyết định điều mà máy
khác cũng phải biết, đều sẽ sai kiểu này.

**43. Đếm lượt tải theo SỐ TẤM, không theo số lần bấm.**
Thêm 06/09/2026 theo yêu cầu. Cột `luotTai` + `taiLanCuoi` trên `Gallery`.

Nút "Tải cả thư mục" tải **từng tấm một** qua chính `/api/download`, nên đếm
theo lượt bấm sẽ ra con số vô nghĩa — một lần bấm có thể là 600 tấm. Đếm theo
tấm thì con số trả lời đúng câu cần hỏi: **khách đã lấy ảnh về chưa.** Album hết
hạn giữ ảnh mà khách chưa tải tấm nào thì studio còn phải nhắc; tải hết rồi thì
dọn Drive được yên tâm.

Ghi trong `after()` và nuốt lỗi, y như đếm lượt xem (nguyên tắc 29): không đếm
được thì cùng lắm thiếu một con số, còn làm hỏng việc tải ảnh thì không.

Đặt lệnh đếm **sau khi đã dọn dẹp xong ảnh, trước khi trả về** — tới đó mới chắc
chắn có file để giao, không đếm nhầm những lần Drive trả lỗi.

Cộng bằng SQL `"luotTai" + N` chứ không đọc-rồi-ghi. Đo thật: bốn lượt tải cùng
lúc trên một album cho ra đúng 7 (3 + 4), không đếm thiếu.

**Ô số liệu trên thẻ album tự giấu ở hai trường hợp**, đừng bỏ:
- Album **không cho tải** — con số luôn 0, hiện ra chỉ thành ô rỗng làm nhiễu.
- Album **tạo trước `MOC_DEM_LUOT_TAI`** — 0 ở đó nghĩa là "hồi đó chưa đếm",
  không phải "khách chưa tải", mà nhìn số 0 thì không phân biệt được. Cùng cách
  trang thống kê xử lý lượt xem.

*Bẫy đã vấp khi làm:* `MOC_DEM_LUOT_TAI` để ở `constants.ts` chứ **không** ở
`thongKe.ts` (nơi có `MOC_DEM_LUOT_XEM` cùng loại). Thẻ album chạy ở máy khách;
nhập hằng số từ `thongKe.ts` là kéo theo `getPrisma` vào gói phía khách và
Turbopack đổ ngay lúc build — *"the chunking context does not support external
modules (request: node:module)"*. **Hằng số cả hai phía cùng dùng thì để
`constants.ts`; file nào có dính tới database thì chỉ server được nhập.**

**44. Điện thoại tải TỪNG TẤM ẢNH, máy tính tải FILE NÉN.**
Studio yêu cầu 07/09/2026: *"tệp khách hàng của a dùng đt nhiều và không biết gì
về file zip"*. Khách chỉ có điện thoại mà nhận về một tệp .zip là nhận về một
thứ mở ra không xem được, phải đi tìm app giải nén — trong khi đích đến họ muốn
chỉ là ảnh nằm trong app Ảnh của máy.

**Hai hệ điều hành đi hai đường khác nhau vì khả năng của chúng khác nhau
thật**, không phải chọn cho vui:

- **Android** — thẻ tải xuống chạy đúng, ảnh rơi vào thư mục Tải về và các app
  xem ảnh (Google Photos, Thư viện) đều liệt kê thư mục đó thành một album. Nên
  cứ tải lần lượt từng tấm, khách không phải chạm thêm cái nào. Nghỉ 250ms giữa
  hai tấm: không nghỉ thì trình duyệt xếp hàng chục lượt tải chồng lên nhau
  trong một nhịp, máy yếu dễ bỏ sót.
- **iPhone** — KHÔNG có API nào cho trang web ghi vào app Ảnh, và thẻ tải xuống
  cũng không chạy. Đây là giới hạn của iOS, không phải chỗ chưa làm. Đường duy
  nhất là khay chia sẻ kèm tệp: khách bấm "Lưu N ảnh" là cả chụm vào thẳng app
  Ảnh. Khay không ôm nổi vài trăm tấm, và Safari chỉ cho mở khay trong vài giây
  kể từ cú chạm của khách — nên phải **chia đợt**: mỗi đợt tải trước vào bộ nhớ
  rồi mời khách chạm một cái để lưu.

**Máy tính vẫn giữ file nén, đừng đổi.** Ở đó khách biết giải nén; còn một thư
mục 772 tấm rơi lẻ vào Downloads thì lẫn hết vào những thứ khác, lại mất luôn
cách sắp xếp thư mục con của studio. Đường ghi thẳng xuống ổ đĩa
(`showSaveFilePicker`) cũng chỉ máy tính mới có, và đó mới là đường tải nổi vài
GB mà không phình bộ nhớ.

Số tấm mỗi đợt lấy **cái nào chặt hơn** giữa 20 tấm và 100 MB. Ảnh gốc ở đây
trung bình 1–2 MB nên thường chạm trần số tấm; trần dung lượng để chặn những thư
mục toàn ảnh in khổ lớn vài chục MB một tấm.

**Lời mời chuyển sang máy tính đứng sẵn dưới nút** với thư mục từ 300 MB (studio
yêu cầu), không đợi khách bấm mới hiện: đọc trước khi bấm thì còn kịp đổi ý, đọc
sau khi bấm thì họ đã bắt đầu chờ rồi.

**Nhận dạng máy trong `useEffect`, không đọc `navigator` lúc dựng giao diện** —
máy chủ không có `navigator`, đọc lúc dựng là hai bên ra hai kết quả khác nhau.
Đặt state qua `setTimeout` như `NutLuuApp`, không thì ESLint chặn.

**Đừng nói chắc điều mình không đo được.** Khay chia sẻ đóng lại chỉ có nghĩa hệ
điều hành báo xong; khách bấm "Lưu ảnh" hay gửi đi đâu khác thì trang web không
hề biết. Nên câu báo xong trên iPhone là *"anh chị mở app Ảnh xem lại giúp"*,
không phải *"ảnh đã nằm trong app Ảnh"*.

*Chưa đo được trên máy thật:* khay chia sẻ nhiều tệp của iPhone, và lời hỏi
"Tải nhiều tệp?" của Chrome trên Android. **Cần studio thử bằng một iPhone và
một máy Android thật.**

**Trình duyệt nhúng dùng để chạy thử KHÔNG có Web Share API** — đo lại ngày
07/09/2026: `navigator.share` và `navigator.canShare` đều là `undefined` ngay
trên localhost dù `isSecureContext` bằng true. Nên mọi nhánh khay chia sẻ không
bao giờ chạy trong lúc thử. **Đừng kết luận "máy này không hỗ trợ khay" từ nó** —
em đã kết luận sai đúng kiểu đó và bỏ lọt lỗi ở nguyên tắc 46.

**45. Trang quản lý: từ 1536px thì TRANG KHÔNG CUỘN, chỉ lưới thẻ album cuộn.**
Studio yêu cầu 07/09/2026. Mọi thứ còn lại trên trang đều là thứ phải luôn nhìn
thấy — khung kho ảnh trên Drive, ô "Tạo link mới", cây lọc theo tháng, khung
thông báo. Cuộn xuống tới album thứ hai mươi là mất sạch, mà đó lại đúng lúc
cần chúng nhất.

**Ô tìm và hàng mã lọc nằm NGOÀI ô cuộn**, dù chúng ở ngay trên lưới thẻ: đó là
công cụ để lọc chính cái lưới bên dưới. Cuộn mất công cụ đi trong lúc đang xem
kết quả thì phải cuộn ngược lên mới sửa được từ khoá.

**Mốc là `2xl` (1536px), KHÔNG phải `lg`.** Bản đầu em đặt ở `lg` và đo ở
1280px thì hỏng hẳn: dưới 1536px cột trái nằm ngang phía trên danh sách, khoá
chiều cao lại thì phần lưới thẻ chỉ còn một dải chừng **40px**. Dưới 1536px cứ
để trang cuộn như cũ — cùng mốc với chỗ ba cột thật sự đứng cạnh nhau
(nguyên tắc 36).

Chuỗi lớp phải đủ cả bốn tầng, thiếu một tầng là ô cuộn không có chiều cao và
trang lại dài ra như cũ: `2xl:h-dvh 2xl:overflow-hidden` ở `<main>` →
`2xl:min-h-0 2xl:flex-1` ở lưới ba cột → `2xl:flex 2xl:min-h-0 2xl:flex-col` ở
cột giữa → `2xl:min-h-0 2xl:flex-1 2xl:overflow-y-auto` ở ô cuộn. `min-h-0` là
tầng hay quên nhất: mặc định `min-height:auto` của flex/grid không cho con co
nhỏ hơn nội dung, nên `overflow` bên trong không bao giờ kích hoạt.

`h-dvh` chứ không `h-screen`. Cột phải cũng phải cuộn được: ô "Tạo link mới"
cao hơn màn hình 13 inch, khoá chiều cao mà không cho cuộn là không tới được
nút "Tạo link".

**Khung "Thông báo" dọn sang cột trái, đứng dưới cây lọc theo tháng** (cùng yêu
cầu). Cột trái hợp hơn vì cả hai thứ ở đó đều là cách **nhìn vào** danh sách
album, còn cột phải là chỗ **tạo ra** album mới — việc khác hẳn.

Nó được truyền xuống `AlbumList` dưới dạng **phần tử đã dựng sẵn ở máy chủ**
(`thongBao: ReactNode`), không phải dữ liệu thô: `AlbumList` chạy ở máy khách,
mà `docThongBao()` đọc thẳng database — nhập vào đó là kéo Prisma sang phía
khách và Turbopack đổ lúc build (cùng bẫy ở nguyên tắc 43). Phải nằm trong
`AlbumList` vì cây lọc dùng chung state lọc với danh sách.

*Bẫy đã vấp:* thả `{thongBao}` trần cạnh `<LocTheoThang/>` thì React kêu
*"Each child in a list should have a unique key prop"* — hai thẻ con tĩnh biên
dịch thành một **mảng**, mà phần tử dựng từ trang cha rơi vào vị trí mảng thì
bị đòi `key`. Bọc nó trong một thẻ là hết.

**46. Khay chia sẻ CHỈ dành cho iPhone — máy tính và Android tải thẳng.**
Anh phát hiện ngày 07/09/2026: bấm nút tải một tấm ảnh trên **máy bàn Windows**
thì hiện ra bảng *"Share using: Nearby Sharing, Paint, Discord, Feedback Hub…"*
thay vì tải file về.

Nguyên nhân là một **giả định sai đã viết thành chú thích** trong code cũ:
*"máy tính và Android không dùng khay chia sẻ"*. Nên `giaoTepChoKhach` và
`NutTai` chỉ hỏi `coKhayChiaSe(file)` rồi mở luôn. Chrome trên Windows **có**
`navigator.share` kèm tệp, nên điều kiện đó đúng và khay bật lên.

Trên máy tính, tải xuống vốn đã chạy tốt và đúng thứ khách muốn — hỏi họ muốn
gửi tấm ảnh đi đâu là chen thêm một câu không ai hỏi, lại còn dẫn tới chỗ khách
bấm nhầm "Discord" rồi mất luôn tấm ảnh. Android cũng vậy: ảnh rơi vào thư mục
Tải về và app xem ảnh liệt kê ngay (nguyên tắc 44). **Chỉ iPhone mới thật sự
cần khay**, vì ở đó thẻ tải xuống không chạy.

Nay cả hai chỗ đều bọc trong `laIOS()`. **Đừng bỏ điều kiện đó ra** với lý do
"máy nào có khay thì cứ dùng cho tiện".

*Vì sao lỗi này lọt qua buổi kiểm cùng ngày:* trình duyệt nhúng dùng để chạy
thử **không có Web Share API** — `navigator.share` là `undefined`. Nhánh khay
không bao giờ chạy trong lúc thử, còn Chrome thật của anh thì có. Bài học chung:
**thiếu một API trong môi trường thử KHÔNG chứng minh môi trường thật cũng
thiếu.** Muốn biết chắc thì hỏi máy thật, hoặc đọc bảng hỗ trợ của trình duyệt,
đừng suy từ kết quả `undefined` của một trình duyệt nhúng.

**47. Thẻ album nói rõ ĐÃ GỬI THÔNG BÁO CHƯA, và có BA trạng thái.**
Studio yêu cầu 07/09/2026: *"a không biết cái nào đã ấn gửi thông báo cho
khách"*. Hai mươi bảy album, bấm gửi rải rác cả ngày, rồi không nhớ đã bấm cho
nhà nào — hoặc bỏ sót một nhà đang chờ, hoặc gửi lại lần hai làm điện thoại họ
rung vô cớ.

Mốc ghi vào bảng `Moc` với tiền tố `bao-tin:<galleryId>`, y cách khung Thông
báo ghi dấu đã đọc (nguyên tắc 39) — bảng đó vốn để ghi "lần cuối làm việc X",
đúng hình dạng, khỏi thêm cột vào `Gallery`.

**CHỈ ghi khi `daGui > 0`.** `daGui = 0` nghĩa là mọi phiếu đều chết (khách gỡ
app) — không một ai nhận được gì. Ghi "đã gửi" lúc đó là dán cho studio yên tâm
về một việc chưa xảy ra.

**Ba trạng thái, không phải hai** — chỗ dễ làm sai nhất:

| Tình trạng | Thẻ hiện |
|---|---|
| Có mốc | **Đã gửi thông báo · 7/9 17:40** (màu nhấn) |
| Không mốc, album tạo TỪ `MOC_GHI_LAN_BAO` trở đi | Chưa gửi thông báo lần nào |
| Không mốc, album tạo TRƯỚC mốc đó | **Chưa rõ đã gửi tin chưa** |
| Không mốc, **0 máy chờ tin** | không hiện gì |

Dòng "chưa rõ" là bắt buộc, đừng gộp vào "chưa gửi": trước `MOC_GHI_LAN_BAO`
web không ghi lại gì cả, nên "không có dòng nào" **không chứng minh** được là
chưa gửi. Viết đại là "chưa gửi" thì studio gửi lại cho một nhà đã nhận rồi —
đúng cái phiền đang muốn dẹp. Cùng cách trang thống kê phân biệt lượt xem
(nguyên tắc 29) và thẻ album phân biệt lượt tải (nguyên tắc 43).

Đo trên dữ liệu thật lúc làm: 10/27 album có máy chờ tin — 1 album tạo hôm nay
ra "chưa gửi lần nào", 9 album cũ ra "chưa rõ", 17 album còn lại không hiện gì.

**Ẩn hẳn khi chưa có mốc VÀ không máy nào chờ tin.** Album đó không gửi được
cho ai; nói "chưa gửi" chỉ thành một dòng nhiễu trên hai phần ba số thẻ. Đây là
ngoại lệ có chủ đích với thói quen "không tự ẩn" ở nguyên tắc 39 — khung Thông
báo ẩn đi thì studio mất một chỗ canh việc, còn dòng này ẩn đi chỉ vì **không
có câu hỏi nào để trả lời**.

`lucGon()` ghép từ `formatToParts` chứ không dùng thẳng `format()`: bản tiếng
Việt xếp giờ lên TRƯỚC ngày ("17:40 7/9"), đọc ngược với cách người ta nói.
Múi giờ vẫn để `Intl` lo qua `MUI_GIO` (nguyên tắc 35).

`MOC_GHI_LAN_BAO` để ở `constants.ts`, **không** ở `moc.ts` — thẻ album chạy ở
máy khách mà `moc.ts` nhập `getPrisma` (cùng bẫy build ở nguyên tắc 43).

**48. Khung "Hỏi Hamita" trên trang album KHÔNG DÙNG AI, và khách BẤM chứ không GÕ.**
Studio yêu cầu 07/09/2026. Cả hai vế đều là quyết định, không phải bước đệm
chờ làm tiếp.

**Không dùng AI**, ba lý do:
- Mọi câu trả lời ở đây đều dính tới **tiền và ngày tháng** của khách. Câu chữ
  dựng thẳng từ dữ liệu album nên không có đường nào ra một con số khác với con
  số đang hiện trên trang.
- Không gọi mạng lần nào sau khi trang đã tải: không tốn tiền, không chậm,
  không hỏng khi mạng trục trặc.
- Đã cân nhắc bản có AI (Claude API) và **hoãn có chủ đích** — ước tính
  50–250k/tháng cho ~350 cuộc, tiền không phải rào cản; rào cản là chưa biết
  khách có dùng khung này không. Làm bản tĩnh trước để đo.

**Khách bấm, không gõ.** Đây là điểm mấu chốt, **đừng đổi thành ô nhập chữ**.
Studio nói thẳng: tệp khách của họ *"ít đọc chữ trên web"*. Một ô trống bắt họ
tự nghĩ ra câu hỏi rồi gõ — phần lớn sẽ bỏ qua. Danh sách nút bấm thì đọc lướt
là thấy ngay câu mình đang thắc mắc.

**MÃ CHỌN ẢNH KHÔNG BAO GIỜ ĐƯỢC ĐƯA VÀO KHUNG NÀY.** Ai cầm link cũng mở được
nó; có mã trong đó là bất kỳ ai cũng hỏi ra được, vô hiệu hoá đúng lớp bảo vệ
mà nguyên tắc 1 và 14 dựng lên. Câu "bấm tim mà không được" chỉ đường tới nút
"Nhập mã" và tới Zalo studio, không đọc mã ra. Đã kiểm trên trang thật: chuỗi
`123456` không xuất hiện ở đâu trong khung.

**Câu chữ phải KHỚP với thứ đang hiện trên trang** (nguyên tắc 28). Đoạn
tim/tick lấy đúng ý bước 01 phần hướng dẫn; số tấm trong gói và giá ảnh thêm
lấy thẳng từ `Gallery`; ngày giữ ảnh dùng chung cách viết với thanh đếm ngược
(`05/12/2026`) — hai chỗ nói cùng một ngày mà viết hai kiểu thì khách tưởng là
hai mốc khác nhau. Gói ảnh vẫn phải xử đủ **ba trạng thái** `null`/`0`/`N`
(nguyên tắc 38).

**Nút nổi ở góc TRÁI dưới, không phải góc phải.** Góc phải dưới đã có nút "lên
đầu trang" của lưới ảnh (`fixed right-4 bottom-4`); hai nút tròn chồng chỗ thì
khách bấm nhầm, mà dời nút cũ đi là đụng vào thứ đang chạy tốt. Đo ở 375px:
nút hỏi đáp chiếm 16→150px tính từ mép trái, nút lên đầu trang chiếm từ 315px —
không chạm nhau.

**Tầng z phải là 30.** Trên nội dung trang nhưng **dưới** khung xem ảnh to
(z-50) và hộp nhập mã (z-60): khách đang ngắm ảnh toàn màn hình thì không có
nút nào nổi lên che ảnh. Đã kiểm đúng thứ tự đó trên trang thật.

**Đường sang người thật luôn đứng sẵn ở đáy khung**, không đợi khách bấm hết
các câu mới hiện. Khung chỉ trả lời được chừng ấy việc; thứ nó không biết thì
giao lại cho studio ngay. Đây cũng là **đường liên hệ duy nhất** trên trang
album — trước đó trang không có lấy một liên kết gọi điện nào kể từ khi bỏ khối
"Phân vân quá…" ngày 28/08/2026.

Mọi câu chữ nằm trong `src/lib/hoiDap.ts`, **không viết thẳng vào JSX** — sửa
giọng văn thì không phải mở file giao diện (cùng lý do với `studio.ts`,
nguyên tắc 25). File đó chạy cả ở máy khách nên **không được nhập gì dính tới
Prisma** (nguyên tắc 43).

*Còn thiếu, cần studio bổ sung:* bộ câu hỏi hiện tại chỉ gồm những câu **web
tự trả lời được**. Những câu khách hay hỏi nhân viên sale (giá chụp, gói dịch
vụ, đặt lịch, có váy không…) **chưa có trong đây** — em không biết và không
được bịa. Studio đưa danh sách thì thêm vào `hoiDap.ts`, không cần đụng giao
diện.

**49. Thư mục ẢNH ĐÃ CHỈNH XONG hỏi khách một câu khác hẳn thư mục file gốc.**
Studio yêu cầu 09/09/2026. Hai loại thư mục đòi khách làm hai việc khác nhau,
nên chữ cũng phải khác:

| Loại thư mục | Khách đang làm gì | Câu hỏi | Nút |
|---|---|---|---|
| **File gốc** | CHỌN — lướt vài trăm tấm, thả tim tấm muốn in | "chọn xong thư mục X chưa ạ?" | Báo cho Hamita — đã chọn xong N tấm |
| **Hoàn thiện / PTS** | DUYỆT — Hamita chỉnh xong rồi, khách gật đầu | "xem thư mục X ưng chưa ạ?" | **Đã ok, báo Hamita để in** |

Hỏi "chọn xong chưa" trong thư mục ảnh đã chỉnh là **hỏi sai việc** — khách
không chọn gì ở đó, họ duyệt.

**Thư mục hoàn thiện KHÔNG đòi khách thả tim tấm nào mới hiện nút** (studio
chốt 09/09/2026). Ở file gốc, chưa chọn tấm nào nghĩa là chưa có gì để báo —
một khối lớn nói "chưa có gì" chỉ tốn một màn hình cuộn, nên vẫn ẩn. Ở thư mục
hoàn thiện thì ngược hẳn: Hamita đã chỉnh xong hết, việc của khách chỉ là xem
qua rồi gật đầu. Bắt họ tim một tấm mới hiện nút duyệt là bắt làm một bước
thừa — mà phần lớn sẽ không làm, rồi ngồi đợi studio trong khi studio ngồi đợi
họ. Vẫn giữ điều kiện **đã nhập mã**: chưa có mã thì không báo được gì cả.

Khi chưa thả tim tấm nào thì **đừng nói tới con số** — "anh chị đang chọn 0
tấm" vừa sai vừa làm khách tưởng mình còn thiếu một bước chưa làm. Câu lúc đó
là *"Hamita chỉnh xong cả thư mục này rồi ạ…"*.

**CHỈ ĐỔI CÂU CHỮ, không đổi cách chạy.** Vẫn là một lần bấm báo xong, vẫn ghi
vào đúng bảng `MucXong` như cũ (nguyên tắc 20). Đừng dựng thêm trạng thái mới.

**Nhận dạng bằng TÊN THƯ MỤC** (`laMucHoanThien()` trong `constants.ts`): tên
là thứ duy nhất có sẵn — thư mục con không có bản ghi nào trong database
(nguyên tắc 4 và 32), mà bắt studio đánh dấu tay từng thư mục thì sẽ có ngày
quên. Đổi lại phải chấp nhận: **studio đổi tên thư mục trên Drive là đổi luôn
chữ khách đọc.**

Khớp sau khi bỏ dấu và hạ chữ thường, nên `Hoàn thiện` · `hoan thien` ·
`HOÀN THIỆN` · `Pts` · `pts` đều ăn như nhau. `\b` hai đầu của `pts` là **cố
ý**: thiếu nó thì một tên như `scripts` cũng khớp. Đã thử 16 tên thật và tên
bẫy — `photobook hoàn thiện` khớp, `photobooks` và `scripts` không.

**Tính MỘT LẦN ở `AlbumView` rồi truyền xuống cả hai chỗ** (thanh trên cùng và
khối cuối trang). Để hai nơi tự nhận dạng riêng là có ngày một nơi đổi luật mà
nơi kia không — khách đọc trên một kiểu, đọc dưới một kiểu về đúng một việc.

*Bẫy đã vấp khi làm:* sửa bằng `perl -pi -e 's|...|...|'` mà trong phần thay
thế có `${tongSoDaChon}` — perl coi đó là **biến của chính nó** và thay bằng
chuỗi rỗng, nên câu hỏi ra "Anh chị chọn xong  tấm rồi phải không ạ?", mất con
số mà TypeScript lẫn ESLint đều không kêu (chuỗi vẫn hợp lệ). Chỉ mở trang thật
lên đọc mới thấy. **Đừng dùng perl thay chuỗi có `${...}`; dùng công cụ sửa tệp
hoặc đọc lại đúng dòng vừa sửa.**

**41. Số đỏ trên biểu tượng app** (Badging API), thêm 04/09/2026 theo yêu cầu.
Thông báo trên màn hình khoá rất dễ vuốt qua rồi quên; con số thì nằm lì trên
biểu tượng tới khi khách mở album ra.

Chỉ chạy trên máy đã **cài app ra màn hình chính** — trình duyệt thường không có
chỗ nào để vẽ con số. Máy không hỗ trợ thì lặng lẽ bỏ qua.

Bộ đếm **cộng dồn**, giữ trong Cache API (`hamita-so-do`), không phải biến trong
bộ nhớ: hệ điều hành tắt service worker giữa hai thông báo là biến mất sạch, mà
studio thêm ba thư mục trong một buổi thì khách phải thấy số 3.

*Điều này KHÔNG phá nguyên tắc 21.* Nguyên tắc đó cấm cache **nội dung** — ảnh
và trang — vì thế sẽ phá "link sống". Ở đây kho chỉ giữ đúng một con số. **Đừng
mở rộng kho đó ra để giữ thêm thứ gì khác.**

Xoá số phải làm **hai việc**, thiếu một là sai: xoá con số đang hiện
(`clearAppBadge`) và nhắn service worker xoá **bộ đếm** của nó
(`postMessage({kieu:"xoaSoDo"})`). Bộ đếm nằm bên service worker — không xoá thì
tin kế tiếp cộng tiếp từ số cũ, khách thấy "4" trong khi chỉ có một tin mới.
Xoá ở hai chỗ: khách mở/quay lại album (`TuLamMoi.tsx`) và khách bấm vào chính
thông báo (`notificationclick` trong `sw.js`).

*Bẫy về thứ tự khi vá dữ liệu cũ:* `npm run db:sync` chỉ gọi `updateGalleryMeta`,
**không** gọi `syncAndWarm` nên **không gửi thông báo**. Chạy nó trước là
`photoCount` nhảy lên số mới, lần "Làm mới" sau không còn thấy chênh lệch, và
khách vĩnh viễn mất đợt tin đó. Muốn khách nhận được thì phải đi qua nút **"Làm
mới"** ở trang quản lý (hoặc gọi thẳng `syncAndWarm`).

**35. Mọi phép chia theo NGÀY THÁNG đều tính theo giờ studio, không theo giờ máy.**
Dùng `MUI_GIO` trong `constants.ts` (`Asia/Ho_Chi_Minh`) với
`Intl.DateTimeFormat`, đừng dùng `getFullYear()`/`getMonth()` của `Date`.

Hai lý do, cái nào cũng đủ để bắt buộc. Thứ nhất là **lỗi thật**: hàm chạy trên
Vercel dùng UTC, trình duyệt ở Long An dùng UTC+7, nên album tạo lúc 0h30 ngày
1/1 giờ Việt Nam bị máy chủ xếp vào năm cũ còn máy khách xếp vào năm mới —
React báo lệch giữa bản dựng sẵn và bản dựng lại. Thứ hai là **đúng về nghiệp
vụ**: "album này tạo tháng 9" phải tính theo lịch của studio, không đổi theo
nơi người đang xem ngồi. Đã kiểm bằng một mốc đặt đúng 17h30 UTC 31/12 — cây
lọc xếp nó vào tháng 1 năm sau, đúng như tờ lịch treo ở studio.

**36. Bộ lọc theo tháng ở trang quản lý xếp theo NGÀY TẠO LINK.**
Ngày chụp không tồn tại ở đâu cả — ảnh nằm trên Drive, database chỉ giữ mốc
studio tạo link, mà hai mốc đó thực tế sát nhau. Đây cũng đúng con số ngày in
dưới mỗi thẻ album, nên bấm tháng nào thì ra đúng những thẻ mang ngày tháng đó.

Ba quyết định trong `LocTheoThang.tsx`, đều có lý do đo được:

- **Chỉ thành cột riêng từ 1536px**, không phải 1024px như phần lớn bố cục
  khác trong dự án. Cột rộng **17rem** (nới từ 13rem ngày 07/09/2026 khi khung
  thông báo dọn sang đứng cùng), cộng khoảng cách là 292px lấy thẳng từ phần
  dành cho thẻ album. Đo ở 1920px: thẻ còn **298px** — vẫn đủ rộng, mọi hàng
  trong thẻ nằm gọn. Nhưng ở 1024px thẻ tụt xuống còn 182px, chật tới mức các
  hàng "Hạn giữ ảnh", "Gói ảnh" tràn dòng. Dưới mốc đó cột này nằm ngang phía
  trên, cây lọc và thông báo chia đôi hàng. Bề rộng trang cũng nới từ `90rem`
  lên `104rem` để bù đúng chỗ cột chiếm.
- **Trạng thái mở/thu giữ bằng state React**, khác hẳn nguyên tắc 30. Ở đây
  `<details>` tự lo KHÔNG chạy được: `open` là thuộc tính React kiểm soát, nên
  mỗi lần bấm lọc là component vẽ lại và React ghi đè `open` về giá trị ban
  đầu — mở năm 2025 ra rồi bấm một tháng thì nó tự gấp lại ngay trước mắt, đã
  thử và thấy đúng vậy. Vẫn không nháy như nguyên tắc 30 lo, vì giá trị đầu
  tính thẳng từ props bằng hàm khởi tạo của `useState`.
- **Bấm vào năm thì LUÔN mở ra, không bao giờ gấp lại.** Nút năm nằm trong
  `<summary>` nên một cú bấm mang hai ý nghĩa. Bấm một năm còn thu mà nó vẫn
  thu thì không có đường nào thấy các tháng bên trong; bấm một năm đang mở mà
  nó gấp lại thì đúng thứ vừa lọc ra biến mất. Cả hai chiều đều dẫn về "mở" —
  muốn gấp thì bấm mũi tên. *Cách làm sai đã thử:* `stopPropagation()` trong
  nút — nó chặn luôn cả việc mở, vì `<summary>` gấp/mở dựa trên cú bấm đi qua
  nó.

Chỉ dựng những năm và tháng **thật sự có album**. Liệt kê đủ mười hai tháng thì
hơn nửa cây là số 0, nhân viên phải đọc lướt một đống dòng chết để tìm dòng sống.

**37. Bộ mã đầu tên album có MỘT nguồn duy nhất: `src/lib/maAlbum.ts`.**
Hai chỗ đọc từ đó — hàng nút gợi ý ở ô "Tên khách" lúc tạo link, và hàng nút
lọc ở danh sách album. Trước đây danh sách có bảng riêng gõ tay; thêm mã mới mà
quên sửa một chỗ là nhân viên đặt tên bằng mã đó rồi lọc không ra.

Hiện có mười mã: `HC` (hình cổng) · `AB` (album) · `ĐH` (đính hôn) · `HIS`
(nhà trai) · `HER` (nhà gái) · `Baby` (chụp bé) · `GD` (gia đình) · `NS`
(nhà Su) · `DN` · `TET`.

**`nghia` để `null` khi không biết chắc mã viết tắt của gì** — `DN` và `TET`
đang vậy. Chú thích bịa còn hại hơn để trống: nhân viên đọc rồi đặt tên theo
cái nghĩa sai đó. Tám mã còn lại đều có căn cứ (studio nói, hoặc đọc được từ
tên thư mục Drive của chính album mang mã ấy).

**Hai hàng nút giống nhau nhưng hỏi hai câu khác nhau, đừng gộp:**
- Ô tạo link hiện **đủ bộ**, kể cả mã chưa album nào dùng — câu hỏi là "được
  phép đặt những mã nào". Ẩn mã chưa dùng thì mã mới không bao giờ có album
  đầu tiên; `GD` và `NS` lúc thêm vào đúng ở tình trạng đó.
- Danh sách **ẩn mã không có album** — câu hỏi là "đang có gì để xem".

**Bấm mã trên ô trống phải chèn kèm dấu nối** (`"ĐH - "`, không phải `"ĐH"`).
Thứ tự nhân viên hay làm nhất là bấm mã trước rồi gõ tên; trả về mã trơn thì họ
gõ tiếp ra `"ĐHTrúc Mai & Minh Tiến"` dính liền — đã thử trên trình duyệt và ra
đúng chuỗi đó. Dấu nối lửng khi chưa gõ gì thì `createGalleryAction` dọn trước
khi ghi database, chứ không dọn ở giao diện: đó là chỗ duy nhất mọi đường vào
database đều đi qua, nên gõ tay ra chuỗi như vậy cũng được dọn.

`maDangCo()` **so với bộ mã đã biết**, không nhận bừa cụm chữ đầu tiên. Tên
`"Khmer- Y Bình"` có dạng giống hệt mã cộng dấu nối mà `Khmer` không phải mã —
nhận bừa thì bấm nút gợi ý sẽ nuốt mất một phần tên khách. Cũng phải đòi dấu
ngăn ngay sau mã, không thì `AB` khớp cả `"Abigail"`.

**38. Thông tin gói ảnh là khối riêng, NẰM NGOÀI phần hướng dẫn thu gọn được.**
Studio yêu cầu làm nổi bật ngày 03/09/2026.

Trước đó đoạn này là dòng chữ **nhỏ nhất và nhạt nhất** trên thẻ bước 01 — 12px,
màu `fg-faint`, nằm dưới một gạch mảnh. Tức là thứ duy nhất trên trang dính tới
**tiền của khách** lại được trình bày mờ nhất.

Ba điều phải giữ:

- **Ngoài `<details>`.** Khách đã chọn lần nào rồi thì ba bước tự thu lại
  (nguyên tắc 30), mà thu lại là nuốt luôn thông tin gói. Trong khi gói ảnh mới
  là thứ khách cần **đúng lúc đang chọn** — tới tấm thứ mười lăm mới nảy ra câu
  hỏi "quá gói mấy tấm rồi, bao nhiêu tiền". Đừng gộp lại vào thẻ bước 01 cho
  "gọn".
- **Rộng hết hàng.** Đo ở 1440px: khối rộng **1.120px**, gấp **3,1 lần** một
  thẻ bước (363px) — đó là chỗ khác biệt lớn nhất trên máy tính. Trên điện
  thoại vốn đã một cột nên cái làm nên khác biệt là nền màu nhấn và cỡ chữ:
  14px `text-fg` thay cho 12px `text-fg-faint`.
- **Hai con số in đậm, tô màu nhấn.** Khách đọc lướt chỉ cần bắt được hai thứ:
  gói bao nhiêu tấm, thêm một tấm thì bao nhiêu tiền.

**Giữ nguyên câu chữ**, chỉ đổi cách trình bày. Đây là lời studio đã nói với
khách (nguyên tắc 28); rút gọn thành dạng bảng cho "dễ đọc" là nói khác đi.

`soAnhTrongGoi === null` thì **không vẽ khối này** — album không tính theo gói
thì tự dựng ra một con số là thu tiền thứ khách không đặt.

**`soAnhTrongGoi` có BA trạng thái, không phải hai** (thêm 06/09/2026):

| Giá trị | Nghĩa | Khách thấy gì |
|---|---|---|
| `null` | không tính theo gói | không có khối gói ảnh |
| `0` | **gói chỉ lấy file, không kèm ảnh in** | "gói chỉ lấy file ảnh… tấm nào muốn in thì 12.000đ" |
| `N > 0` | gói có N tấm in | ba gạch đầu dòng, mở đầu bằng "Gói của anh chị cần tim N tấm" |

**Phải so với `null`, không được viết `soAnhTrongGoi ? …`** — số 0 cũng là giá
trị "sai" trong JavaScript nên gói 0 tấm sẽ bị đọc nhầm thành chưa đặt, và
khách mua gói chỉ lấy file sẽ không thấy dòng nào về giá in. Đã sửa ba chỗ mắc
bẫy này lúc thêm trạng thái 0.

Phần tính tiền **không phải sửa gì**: `tinhTienIn(soTam, 0, gia)` cho ra
`vuotGoi = soTam` — đúng nghiệp vụ, vì gói không kèm tấm in nào thì tấm nào
khách thả tim cũng là in thêm. Đo: 5 tấm → 60.000đ, 100 tấm → 1.200.000đ.

Đơn giao in bỏ hàng "Trong gói 0/0" khi gói là 0 — hàng đó không nói được gì mà
còn làm người cầm tờ đơn tưởng studio quên điền số; thay bằng một dòng nói thẳng
bản chất của gói, và đổi nhãn "Vượt gói" thành "In thêm".

**39. Khung "Thông báo" ở trang quản lý chỉ chứa VIỆC CỦA STUDIO.**
Thêm 04/09/2026 theo yêu cầu. Ranh giới với ba chỗ báo sẵn có — nhầm là cùng
một tin hiện hai nơi:

| Chỗ báo | Lo việc gì |
|---|---|
| Khung **Kho ảnh** đầu trang | Drive sắp đầy, album quá hạn giữ ảnh |
| Cạnh nút **Sao lưu ngay** | Lần sao lưu gần nhất cách đây bao lâu |
| Trang **thống kê** | **Nhắc khách** — chưa mở link, chưa chọn, chọn dở rồi dừng |
| Khung **Thông báo** (mới) | **Việc studio tự làm** — không ai gọi điện thay được |

Bốn loại đang canh:

- **Khách đã báo chọn xong** (thêm 06/09/2026). Đây là **tín hiệu chuyển việc
  từ khách sang studio** nên luôn là mức gấp: khách làm xong phần của họ và
  đang đợi. Trước đó chỉ có thẻ nổi ở góc (`TheoDoiKhach`) hiện đúng lúc khách
  vừa bấm — thoáng qua rồi mất, mở trang quản lý sau đó thì không còn dấu vết.
  Xong hết hay mới một phần **đều báo**, chỉ khác lời: album năm thư mục mà
  khách xong thư mục đầu thì studio in trước thư mục đó được, không phải đợi cả
  bộ.
  *Khách báo xong mà KHÔNG thả tim tấm nào thì đừng mời đi làm đơn giao in* —
  đơn đó sẽ trống trơn. Có thật: nhà "baby- Châu" báo xong mà chỉ tick giữ
  riêng 7 tấm. Có thể họ hiểu nhầm hai nút, cũng có thể chỉ muốn giữ file;
  đằng nào studio cũng nên hỏi lại trước khi kết sổ, nên câu chữ nói thẳng vậy.
- **Chưa đặt gói ảnh.** Tách hai mức, đừng gộp: đã có khách thả tim là **gấp**
  (đơn giao in không tính được tiền, tới ngày giao mới lộ ra); chưa ai thả tim
  thì chỉ là lời nhắc. Đo trên dữ liệu thật: 2 album gấp, 2 album nhắc.
- **Khách chọn thêm sau khi đã báo xong.** So với mốc báo xong **sớm nhất** của
  album. Đây là kiểu lỗi im lặng nhất: studio thấy "đã báo xong" thì đem đi in,
  khách còn thêm mấy tấm sau đó, tới ngày giao mới biết thiếu mà không ai lần
  ra vì sao. Thật: Tú Trinh thêm 10 tấm sau khi báo.
- **Album mất mã bảo vệ.** `daMoKhoa()` trả `true` khi album không có mã, nghĩa
  là ai cầm link cũng chọn được. Giao diện chặn mã dưới 4 ký tự nên không xảy
  ra từ đó, nhưng nếu xảy ra bằng đường khác thì phải thấy ngay.

**KHÔNG gọi Drive** (nguyên tắc 9). Vì vậy khung này **không thể** biết media
vừa đổ thêm ảnh vào một thư mục cũ — thứ chỉ lộ ra khi đọc lại Drive. Đừng thêm
phép kiểm kiểu đó vào đây; nó sẽ làm trang quản lý chậm hẳn.

**Không tự ẩn khi rỗng**, và khi rỗng thì **nói rõ đang canh những gì**. Khung
lặng lẽ biến mất thì studio không phân biệt được "hôm nay không có việc" với
"cái khung đó hỏng rồi" — đúng bẫy đã ghi ở nguyên tắc 27 với khung kho ảnh.

**Bấm vào dòng = đánh dấu ĐÃ ĐỌC, dòng biến mất ngay** (yêu cầu 06/09/2026).
Bản đầu để cả dòng là liên kết tới `/admin/[slug]`, nhưng việc studio làm nhiều
nhất là **đọc rồi dẹp** chứ không phải mở album ra ngay — ba trong năm thông
báo lúc đó là "chưa đặt gói ảnh" cho album của chính studio, đọc xong biết là
bỏ qua được. Đường sang album vẫn còn, là một liên kết nhỏ **"mở album"** đặt
đè lên góc dưới phải.

Hai thẻ đó phải là **anh em, không lồng nhau**: `<a>` nằm trong `<button>` là
HTML sai và mỗi trình duyệt xử lý một kiểu. Đặt tuyệt đối lên trên thì bấm vào
liên kết không chạm tới nút bên dưới.

Dấu tích lưu ở **DATABASE**, không phải trong trình duyệt: studio mở trang quản
lý trên cả máy tính lẫn điện thoại, đánh dấu ở máy này mà máy kia vẫn hiện là
đọc hai lần cho cùng một việc. Mượn bảng `Moc` với tiền tố `da-doc-tb:` — bảng
đó vốn ghi "lần cuối làm việc X", đúng hình dạng, khỏi đổi schema.

Dòng biến mất **ngay khi bấm**, không đợi máy chủ trả lời: cùng lắm là ghi hụt
một dấu tích và thông báo hiện lại ở lần tải sau, không đáng để studio ngồi
nhìn một vòng xoay.

**BẢNG `Moc` KHÔNG NẰM TRONG DÂY CHUYỀN XOÁ — phải dọn tay.** Mọi bảng con
(`MucXong`, `BiaMuc`, `PushSub`, `SelectionList`…) đều khai `onDelete: Cascade`
nên tự biến mất theo album. `Moc` thì không có quan hệ nào tới `Gallery` — nó
chỉ là một bảng khoá/giá trị dùng chung — nên dòng của nó **nằm lại vĩnh viễn**
sau khi album đã xoá. Đã xảy ra thật: rà ngày 09/09/2026 thấy một dòng
`bao-tin:` trỏ tới album không còn tồn tại. `deleteGallery` nay gọi
`xoaMocCuaAlbum()` ngay sau khi xoá album; đối chiếu bằng `contains` mã album
nên **thêm tiền tố mới cũng tự được dọn**, không phải nhớ sửa thêm chỗ nào.

**Id của thông báo "khách chọn thêm" mang theo SỐ TẤM** (`them-<id>-<soTam>`).
Đánh dấu đã đọc là tắt nó đi, nhưng nếu khách chọn **thêm nữa** thì phải báo
lại — không thì lại giao in thiếu mà không ai biết. Số tấm đổi thì id đổi, dấu
tích cũ không khớp và thông báo hiện trở lại. Hai loại kia không cần vậy: chúng
nói về một trạng thái đứng yên, không phải một con số lớn dần.

**40. Khung xem ảnh to ở trang quản lý dùng ĐÚNG bộ phím của khung phía khách.**
`Esc` đóng, mũi tên trái/phải chuyển tấm, vuốt ngang trên điện thoại — giống
hệt `PhotoGrid.tsx`. Hai khung viết riêng nhưng cùng một người dùng: studio mở
album của khách xem thử rồi quay lại trang này, tay quen phím nào thì phím đó
phải chạy.

Ba điểm khác với khung phía khách, đều có lý do:

- **Mũi tên chỉ chạy trong MỘT thư mục.** Lưới nhận ảnh theo từng nhóm thư mục
  chứ không cả danh sách, nên lướt hết một thư mục là dừng — không trôi sang
  thư mục khác lúc nào không hay.
- **Lời dặn của khách hiện dưới ảnh** trong khung to. Đây mới là chỗ studio đọc
  nó: đang nhìn kỹ đúng tấm đó để quyết chỉnh sửa thế nào.
- **Nền đen cố định**, không theo tông sáng/tối của trang quản lý — cùng lý do
  với ngoại lệ ở nguyên tắc 12: nền kem hắt màu lên ảnh thì không đánh giá được
  màu da và màu váy.

*Bẫy đã vấp, ghi để khỏi lặp:* hàm chuyển tấm phải tính từ vị trí CŨ do React
đưa vào (`setState(cu => …)`), **không đọc `viTri` trong closure**. Giữ mũi tên
cho phím tự lặp thì nhiều sự kiện rơi vào cùng một nhịp, React chưa kịp vẽ lại
nên lần nào cũng tính từ đúng một vị trí. Đo trước khi sửa: đang ở tấm 2, bấm
trái hai lần ra tấm 1 thay vì tấm 10 — nuốt mất một bước. Sau khi sửa: từ 1/10
bấm trái hai lần ra 9/10, bấm phải ba lần ra 2/10, đúng từng bước.

Ảnh trong lưới bọc trong `<button>` chứ không gắn `onClick` thẳng lên thẻ ảnh:
có nút thì bàn phím Tab tới được và Enter mở được.

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

**Tailwind v4 đổi `divide-y` sang dùng `border-bottom`** (trừ phần tử cuối cùng)
thay vì `border-top` (trừ phần tử đầu) như bản cũ hay nhớ nhầm. Đo
`border-top-width` sẽ luôn ra `0px` dù class áp đúng — phải đo `border-bottom-width`.

**CDN cache (`Cache-Control: immutable`) làm việc chặn hotlink theo Referer chỉ
có tác dụng với ảnh CHƯA từng được xem.** Ảnh đã có người xem hợp lệ trước đó
thì Vercel phục vụ thẳng từ cache, không chạy lại hàm kiểm tra Referer nữa —
đây là giới hạn chấp nhận được của mọi kiểu chặn hotlink kết hợp CDN, không
phải lỗi cần sửa tiếp (sửa tiếp sẽ phải hy sinh lợi ích cache).

**`dispatchEvent(new Event('blur'))` giả không kích hoạt `onBlur` của React.**
Blur không nổi bọt tự nhiên; phải gọi thật `element.blur()` để test.

**Thư viện ảnh (sharp) từ chối ảnh quá lớn.** Mặc định chỉ nhận 268 triệu điểm
ảnh để chặn "bom nén". Ảnh in khổ lớn của studio vượt xa mốc đó — tấm mica
60x120cm đo được 18000x36000 = 648 triệu điểm — và route trả về *"Input image
exceeds pixel limit"* sau 30 giây chờ. Đã nới bằng `TRAN_DIEM_ANH` trong
`constants.ts`, phải truyền vào **mọi** lời gọi `sharp()` (cả `/api/img` lẫn
`/api/download`, bỏ sót một chỗ là ảnh hiện được mà tải lại hỏng). Nới không
tốn bộ nhớ như tưởng: thư viện giải nén JPEG thẳng ở tỉ lệ thu nhỏ, tấm 648
triệu điểm chỉ tốn 340 MB và 1,9 giây.

**Phiếu thông báo đẩy chết theo hai kiểu, phải xử lý cả hai.** Dịch vụ trả
404/410 là một kiểu (khách gỡ app). Kiểu thứ hai: dữ liệu phiếu tự nó hỏng
(khoá sai dạng) — lỗi xảy ra lúc **mã hoá**, chưa kịp gửi đi đâu nên **không có
mã trạng thái nào cả**. Chỉ bắt 404/410 thì phiếu rác nằm lại vĩnh viễn. Xem
`phieuChet()` trong `src/lib/push.ts`.

**Mở lại app đã cài KHÔNG phải là tải trang mới.** Hệ điều hành khôi phục
nguyên cửa sổ cũ trong bộ nhớ, nên studio vừa thêm thư mục mà khách bấm vào
lối tắt thì vẫn thấy bộ ảnh của lần xem trước. Đã xử lý bằng `TuLamMoi.tsx`
(tự lấy lại nội dung khi khách quay lại sau hơn 20 giây, và bắt cả `pageshow`
cho trường hợp trang lấy từ bộ nhớ đệm). Cùng lỗi này ở service worker: bấm
thông báo mà chỉ gọi `focus()` thì cửa sổ hiện lên vẫn ở trang cũ — phải
`navigate()` tới đúng nơi.

**Thử một component có gọi mạng: chỉ chặn ĐÚNG đường cần giả.** Ghi đè
`window.fetch` cho mọi đường sẽ làm `router.refresh()` của Next nhận dữ liệu
rác rồi hỏng, mà triệu chứng giống hệt như component không chạy — mất rất
nhiều thời gian lần. Nhớ thêm: chế độ phát triển của React chạy hiệu ứng hai
lần, nên lần trả dữ liệu đầu tiên có thể bị nuốt.

**Chú thích `{/* … */}` không đứng một mình trong `return (` hay trong nhánh
của toán tử ba ngôi.** Chỗ đó chỉ nhận **một** phần tử gốc, mà chú thích JSX
tính là một phần tử — thành ra hai. Lỗi báo rất khó lần: *"JSX expressions must
have one parent element"* rồi kéo theo cả loạt lỗi cú pháp ở những dòng phía
dưới, trông như hỏng ở chỗ khác. Đã vấp ba lần trong một buổi. Cách viết đúng:
đặt chú thích **bên ngoài** `return`, hoặc dùng chú thích thường `/* … */`
ngay sau dấu `(`, hoặc đẩy nó vào **trong** thẻ đã mở.

**ESLint của React 19 bắt hai thứ mà bản cũ bỏ qua**, và cả hai đều là lỗi
thật chứ không phải khó tính:
- *Gọi hàm bất thuần lúc dựng giao diện* — `Date.now()` viết thẳng trong thân
  component. Máy chủ dùng một mốc lúc vẽ trang, máy khách dùng mốc khác lúc
  nhận trang, hai bên ra hai con số. Sửa bằng cách để `null` ở lượt đầu rồi
  tính trong `useEffect` (xem `ThoiHan.tsx`, `DemNguoc.tsx`).
- *Đổi state đồng bộ trong thân `useEffect`* — kéo theo một lượt vẽ lại ngay
  sau lượt vừa xong. Hai cách chữa tuỳ việc: đặt lại state khi một giá trị đầu
  vào đổi thì **so với lượt trước ngay trong thân component**
  (`PhotoGrid.tsx`); còn tải dữ liệu thì để hàm gọi máy chủ **thuần tuý, không
  đụng state**, mỗi nơi gọi tự quyết định lúc nào bật đèn "đang tải"
  (`CoverPicker.tsx`). Lưu ý ESLint không phân tích xuyên hàm: gọi một hàm có
  `setState` bên trong từ effect vẫn bị bắt, dù `setState` đó nằm sau `await`.

**Một byte NUL lẫn vào mã nguồn làm CẢ TỆP tàng hình với mọi lệnh tìm kiếm.**
Tìm ra ngày 09/09/2026: `CoverPicker.tsx` có một byte `0x00` nằm trong chuỗi ở
dòng 11 (`const CA_ALBUM = "\0ca-album"`). Chương trình vẫn chạy đúng vì hằng số
đó chỉ so với chính nó, nhưng `file` nhận cả tệp là **nhị phân**, nên `grep`
và mọi công cụ dò theo dòng đều **bỏ qua tệp này** — chỉ in
*"Binary file … matches"*. Hệ quả: tìm một đoạn mã trong cả kho sẽ tưởng tệp đó
không có gì, và một buổi rà soát có thể bỏ sót nguyên một tệp.

Cách phát hiện nhanh: `file src/**/*.tsx` — tệp lành phải là *"Unicode text,
UTF-8 text"*, tệp hỏng ra *"data"*. Sửa = lọc bỏ byte 0, không cần viết lại gì.

**State cũ trong closure khi vừa set state vừa gọi lại hàm trong cùng lượt
bấm.** React chưa kịp cập nhật state trước khi hàm chạy lại, đọc phải giá trị
cũ. Sửa bằng cách truyền thẳng tham số vào hàm thay vì dựa vào state cho quyết
định cần đúng ngay lập tức (gặp ở nút "Vẫn tải" của cảnh báo tải file lớn).

---

## Ranh giới khi thao tác

- **Không tự ý gỡ `ADMIN_PASSWORD`** khỏi `.env.local` để xem giao diện. Người
  dùng đã tỏ ý không thoải mái. Nhờ họ tự kiểm tra thay vì tự mở khoá.
- **Cách kiểm chứng thay thế cho trang cần đăng nhập:** dựng một route thử tạm
  (`src/app/thu-xxx/page.tsx`, không đọc `isAdmin()`) render thẳng component
  cần xem với dữ liệu giả (hoặc bọc `SelectionProvider` thật với props giả cho
  các component phía khách), đo bằng `getBoundingClientRect()`/`getComputedStyle()`
  qua trình duyệt, rồi **xoá thư mục thử ngay sau khi xong** — kiểm tra lại
  bằng `git status` để chắc không sót. Dùng cách này đã kiểm chứng được cả giao
  diện admin lẫn client mà không cần mật khẩu.
- **Muốn thao tác trên dữ liệu thật (không phải chỉ đọc)** — ví dụ test toggle
  lựa chọn, test cảnh báo tải lớn — được phép miễn **dọn sạch ngay sau khi
  kiểm chứng xong** và **đo lại bằng script để xác nhận đã sạch** (không chỉ
  tin là đã dọn). Đã làm nhiều lần với gallery `le-han` trong phiên 24/08.
- **Thao tác phá huỷ dữ liệu thật sự (không định dọn lại) phải hỏi trước** —
  xoá cột, xoá bảng, xoá album của khách. Cột `accessMode` hiện không dùng
  nhưng vẫn giữ, vì xoá là không lùi được.
- **Không thêm tính năng không được yêu cầu.** Người dùng đã gỡ nhiều thứ dư.
- **Không đoán khi không đủ căn cứ** — ví dụ định dạng link Zalo: đã thử vài
  cách, kết quả không rõ ràng, nên hỏi lại người dùng thay vì đoán liều một
  link có thể chết trên trang thật.

---

- **Deploy bằng `git push`** — kho `miticode/HamitaWebDrive` đã nối với dự án
  Vercel **chiều 26/08/2026** (anh tự nối trong Settings → Git). Đẩy lên nhánh
  `main` là Vercel tự dựng bản production.
  *Lịch sử để khỏi lặp lại nhầm lẫn:* bản bàn giao 25/08 ghi câu này khi kho
  **chưa** nối, nên suốt ngày 25 và sáng 26 mọi cú push đều không dựng gì mà
  không ai biết. Cách phát hiện: `npx vercel ls hamita-gallery --scope hamita`
  cho thấy bản mới nhất vẫn cũ hàng chục tiếng.
- **Đừng tin là đã lên, phải kiểm.** Sau khi push, xem `npx vercel ls` có bản
  mới với `Username` là tên tài khoản GitHub (deploy do git kích hoạt) hay
  không, rồi **gọi một đường API vừa đổi và xem nó trả kiểu cũ hay kiểu mới**.
  Đừng đoán theo thời gian.
- **Đường lui khi cần đẩy gấp** (git trục trặc, hoặc muốn dựng từ mã chưa
  commit): `npx vercel deploy --prod --yes --scope hamita`. Lệnh này đôi khi
  báo "Not authorized" vì phiên CLI hết hạn — chạy `npx vercel login` rồi làm lại.
- Kiểm tra bản mới đã lên chưa bằng cách **gọi một đường API vừa đổi và xem nó
  trả về kiểu cũ hay kiểu mới**, đừng đoán theo thời gian.
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
| `git push` | **Đưa lên mạng** (Vercel tự dựng) |
| `npx vercel deploy --prod --yes --scope hamita` | Đường lui khi git trục trặc |
| `npm run db:check` | Xem album nào khách đã chọn bao nhiêu ảnh |
| `npm run db:sync` | Chụp lại số liệu Drive cho toàn bộ album |
| `npm run db:backup` | **Sao lưu database** ra `data/sao-luu/` |
| `npm run db:restore` | Liệt kê các bản sao lưu · xem trước · phục hồi |
| `npm run kiem:domain -- https://...` | **Kiểm một domain mới đã sẵn sàng chưa** (16 phép kiểm) |
| `npm run db:push` | Cập nhật cấu trúc database |
