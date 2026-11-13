# Soát UI/UX phần quản lý — 13/11/2026

> **Trạng thái 13/11:** **P0 và cả P1 đã làm xong và lên mạng.** Còn lại bốn
> việc **P2** (nhất quán, đánh bóng) đang chờ anh duyệt.

Soi toàn bộ `/quan-ly`: 18 mục menu, 20 trang, 10.819 dòng giao diện. Chạy
`web-design-guidelines` (bộ quy tắc Vercel) và `ui-ux-pro-max`, nhưng **phần
lớn phát hiện dưới đây đến từ đọc mã nguồn thật** — hai bộ quy tắc kia trả về
hướng dẫn chung (nhãn ô nhập, bảng tràn ngang, phản hồi sau khi gửi), đúng
nhưng không chỉ ra được chỗ hỏng riêng của tiệm mình. Em nói rõ để anh biết
giá trị đến từ đâu.

**Không sửa gì cho tới khi anh duyệt.** Mọi đề xuất giữ nguyên chức năng,
business logic, API, database, đăng nhập và phân quyền.

---

## Tóm tắt: 13 việc, chia ba mức

| Mức | Việc | Vì sao |
|---|---|---|
| **P0** | 3 việc | Màn hình đang **nói sai** hoặc **không nói** thứ người ta cần |
| **P1** | 6 việc | Thao tác thừa, dễ nhập sai, thiếu thông tin để làm việc |
| **P2** | 4 việc | Thiếu nhất quán, đánh bóng |

---

# P0 — Phải sửa trước khi cho cả tiệm dùng  ✅ LÀM XONG 13/11

**Hai thứ đo ra sau khi dựng xong trang Tổng quan, phải sửa lại ngay:**

- Thẻ *Việc quá hạn* bản đầu đếm cả tiệm → ra **169**, hạn cũ nhất **23/03/2025**.
  Đó là tồn kho hai mươi tháng chép từ AppSheet, không phải việc hôm nay. Một
  thẻ đỏ ghi 169 ngày nào cũng đỏ thì một tuần sau không ai nhìn nữa. Đổi thành
  việc của chính người đang xem — Khánh: **0**. Con số cả tiệm vẫn còn ở chip
  "Quá hạn" trên trang Đầu việc, đúng chỗ của nó.
- Dòng *"19 sự cố đang treo"*: cả 19 là bản chép AppSheet, ba cột thời gian bên
  đó rỗng hết nên không ai biết chúng còn thật hay xong từ năm ngoái. Chỉ đếm
  sự cố **ghi trên web** — hiện là **0**, nên dòng đó biến mất.

Hai lần này đều là cùng một lỗi: **đếm rác cũ rồi gọi nó là việc hôm nay.**


## P0-1 · Dải báo đồng bộ đang nói sai, trên 7 trang

**Hiện trạng.** `BangDongBo` xuất hiện ở Hợp đồng, chi tiết Hợp đồng, Khách
hàng, Phiếu thu, Lịch chụp, Đầu việc, Sổ quỹ — 7 trang. Câu cuối của nó:

> **Nhưng hợp đồng cũ thì sửa bên AppSheet**: sửa trên web, đêm đó bản bên kia
> chép sang là mất.

**Sáng nay mình đã bỏ hẳn lịch chạy đêm.** Không còn "đêm đó" nào cả. Đây là
lỗi em để lọt khi sửa 9 chỗ nói "mỗi đêm" — sửa được câu đầu, sót câu cuối.
Chú thích trong mã còn tệ hơn: ba đoạn nói ngược nhau, đoạn mới nhất vẫn ghi
*"anh cho BẬT LẠI lịch chép đêm"*.

**Hậu quả thật:** nhân viên đọc xong sẽ **không dám sửa hợp đồng cũ trên web**
— đúng thứ mình vừa mở ra cho họ làm. Lần chuyển 21/09 thất bại cũng vì không
ai đổi thói quen; một dải báo bảo "sửa bên AppSheet đi" là tự tay dựng lại rào.

### Trước

```
Hợp đồng, phiếu thu, lịch và đầu việc cũ là bản chép của AppSheet — chép lần
cuối 13/11 15:04. Chép lại bằng nút Đồng bộ ngay — không còn lịch tự động.
Hợp đồng mới cứ lập thẳng trên web bằng nút Lập hợp đồng — những hợp đồng đó
không bao giờ bị lịch chép đụng vào. Nhưng hợp đồng cũ thì sửa bên AppSheet:
sửa trên web, đêm đó bản bên kia chép sang là mất.
```
Năm dòng chữ, đọc hết mới hiểu. Nằm trên **mọi** trang chính → sau hai ngày
không ai đọc nữa (chứng mù dải báo).

### Sau

Một dòng, và **chỉ cảnh báo khi có cái để cảnh báo**:

```
Dữ liệu cũ chép từ AppSheet · lần cuối 13/11 15:04        [Đồng bộ ngay]
```

Câu cảnh báo ghi đè chuyển **vào đúng chỗ nó có nghĩa** — trong form sửa hợp
đồng, và chỉ với hợp đồng mang dấu vân tay AppSheet:

```
⚠ Hợp đồng này chép từ AppSheet. Sửa ở đây giữ được, trừ khi bên AppSheet
  cũng sửa nó rồi có người bấm "Đồng bộ ngay".
```

**Dễ hơn vì:** cảnh báo xuất hiện lúc người ta sắp làm việc nguy hiểm, không
phải lúc họ chỉ đang xem danh sách. Đúng cách em đã làm cho form sửa khách
hàng hôm nay.

---

## P0-2 · Trang Tổng quan liệt kê những thứ "sắp có" mà đã làm xong hai tháng

**Hiện trạng.** Khối "Sắp có — thay dần AppSheet" trên trang đầu tiên:

| Hiện đang ghi | Thực tế |
|---|---|
| Đợt 2 — Hợp đồng: *"tạo, sửa hợp đồng… khi chuyển hẳn khỏi AppSheet"* | **xong 21/09**, đang dùng |
| Đợt 3 — *"chia việc ngay trên web, khách tiềm năng"* | **xong hôm nay** |
| Đợt 4 — *"Chấm công, đơn xin, thưởng phạt, lương tháng, phiếu chi"* | **xong hôm nay**, đang cho tiệm dùng thử |
| Đợt 5 — Báo cáo | chưa làm (mục duy nhất còn đúng) |

Và dòng kết: *"Trong lúc chờ, tiệm vẫn dùng AppSheet cho các phần này như bình
thường."*

**Hậu quả thật:** nhân viên mới đăng nhập, thấy trang đầu nói "Chấm công sắp
có", trong khi menu bên trái có mục Chấm công. Họ sẽ tin trang đầu và đi chấm
bên AppSheet. Đây **chính xác** là cách lần chuyển trước chết.

### Sau

Bỏ hẳn khối "Sắp có". Thay bằng **việc cần làm hôm nay** (xem P0-3). Nếu anh
muốn giữ lộ trình thì để một dòng ở cuối trang:
*"Còn lại: báo cáo doanh thu — đợt cuối."*

---

## P0-3 · Trang Tổng quan không nói ai phải làm gì

**Hiện trạng.** Trang đầu tiên mọi người thấy, hiện có:

- 3 thẻ số — **chỉ về mật khẩu nhân viên**, và chỉ Admin thấy
- một danh mục liên kết lặp lại y hệt menu bên trái
- khối "sắp có" đã sai

Người không phải Admin — tức **14/16 người trong tiệm** — mở lên thấy một lời
chào và một danh sách link trùng menu. Không con số nào.

Trong khi đó database đã có sẵn mọi con số đáng hiện, truy vấn nào cũng rẻ:

| Con số | Đã có ở đâu | Ai cần |
|---|---|---|
| Đơn từ chờ duyệt | `don-tu/page.tsx` đếm rồi | Admin |
| Phiếu thu chờ duyệt | `phieu-thu` | Admin, Sale |
| Khoản chi chờ duyệt | `so-quy` | Admin |
| Việc quá hạn của tôi | `cong-viec` đếm rồi | Photo, Hậu kỳ |
| Lịch chụp hôm nay / ngày mai | `lich` | Photo, Sale |
| Khách tiềm năng đến hẹn gọi lại | mới làm — **13 người** | Sale, CSKH |
| Hợp đồng đang chờ khách chọn ảnh | `BUOC_CHO_KHACH` | Sale, Hậu kỳ |
| Công nợ còn phải thu | `hop-dong` tổng rồi | Admin, Sale |
| Sự cố đang treo | mới làm | cả tiệm |
| Hôm nay tôi chấm công chưa | `cham-cong` | cả tiệm |

### Trước

```
Chào Khánh

┌─────────────┬─────────────┬─────────────┐
│ Nhân viên   │ Chưa có     │ Đã cấp,     │   ← chỉ Admin thấy
│ đang làm 16 │ mật khẩu 2  │ chờ đổi  3  │
└─────────────┴─────────────┴─────────────┘

Đang có
  Hợp đồng      Tra hợp đồng, công nợ…        ← trùng menu trái
  Lịch chụp     Lịch cả tháng…
  Đầu việc      Việc chưa xong…
  … 6 dòng nữa

Sắp có — thay dần AppSheet
  Đợt 2  Hợp đồng — phần còn lại    ← đã xong từ lâu
  Đợt 3  Lịch & công việc           ← đã xong
  Đợt 4  Nhân sự & chi              ← đã xong
```

### Sau

```
Chào Khánh                                 Thứ Năm, 13/11

VIỆC CỦA ANH CHỊ HÔM NAY
┌──────────────────┬──────────────────┬──────────────────┐
│ Chưa chấm công   │ Việc quá hạn     │ Lịch chụp hôm nay│
│   [Vào ca]       │        3         │        2         │
└──────────────────┴──────────────────┴──────────────────┘
                      ↑ đỏ nếu > 0       ↑ bấm vào mở lịch

CHỜ ANH DUYỆT                                    (chỉ Admin)
┌──────────────────┬──────────────────┬──────────────────┐
│ Đơn từ      2    │ Phiếu thu   5    │ Khoản chi   1    │
└──────────────────┴──────────────────┴──────────────────┘

TIỆM ĐANG THẾ NÀO                           (Admin + Sale)
  Còn phải thu         783.935.909đ    101 hợp đồng
  Chờ khách chọn ảnh            14     hợp đồng
  Khách hẹn gọi lại             13     người ← đỏ, quá hạn cả 13
```

Mỗi thẻ là một liên kết đi thẳng tới danh sách **đã lọc sẵn**. Thẻ nào bằng 0
thì xám và không mời bấm.

**Dễ hơn vì:** nhân viên mới mở web lên là thấy **ba việc của mình**, không
phải một menu. Sếp mở lên thấy **ba con số cần duyệt** và **ba con số về
tiệm**, không phải đi dạo bảy trang để gom. Mỗi thẻ chỉ là một phép đếm trên
truy vấn đã có — không thêm bảng, không thêm cột, không đụng phân quyền (thẻ
nào hiện cho ai vẫn theo đúng `xemHopDong` / `laQuanTri` hiện hành).

---

# P1 — Bớt thao tác, bớt nhập sai  ✅ LÀM XONG 13/11

## P1-1 · Ô tìm khách không có nút, phải đoán là bấm Enter  ✅

**Hiện trạng.** `khach-hang/page.tsx:90` — `<form>` chỉ có đúng một ô nhập,
không nút nào:

```jsx
<form action="/quan-ly/khach-hang">
  <input name="q" placeholder="Tìm tên hoặc số điện thoại" />
</form>
```

Gõ xong không có gì xảy ra. Người quen máy tính sẽ bấm Enter; người quen điện
thoại sẽ gõ rồi ngồi chờ. Trên bàn phím ảo iOS nút đó ghi "Go", không ghi
"Tìm".

**Sau:** thêm nút `Tìm` ngay cạnh ô, và `type="search"` để điện thoại hiện
đúng nút kính lúp.

**Dễ hơn vì:** một nút nhìn thấy được luôn thắng một phím phải đoán. Đây cũng
là quy tắc "nhãn nút phải nói rõ việc" trong bộ Vercel.

---

## P1-2 · Trang Hợp đồng có hai kiểu lọc khác nhau, cùng một màn hình  ✅

**Hiện trạng.** Đếm trên 11 trang có lọc:

| Kiểu | Dùng ở | Hành vi |
|---|---|---|
| Chip bấm-là-xong | **11 trang** | bấm một cái, áp dụng ngay |
| Form + nút "Lọc" | **1 trang** (Hợp đồng) | chọn, rồi phải bấm thêm "Lọc" |

Trang Hợp đồng dùng **cả hai cùng lúc**: ô tìm + 2 ô chọn + nút "Lọc" ở hàng
trên, rồi chip "Còn nợ" bấm-là-xong ở hàng dưới. Hai thứ cạnh nhau, hành xử
khác nhau.

**Sau:** giữ nguyên ô tìm + nút Tìm (vì gõ chữ thì cần Enter/nút), nhưng cho
hai ô chọn **tự áp dụng khi đổi** — cùng nếp với 11 trang kia. Nút "Lọc" bỏ đi.

**Dễ hơn vì:** bớt một cú bấm mỗi lần lọc, và quan trọng hơn là **một quy tắc
duy nhất** cho cả web: đổi lựa chọn = áp dụng ngay. Nhân viên mới không phải
học hai cách.

---

## P1-3 · Lịch hiện cùng lúc lưới tháng và bảng — cùng một dữ liệu  ✅

**Hiện trạng.** Trên máy tính, trang Lịch vẽ **lưới 7 cột cả tháng**, rồi ngay
dưới vẽ tiếp **bảng danh sách cùng từng ấy buổi chụp**. Hai lần cùng một dữ
liệu, phải cuộn qua cả hai.

Thiếu luôn: không có nút **về tháng này**. Bấm ‹ lùi năm tháng rồi muốn quay
lại phải bấm › năm lần.

**Sau:**

```
Tháng 11/2026   ‹  ›   [Hôm nay]     ◉ Lưới   ○ Danh sách
```

Một công tắc chọn kiểu xem, nhớ lựa chọn trong địa chỉ (`?xem=luoi`), mặc định
lưới trên máy tính và danh sách trên điện thoại — đúng như hiện nay, chỉ khác
là **không hiện cả hai**.

**Dễ hơn vì:** trang ngắn đi một nửa, và người xem chọn đúng kiểu hợp với việc
mình đang làm — Sale thích lưới (nhìn tháng dày hay thưa), Photo thích danh
sách (đọc nhanh buổi nào trước buổi nào).

---

## P1-4 · Lịch không có giờ chụp — Photo không biết mấy giờ đi  ✅ LÀM XONG 13/11

> **Đo trước khi làm:** AppSheet **chưa bao giờ lưu giờ chụp**. Trong 1.454 buổi
> chỉ **26 buổi (1,8%)** có thứ trông như giờ, và cả 26 đều nằm lẫn trong ghi
> chú. Nên cột `gio` bắt đầu từ con số không — nó chỉ có ích nếu sale chịu điền
> từ nay trở đi. Dòng cũ để trống thì hiện y như trước.

**Hiện trạng.** Bảng `LichChup` chỉ có `ngay` (YYYY-MM-DD), **không có trường
giờ**. Trang lịch hiện được ngày, loại, tên khách, trạng thái — không giờ.

Photo mở lịch thấy "15/11 · Ngày cưới · Nhà Minh Tâm" rồi phải đi hỏi Sale mấy
giờ có mặt.

**Đây là việc chạm database**, nên em để ở P1 và **hỏi anh trước**: thêm một
cột `gio String?` (dạng "07:30") vào `LichChup`, hiện trong lưới và bảng, cho
sửa trong khối Lịch của trang hợp đồng. Không đụng gì đã có — dòng cũ để trống
thì hiện như bây giờ.

Nếu anh thấy chưa cần thì bỏ qua; nhưng Photo và Makeup là hai nhóm hỏi giờ
nhiều nhất.

---

## P1-5 · Quy trình 18 bước không nói bước sau là gì, ai lo  ✅

**Hiện trạng.** Hợp đồng hiện trạng thái dạng chip: `4. Đã gửi ảnh gốc, chờ
Khách chọn`. Hết. Muốn biết bước sau là gì phải mở form sửa rồi đọc cả 18 dòng
trong ô chọn.

Nhưng **hôm nay mình vừa chép về bảng `BuocHopDong`**, trong đó có sẵn:
bước trước · bước sau · **trách nhiệm** (Sale 7 bước, Nhiếp ảnh 4 bước).
Dữ liệu đã nằm trong database mà chưa hiện ra đâu cả.

### Trước

```
Nhà Minh Tâm                      [4. Đã gửi ảnh gốc, chờ Khách chọn]
```

### Sau

```
Nhà Minh Tâm                      [4. Đã gửi ảnh gốc, chờ Khách chọn]
                                   tiếp theo → 5. Đang Retouch · Nhiếp ảnh
```

Trên trang chi tiết hợp đồng, thêm một dòng dưới chip. Nút "Sửa hợp đồng" giữ
nguyên — không tự chuyển bước, vì đổi bước là đổi tiến độ cả một nhà khách.

**Dễ hơn vì:** Hậu kỳ mở hợp đồng ra là biết **việc kế tiếp là của mình**, không
phải nhớ thuộc lòng 18 bước. Không thêm dữ liệu — chỉ hiện thứ vừa chép về.

### ⚠ Làm xong mới lộ: cột "Trạng thái sau" bên AppSheet hỏng quá nửa

Dựng xong, em render thử cả 18 bước với hợp đồng thật rồi chụp màn hình. Kết
quả: bước 7 không có bước sau, bước 9 "Hoàn thành" **trỏ về chính nó**. Đo lại
cả bảng:

| Tình trạng cột "Trạng thái sau" | Số bước |
|---|---|
| thiếu hẳn (ô trống) | **7** — bước 11, 13, 14, 15, 16, 17, 18 |
| trỏ về chính nó | 1 — bước 9 |
| trỏ tới chuỗi không có trong bảng (gõ sai) | 2 — bước 7, 10 |
| nhảy sai nhánh (12 trỏ về 9) | 1 |
| **dùng được** | **7/18** |

Bảy dòng dùng được đều trỏ sang bước mang **số liền sau** — tức quy tắc thật
của bảng là "số kế tiếp", còn cột kia chỉ là bản chép tay hỏng. Nên web suy
theo số thứ tự và dừng ở hai bước kết nhánh (9 chụp studio, 18 tiệc): đúng cho
cả 18 bước, thay vì đúng 7 và **nói sai 4**.

Riêng **trách nhiệm** vẫn lấy thẳng từ bảng — 11/18 bước có, 7 bước trống,
không dòng nào mâu thuẫn.

---

## P1-6 · Ô nhập thiếu gợi ý tự điền và loại bàn phím  ✅ (và em đã nói sai)

> **Đo lại thì nhận định ban đầu của em SAI.** Quét cả 106 thẻ `<input>` trong
> `/quan-ly`: **không ô nào thiếu `inputMode`** — một kết quả duy nhất bị bắt
> là khớp nhầm vì chữ "diễn**gia**i". Phần bàn phím số đã đúng sẵn từ trước,
> em đã suy từ con số "5 ô có autocomplete" mà kết luận quá tay.
>
> Việc thật sự còn lại là **tắt gợi ý tự điền** ở ô nhập dữ liệu của khách:
> Chrome gợi ý tên và số điện thoại của chính nhân viên vào ô tên khách, bấm
> nhầm một cái là sinh ra một nhà khách sai — mà số điện thoại ở đây *chính
> là* mã khách. Đã khai `autoComplete="off"` cho form Khách hàng, form Khách
> tiềm năng và hai ô tìm.

**Hiện trạng.** Đếm trong `/quan-ly`: **21 ô có placeholder, 5 ô có
`autocomplete`**. Ô số điện thoại phần lớn chưa khai `inputMode="tel"`, ô tiền
chưa khai `inputMode="numeric"` đều.

**Hậu quả:** trên điện thoại, gõ số điện thoại khách mà bàn phím hiện chữ cái
→ gõ chậm và dễ sai. Mà số điện thoại **chính là mã khách** — gõ sai một chữ
số là sinh ra một nhà khách thừa.

**Sau:** rà toàn bộ ô nhập, khai đúng ba thứ: `type` / `inputMode` /
`autocomplete`. Đây là sửa thuộc tính, không đụng logic.

**Dễ hơn vì:** bàn phím số hiện ra đúng lúc cần, và trình duyệt gợi ý lại thứ
người ta vừa gõ hôm qua. Bộ quy tắc Vercel xếp mục này mức cao.

---

# P2 — Nhất quán và đánh bóng

## P2-1 · Chip trạng thái chỉ dùng ở Hợp đồng

`ChipTrangThai` tô màu theo nghĩa (xanh = xong, vàng = chờ khách) và chỉ dùng
ở trang Hợp đồng. Các bảng khác — Đầu việc, Đơn từ, Sổ quỹ, Sự cố, Khách tiềm
năng — hiện trạng thái bằng **chữ trần tô màu bằng tay**, mỗi trang một kiểu.

**Sau:** một component `Chip` dùng chung, nhận `kieu: "xong" | "cho" | "treo" |
"thuong"`. Mỗi trang vẫn tự quyết trạng thái nào thuộc kiểu nào — không đụng
business logic.

**Dễ hơn vì:** vàng luôn có nghĩa "đang chờ ai đó", xanh luôn là "xong". Học
một lần, đọc được mọi bảng.

---

## P2-2 · Nút "Sửa" có ba cỡ khác nhau

`btn` ở trang hợp đồng, `btn px-3 py-1 text-xs` ở bảng khách tiềm năng, `btn
px-3 py-1 text-xs` ở sổ sự cố, `btn` ở nội quy. Cùng một việc, ba kích thước.

**Sau:** đặt hai cỡ chuẩn trong `@layer components` — `btn` (trong trang) và
`btn-nho` (trong ô bảng) — rồi thay cho mọi chỗ gõ tay.

---

## P2-3 · Trạng thái rỗng chỉ nói "không có gì", không nói làm gì tiếp

Hiện: *"Không có hợp đồng nào khớp bộ lọc."* · *"Chưa có khách tiềm năng nào."*

**Sau:** thêm lối ra ngay trong câu đó — *"Chưa có khách tiềm năng nào. Bấm
**Thêm khách tiềm năng** để ghi người đầu tiên."* Với bộ lọc thì thêm nút **Bỏ
lọc**.

**Dễ hơn vì:** người mới không bị kẹt ở màn hình trống.

---

## P2-4 · Menu 18 mục, nhóm theo phòng ban chứ không theo việc

Admin thấy đủ 18 mục trong 6 nhóm. Photo thấy ít hơn, nhưng việc của họ — Lịch
chụp, Đầu việc — nằm trong nhóm tên **"Hợp đồng – Công việc"**, cạnh mục Hợp
đồng mà họ không mở được.

**Sau (nhẹ nhất, không đổi quyền):** đưa hai mục dùng hàng ngày — **Lịch chụp**
và **Đầu việc** — lên trên cùng cạnh Chấm công, thành nhóm không tên như Tổng
quan và Chấm công đang có. Phần còn lại giữ nguyên thứ tự.

**Dễ hơn vì:** ba thứ một người bình thường dùng mỗi ngày nằm trong tầm mắt,
không phải cuộn qua tên nhóm kế toán.

---

# Thứ tự em đề nghị làm

| Buổi | Việc | Lý do xếp trước |
|---|---|---|
| 1 | P0-1, P0-2 | Màn hình đang nói sai — sửa chữ, rủi ro gần bằng 0 |
| 2 | P0-3 | Trang Tổng quan mới — việc đáng giá nhất, cần đo truy vấn |
| 3 | P1-1, P1-2, P1-6 | Ba thứ nhỏ về thao tác, làm cùng lúc được |
| 4 | P1-3, P1-5 | Lịch và quy trình bước |
| 5 | P2 | Nhất quán |

P1-4 (giờ chụp) **chờ anh quyết riêng** vì nó thêm một cột vào database.

---

# Em cố ý KHÔNG đề xuất

- **Đổi màu, đổi phông, đổi phong cách.** Giao diện hiện tại đã có hệ thống rõ
  (nguyên tắc 11, 12), đọc được, và tiệm đã quen. Đổi là bắt cả tiệm học lại
  mà không được gì.
- **Thêm biểu đồ.** Chưa có ai hỏi, và biểu đồ không thay được con số cần duyệt.
- **Gộp hay bỏ trang nào.** Anh bảo giữ nguyên chức năng.
- **Đổi cách phân quyền.** Mọi đề xuất trên đều chạy trong đúng quyền hiện có.
