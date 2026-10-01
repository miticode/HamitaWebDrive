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
Khách mở link là xem được toàn bộ ảnh. Muốn thả tim thì phải nhập mã của album
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

*Ngoại lệ thứ hai:* khối **con trỏ bàn tay** nằm trong `@layer base` (không
phải `components`) — xem ngay dưới đây.

**BẤM ĐƯỢC THÌ CON TRỎ PHẢI THÀNH BÀN TAY.** Anh yêu cầu 21/09/2026. Mặc định
trình duyệt cho `<button>` là mũi tên thường — chỉ `<a href>` mới sẵn bàn tay —
mà web này hầu hết là nút, nên trông như chữ chết. Khối trong `@layer base` ở
`globals.css` phủ: `button`, `summary`, `select`, `label[for]`, nhãn bọc ô tích
(`label:has(> input[type=checkbox])`), `[role="button"]`, và các `input` kiểu
bấm. Nút đang khoá (`:disabled`, `aria-disabled`) hiện **dấu cấm**, không phải
bàn tay: bàn tay trên nút bấm không ăn thua là hứa hão.

Phải là `@layer base` để lớp tiện ích `cursor-*` còn đè lên được — web đang có
ba chỗ cố ý khác đi: tấm phủ đóng bảng "…" (`cursor-default`), nút "Gửi thông
báo · 0 máy" (`cursor-not-allowed`), ảnh bấm để phóng to (`cursor-zoom-in`).
Viết trần ngoài layer là xoá sổ cả ba.

**GU CỦA HAMITA THẮNG SKILL THIẾT KẾ.** Anh cho cài skill `frontend-design`
của Anthropic ngày 23/09/2026 (`~/.claude/skills/frontend-design`). Skill đó
liệt kê mấy thứ là "dấu hiệu trang do máy sinh ra" và khuyên tránh — trong đó
có **đúng hai thứ web này dùng khắp nơi**:

- **Nhãn chữ hoa giãn cách trên mỗi tiêu đề** (`.eyebrow`) — đang dùng ở **57
  tệp**, là lựa chọn thống nhất của cả web từ đầu.
- **Chuỗi thông tin nối bằng dấu chấm giữa** ("Mã 123456 · gói 100 ảnh",
  "/g/slug · ngày tạo").

Hai thứ đó **ở nguyên**. Đừng đọc skill rồi đi "sửa cho khỏi giống AI": chúng
không phải mặc định ai đó bê vào, mà là hệ thống nhãn đã dùng nhất quán hàng
trăm chỗ và studio đã quen mắt. Skill dùng để tham khảo khi dựng giao diện MỚI,
còn những gì đã chốt trong tệp này và những gì anh đã duyệt thì skill không có
quyền lật lại.

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
- Hỏi lại danh sách mỗi **30 giây** khi tab đang mở VÀ khách còn động vào trang
  trong 5 phút gần đây (`NHIP_DONG_BO`, `NGHI_SAU`), cộng một lần ngay khi
  khách quay lại tab hoặc chạm lại sau lúc nghỉ. *Nới từ 15 giây ngày
  21/09/2026, anh đồng ý* — xem nguyên tắc 53.

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

> **ĐÃ THAY từ 17/09/2026:** ô tích "Trang giới thiệu" trên thẻ album đã BỎ. Mọi
> thứ lên trang giới thiệu chọn ở `/admin/gioi-thieu` (bảng `AnhGioiThieu`, xem
> nguyên tắc 25). Cột `featured`/`khuGioiThieu` còn trong database nhưng KHÔNG
> ai đọc — đừng dựng lại chỗ tích trên thẻ. Hai album đang tích lúc đó (Hamita
> Garden, HC Hồng Tâm - Hoàng Minh) đã được chuyển sang, giữ nguyên ảnh bìa.
> `/phim-truong` chuyển hẳn (308) sang `/dich-vu/hamita-garden`. Phần dưới giữ
> lại để hiểu lịch sử và lý do tỉ lệ khung ảnh từng khu (vẫn đúng).
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
chỗ riêng tư của một nhà khách: có nhập mã, thả tim, đếm ngược
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

**Khu "Hành trình" năm chương đã GỠ 25/09/2026** theo yêu cầu của anh — cùng
đợt rà chỗ dư trên trang (hằng `HANH_TRINH` xoá luôn, `StudioIcon` nay tự khai
tên biểu tượng). Nguyên tắc kể chuyện ở trên vẫn giữ cho phần chữ còn lại; đừng
dựng lại khu đó nếu không được yêu cầu.

Mọi chữ khách đọc nằm trong `src/lib/studio.ts` (`VE_HAMITA`, `LOI_KE`,
`PHIM_TRUONG`, `HAMI_BABY`), **không viết thẳng vào JSX** —
sửa giọng văn thì không phải mở file giao diện.

**Bố cục trang giới thiệu học từ mohome.vn (16/09/2026, theo yêu cầu).** Chỉ học
CÁCH BÀY, giữ nguyên màu, phông và bốn khu của Hamita: đầu trang hai cột (dải
trang album chạy nằm trong khung bo góc bên phải — `AnhBiaChay trongKhung`),
"Về Hamita" kèm thẻ số liệu, thẻ **hai cơ sở**, lưới **"Hamita chụp gì?"** bằng
thẻ ảnh lớn chữ đè lên ảnh (`DICH_VU` trong `studio.ts`), bốn khu ảnh với đầu
mục canh trái, dải kêu gọi bo tròn, và ba
nút liên hệ nổi (`NutLienHeNoi`). Mấy điều phải giữ:

- **Lưới "Hamita chụp gì?" chia BỐN PHẦN theo thương hiệu** (`PHAN_DICH_VU`
  trong `studio.ts`, anh yêu cầu 25/09/2026): Hamita Wedding (ảnh cưới, album &
  hình cổng, Hamita Garden) giữ lưới ba thẻ dọc; Hami Baby Studio, Tiệm ảnh nhà
  Su và Váy cưới & trang điểm mỗi cái một **dải ngang** ảnh trái chữ phải —
  một thẻ dọc đứng lẻ giữa hàng trông như lưới thiếu ảnh. Hai quy tắc nhỏ:
  **tên phần trùng tên thẻ duy nhất thì không in tên phần** (đọc hai lần cùng
  một cái tên), và **nhãn thẻ trùng tên phần thì bỏ nhãn** (thẻ "Bé & gia đình"
  vốn mang nhãn "Hami Baby Studio").

  **Phần một mảng mà mảng đó chia nhiều mục thì bày thẳng CÁC MỤC** (anh yêu
  cầu 25/09/2026 cho Hami Baby Studio: Bầu, Sơ sinh, Baby - Thôi nôi, Gia
  đình) — lưới bốn cột thay cho dải ngang. Mục chưa chọn thư mục nào vẫn hiện
  (ô nền màu nhấn nhạt + biểu tượng) nhưng **dẫn về `hrefThe` của mảng, không
  dẫn sang trang mục**: mục trống bên đó trả 404. Quy tắc này tự áp dụng cho
  phần khác khi nhóm của nó có từ hai mục trở lên.

- **Trang từng dịch vụ `/dich-vu/<nhóm>/<mục>`** (17/09/2026). Năm nhóm khớp năm
  thẻ "Hamita chụp gì?" — Ảnh cưới, Hamita Garden, Bé & gia đình, Váy cưới &
  trang điểm, Tiệm ảnh nhà Su. **"Album & hình cổng" đã gỡ hẳn 25/09/2026 theo
  yêu cầu của anh**: mất cả thẻ trong lưới, khu ảnh riêng giữa trang chủ, mục
  ALBUM trên menu và hằng `ALBUM_HC`; mã `AB`/`HC` vẫn giữ để đặt tên album nội
  bộ. Đừng dựng lại nếu không được yêu cầu — **nhóm cố định trong mã nguồn**
  (`NHOM_GIOI_THIEU`, `src/lib/nhomGioiThieu.ts`), còn **mục nhỏ và mã gợi ý nằm
  trong database** từ 25/09/2026 (bảng `MucDichVu`, đọc/ghi qua
  `src/lib/mucDichVu.ts`) vì anh yêu cầu tự tạo mục trên web. Key mục là đường
  dẫn gửi khách — sinh từ tên lúc tạo rồi **giữ nguyên mãi**, kể cả khi đổi tên
  mục. Studio chọn THƯ MỤC CON ở `/admin/gioi-thieu` (tab theo nhóm →
  "Thêm vào trang giới thiệu" → album gợi ý theo mã → chọn thư mục; "Đổi bìa"
  trên từng thẻ). Bảng `AnhGioiThieu` (cột `nhom`, `muc`), tra theo MÃ thư mục,
  lưu kèm tên và tấm bìa để trang quản lý và trang danh sách không gọi Drive;
  chỉ trang ảnh `/dich-vu/<nhóm>/anh/<id>` mới đọc Drive. Nhóm một mục thì không
  có hàng nút mục. Mục/nhóm chưa có thư mục thì 404, và thẻ ở trang chủ quay về
  đường cũ. `/anh-cuoi/*` (tên cũ vài tiếng) chuyển hẳn (308) sang đường mới.
  **KEY MỤC KHÔNG ĐƯỢC TRÙNG GIỮA CÁC NHÓM**: ràng buộc không trùng vẫn là
  (muc, galleryId, albumId); đổi nó phải chạy `db push --accept-data-loss` trên
  database thật — Prisma chặn lệnh đó khi trợ lý chạy, đừng lách. KHÔNG dẫn sang
  `/g/[slug]` của nhà khách (nguyên tắc 17). Nhãn và mô tả thẻ "Tiệm ảnh nhà Su"
  cố ý để trống chờ anh viết — đừng tự điền.

  **Nhóm đang xem nằm trong địa chỉ trang** (`?nhom=be-gia-dinh`, 25/09/2026):
  anh đang ở tab Bé & gia đình mà bấm đọc lại Drive thì bị nhảy về tab đầu.
  Ghi bằng `history.replaceState` chứ ĐỪNG dùng `router.replace` — cái đó bắt
  máy chủ dựng lại trang mỗi lần bấm tab, tốn thêm một lượt hỏi database mà
  chẳng được gì (nguyên tắc 53).

  **STUDIO TỰ TẠO MỤC** (anh yêu cầu 25/09/2026): trong mỗi tab nhóm có thẻ
  "Tạo mục mới", và mỗi mục có hàng *Sửa tên, mã · ↑ Lên trước · ↓ Xuống sau ·
  Xoá mục*. Bốn điều phải giữ khi đụng vào phần này:
  - **`MUC_MAC_DINH` chỉ là bản nạp lần đầu.** Bảng trống thì `napLanDau()`
    chép nguyên nó vào database rồi thôi — sửa mảng đó sau này không đổi gì
    trên web thật, muốn đổi phải sửa trong database.
  - **Key mục vẫn không được trùng giữa các nhóm** (khoá không trùng của
    `AnhGioiThieu` chỉ theo `muc`) — `themMuc` tự thêm `-2`, `-3` khi đụng.
  - **Đổi tên KHÔNG đổi key**: link đã gửi khách phải sống, và các thư mục đã
    chọn nối với mục qua key.
  - **Xoá mục bị chặn khi còn thư mục bên trong** — báo số thư mục phải gỡ
    trước, đừng xoá lặng lẽ thành dòng mồ côi.

  **MỖI THƯ MỤC LÀ MỘT CẢNH, studio tự đặt tên và sắp xếp** (anh yêu cầu
  23/09/2026 cho Hamita Garden): ba cột `tenHien`, `moTa`, `thuTu` trong
  `AnhGioiThieu`, sửa ngay trên thẻ ở `/admin/gioi-thieu`. Ba điều đáng nhớ:

  - **Tên khách đọc: `tenHien` studio gõ → TÊN THƯ MỤC DRIVE → tên album đã bỏ
    mã** (`docThuMucCongKhai` và `docAnhThuMuc`, cùng một thứ tự). Bậc giữa là
    anh yêu cầu 25/09/2026; hôm 23/09 chỗ này bỏ qua tên thư mục vì sợ tên nội
    bộ kiểu "All View HamitaGarden", nhưng từ khi Hamita Garden chia theo cảnh
    thì **tên thư mục chính là tên cảnh** ("Lâu Đài", "Tiệc Rượu Đài Phun"),
    còn lấy tên album thì mọi cảnh đều ra "Hamita Garden" giống hệt nhau. Ô
    "Tên cảnh" ở trang quản lý để trống = chạy theo Drive, chữ mờ trong ô
    chính là tên khách sẽ đọc.
  - **Nút "↻ Đọc lại Drive" ở MỤC** (`docLaiCaMuc`, anh yêu cầu 25/09/2026) lo
    thứ nút trên từng thẻ không lo được: **thư mục vừa tạo trên Drive thì chưa
    có thẻ nào để bấm**. Nó đọc mỗi album **đúng một lần** dù mục có mười thẻ
    cùng album, cập nhật tên/số ảnh/bìa hỏng, và trả `soMoi` = số thư mục có
    ảnh chưa đưa lên trang. Ô chọn thư mục có nút cùng tên (`docThuMucAlbumAction`
    cờ `docLai`) vì danh sách đó cũng đọc qua cache.
  - **Nút "Đọc lại từ Drive"** (`docLaiThuMucGioiThieu`) cập nhật số ảnh khi
    studio up thêm — trước đó phải gỡ ra thêm lại, mà gỡ ra là **mất luôn tên
    và mô tả đã gõ**. Ảnh bìa giữ nguyên nếu tấm đó còn trong thư mục: đó là
    tấm studio đã chọn tay.
  - **Đổi thứ tự bằng cách ĐỔI CHỖ hai dòng rồi đánh số lại cả cụm**, không
    cộng trừ một số: cộng trừ thì hai dòng dễ mang cùng một số và thứ tự nhảy
    lung tung mỗi lần tải lại.

  Ô chọn thư mục cho **tick nhiều rồi đưa lên một lượt**, chạy **tuần tự** —
  mỗi lượt là một lần đọc Drive, bắn song song mười lượt thì dễ dính hạn mức
  Drive và thêm được nửa chừng mà không biết nửa nào.
- **Lưới dịch vụ đứng NGAY SAU đầu trang**, trước "Về Hamita" (studio chốt
  17/09/2026: khách vào là thấy dịch vụ để dễ bán thêm). Menu cũng để "Dịch vụ"
  lên đầu. Đầu trang bớt lề dưới, lưới dịch vụ bớt lề trên để thẻ ló vào màn
  hình đầu — đo ở 2000×1000: thẻ bắt đầu từ 751px. Đừng dời lại xuống dưới.

- **Không dựng "cảm nhận khách hàng" hay "blog"** như web mẫu — chưa có dữ liệu
  thật, dựng ra là bịa.
- **Thẻ dịch vụ và mục menu chỉ trỏ tới khu ĐANG HIỆN.** Khu ảnh cưới / album
  chỉ dựng khi có album được tích lên trang giới thiệu; đo trên web thật 16/09:
  chưa có album nào, nên thẻ trỏ về `#hanh-trinh` và `NavGioiThieu` nhận
  `anMuc` để ẩn mục đó. Trước đó menu "Ảnh cưới", "Album" bấm vào đứng im.
- Thẻ chưa có ảnh thì hiện biểu tượng trên nền màu nhấn nhạt, chữ đậm — **không**
  để ô xám trông như ảnh tải hỏng. Cụm ảnh "Về Hamita" thiếu ảnh cưới thì dùng
  bìa album dọc `/bia/bia-4.webp` (khung 2:3 đúng tỉ lệ, không xén chữ).
- **Nút liên hệ nổi CHỈ ở trang giới thiệu**, không đưa sang `/g/…`: góc dưới
  trang khách đã có nút thả tim, tải ảnh, khung Hỏi Hamita.
- Nút chính nền đậm (`bg-fg`), không nền vàng đồng: chữ trắng trên #9c7c4f chỉ
  3,9:1.

Đoạn `VE_HAMITA` phải nêu **quan điểm**, không liệt kê dịch vụ: ngay dưới nó đã
có cả một mạch kể dịch vụ rồi, nói lại là lặp. Bản cũ chính là lỗi đó ("Hamita
là nơi lo trọn gói… từ lễ hỏi, ảnh cưới, trang điểm cho tới chiếc váy").

**26. Bản sao lưu KHÔNG được chứa chìa khoá: phiếu Google, mật khẩu nhân viên.**
Bỏ cột `refreshToken` của `GoogleAccount`, cột `matKhau` của `NhanVien`; bỏ hẳn
bảng `LoginAttempt` và `PhienDangNhap`. Mọi bảng khác đều vào bản sao lưu.

**Mọi bảng phải khai báo trong `src/lib/saoLuu.ts`** — `BANG_SAO_LUU` hoặc
`BANG_BO_QUA` kèm lý do. Bảng mới chưa khai báo thì sao lưu BÁO LỖI thay vì
lặng lẽ bỏ sót. Đã xảy ra thật: đo 15/09/2026, bản sao lưu chỉ lấy 6/13 bảng —
thiếu ảnh bìa thư mục, gói ảnh thư mục, mốc thông báo, nhân viên, nhật ký — mà
không ai biết, dù chú thích trong tệp đã cảnh báo đúng chuyện đó.

**Tự động lên Drive mỗi đêm 3 giờ** (vercel.json → `/api/cron/sao-luu`), nén
gzip, cất trong thư mục "Hamita – Sao lưu tự động" của tài khoản Drive đang
kết nối, bằng quyền `drive.file` (chỉ sửa được tệp do web tạo). Chưa đặt
`CRON_SECRET` thì người lạ gọi đường đó tối đa một lần mỗi 20 giờ, tính cả lần
hỏng. Tên tệp theo giờ studio, không theo giờ máy chủ (UTC).

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

**28. Đơn giao in CHỈ tính danh sách "Ảnh in" (trái tim) — từ 15/09/2026 cũng là danh sách duy nhất.**
Đây không phải lựa chọn kỹ thuật mà là **lời đã nói với khách**, nguyên văn ở
bước 01 trong `HuongDanChon.tsx` (là bước 02 cho tới 28/08/2026, khi studio
bỏ hẳn bước "Ngắm ảnh thật kỹ" đứng trước nó):

> *"Thấy tấm nào ưng, anh chị bấm **trái tim** để Hamita **in ra** nhé."*

**Dấu tick ("Ảnh chọn", giữ riêng) đã BỎ ngày 15/09/2026** theo yêu cầu studio.
Kho dữ liệu (`getLists`, `getSelections`, `listCounts`) chỉ trả ra danh sách
tim; 520 lượt tick cũ vẫn nằm trong database, KHÔNG xoá. Trước khi bỏ, 5 lời
dặn khách ghi trên lượt tick của tấm cũng có tim ("ảnh bìa", "ảnh bàn" — album
gd-thanh-ngan) đã được chép sang lượt tim, vì đơn giao in chỉ đọc lượt tim.
Một lời dặn nằm trên tấm CHỈ tick (baby-cam-nuong, HMT07543 "Ảnh lớn") đã báo
studio — không tự thả tim hộ khách, vì tim là thêm một tấm vào đơn in. Đừng
thêm lại nút thứ hai cạnh trái tim.

Suy ra ba điều mà `src/lib/anhIn.ts` phải giữ đúng:
- Chỉ danh sách trái tim được in và được tính tiền.
- Đếm theo **tấm riêng biệt**. Hai người cùng thả tim một tấm vẫn chỉ là một
  tấm cần in.
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

- **Nút trái tim: 44px.** Trước là 40px, trong khi đầu ngón tay người lớn rộng
  45–57px. (Cho tới 15/09/2026 bên cạnh còn nút tick, phải đặt cách 12px vì hai
  nút mang ý nghĩa ngược nhau; nay chỉ còn trái tim.)
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

**TRÊN ANDROID, THẺ TẢI XUỐNG CHỈ CHẠY TRONG CÚ CHẠM CỦA KHÁCH.** Anh báo ngày
09/09/2026: bấm nút tải một tấm ảnh trên điện thoại Android thì **không có gì
xảy ra**, ảnh không lưu được.

Nguyên nhân: nút đó tải cả tấm ảnh về bộ nhớ trước (`taiTep`) rồi mới bấm thẻ
`<a download>`. Tải một tấm gốc qua 4G mất vài giây — tới lúc bấm thẻ thì cú
chạm đã hết hiệu lực, và Chrome trên Android **chặn im lặng** những lượt tải
không gắn với một cú chạm còn hiệu lực. Không báo lỗi, không nhật ký, khách chỉ
thấy bấm mà không có gì.

Cách chữa là `taiThang()` trong `taiAnh.ts`: trỏ thẻ **thẳng vào
`/api/download`** và bấm **ngay trong cú chạm**, không `await` gì phía trước.
Route đó vốn đã trả kèm `Content-Disposition: attachment` và đúng tên tệp nên
trình duyệt tự lo phần còn lại — kèm luôn thanh tiến độ và thông báo của chính
nó. Nhẹ hơn hẳn: không giữ tấm ảnh nào trong bộ nhớ trang.

Đo sau khi sửa (giả lập Android): thẻ được bấm **0ms** sau cú chạm, đúng đường
`/api/download/<id>?slug=…` với `download="TRI02365.jpg"`, và máy chủ nhận thật
— `luotTai` của album nhích đúng 1 (đã trả lại số cũ sau khi đo).

**Quy tắc rút ra: mọi lượt tải trên điện thoại phải nổ ra trong chính cú chạm.**
Cần dữ liệu trước khi tải thì đó là dấu hiệu đi sai đường — hãy để máy chủ giao
thẳng, đừng gom vào bộ nhớ trang rồi giao lại. (Riêng iPhone bắt buộc phải gom
trước vì đi qua khay chia sẻ; đổi lại chấp nhận cảnh "cho-cham" — mời khách
chạm thêm một cái.)

**ANDROID CŨNG PHẢI CHIA ĐỢT, VÀ MỖI ĐỢT LÀ MỘT CÚ CHẠM MỚI.** Đo trên máy
thật ngày 09/09/2026: thư mục 115 tấm, bấm "Tải tất cả" một lần thì máy nhận
đúng **6 tấm** rồi im — vừa đúng số thẻ bắn ra trong ~1,5 giây đầu. Trình duyệt
chỉ nhận lượt tải khi cú chạm còn hiệu lực; hết cửa sổ đó thì chặn lặng lẽ,
không lỗi, không thông báo.

`TRAN_MOT_DOT_ANDROID = 6` lấy thẳng từ con số đo được (6 × 250ms = 1,5 giây).
**Muốn nâng thì phải đo lại trên máy thật, đừng đoán.**

Hai máy chia đợt vì hai lý do KHÁC HẲN nhau, đừng gộp thành một con số:

| Máy | Cái gì chặn | Mỗi đợt |
|---|---|---:|
| iPhone | sức chứa của khay chia sẻ | 20 tấm (hoặc 100 MB) |
| Android | cửa sổ hiệu lực của cú chạm | **6 tấm** |

Nút đợt kế tiếp trên Android gọi `chayAndroid()` **ngay trong cú chạm**, không
`await` gì trước — chạy tiếp tự động là quay đúng về lỗi vừa sửa.

**Từ 5 đợt trở lên thì mời khách sang máy tính TRƯỚC KHI bắt đầu.** Thư mục 171
tấm chia 6 tấm mỗi đợt là **29 lần bấm** — không còn là chuyện nhanh hay chậm
nữa mà là việc không ai làm hết. Bảng cảnh báo nói thẳng con số đó ("anh chị
phải bấm 29 lần ạ") để khách tự quyết, chứ đừng để họ bấm tới lần thứ mười mới
nhận ra. Vì vậy `nang` trên Android tính bằng CẢ số đợt, không chỉ dung lượng.

Đo sau khi sửa: đợt 1 bắn đúng 6 thẻ rồi dừng chờ chạm; bấm "Tải tiếp 6 tấm"
thì sang đúng 6 tấm kế, không trùng tấm nào, mọi thẻ đều trỏ thẳng
`/api/download`.

**TRÌNH DUYỆT NHÚNG CỦA MESSENGER/ZALO NUỐT LƯỢT TẢI.** Anh gặp thật ngày
09/09/2026, và đây là ca nặng nhất trong cả chuỗi lỗi tải ảnh: mở link từ
Messenger, bấm "Tải tất cả", thanh tiến độ chạy đủ 115 tấm, khung báo **"Đã
lưu xong 6 tấm ạ"** — mà trong máy **không có lấy một tấm**.

Hai lỗi chồng nhau, và cái thứ hai mới đáng sợ:

1. Trình duyệt nhúng (Messenger, Facebook, Zalo, Instagram) không thực thi
   lượt tải — nhất là qua đường dẫn tạm `blob:`. Không lỗi, không thông báo.
2. **Giao diện KHẲNG ĐỊNH một việc nó không hề đo được.** Bản cũ đếm số tấm
   đã *tải về bộ nhớ trang* rồi ghi "đã lưu xong" — hai chuyện khác hẳn nhau.
   Khách đọc xong yên tâm đóng máy, tưởng đã có ảnh trong tay.

Ba việc phải giữ, thiếu một là lỗi quay lại:

- **`laTrongUngDungKhac()` trong `taiAnh.ts`** nhận diện trình duyệt nhúng.
  Trên Android, bấm "Tải tất cả" trong đó thì hiện bảng chỉ đường sang Chrome
  **trước khi** tải. Phép kiểm này đứng TRƯỚC phép kiểm "bộ nặng" — thứ tự có
  chủ đích: "trình duyệt này không lưu được gì" là chuyện lớn hơn "bộ này
  nặng", để sau thì khách ngồi đợi hết 115 tấm rồi mới biết.
- Vẫn để nút **"Vẫn thử"**. Không phải bản nhúng nào cũng chặn, mà chặn đường
  của khách khi mình không chắc thì cũng sai.
- **Câu chữ nói đúng thứ đo được**: "Hamita gửi xong N tấm rồi ạ", không phải
  "đã lưu xong". Kèm câu chỉ đường khi khách không thấy ảnh. Cùng luật với
  iPhone ở đoạn ngay trên — web chỉ biết mình đã GIAO, không biết máy đã LƯU.

Đo sau khi sửa (giả lập UA `FB_IAB/Orca-Android`): bảng chỉ đường hiện đúng;
bấm "Vẫn thử" thì 6 thẻ đầu đều trỏ thẳng `/api/download/<id>?slug=…` kèm đúng
tên tệp, **không còn một `blob:` nào**, nhãn tiến độ ghi "Đang gửi 6/171 tấm
về máy".

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

**THẺ ALBUM DỰNG THEO KIỂU GUMP, VÀ SÁU THẺ ĐẦU PHẢI LỌT TRỌN MỘT MÀN HÌNH.**
Anh yêu cầu 21/09/2026, qua hai vòng trong cùng một ngày: đầu tiên là "mở
`/admin` phải thấy trọn sáu album", sau đó là "giao diện giống y hệt Gump, ảnh
bìa đang bị hẹp quá, các nút làm nhỏ lại". Hai yêu cầu đó kéo ngược nhau, nên
hình dạng thẻ bây giờ là lời giải chung cho cả hai:

```
┌─────────────────────────────┐
│  ảnh bìa to (3:2, có trần)  │  ← nhãn "không cho tải", "đã báo tin",
│                             │     "đã chọn xong" đè lên ảnh
├─────────────────────────────┤
│ Tên album        [⚙] [ … ]  │  ← bánh răng mở cửa sổ cài đặt; "…" là mọi việc
│ 1046 · 3 · ♥0 · ↓2  Mã · gói│  ← một hàng số liệu duy nhất
└─────────────────────────────┘
```

**Chiều cao ảnh bìa là thứ quyết định một màn thấy mấy thẻ** (đây là lý do cả
mục này tồn tại). `aspect-[3/2]` một mình không kiểm soát được: cột càng rộng
bìa càng cao (cột 492px → bìa 328px). Nên bìa có thêm trần tính theo chính
chiều cao màn hình, ở `GalleryCard`:
`2xl:max-h-[calc(50vh-255px)] 2xl:min-h-36`. Con số 255 ra từ phép tính:

```
2 × (bìa + 76) + 24 (khe) + 20 (lề trên lưới) ≤ chiều cao ô cuộn
chiều cao ô cuộn = chiều cao màn hình − 267 (đầu trang + ô tìm + hàng lọc + lề)
⇒ bìa ≤ 50vh − 232px, lấy 255 để dư 39px
```

**76px là phần còn lại của thẻ** (tên + hàng số liệu + lề `p-3`). Sửa gì làm
phần đó cao lên thì phải sửa luôn con số 255, không thì hàng thứ hai bị cắt.
Đo lại bằng cách so `getBoundingClientRect().bottom` của thẻ thứ sáu với đáy ô
cuộn — đo ngày làm: bìa 285px, thẻ 365px, thẻ thứ sáu kết thúc ở 1017 so với
đáy ô cuộn 1056, thẻ thứ bảy ló ra 15px cho biết bên dưới còn album.

Đường đi của con số này đáng nhớ, vì nó đúng là cái bẫy: bản trước có thêm
hàng bốn nút và dòng "Mã · gói · Cài đặt" đứng riêng, phần dưới thẻ ngốn 222px
nên bìa chỉ còn **140px** — anh nhìn ra ngay ("ảnh bìa bị hẹp quá"). Gom nút
vào bảng "…" lấy lại được 146px, và toàn bộ 146px đó chảy thẳng vào ảnh bìa.

**Mọi thông tin phụ đều đè lên ảnh bìa, không ăn chiều cao:** nhãn "không cho
tải" (trái trên), nhãn báo tin (phải trên, chấm vàng = chưa nhắn khách, chấm
xanh = đã nhắn), nhãn "đã chọn xong" từng thư mục (đáy). Nhãn nào cũng nền đen
trong mờ — bản đầu để miếng vàng đậm cho "chưa gửi" thì mấy miếng ấy nhảy hẳn
ra khỏi ảnh, mà đó là lời nhắc chứ không phải báo động.

Ba thứ đã bỏ khỏi mặt thẻ, **mỗi thứ đều còn đường xem lại**: tên các thư mục
con → chú thích của con số thư mục; dòng `/g/slug · ngày tạo` → chú thích của
ảnh bìa; nút "sửa" cạnh tên album → mờ đi, chỉ hiện khi rê chuột (dưới 640px
thì luôn hiện, không thì trên điện thoại không ai đổi tên được nữa).

**Bốn cài đặt album mở thành CỬA SỔ** (`CaiDatDialog.tsx`), gọi bằng nút bánh
răng **dính sát** nút "…" ở mép phải hàng tên (tên album chiếm phần còn lại
bằng `min-w-0 flex-1`; để cả ba cùng một hàng `justify-between` thì tên ngắn là
bánh răng bị bỏ lại giữa thẻ — anh chỉ ra 21/09/2026) — anh yêu cầu 21/09/2026: "nút cài đặt album đang
bất tiện". Trước đó nó là một mục trong bảng "…" và bấm vào thì bốn ô xổ ngay
trong thẻ: hai cú bấm mới tới, tới rồi thì thẻ phình cao gấp đôi và đẩy cả hàng
album bên dưới chạy xuống, mà bốn ô nhập chen trong bề ngang 470px của thẻ nên
chữ gãy dòng liên tục. **Đừng gom nó trở lại vào bảng "…"** và đừng thêm nút
"Lưu" chung cho cửa sổ: bốn mục con (`AccessControl`, `LoiNhan`, `ThoiHan`,
`GoiAnh`) mỗi mục tự lưu phần của nó, một nút lưu chung là hứa điều chúng không
làm.

**Cửa sổ có chuyển động cả lúc mở lẫn lúc đóng** (anh yêu cầu cùng ngày): lớp
`.nen-hien` / `.hop-hien` / `.nen-tat` / `.hop-tat` trong `globals.css` — nền
chỉ mờ dần, hộp vừa mờ vừa trượt lên một quãng ngắn. **Đóng không được gỡ hộp
ngay**: component bật cờ `dangTat`, đợi 170ms cho `.hop-tat` (160ms) chạy hết
rồi mới gọi `onDong` — gỡ ngay thì hộp biến mất cái bụp, đúng cảm giác giật cần
bỏ. Sửa thời lượng một bên thì sửa cả hai. Máy bật "giảm chuyển động" thì bốn
lớp này tắt hẳn.

**Bảng "…" (`MenuThe.tsx`) — ba điều phải giữ:**

- Thẻ ngoài **không được `overflow-hidden`**, không thì bảng bị xén mất một
  nửa. Ảnh bìa tự lo phần bo góc bằng `overflow-hidden rounded-t-[3px]`.
- Thẻ ở hàng dưới thì bảng **mở ngược lên** (`bottom-full`), vì lưới album là
  một ô cuộn riêng: mở xuống là thò quá đáy ô, phải cuộn mới thấy mục cuối mà
  cuộn thì thẻ chạy mất.
- Đóng bảng bằng **một tấm phủ `fixed inset-0`** chứ không nghe `click` trên
  `document`: không phải gỡ listener, không lo thứ tự sự kiện, và cú bấm ra
  ngoài bị tấm phủ nuốt nên không đồng thời bấm trúng thứ nằm dưới.

**Nút trong thẻ album nhỏ hơn nút thường** (anh yêu cầu "làm các nút nhỏ lại"):
lớp `.btn-gon` và `.muc-menu` trong `globals.css` để 32px/36px **từ 640px trở
lên**, và **tự trở lại 44px dưới mốc đó** — 44px là mức tối thiểu cho đầu ngón
tay, đừng bỏ đoạn media query ấy. Màn từ 640px là màn có chuột, trỏ chuột nhắm
32px thoải mái.

Mấy nút dùng chung (`CopyLink`, `NutLamMoi`, `NutGuiThongBao`) nhận prop `lop`
để đổi hình dạng theo chỗ đứng — cùng một nút vừa dùng ở hàng nút thường
(`.btn`) vừa dùng trong bảng "…" (`.muc-menu`). Thừa kế lớp chứ đừng đoán.

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
thả tim lấy đúng ý bước 01 phần hướng dẫn; số tấm trong gói và giá ảnh thêm
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

**50. Mỗi thư mục con có thể mang một GÓI ẢNH RIÊNG.**
Studio yêu cầu 10/09/2026: *"có trường hợp khách chụp hình cổng rồi 1 thời gian
về sau chụp hình cưới thì mỗi gói sẽ có số lượng ảnh khác nhau"*. Một nhà khách
là một link, nhưng có thể là nhiều lần mua.

Lưu ở bảng `GoiMuc` (galleryId + albumId). **Không có dòng nào nghĩa là theo số
chung của album** (`Gallery.soAnhTrongGoi`) — nhờ quy tắc đó, album một gói duy
nhất, tức phần lớn album, không sinh thêm dòng nào và studio không phải đặt lại
từng thư mục.

**Số 0 vẫn là một gói THẬT** (gói chỉ lấy file), nên chỗ nào cũng phải so với
`null`/`undefined`, đừng viết gọn thành `goi ? …` (nguyên tắc 38).

**Đơn giao in phải tính TÁCH TỪNG THƯ MỤC rồi mới cộng.** Cách cũ đem tổng số
tấm khách thả tim so với một con số duy nhất, sai ở cả hai chiều: đo thử nhà có
gói chung 21 và một thư mục đặt riêng 30, khách thả 10 tấm ở thư mục này và 40
tấm ở thư mục kia — tính đúng 120.000đ, tính gộp ra 348.000đ.

**Ghép theo hai khoá khác nhau, cố ý:** phía khách tra bằng **mã thư mục**
(`goiCuaMuc`), đơn giao in tra bằng **tên** (`goiCuaMucTheoTen`) vì
`Selection.albumName` chỉ lưu tên, mà trang đó không được gọi Drive (nguyên tắc
9). Điểm yếu đã biết: **đổi tên thư mục trên Drive sau khi đặt gói riêng thì đơn
in quay về gói chung** — chữa bằng cách mở ô "Gói ảnh" đặt lại một lần.

**Khung "Hỏi Hamita" ở trang bìa liệt kê ĐỦ mọi thư mục** khi có gói riêng, kể
cả thư mục đang theo gói chung: vắng mặt một thư mục thì khách đọc xong tưởng
thư mục đó không được chọn tấm nào. Và **không bao giờ cộng các gói lại thành
một con số** — khách sẽ thả tim theo con số đó rồi tới lúc nhận đơn mới biết
mình vượt gói ở đợt này và còn thiếu ở đợt kia.

**51. Phần quản lý studio (`/quan-ly`) đăng nhập bằng TÊN + MẬT KHẨU, không phải Google.**
Studio chốt 15/09/2026, bỏ phương án đăng nhập Google cho đơn giản. Đây là phần
thay dần app AppSheet mua lại (kế hoạch G0–G5, xem `BAN-GIAO.md`).

- **Tên đăng nhập mặc định là số điện thoại** — nhân viên nào cũng nhớ số mình.
- **Mật khẩu băm scrypt, có muối** (`src/lib/matKhau.ts`). Không bao giờ lưu
  dạng đọc được, không ghi vào nhật ký.
- **KHÔNG nhập mật khẩu từ AppSheet.** Bên đó mật khẩu nằm trần trong file
  Google Sheet đứng tên người bán; 25/26 cái là số điện thoại của chính người
  đó (đo 15/09). Quản lý bấm "Cấp mật khẩu", mật khẩu tạm hiện ĐÚNG MỘT LẦN để
  chép gửi Zalo, nhân viên bị bắt đổi ở lần đăng nhập đầu. Cấm đặt mật khẩu
  trùng số điện thoại hay tên đăng nhập.
- **Bộ đếm đăng nhập sai tính theo TÀI KHOẢN** (khoá `tk:<tên>` trong bảng
  LoginAttempt), không theo địa chỉ mạng: cả tiệm dùng chung wifi, tính theo
  địa chỉ thì một người gõ sai là khoá cả tiệm, kể cả trang quản lý album.
- **MỘT MÀN HÌNH ĐĂNG NHẬP DUY NHẤT** cho cả hệ thống: `/quan-ly/dang-nhap`
  (gộp 16/09/2026 theo yêu cầu studio). Trang quản lý album `/admin` trước đó
  có màn hình riêng chỉ hỏi mật khẩu — hai cửa cho cùng một người, đứng nhầm
  cửa thì không thấy ô tài khoản và tưởng hệ thống hỏng. Nay `/admin` chuyển
  về màn hình chung kèm `?tiep=<đường cần quay lại>`; đăng nhập xong quay
  đúng chỗ. **Không có `tiep` thì mọi tài khoản vào thẳng `/admin`**
  (`TRANG_DAU` trong `src/app/quan-ly/actions.ts`, studio chốt 16/09): quản
  lý album là việc mở ra mỗi ngày, còn phần quản lý studio vào bằng link ngay
  đầu trang album. `tiep` CHỈ nhận đường nội bộ (bắt đầu bằng một dấu "/") — nhận
  bừa là ai đó gửi link đưa người dùng sang web khác sau khi đăng nhập.
- **Sếp gõ tên `admin`** + mật khẩu quản lý album (`ADMIN_PASSWORD`). Tên
  "admin" cấm nhân viên dùng.
- **Quyền trang album có HAI mức** (`src/lib/quyenAlbum.ts`), đừng gọi thẳng
  `isAdmin()` ở trang hay đường API của `/admin` nữa:
  - `quyenAlbum()` — MỞ trang: mật khẩu quản lý album, hoặc **bất kỳ nhân
    viên nào đã đăng nhập** (studio chốt 16/09: cả tiệm làm album). Người còn
    mật khẩu tạm thì chưa vào được, phải đổi mật khẩu trước.
  - `quyenAlbumNguyHiem()` — **xoá album, kết nối/ngắt Drive, bản sao lưu**:
    chỉ quản lý. Xoá nhầm là mất cả lựa chọn ảnh của khách; ngắt Drive là cả
    tiệm không xem được ảnh; bản sao lưu mang dữ liệu cả tiệm đi ra ngoài.
  Giấu nút trong giao diện là để đỡ bấm nhầm; chặn thật phải nằm trong từng
  action và đường API. Nút "Đăng xuất" ở `/admin` xoá CẢ HAI phiếu.
- **"Đăng xuất mọi máy"** (nút ở mục Nhân viên, chỉ quản lý; hoặc
  `npx tsx scripts/dang-xuat-moi-may.mts`): xoá sạch bảng PhienDangNhap VÀ ghi
  mốc `dangXuatMoiMay`. Phiếu mật khẩu chung không nằm trong database nên
  không xoá từng cái được — nó là dấu băm của mật khẩu, nên mốc đó được đem
  băm cùng (`admin-<mốc>` trong `src/lib/auth.ts`): đổi mốc là mọi phiếu cũ
  chết ngay, mật khẩu vẫn nguyên. Chưa bấm lần nào thì mốc là "v1" — đúng
  chuỗi cũ, phiếu đang có vẫn sống. Studio bấm lần đầu 16/09/2026 để cả tiệm
  bỏ mật khẩu chung, chuyển sang tài khoản riêng; ai chưa được cấp mật khẩu
  thì từ đó không vào được nữa.
- **Phiên lưu trong database** (bảng PhienDangNhap, chỉ giữ SHA-256 của cookie)
  để cấp lại mật khẩu, đánh dấu nghỉ việc, hay hạ quyền là mọi máy của người
  đó văng ra NGAY. Mỗi lần mở trang đều kiểm lại người đó còn làm không.
- **Nhật ký** (bảng NhatKy, `src/lib/nhatKy.ts`): mọi thao tác sửa dữ liệu
  phải ghi. Không nối khoá tới NhanVien để nhật ký còn nguyên khi xoá người.
- **Ba vai trò** (`VAI_TRO` trong `src/lib/nhanVienChung.ts`, chốt 15/09):
  quản lý, sale, nhân viên. **Sửa hợp đồng: quản lý + sale. Duyệt phiếu thu
  chi: chỉ quản lý.** Sale mặc định gán cho phòng Tư Vấn (AppSheet chỉ ghi
  Admin/User). Chữ lạ trong cột vai trò luôn coi là nhân viên, quyền thấp nhất.
- **Quyền xem lương** (dùng từ đợt 4): quản lý xem lương mọi người, nhân viên
  chỉ xem lương của chính mình. Lương cứng và số tài khoản CHƯA nhập từ
  AppSheet — chờ tới đợt 4.
- **Không làm chức năng quét QR trang phục** (studio chốt 15/09; bảng đó bên
  AppSheet cũng trống).
- **MỖI TRANG tự gọi `batBuocDangNhap()`**, đừng trông vào layout của nhóm
  `(he-thong)`: trong Next, layout và trang dựng SONG SONG — layout chuyển hướng
  thì trang vẫn chạy. Đã vấp thật 15/09: bốn lượt thử không đăng nhập làm trang
  Tổng quan văng lỗi `null` vì tin là layout đã chặn. Thanh bên chỉ hiện mục
  đã làm xong; mục đang làm liệt kê ở trang Tổng quan.
- Nhập nhân viên: `npx tsx scripts/nhap-nhan-vien.mts` (chỉ thêm người chưa
  có; `--cap-nhat` để cập nhật thông tin). Ghép bằng "Mã NV", không bao giờ
  ghi đè tên đăng nhập, vai trò, mật khẩu. **NV001 (Võ Đại Dương) là NGƯỜI BÁN
  app AppSheet, không phải nhân viên** — studio xoá 15/09; script bỏ qua mã đó
  (`KHONG_NHAP`). Đừng gỡ: nhập lại là người bán có quyền quản lý trên web.
- **Thông tin studio:** liên hệ công khai (địa chỉ, hotline, Zalo, Facebook)
  CHỈ nằm ở `src/lib/studio.ts` — trang giới thiệu và khung Hỏi Hamita đọc từ
  đó. Bảng ThongTinStudio chỉ giữ phần NỘI BỘ (tài khoản ngân hàng, giờ làm,
  ngày công, toạ độ chấm công), chỉ quản lý xem. Đừng thêm hotline vào bảng
  đó: hai nơi giữ một số điện thoại là có ngày lệch. Tiệm có **HAI cơ sở** —
  377 Đỗ Tường Tự là Hamita Wedding House (cưới hỏi), 337 là Hami Baby (bé,
  gia đình); mỗi cơ sở một địa chỉ, số điện thoại, bản đồ riêng trong `STUDIO`
  và `HAMI_BABY`. Nơi nào hiện địa chỉ thì hiện đủ cả hai.
- **Nội quy không bao giờ xoá**, chỉ ngưng áp dụng — lịch sử phạt (đợt 4) trỏ
  tới nó. Nhân viên chỉ thấy nội quy đang áp dụng.
- **Dịch vụ & trang phục** (bảng DichVu + GiaHangMuc, `src/lib/dichVuChung.ts`,
  nhập 15/09 bằng `npx tsx scripts/nhap-dich-vu.mts`; `--cap-nhat` ĐÈ cả chỗ đã
  sửa trên web). Ai đăng nhập cũng XEM. SỬA: quản lý + sale mọi loại; **nhân
  viên phòng Váy chỉ trang phục** (bên AppSheet phòng Váy tự nhập trang phục) —
  quyền theo phòng đọc từ `NguoiDung.phongBan`. **Mã DV không đổi được** sau khi
  tạo: hợp đồng AppSheet (đợt 2) tìm dịch vụ theo mã. **Không xoá**, chỉ ngưng
  dùng. **Chi phí từng hạng mục (GiaHangMuc) chỉ quản lý thấy** — phần lớn là
  tiền công thợ, nền của lương sản phẩm đợt 4. Ảnh trang phục chưa có (thư mục
  ảnh AppSheet chưa được chia sẻ); đường dẫn cũ nằm ở `hinhAppSheet`.
- Script đọc AppSheet dùng chung `src/lib/appsheet.ts` (tải file vào bộ nhớ,
  không ghi xuống đĩa).

**52. Hợp đồng: WEB LÀ NƠI LẬP (từ 21/09/2026). AppSheet chỉ còn để tra dữ liệu cũ.**
Anh chốt 21/09/2026, đảo hẳn luật cũ ("AppSheet là nơi tạo", 16/09). Lịch chép
`dong-bo` **đã tắt trong `vercel.json` và phải ở nguyên đó** — bật lại là bản
AppSheet cũ đè lên hợp đồng vừa lập trên web, đúng cái bẫy luật cũ đã cảnh báo.

Lập hợp đồng ở `/quan-ly/hop-dong/moi`: `src/lib/hopDongChung.ts` (hằng số và
hàm kiểm dùng chung), `src/lib/taoHopDong.ts` (sinh mã, ghi database),
`src/app/quan-ly/actionsHopDong.ts` (server action), `moi/FormHopDongMoi.tsx`.
**Quyền lập: quản lý + sale** (`lapHopDong` trong `phienNhanVien.ts`), kiểm ở cả
trang lẫn server action.

Một lần lập sinh đủ bộ trong MỘT giao dịch, đúng như bên AppSheet vẫn làm:
khách (nếu là nhà mới) → hợp đồng → từng dòng dịch vụ → phiếu thu cọc → lịch
chụp → đầu việc. Những chỗ dễ làm sai:

- **Mã hợp đồng giữ hình dạng AppSheet**: `STT_26.0900-3_MT1206_14-30` = năm,
  tháng, số thứ tự trong tháng, mã nhân viên người lập, giờ-phút. Bên AppSheet
  con số sau dấu gạch **lặp lại giữa các tháng** (riêng tháng 1/2026 có 46 mã
  trùng số đó), nên đừng tưởng nó là khoá — khoá là cả chuỗi.
- **Mã khách chính là số điện thoại** (1.992/1.992 nhà đang vậy). Số đã có thì
  dùng lại nhà cũ, không tạo thêm hồ sơ trùng số.
- **Mã dòng chi tiết** = mã hợp đồng + `_1`, `_2`… (cột `maAppSheet`, bắt buộc
  và unique). Phiếu thu, lịch, đầu việc lập trên web để `maAppSheet` null —
  cột đó chỉ dành cho dòng chép từ AppSheet.
- **Tiền tính ở máy chủ** trong `kiemHopDongMoi`, không nhận con số form gửi
  lên: tổng = cộng dòng − khuyến mãi; đã thu = cộng MỌI phiếu kể cả phiếu chờ
  duyệt (đúng cách AppSheet tính, kiểm 300 hợp đồng mới nhất không lệch dòng).
- **Phiếu thu của sale nằm "Chờ duyệt"**, quản lý lập thì ghi thẳng "Đã thu…"
  và chính họ là người duyệt (`trangThaiThu`).
- **Đầu việc sinh theo bảng giá hạng mục của dịch vụ** (`GiaHangMuc`) — chỉ
  96/1.018 dịch vụ có bảng giá nên nhiều dòng không sinh việc, đó không phải
  lỗi. Tên việc lấy tên hạng mục; bên AppSheet tên việc nhiều khi khác hẳn
  ("CHỤP TIỆC" cho hạng mục "PHOTO", chỉ 121/380 việc trùng tên) — **quy tắc
  đổi tên đó không suy ra được**, nên đừng đoán, để người lập sửa.
- **Người lập phải có mã nhân viên** (`NhanVien.maNV`) thì mã hợp đồng mới đọc
  ra tên; chưa có mã thì web dùng tên đăng nhập.

Sáu bảng KhachHang, HopDong, ChiTietHopDong, PhieuThu, LichChup, CongViec nay
**có dòng của web lẫn dòng chép từ AppSheet**. Phân biệt bằng `bamAppSheet`:
dòng web luôn null, và bộ đồng bộ chỉ đụng dòng CÓ dấu vân tay ấy.

Dữ liệu cũ vẫn chép được khi cần: quản lý bấm "Đồng bộ ngay" trên trang Hợp
đồng, hoặc chạy `npx tsx scripts/dong-bo-appsheet.mts`
(`src/lib/dongBoAppSheet.ts`). Mỗi lượt hỏi Drive "file sửa lần cuối lúc nào"
trước (`lucSuaFileAppSheet`), không đổi thì dừng luôn.

- **SỬA, XOÁ và vận hành hợp đồng — làm được từ 23/09/2026** (`src/lib/suaHopDong.ts`,
  `actionsHopDong.ts`, `actionsViec.ts`). Nhớ: dòng chép từ AppSheet vẫn mang
  `bamAppSheet`, nên nếu ai bật lại lịch `dong-bo` thì mọi sửa đổi trên web bị
  đè — thêm một lý do nữa để lịch đó ở nguyên trạng thái tắt.

  **Lập hợp đồng mở bằng CỬA SỔ ngay trên trang danh sách**
  (`NutLapHopDong.tsx`, anh yêu cầu 23/09/2026), nhưng trang riêng
  `/quan-ly/hop-dong/moi` **vẫn giữ**: đó là đường vào khi ai dán thẳng địa chỉ,
  và là chỗ chạy được khi trình duyệt chặn JavaScript. Cửa sổ dùng LẠI đúng
  `FormHopDongMoi` chứ không chép thành bản thứ hai — hai bản form sẽ lệch nhau
  ngay lần sửa đầu tiên; form nhận hai prop `onThoi` và `onXong` để biết mình
  đang nằm trong cửa sổ hay đứng riêng một trang.

  Bảng dịch vụ tải **khi bấm nút** (`duLieuFormHopDongAction`), không tải sẵn
  lúc mở trang danh sách: 1.018 dịch vụ + 313 dòng bảng giá là hai câu hỏi
  database mà phần lớn lượt mở trang không dùng tới (nguyên tắc 53). Cửa sổ
  hiện RA NGAY kèm dòng "Đang mở bảng dịch vụ…" rồi form thế chỗ — chờ đủ dữ
  liệu mới mở thì bấm xong phải đợi một nhịp không biết chuyện gì đang xảy ra.

  **Bốn điều của đợt này đừng phá:**

  - **Tiền LUÔN cộng lại từ dữ liệu thật** (`tinhLaiTien`): mọi thao tác sửa
    dòng, thêm hay xoá phiếu thu đều kết thúc bằng một lượt cộng lại thành
    tiền, tổng, đã thu, còn lại từ bảng chi tiết và bảng phiếu thu. Đừng bao
    giờ cộng dồn vào số cũ — chỉ cần một lần hỏng giữa chừng là sổ sai mãi mà
    không ai biết. "Đã thu" vẫn cộng cả phiếu **chờ duyệt**, đúng cách AppSheet
    tính suốt mấy năm.
  - **Mã dòng chi tiết (`_1`, `_2`…) của dòng cũ giữ nguyên khi sửa**, dòng mới
    lấy số tiếp theo số lớn nhất đang có — không đánh số lại từ đầu, vì mã đó
    đã in trên đơn giao in và có thể đã gửi cho khách.
  - **Bỏ một dòng dịch vụ chỉ xoá đầu việc CHƯA AI LÀM** của dòng đó; việc đã
    giao hoặc đã xong thì chỉ cắt dây (`chiTietId = null`) — người ta đã bỏ
    công thật.
  - **Xoá hợp đồng phải gõ lại đúng mã**, và xoá tay cả phiếu thu, lịch, đầu
    việc: ba bảng đó để `onDelete: SetNull` nên không tự đi theo, để lại là
    tiền lơ lửng không thuộc hợp đồng nào (đo lúc làm: sau khi xoá, 0 dòng mồ côi).

  **Quyền:** sửa hợp đồng, thêm phiếu thu, sửa lịch = quản lý + sale
  (`lapHopDong`). Duyệt phiếu, xoá phiếu, xoá hợp đồng = **chỉ quản lý**. Đầu
  việc: quản lý giao cho bất kỳ ai; người khác **tự nhận việc chưa giao** và
  đổi trạng thái việc mang tên mình, không đụng được việc người khác.

  *Bẫy đã vấp:* tệp `"use server"` **chỉ được xuất hàm async**. Xuất một mảng
  hằng từ đó (`TRANG_THAI_VIEC`) thì Next biến nó thành tham chiếu sang máy
  chủ, phía trình duyệt gọi `.includes` trên nó là nổ *"… is not a function"* —
  trang trắng ngay. Hằng dùng chung để ở `hopDongChung.ts`.
- Chép theo dấu vân tay (`bamAppSheet`): dòng không đổi thì không ghi. Dòng
  biến mất bên AppSheet chỉ đánh dấu `matBenAppSheet`, không xoá; và chỉ đụng
  dòng CÓ `bamAppSheet` — dòng tạo trên web sau này không bao giờ bị đánh dấu.
- Tiền là con số AppSheet đã tính, web không tính lại ("Thanh toán" bên đó cộng
  cả phiếu chờ duyệt — trang phiếu thu tách phiếu chờ duyệt ra khỏi tổng tháng).
  Ngày không giờ lưu chuỗi `"YYYY-MM-DD"`; thời điểm bên AppSheet là giờ Việt
  Nam đọc ra như UTC nên lùi 7 tiếng.
- **AI XEM ĐƯỢC GÌ — anh chốt lại 21/09/2026**, thay hẳn luật cũ "ai đăng nhập
  cũng xem hết":

  | Trang | Ai xem được |
  |---|---|
  | Hợp đồng (xem, và **lập mới** từ 21/09) | quản lý + **sale** (sale là người lập hợp đồng) |
  | Khách hàng, Phiếu thu | **chỉ quản lý** — tiền, công nợ và số điện thoại của hàng trăm nhà khách |
  | Lịch chụp | cả tiệm |
  | Đầu việc | quản lý thấy hết; người khác chỉ thấy việc **ghi tên mình** cộng việc **chưa giao cho ai** (anh muốn ai rảnh thì nhận) |

  Ba điều phải giữ:
  - Quyền viết trong `src/lib/phienNhanVien.ts` (`xemHopDong`, `xemTienVaKhach`,
    `batBuocQuyen`) — **đừng rải điều kiện vai trò khắp các trang**.
  - **Lọc đầu việc ngay trong câu lệnh database**, không lọc ở giao diện: lọc ở
    giao diện thì dữ liệu vẫn rời khỏi máy chủ (cùng bài học nguyên tắc 3). Hai
    con số "Quá hạn" và tổng cũng phải đếm trong đúng phạm vi đó, không thì con
    số tố cáo phần mình không được xem.
  - Giấu mục trong menu và ẩn liên kết sang hợp đồng ở trang Lịch **chỉ để đỡ
    bấm nhầm**; chặn thật nằm ở `batBuocQuyen` trong từng trang. Bị chặn thì
    đưa về Tổng quan, không ném lỗi.

  Đo trên máy dev bằng ba tài khoản tạm (đã xoá sau khi thử): nhân viên thấy
  138/186 đầu việc (2 của mình + 136 chưa giao), cột "Người làm" chỉ có "—" và
  tên họ, ba trang bị chặn đều quay về Tổng quan; sale vào được Hợp đồng nhưng
  bị chặn Khách hàng và Phiếu thu; quản lý thấy đủ 186 việc và mọi trang.
- **Nối album ảnh với hợp đồng** (`Gallery.hopDongId`, `src/lib/noiAlbum.ts`,
  16/09): đây là DỮ LIỆU CỦA WEB — AppSheet không biết gì về album, nên bộ
  đồng bộ đêm không đụng cột này. Web **chỉ gợi ý** hợp đồng trùng tên rồi để
  người bấm, **không tự gắn**: trùng tên khách là chuyện thường (hai nhà cùng
  tên, một nhà hai hợp đồng), gắn nhầm thì tiền và tiến độ nhà này hiện sang
  nhà kia. Gắn ở trang "Ảnh khách chọn" của album; trang hợp đồng hiện lại
  album, số tấm khách đã thả tim và lúc khách báo chọn xong. Khách đã báo xong
  mà hợp đồng còn ở bước 4 hay 13 thì trang hợp đồng NHẮC chuyển bước — nhắc
  thôi, không tự chuyển: AppSheet vẫn là bản gốc, sửa ở web thì đêm sau bị ghi đè.
- Mã dịch vụ mới bên AppSheet: bộ đồng bộ chỉ THÊM vào bảng Dịch vụ, không sửa
  mục đã có (bảng đó sửa trên web).
- Lịch 02:30 chạy TRƯỚC sao lưu 03:00 để bản sao lưu đêm có dữ liệu mới. Chưa
  đặt `CRON_SECRET` nên ai không phải quản lý gọi thẳng đường này thì tối đa
  một lần mỗi 20 giờ (mốc `dongBoThu`). **Thử tay bằng tài khoản không phải
  quản lý thì xoá mốc đó sau**, không thì đêm đó lịch chạy bị bỏ qua — y hệt
  bẫy đã gặp với đường sao lưu.

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
đúng chuỗi đó.

**CHỈ CÓ MÃ mà chưa gõ tên thì `createGalleryAction` tự lấy tên thư mục Drive
ghép vào** (`chiCoMa` + `ghepMaVoiTenThuMuc`) — anh yêu cầu 23/09/2026: bấm
"HC" rồi bấm Tạo link luôn thì album ra tên trống trơn, chỉ còn mỗi chữ "HC".
Nay ra `"HC - Anh Thư & Rich Kim"` (đo thật khi làm, có tạo album rồi xoá).
Tên thư mục **mang sẵn mã thì bỏ mã của nó đi rồi mới ghép**, không thì ra
`"HC - HC Ngọc Thơ"`.

Dọn ở `createGalleryAction` chứ không dọn ở giao diện: đó là chỗ duy nhất mọi
đường vào database đều đi qua, nên gõ tay ra chuỗi như vậy cũng được dọn. Ô để
**trống hẳn** thì vẫn ghi `null` như cũ — lúc đó cả hai trang tự quay về dùng
tên thư mục, không cần chép lại làm gì.

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
| `0` | **gói chỉ lấy file, không kèm ảnh in** | "gói chỉ lấy file ảnh… tấm nào muốn in thì 15.000đ, đã bao gồm cả chỉnh sửa và in" |
| `N > 0` | gói có N tấm in | ba gạch đầu dòng, mở đầu bằng "Gói của anh chị cần tim N tấm" |

**Phải so với `null`, không được viết `soAnhTrongGoi ? …`** — số 0 cũng là giá
trị "sai" trong JavaScript nên gói 0 tấm sẽ bị đọc nhầm thành chưa đặt, và
khách mua gói chỉ lấy file sẽ không thấy dòng nào về giá in. Đã sửa ba chỗ mắc
bẫy này lúc thêm trạng thái 0.

Phần tính tiền **không phải sửa gì**: `tinhTienIn(soTam, 0, gia)` cho ra
`vuotGoi = soTam` — đúng nghiệp vụ, vì gói không kèm tấm in nào thì tấm nào
khách thả tim cũng là in thêm. Đo: 5 tấm → 75.000đ, 100 tấm → 1.500.000đ.

**GIÁ HIỆN HÀNH: 15.000đ MỘT TẤM IN THÊM, ĐÃ BAO GỒM CẢ CHỈNH SỬA VÀ IN**
(anh chốt 01/10/2026). Quyết định này **đảo ngược** đợt 27/09/2026 — khi đó anh
hạ xuống 10.000đ và bỏ hẳn cụm "đã gồm chỉnh sửa và in" khỏi mọi chỗ khách đọc.
Nay cả hai vế quay lại: giá lên 15.000đ, và câu đó có mặt ở **bốn chỗ** khách
đọc, phải nói giống nhau cả bốn:

| Chỗ | Tệp |
|---|---|
| Khối gói ảnh, nhánh gói 0 tấm | `HuongDanChon.tsx` |
| Khối gói ảnh, gạch đầu dòng thứ ba | `HuongDanChon.tsx` |
| "Hỏi Hamita" — album nhiều gói, và album gói N tấm | `hoiDap.ts` (2 câu) |
| "Hỏi Hamita" — album gói chỉ lấy file | `hoiDap.ts` |

Giá là **một khoản đã trộn công chỉnh sửa**, không phải hai khoản cộng lại —
đừng tách thành dòng riêng trên đơn in hay trong câu chữ phía khách.

**Đã đổi cả 74 album đang có sang 15.000đ** (đo lại sau khi chạy: 74/74), kể cả
**39 album khách đã bấm "chọn xong"** khi giá còn 10.000đ hoặc 12.000đ — anh
yêu cầu "đổi tất cả" và đã được nêu rủi ro trước khi chạy. Nghĩa là đơn in của
39 nhà đó tính theo giá mới; khi báo giá thì studio tự cân lại. `@default` của
cột cũng lên 15.000 nên album tạo sau này tự mang giá mới.

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
  riêng 7 tấm (hồi còn nút tick). Có thể họ hiểu nhầm hai nút, cũng có thể chỉ muốn giữ file;
  đằng nào studio cũng nên hỏi lại trước khi kết sổ, nên câu chữ nói thẳng vậy.
- **Chưa đặt gói ảnh.** Tách hai mức, đừng gộp: đã có khách thả tim là **gấp**
  (đơn giao in không tính được tiền, tới ngày giao mới lộ ra); chưa ai thả tim
  thì chỉ là lời nhắc. Đo trên dữ liệu thật: 2 album gấp, 2 album nhắc.
- **Khách chọn thêm sau khi đã báo xong.** Đây là kiểu lỗi im lặng nhất: studio
  thấy "đã báo xong" thì đem đi in, khách còn thêm mấy tấm sau đó, tới ngày
  giao mới biết thiếu mà không ai lần ra vì sao. Thật: Tú Trinh thêm 10 tấm sau
  khi báo.

  **So theo TỪNG THƯ MỤC** — mốc báo xong của chính thư mục chứa tấm ảnh, ghép
  bằng `Selection.albumName` ↔ `MucXong.tenMuc`. Bản đầu so với mốc **sớm nhất
  của cả album** và anh bắt lỗi 23/09/2026: nhà "Nhã Linh & Văn Chiêu" xong
  "File gốc nhà gái" lúc 10:36 rồi khách sang "File gốc nhà trai" chọn tiếp 58
  tấm — chuyện hoàn toàn bình thường mà web báo như có gì sai. Đo lại trên toàn
  bộ dữ liệu: cách cũ báo **18 album**, cách đúng còn **7** — 11 nhà kia chỉ là
  khách đang chọn ở thư mục khác. Thư mục chưa báo xong thì khách chọn bao
  nhiêu cũng không phải chuyện để báo.
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

**53. Neon tính tiền theo THỜI GIAN DATABASE THỨC, nên thứ gọi ĐỀU ĐẶN mới là
thứ tốn tiền — không phải câu lệnh nặng.**
Ngày 21/09/2026 tài khoản Neon hết hạn mức gói miễn phí và **cả web sập**: mọi
trang trả 500, `/api/suc-khoe` trả `database:false`, lỗi gốc là
`53000 … exceeded the quota`. Anh nâng lên gói Launch nên web sống lại; sau đó
rà lại các nguồn gọi database. Mỗi lần bị gọi là Neon thức thêm ít nhất 5 phút,
nên một thứ gọi 20 giây/lần giữ database thức 24/24.

Đã đo và đã sửa:

| Nguồn | Trước | Sau |
|---|---|---|
| `/api/img` xin phiếu Drive | **mỗi tấm ảnh một lần đọc database** (đo: 20 lượt → 20 lần đọc, 3.050ms) | giữ token trong bộ nhớ 50 phút (20 lượt → **1 lần**, 1.578ms) |
| `/api/admin/trang-thai` (thẻ "khách vừa chọn xong") | 20 giây/lần, **kể cả khi tab bị ẩn** | 60 giây/lần, **chỉ khi tab đang hiện** VÀ (từ 22/09) **ngưng sau 5 phút không ai đụng vào trang** |
| `/api/selections` (khách đang chọn ảnh) | 15 giây/lần khi tab hiện | 30 giây/lần, **ngưng sau 5 phút khách không đụng vào** |
| Cron đồng bộ AppSheet | mỗi giờ, 17 lượt/ngày | **tắt** (anh chốt 21/09: chưa dùng CRM) |

Ba điều đừng phá:
- **Token Drive giữ trong bộ nhớ của từng máy chạy hàm**, không phải database.
  "Kết nối lại" và "Ngắt kết nối" xoá ngay ở máy nhận cú bấm; máy khác cùng lắm
  50 phút rồi cũng đọc lại, và nếu phiếu đã chết thì Drive trả lỗi rồi code tự
  quay về service account như cũ (xem `tokenCache` trong `googleAuth.ts`).
- **Mọi vòng lặp hỏi lại phải kiểm `document.visibilityState` VÀ "còn ai đụng
  vào trang không"** — cả trang khách lẫn trang quản lý (từ 22/09/2026, trước
  đó trang quản lý chỉ kiểm vế đầu). Nếp chung: mốc `chamCuoi` cập nhật theo
  `pointerdown`/`keydown`/`scroll`, nghỉ quá `NGHI_SAU` thì ngưng hỏi, chạm lại
  thì hỏi NGAY một lần rồi mới tính nhịp tiếp — không thì người vừa quay lại
  bàn phải đợi hết một nhịp mới thấy tin mới. Thêm một vòng lặp mới mà quên hai
  phép kiểm này là quay lại đúng chỗ làm sập web.
- - **Chưa nhập mã thì KHÔNG hỏi lại danh sách** (30/09/2026). Máy chủ đòi mã
  mới cho đọc (nguyên tắc 3), nên khách chưa nhập mã thì mọi nhịp đều bị từ
  chối 403 — hỏi bao nhiêu lần cũng không được gì, mà mỗi lượt vẫn đánh thức
  database thêm 5 phút. Soi nhật ký Vercel 30/09 thấy 403 đều tăm tắp 30 giây
  một lượt suốt nửa tiếng, cho một khách không định chọn tấm nào. Nay effect
  trong `Selection.tsx` thoát ngay khi `!unlocked`; nhập mã xong nó chạy lại
  và tải NGAY nên khách không phải đợi hết một nhịp.
**Cron `dong-bo` đang TẮT trong `vercel.json`.** Nút "Đồng bộ ngay" và
  `npx tsx scripts/dong-bo-appsheet.mts` vẫn chạy được. Bật lại khi studio dùng
  CRM: thêm lại dòng `{ "path": "/api/cron/dong-bo", "schedule": "5 0-15,19 * * *" }`.

**Số thật sau một ngày chạy gói Launch** (anh gửi ảnh bảng Billing 22/09/2026):
**6,06 CU-giờ = $0,62** cho ngày đầu, lưu trữ 45,9 MB, truyền mạng 0,4 GB trong
500 GB kèm gói. Giá compute ≈ **$0,10/CU-giờ**; cứ nhịp đó thì khoảng **$19 một
tháng**. Biểu đồ cho thấy **ban đêm database ngủ thật** (vệt "endpoint inactive"
từ ~22h tới ~7h), còn ban ngày thức gần như liên tục ở mức sàn 0,25 CU.

Thủ phạm ban ngày là **tab `/admin` mở cả buổi**: tab còn hiện thì vòng hỏi 60
giây vẫn chạy, kể cả lúc không ai ngồi trước máy. Nên 22/09 `TheoDoiKhach` thêm
vế thứ hai giống trang khách — **ngưng sau 5 phút không ai đụng vào trang**,
chạm lại là hỏi ngay. Không thấy dịch vụ theo dõi ngoài nào gọi `/api/suc-khoe`
(đếm nhật ký 3 phút: 0 lượt).

**Đo lại 24/09/2026 (17h20):** 15,11 CU-giờ = **$1,58** cộng dồn từ 21/09 →
**~4,1 CU-giờ/ngày**, giảm ~⅓ so với ngày đầu. Giá thật $0,105/CU-giờ, dự
phóng **$11–13/tháng**. **Thước đo nhanh:** database chạy ở sàn 0,25 CU nên
thức trọn ngày = đúng **6 CU-giờ/ngày**; lấy số CU-giờ/ngày ÷ 0,25 ra số giờ
thức rồi đối chiếu giờ làm việc của studio — lệch nhiều là có thứ gọi lén.
Đừng đề xuất hạ trần autoscale: chưa bao giờ vượt 0,25 CU nên không đổi gì.

---

### 57. Địa chỉ ảnh xem luôn đi qua `duongDanAnh()`

Không bao giờ viết thẳng `/api/img/...?w=640` trong thành phần giao diện. Dùng
`duongDanAnh(id, 640)` từ `src/lib/anhXem.ts`.

Hàm đó là chỗ DUY NHẤT quyết định ảnh đi qua Cloudflare Worker hay qua Vercel.
Viết thẳng địa chỉ thì tấm ảnh đó vĩnh viễn đi đường Vercel — mà **không ai
thấy gì bất thường**: ảnh vẫn hiện đúng, chỉ là tháng sau hoá đơn không giảm
như tính. Đúng kiểu lỗi không bao giờ tự lộ ra.

Trước 28/09/2026 địa chỉ này nằm rải rác 21 chỗ trong 10 tệp.

Cỡ ảnh truyền vào phải nằm trong `ALLOWED_SIZES` của `/api/img`, và danh sách
đó phải khớp `CO_ANH` trong `worker/src/anhXem.ts` — hai đường cùng phục vụ
một trang, lệch nhau thì bật/tắt Worker là ảnh đổi kích thước giữa chừng.

---

### 58. Trang công khai dùng bản dựng sẵn — đụng vào thì phải gọi `revalidatePath`

Trang chủ và hai trang dịch vụ (`/dich-vu/[nhom]`, `/dich-vu/[nhom]/[muc]`) KHÔNG
đọc database mỗi lượt nữa. Chúng là bản dựng sẵn, làm mới khi studio sửa.

**Thêm bất kỳ việc nào sửa nội dung hiện trên mấy trang đó thì phải gọi
`revalidatePath("/")` hoặc `revalidatePath("/dich-vu", "layout")` trong action.**
Quên là trang đứng nguyên, mà không có lỗi nào hiện ra để biết — studio sẽ
tưởng máy hỏng. Đã vấp đúng thế với `themNhanVienAction` và `suaNhanVienAction`
(28/09/2026): đổi phòng ban hay cho nghỉ việc đều không hiện ra khu Đội ngũ.

**Hai việc phải làm cùng lúc, thiếu một là vô ích:**

1. Bỏ `dynamic = "force-dynamic"`, đặt `revalidate = 86400`.
2. Khai `generateStaticParams` cho mọi đoạn động trên đường dẫn.

Thiếu bước 2 thì Next không biết `[nhom]` nhận giá trị nào nên vẫn dựng lại mỗi
lượt. Đã đo: chỉ có `revalidate` thôi thì trang vẫn trả `Cache-Control:
no-store`; thêm `generateStaticParams` mới thành `x-nextjs-cache: HIT`.

Con số 86400 là lưới an toàn cho trường hợp quên gọi `revalidatePath`, không
phải cách làm mới chính.

**`/dich-vu/[nhom]/anh/[id]` cố ý để nguyên động.** Nó đọc Drive; dựng sẵn nghĩa
là lúc build phải gọi Drive cho từng cảnh một, Drive trục trặc đúng lúc đó là
hỏng cả bản dựng — trái nguyên tắc 19.

**Cách kiểm sau khi sửa:** `npm run build` rồi `npm start`, gọi
`curl -s -o /dev/null -D - http://localhost:3000/` và tìm dòng `x-nextjs-cache`.
Nhớ giết tiến trình giữ cổng 3000 trước, nếu không đo trúng bản cũ mà không biết
(`netstat -ano | grep :3000`).

---

## Đã thử và bị loại — đừng đề xuất lại

- **Nhận diện khách bằng số điện thoại** → đã code xong rồi bỏ theo yêu cầu.
- **Ba chế độ truy cập** (mở tự do / cần mã / riêng tư) → chỉ giữ một.
- **Duyệt thư mục Drive trong trang quản lý** → chỉ giữ ô dán link thủ công.
- **Phạm vi quyền `drive.file`** → Google nói rõ: chọn một thư mục KHÔNG cấp
  quyền đọc nội dung bên trong. Bắt buộc dùng `drive.readonly`.
- **Tạo thư mục mẹ chung trên Drive** → người dùng không muốn sắp xếp lại Drive.

---

**56. XOÁ ALBUM: quản lý + phòng Media** (anh chốt 28/09/2026, trước đó chỉ
quản lý). Hàm `quyenXoaAlbum` trong `quyenAlbum.ts` — KHÁC `quyenAlbumNguyHiem`
(nay chỉ còn lo kết nối Drive và bản sao lưu). Media là phòng dựng album nên
họ biết album nào tạo nhầm; bắt đi nhờ quản lý từng cái là tắc việc. Vẫn chặn
người đang cầm mật khẩu tạm chưa đổi. So phòng ban bằng `boDau`, không phân
biệt hoa thường — trong bảng nhân viên chữ mỗi nơi một kiểu. Đo 28/09: 9/15
người xoá được (7 Media + 2 quản lý).

**55. Danh sách nhân viên: quản lý + sale, KHÔNG cho nhân viên thường**
(anh chốt 25/09/2026). Bảng đó có số điện thoại, ngày vào làm, phòng ban của
cả tiệm — thông tin cá nhân của đồng nghiệp chứ không phải thứ ai cũng cần mở
ra xem. Hàm `xemNhanVien` trong `phienNhanVien.ts`; trang gọi `batBuocQuyen`
chứ không chỉ giấu mục trên thanh bên (nguyên tắc 3) — gõ thẳng đường dẫn cũng
bị đưa về Tổng quan. Ba chỗ phải sửa cùng lúc khi đổi luật này: trang, thanh
bên (layout), và mục trong danh sách ở trang Tổng quan.

**54. Khu "Đội ngũ" lấy người từ bảng NhanVien, KHÔNG có danh sách thứ hai**
(anh yêu cầu 25/09/2026). Cờ `hienTrenTrang` + `thuTuHien` trên NhanVien, ảnh
nằm ở bảng riêng `AnhNhanVien` (cột Bytes). Bốn ràng buộc phải giữ:

- **Mặc định TẮT.** Bảng nhân viên là dữ liệu nội bộ; bật từng người, và chỉ
  quản lý bật được (`doiHienTrenTrangAction` kiểm `laQuanTri`).
- **Ảnh của người chưa bật cờ chỉ trả cho người đã đăng nhập** (route
  `/api/anh-nv/[id]` trả 403 cho khách lạ). Ảnh nhân viên là thứ của họ.
- **Nhân viên chỉ sửa được ảnh của CHÍNH MÌNH**: action lấy id từ phiên đăng
  nhập, không nhận id từ máy khách.
- **`dangLam` false là rơi khỏi trang** dù cờ còn bật.

Ảnh nén ở TRÌNH DUYỆT (canvas, cắt vuông giữa, 320px, JPEG ~0.82) rồi mới gửi
base64 lên; máy chủ tự kiểm cỡ (≤400 KB) và hai byte đầu phải là JPEG. Không
dùng Drive vì quyền hiện tại chỉ đọc — bật quyền ghi là phải xin lại cả tài
khoản Google của studio.

Bảng ảnh TÁCH RIÊNG khỏi NhanVien: mọi truy vấn nhân viên (đăng nhập, danh
sách, chấm công) sẽ kéo theo vài chục KB mỗi dòng nếu để chung.

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

**`shrink-0` trong flex làm chữ TRÀN RA NGOÀI thẻ rồi bị cắt cụt.** Anh phát
hiện 09/09/2026 trên thẻ album: nhãn "Xong · file hoàn thiện AB" chạy hẳn ra
ngoài mép thẻ, cắt giữa chữ, không có dấu ba chấm nào — nhìn như chữ bị mất.

Khối nhãn để `flex shrink-0 flex-wrap`. `shrink-0` nghĩa là **cấm co lại**, nên
hai nhãn nằm cạnh nhau dài hơn thẻ; `flex-wrap` bên trong vô dụng vì khối cha
không bao giờ hẹp lại để buộc xuống dòng. Đo trên thẻ 298px: tràn **76px**, bị
`overflow-hidden` của thẻ xén mất.

Đúng phải là **`min-w-0`**: cho khối co được, rồi `flex-wrap` mới xếp nhãn
xuống dòng. Sửa xong đo lại 24 thẻ: **0 phần tử tràn**.

Luật chung: trong flex, `shrink-0` chỉ dành cho thứ có bề rộng CỐ ĐỊNH và nhỏ
(biểu tượng, nhãn một hai chữ). Thứ nào chứa chữ do người dùng đặt — tên thư
mục, tên khách — thì `min-w-0` cộng `truncate` hoặc `flex-wrap`, không bao giờ
`shrink-0`.

**ĐỔI ĐƯỜNG TẢI SANG TÊN MIỀN KHÁC LÀM CHẾT MỌI LƯỢT `fetch` CỦA TRANG.**
Anh gặp thật trên điện thoại ngày 29/09/2026: bấm "Lưu ảnh" chỉ thấy
*"Chưa tải được — bấm thử lại nhé"*.

Nút đó không mở link mà gọi `fetch` để lấy tệp vào bộ nhớ rồi đưa sang khay
chia sẻ của máy (bắt buộc với iPhone, xem nguyên tắc 44). Khi `/api/download`
còn cùng tên miền với trang thì không phải xin phép gì. Từ lúc nó chuyển hướng
sang `workers.dev`, lượt `fetch` ấy thành **khác tên miền** — trình duyệt chặn
nếu bên nhận không khai `Access-Control-Allow-Origin`, và chặn **sau khi** đã
theo chuyển hướng nên chẳng có mã lỗi nào để lần.

**Vì sao máy tính vẫn tải được, làm lỗi ẩn thêm một ngày:** trên máy tính và
Android, nút tải trỏ thẻ `<a download>` thẳng vào đường dẫn — điều hướng thật,
không phải `fetch`, nên không dính luật này. Chỉ đường đi qua `fetch` mới chết.

Nay Worker kèm lời cho phép vào **mọi** phản hồi của `/t/`, kể cả báo lỗi:
thiếu nó thì ngay cả câu "đường dẫn hết hạn" cũng không tới được trang, khách
chỉ thấy lỗi chung chung. Chỉ cho phép đúng tên miền đang hỏi (đọc từ
`HOST_CHO_PHEP`), không dùng `*`.

**Luật rút ra: dời một đường API sang tên miền khác thì phải rà xem có chỗ nào
gọi nó bằng `fetch` không.** Thẻ `<a>` và `<img>` không sao, `fetch` và
`XMLHttpRequest` thì chết — mà hai thứ đó lại hay nằm ở đường quan trọng nhất.

**Chữ bị `truncate` thì phải có `title`.** Ba dòng trên thẻ album bị cắt mà
không có cách nào xem lại: tên album, lời nhắn, và dòng đường dẫn kèm ngày tạo.
Cắt cho vừa thẻ là đúng, nhưng cắt xong không cho xem lại là mất thông tin thật —
nay cả ba đều có chú giải khi rê chuột.

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

**Lưới ảnh có tải thêm KHÔNG được dùng cột báo (`columns-*`).** Anh báo
19/09/2026: ảnh "sắp xếp lộn xộn", "lướt tới ảnh mới thì bị reload mất ảnh".
Cột báo xếp ảnh DỌC hết cột này mới sang cột kia (đo: 6 tấm đầu chồng cả trong
cột trái), và mỗi lần nối thêm 60 tấm trình duyệt chia lại mọi cột — tấm thứ
30 đang xem bị đẩy từ (334, 4372) sang (24, 8409). `PhotoGrid` nay xếp HÀNG
(flex-wrap, `flex-grow` = tỉ lệ ảnh quanh chiều cao `--h`): đúng thứ tự tên
file, không xén, ảnh tải thêm chỉ nối hàng mới. Cột báo chỉ dùng được ở trang
hiện HẾT ảnh một lần (trang ảnh `/dich-vu/.../anh/<id>` vẫn dùng — nhưng thứ tự
đọc ở đó cũng là theo cột).

**Lưới "Ảnh khách chọn" (`/admin/[slug]`) dùng Ô VUÔNG + `object-contain`.**
Anh báo 21/09/2026: "ảnh ngang vẫn đang hiển thị thành ảnh dọc" — bản cũ để
`aspect-[3/4] object-cover` nên ảnh tiệc chụp ngang bị xén mất hai bên, đúng
phần nhiều người ngồi trong bàn, mà đây là trang để đối chiếu trước khi giao in.

Vì sao KHÔNG dựng lưới theo tỉ lệ thật như `PhotoGrid`: tỉ lệ ảnh chỉ có trên
Drive, mà **trang quản lý không gọi Drive** (nguyên tắc 9) — bảng `Selection`
chỉ lưu `driveFileId`, tên file, lời dặn, không có `width`/`height`. Đo tỉ lệ ở
trình duyệt sau khi ảnh tải xong thì mỗi tấm tải xong lại đẩy lưới nhảy một
nhịp — đúng lỗi vừa sửa ở trang khách. Ô vuông không cắt tấm nào và không nhảy;
đổi lại ảnh dọc nhỏ hơn bản cũ chừng một phần tư.

Muốn lưới hàng-đều như trang khách thì phải **lưu `width`/`height` vào
`Selection`** lúc khách chọn (trang khách có sẵn hai số đó) và lấp cho dữ liệu
cũ bằng một lượt đọc Drive chạy nền — đừng gọi Drive ngay trong trang.

**State cũ trong closure khi vừa set state vừa gọi lại hàm trong cùng lượt
bấm.** React chưa kịp cập nhật state trước khi hàm chạy lại, đọc phải giá trị
cũ. Sửa bằng cách truyền thẳng tham số vào hàm thay vì dựa vào state cho quyết
định cần đúng ngay lập tức (gặp ở nút "Vẫn tải" của cảnh báo tải file lớn).

**Cache 5 phút của `loadTree` làm hai lần đọc lệch nhau.** Hộp "Đổi ảnh bìa"
liệt kê ảnh từ một lượt đọc, máy chủ kiểm ảnh đó ở một lượt đọc khác — người
dùng thấy ảnh ngay trước mắt mà bị báo "Ảnh này không nằm trong thư mục" (gặp
23/09 ở cảnh Hamita Garden vừa chia lại trên Drive). **Hàm kiểm ở máy chủ không
được tin cache:** không thấy thì đọc lại bằng `loadTreeMoi` một lần nữa rồi mới
kết luận. Áp dụng cho `doiBiaThuMucGioiThieu` và `themThuMucGioiThieu`; câu lỗi
cũng phải chỉ đường ("bấm Đọc lại từ Drive") chứ đừng chỉ nói sai.

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
