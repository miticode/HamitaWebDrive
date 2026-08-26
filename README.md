# Photo Gallery — xem ảnh qua Google Drive

Web tạo link gallery cho khách xem ảnh, ảnh vẫn nằm nguyên trên Google Drive
của studio. Khách không thấy giao diện Drive và không lấy được link Drive gốc.

Link gửi khách là **link sống**: thả thêm thư mục mới vào Drive (file gốc →
file hoàn thiện → file nhà gái...) thì khách F5 là thấy, không cần tạo link mới.

## Trạng thái

- [x] Giai đoạn 1 — kết nối Drive bằng Service Account
- [x] Giai đoạn 2 — API proxy ảnh (resize + cache) và tải ảnh
- [x] Giai đoạn 3 — trang admin tạo gallery
- [x] Giai đoạn 4 — trang xem cho khách, tim/tick chọn ảnh
- [x] Giai đoạn 6 — màn hình xem ảnh khách đã chọn
- [ ] Giai đoạn 5 — tải zip cả album
- [x] Giai đoạn 7a — lớp dữ liệu Postgres (Prisma + Neon) đã sẵn sàng
- [x] Giai đoạn 7b — Neon Postgres (Singapore) đã chạy, dữ liệu đã chuyển sang
- [x] Giai đoạn 7c — đã chạy thật tại https://hamita-gallery.vercel.app

## Cài đặt Google Cloud (làm một lần)

1. Vào https://console.cloud.google.com → tạo project mới.
2. **APIs & Services → Library** → tìm **Google Drive API** → Enable.
3. **IAM & Admin → Service Accounts** → Create service account → đặt tên bất kỳ
   → Done (không cần cấp role nào).
4. Mở service account vừa tạo → tab **Keys** → Add key → Create new key →
   chọn **JSON** → tải file về máy.
5. Mở file JSON, copy giá trị `client_email`. Vào folder ảnh trên Google Drive
   → Share → dán email đó vào → quyền **Viewer**.

## Cấu hình

Chuyển file JSON thành một dòng base64 (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\duong-dan\key.json")) | Set-Clipboard
```

`.env.local`:

```
GOOGLE_SERVICE_ACCOUNT_JSON=<chuỗi base64>
ADMIN_PASSWORD=<mật khẩu vào trang quản trị>
DRIVE_ROOT_FOLDER_ID=<ID thư mục mẹ chứa tất cả folder khách>
DATABASE_URL=<chuỗi kết nối Neon — bỏ trống khi chạy ở máy>
NEXT_PUBLIC_STUDIO_NAME=Hamita Studio
```

Có `DATABASE_URL` thì dùng Postgres, bỏ trống thì dùng file JSON trong `data/`.
Vercel có hệ thống file chỉ đọc nên khi deploy **bắt buộc** phải có biến này.

Chưa đặt `ADMIN_PASSWORD` thì trang `/admin` mở tự do — chỉ chấp nhận khi chạy
ở máy, bắt buộc phải đặt trước khi đưa lên mạng.

## Thư mục mẹ — để nhân viên khỏi phải share từng folder

Quyền trên Drive di truyền xuống dưới. Tạo một thư mục mẹ (ví dụ `KHÁCH HÀNG`),
share **một lần** cho service account với quyền Viewer, rồi đặt ID của nó vào
`DRIVE_ROOT_FOLDER_ID`.

Từ đó nhân viên chỉ cần tạo folder khách **bên trong** thư mục mẹ — trang admin
sẽ tự liệt kê ra trong ô chọn, không phải copy link, không phải share lại.

Chưa đặt biến này thì trang admin tạm liệt kê những thư mục được share riêng lẻ
cho service account.

## Chạy

```
npm run dev
```

- `/admin` — chọn thư mục khách trong danh sách để tạo link, xem ảnh khách đã chọn
- `/g/{slug}` — khách thấy tất cả thư mục trong folder (chỉ có một thư mục thì
  vào thẳng lưới ảnh)
- `/g/{slug}/{folderId}` — lưới ảnh, bấm ảnh để xem to, tim/tick để chọn

## Đưa lên mạng

Đang chạy tại **https://hamita-gallery.vercel.app** (Vercel team `hamita`,
project `hamita-gallery`). Database Neon và server Vercel đều đặt ở Singapore —
cấu hình region nằm trong `vercel.json`.

Đẩy phiên bản mới lên — kho GitHub đã nối với Vercel từ 26/08/2026 nên chỉ cần:

```
git push
```

Đường lui khi git trục trặc: `npx vercel deploy --prod --yes --scope hamita`.

Biến môi trường trên Vercel được lưu dạng **Sensitive** nên không đọc ngược lại
được. Muốn đổi thì ghi đè:

```
npx vercel env add TEN_BIEN production --force
```

Sửa biến môi trường xong phải deploy lại thì bản đang chạy mới nhận giá trị mới.

### Lệnh liên quan tới database

| Lệnh | Việc |
|---|---|
| `npm run db:push` | Tạo/cập nhật bảng theo `prisma/schema.prisma` |
| `npm run db:check` | Xem nhanh trong database đang có gì |
| `npm run db:backup` | Sao lưu database ra `data/sao-luu/` |
| `npm run db:restore` | Liệt kê bản sao lưu · xem trước · phục hồi |
| `npm run db:migrate-json` | Chuyển dữ liệu từ `data/db.json` sang Postgres (chạy một lần) |
| `npm run db:studio` | Mở giao diện xem/sửa dữ liệu |

## Sao lưu và phục hồi

Ảnh nằm trên Drive, nhưng thứ **không thể tạo lại** nằm trong database: khách
đã thả tim những tấm nào, ghi chú "in cỡ 40x60" ở tấm nào, mã chọn ảnh của từng
album. Xoá nhầm một album là mất sạch những thứ đó, và xoá kéo theo dây chuyền
nên không lùi được.

```
npm run db:backup
```

Ghi ra `data/sao-luu/hamita-2026-08-26-1614.json`, giữ **8 bản gần nhất** rồi
tự dọn bản cũ. Thư mục `data/` đã nằm trong `.gitignore` nên bản sao lưu không
bao giờ lọt lên GitHub.

### Hoặc bấm nút, khỏi gõ lệnh

Trang quản lý có nút **"Sao lưu ngay"** ngay cạnh thanh kết nối Drive. Cùng dữ
liệu với lệnh trên — hai bên dùng chung `taoBanSaoLuu()` nên không bao giờ lệch
nội dung — nhưng tệp tải thẳng về máy qua trình duyệt thay vì ghi vào
`data/sao-luu/`.

Máy chủ **không giữ lại bản nào**: Vercel có hệ thống tệp chỉ đọc, mà kể cả ghi
được thì cũng vô nghĩa — bản sao lưu nằm cùng chỗ với thứ nó bảo vệ thì mất là
mất cả hai.

Nút hiện luôn **"Lần cuối: N ngày trước"**, và đổi sang màu cảnh báo khi quá 14
ngày. Không có dòng đó thì nó chỉ là một cái nút bấm rồi quên — mà chính việc
thiếu lời nhắc là lý do Drive đầy 99,5% mà không ai biết.

**Không chứa phiếu đăng nhập Google.** Phiếu đó mở được toàn bộ Drive và không
hết hạn — một tệp được chép đi chép lại không phải chỗ giữ nó. Phục hồi xong
chỉ cần vào trang quản lý bấm "Kết nối lại".

### Phục hồi

```
npm run db:restore                                  # xem có những bản nào
npm run db:restore -- <tệp>                         # XEM TRƯỚC, không ghi gì
npm run db:restore -- <tệp> --ghi                   # ghi thật
npm run db:restore -- <tệp> --album <slug> --ghi    # chỉ một album
```

Mặc định là **xem trước** — phải gõ thêm `--ghi` mới động vào database. Và nó
**chỉ thêm những gì đang thiếu**, không bao giờ ghi đè hay xoá: album nào còn
tồn tại thì bỏ qua và báo rõ. Nhờ vậy một lần phục hồi nhầm không xoá mất những
lựa chọn khách vừa làm hôm nay.

### Cho nó chạy hằng tuần

Đặt lịch trên Windows — mở PowerShell rồi dán (chạy một lần duy nhất):

```powershell
$act = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c cd /d D:\code\photo-gallery && npm run db:backup" 
$trg = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 9am
Register-ScheduledTask -TaskName "Hamita - sao luu database" -Action $act -Trigger $trg
```

Sáng thứ Hai hằng tuần là có một bản mới. **Giới hạn cần biết:** cách này chỉ
chạy khi máy đang bật. Máy tắt cả tuần thì tuần đó không có bản nào — nên thỉnh
thoảng vẫn nên tự chạy `npm run db:backup` sau những đợt khách chọn ảnh nhiều.

## Kiến trúc

- `src/lib/drive.ts` — xác thực Service Account, đọc cây thư mục, tải file gốc.
  Mỗi thư mục con cấp 1 thành một album; ảnh nằm sâu hơn được gộp vào album gần
  nhất để khách không phải bấm quá nhiều lớp.
- `src/lib/cache.ts` — cache 5 phút cho kết quả gọi Drive, đồng thời gộp các
  request đến cùng lúc thành một.
- `src/lib/store/` — hai kho dữ liệu cùng một giao diện: `json.ts` (file, chạy ở
  máy) và `prisma.ts` (Postgres/Neon). `index.ts` chọn cái nào tuỳ theo có
  `DATABASE_URL` hay không. Bản JSON cho **mọi thao tác đọc và ghi đi qua một
  hàng đợi chung**: nếu không, hai cú bấm gần nhau sẽ ghi đè mất nhau, và request
  đọc trúng lúc đang ghi sẽ tưởng là không có gallery nào.
- `src/app/api/img/[fileId]` — proxy ảnh. Kích thước tính theo **cạnh dài**,
  không phải chiều rộng: ảnh cưới phần lớn là ảnh dọc, giới hạn theo chiều rộng
  sẽ cho ra ảnh cao gấp rưỡi mức màn hình cần. Luôn ưu tiên bản dựng sẵn của
  Google (tham số `=s`), chỉ tải bản gốc khi Drive chưa có. Lưu ý: xin cỡ bằng
  hoặc lớn hơn ảnh gốc thì Google trả về nguyên file gốc.
- `src/lib/warm.ts` — dựng sẵn ảnh đầu tiên sau khi tạo link, chạy trong
  `after()` nên không bắt người tạo phải đợi. Phải gọi qua HTTP chính mình thì
  CDN mới giữ lại bản trả về; và **không được** đặt `cache: "no-store"` trong
  lệnh gọi, vì header đó khiến CDN bỏ qua không lưu.
- `src/app/api/download/[fileId]` — tải ảnh về máy khách, đã xoá metadata GPS.
- `src/lib/access.ts` + `src/app/api/selections` — **mã xem album**. Mỗi album
  một mã, ba chế độ: mở tự do / xem tự do nhưng cần mã để chọn / riêng tư hoàn
  toàn. Mã kiểm tra ở **phía máy chủ**, không chỉ giấu nút — gọi thẳng API mà
  không có mã vẫn bị từ chối.
- **Cả nhà dùng chung một mã nên lựa chọn cũng là một danh sách chung.** Nhờ vậy
  cô dâu chọn trên điện thoại rồi mở laptop vẫn thấy đúng, và hai người cùng tim
  một tấm cũng chỉ tính một lần — trước đây mỗi máy một mã ẩn danh nên vướng cả
  hai lỗi đó.
- Chữ ký của phiếu mở album lấy từ chính mã: **đổi mã là mọi phiếu cũ tự hết
  hiệu lực**, không cần bước thu hồi nào.

## Giao diện

Tông sáng cố định, **không đổi theo chế độ sáng/tối của máy khách** — album gửi
khách là bộ mặt studio nên phải giống nhau trên mọi máy. Riêng khung xem ảnh to
vẫn nền đen vì ảnh nổi hơn hẳn trên nền tối.

Nền trắng ngà `#fdfcfa`, chữ nâu đen, đường kẻ mảnh, điểm nhấn đồng nhạt — mọi
thứ lùi lại để mắt chỉ dừng ở ảnh. Tiêu đề dùng Cormorant Garamond, phần chữ
còn lại dùng Be Vietnam Pro; cả hai đều có bộ ký tự tiếng Việt đầy đủ. Biến màu
khai báo ở `globals.css`.

### Trang quản trị

Lưới thẻ có ảnh bìa, mỗi thẻ hiện số ảnh, số thư mục con và số ảnh khách đã
chọn theo từng danh sách.

Có ô tìm kiếm **bỏ dấu** (gõ "ngoc tho" ra "Ngọc Thơ") và các nút mã nhanh
(HC, AB, ĐH…). Ô gõ chữ dò cả tên thư mục con, còn nút mã **chỉ dò trong tên
album** — nhiều album có thư mục "file hoàn thiện HC", tính cả vào thì bấm mã
HC sẽ ra nhầm.

Mỗi thẻ có nút **Đổi bìa**: chọn bất kỳ ảnh nào trong album làm ảnh bìa. Bìa do
người dùng chọn được đánh dấu `coverPinned`, nên lần đồng bộ sau không ghi đè
lên bằng tấm đầu tiên.

**Trang này không gọi Drive lần nào.** Số liệu của từng album được chụp lại vào
database lúc tạo link và mỗi lần bấm "Làm mới" (`syncAndWarm` trong
`src/lib/warm.ts`). Nếu đọc thẳng từ Drive thì 9 album là khoảng 70 lần gọi,
chậm 8–10 giây mỗi lần mở trang. Chạy `npm run db:sync` để chụp lại hàng loạt.

### Trang khách

- `GalleryHeader` — thanh trên cùng dính theo màn hình, gộp nút quay lại, tên
  mục đang xem và số ảnh đã chọn. **Con số cũng là nút lọc**: bấm vào chỉ hiện
  những ảnh đã chọn, khỏi cuộn lại từ đầu để rà.
- `PhotoGrid` — lưới 2 cột trên điện thoại, 3/4/5 cột theo bề ngang màn hình.
  Mỗi ô là một component bọc `memo`, nên mở/đóng ảnh to không làm cả trăm ô
  còn lại vẽ lại.
- Ô ảnh chưa tải xong nhấp nháy nhẹ (`.skeleton`) để biết là đang chờ chứ
  không phải hỏng. Tỉ lệ khung giữ đúng ảnh gốc nên trang không nhảy.
- Nút về đầu trang hiện sau khi cuộn sâu.
- Vùng bấm tối thiểu 38–56px cho ngón tay; khung xem ảnh chừa lề dưới theo
  `env(safe-area-inset-bottom)` để không bị thanh cử chỉ iPhone che.