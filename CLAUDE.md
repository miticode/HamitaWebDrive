@AGENTS.md

# Web giao ảnh Hamita Studio

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
bước 02 trong `HuongDanChon.tsx`:

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
| `npm run db:push` | Cập nhật cấu trúc database |
