# Trạng thái phía ALBUM ẢNH — và chỗ nối sang 18 bước hợp đồng

Anh yêu cầu 19/11/2026: *"thống kê lại tất cả các trạng thái trên album trước
khi có CRM hợp đồng để giờ có thể nối vô cho chặt chẽ"*.

Mọi con số dưới đây **đo thật trên database production ngày 19/11/2026**, không
phải ước lượng. Nền: **182 album · 2.403 hợp đồng · 5 album đã gắn hợp đồng**.

Phần ảnh ra đời trước phần CRM gần một tháng, nên nó có một bộ dấu hiệu tiến độ
riêng, dựng theo nhu cầu của phòng Media chứ không theo 18 bước của AppSheet.
Tài liệu này kể ra đủ bộ đó, và nói rõ cái nào **đã nối**, cái nào **nối được mà
chưa nối**, cái nào **không nên nối**.

---

## 1. Vì sao hai bên lệch nhau

| | Phía ALBUM | Phía HỢP ĐỒNG |
|---|---|---|
| Đơn vị | **thư mục con** của một album | **cả hợp đồng** |
| Ai đổi | khách tự bấm, hoặc Media bấm | nhân viên gõ tay |
| Số trạng thái | 2 giá trị (`xong`, `can-sua`) × từng thư mục | 18 bước, một con số |
| Có từ | 24/08/2026 | 21/09/2026 |

Lệch sâu nhất là **đơn vị**. Một album có nhiều thư mục con, mỗi thư mục một
trạng thái riêng (nguyên tắc 20, 32). Hợp đồng chỉ có một con số. Nên nối không
bao giờ là một-đổi-một: phải quyết *thư mục loại nào* mới được đẩy bước hợp đồng.

Đo được chuyện đó là bình thường chứ không phải ngoại lệ: **54 album** đang có
cả thư mục file gốc đã xong **lẫn** thư mục hoàn thiện đã xong.

---

## 2. Dấu hiệu tiến độ THẬT — bảng `MucXong`

Đây là bảng quan trọng nhất, và là dấu duy nhất do **khách** tạo ra.

```
229 thư mục khách đã báo, trên 116 album:

  96  hoàn thiện            · xong      ← khách DUYỆT ảnh đã chỉnh
  86  file gốc khác         · xong      ← khách CHỌN xong file gốc
  41  gốc hình cổng/album   · xong      ← chọn xong, có hỏi ngày lấy hình
   4  không rõ              · xong      ← tên lạ, xem mục 6
   2  hoàn thiện            · can-sua   ← khách muốn chỉnh lại
```

Ba nhóm đầu **mang ba ý nghĩa nghiệp vụ khác nhau**, dù cùng là `loai = "xong"`.
Phân loại bằng tên thư mục, hàm có sẵn trong `src/lib/constants.ts`:

| Hàm | Nhận ra | Ý nghĩa |
|---|---|---|
| `laMucHoanThien(ten)` | `hoan thien`, `pts` | ảnh ĐÃ CHỈNH — khách duyệt, không phải chọn |
| `laMucHoiHanLay(ten)` | có `gốc` + (`hình cổng`/`HC`/`album`/`AB`) | file gốc buổi chụp trước cưới |
| còn lại có `gốc` | `file gốc`, `file gốc nhà gái`… | file gốc thường |

**`hanLay` (ngày khách cần lấy hình)**: 9 thư mục, và cả 9 đều nằm đúng nhóm
`gốc hình cổng/album` — nguyên tắc 66 chạy đúng, không rò sang nhóm khác.

---

## 3. Các dấu hiệu khác, và vì sao phần lớn KHÔNG nên nối

### 3.1 Cột trong bảng `Gallery`

| Cột | Đo 19/11 | Nối được? |
|---|---|---|
| `selectionsDoneAt` | **0/182** | **đã chết** — dấu cũ tính cả album, `MucXong` thay hẳn. Giữ cột vì xoá không lùi được |
| `syncedAt` | 182/182 | không — chỉ là lần cuối đọc Drive, không nói tiến độ |
| `expiresAt` | 182/182, 0 quá hạn | không — hạn giữ ảnh là lời nhắc cho khách, không phải bước |
| `luotXem = 0` | 0/182 | không — nhưng hữu ích: "link gửi rồi mà khách chưa mở" |
| `luotTai > 0` | 174/182 (96%) | không — tải ảnh về không có nghĩa đã chọn xong |
| `allowDownload` tắt | 4/182 | không — quyền, không phải tiến độ (nguyên tắc 60) |
| `soAnhTrongGoi` có | 170/182 (93%) | không — dữ liệu gói, phần tiền |
| `photoCount = 0` | 3/182 | không — "chưa đo" lẫn "rỗng", không phân biệt được |
| `featured` bật | 2/182 | không — trang giới thiệu |

### 3.2 Bảng phụ

| Bảng | Đo 19/11 | Nối được? |
|---|---|---|
| `MucXong` | 229 dòng / 116 album | **CÓ — xem mục 4** |
| `MoMuc` | 483 lượt mở / 162 album | không — khách mở xem, chưa quyết gì |
| `PushSub` | 169 máy / 123 album; **59 album không ai bật** | không — nhưng quyết chỗ hiện nút "Đã gửi file gốc" |
| `Moc "bao-tin:"` | **110 album** đã từng bấm gửi | gián tiếp — chính nút đó đã nối (mục 4) |
| `Selection` | 12.041 tấm / 135 album | không trực tiếp — nhưng "đã chọn mà chưa bấm xong" là việc cần nhắc |
| `SelectionList` | "Ảnh in" 182, "Ảnh chọn" 46 | không — danh sách, không phải trạng thái |
| `BiaMuc` | 178 thư mục | không — thẩm mỹ |
| `GoiMuc` | 12 thư mục | không — phần tiền, từng thư mục một gói |

---

## 4. Chỗ ĐÃ NỐI (19/11/2026)

| Việc phía album | Bước hợp đồng | Mã nguồn |
|---|---|---|
| Media bấm **"Gửi thông báo"** hoặc **"Đã gửi file gốc"** | 2 hoặc 3 → **4**<br>10, 11 hoặc 12 → **13** | `buocSauKhiGuiAnhGoc` |
| Khách bấm **"đã chọn xong"** | 4 → **5**<br>13 → **14** | `buocSauKhiKhachChonXong` |

Lõi đổi bước ở `src/lib/doiBuocAlbum.ts`, dùng chung cho cả hai đường.

**Mối nối thứ hai hiện chưa phân loại thư mục** — xem mục 5.1.

---

## 5. Chỗ CÒN TRỐNG

### 5.1 Khách duyệt ảnh hoàn thiện (96 thư mục, nhiều nhất bảng)

`MucXong` có 96 dòng `hoàn thiện · xong`. Đó **không phải** "chọn xong file
gốc" — đó là khách **duyệt xong ảnh đã chỉnh**, tức bước 6 "Chờ Khách duyệt"
đáng ra sang 7 "Gửi in". Hiện không nối gì.

Và nó còn là một **lỗ trong mối nối vừa làm**: route `gallery-done` đổi bước khi
`loai === "xong"` mà không xét tên thư mục. Hợp đồng đang ở bước 4 mà khách bấm
"Đã ok" ở thư mục hoàn thiện thì web đẩy sang 5 "Đang Retouch" — sai, vì retouch
đã xong.

Xác suất gặp không nhỏ: 54 album có cả hai loại thư mục cùng lúc.

### 5.2 Khách bấm "Cần chỉnh lại" (2 thư mục)

Nguyên tắc 65: thư mục hoàn thiện có hai lối ra. Lối "Cần chỉnh lại" hiện không
đẩy bước nào — đáng ra bước 6 nên quay về 5 "Đang Retouch".

### 5.3 Bước không có dấu hiệu nào phía album

| Bước | Vì sao không nối được |
|---|---|
| 1 "Chưa có ngày chụp" | thuộc lịch chụp, không thuộc album |
| 7 "Gửi in", 8 "Đã nhận hình in" | việc ở nhà in, web không biết |
| 9 "Hoàn thành" | quyết định của studio |
| 10 "Chờ ngày tiệc", 11 "Đã giao váy" | không liên quan ảnh |
| 12 "Đã xong tiệc" | chụp tiệc, không phải album |
| 16, 17, 18 | như 7, 8, 9 bên nhánh tiệc |

---

## 6. Hai chỗ dữ liệu bẩn cần biết

**4 thư mục tên lạ** mà hàm phân loại không nhận ra nhóm nào:

```
file gốcc      ← gõ thừa chữ c
ptb            ← chắc là "pts" gõ sai
app            ← không rõ
SN - Thỏ Tây   ← tên khách, không phải tên loại thư mục
```

Chúng nằm trên Drive nên sửa tên là hết. Hiện chúng rơi vào nhóm "không rõ" và
mọi phép phân loại đều bỏ qua — không gây hại, chỉ là không đếm được.

---

## 7. Phân bố 18 bước — chỗ nào đang tắc

```
bước  1:   10      bước 10:   47
bước  2:   20      bước 11:    3
bước  3:    1      bước 12: 1057   ← tắc lớn nhất
bước  4:    8      bước 13:   16
bước  5:    5      bước 14:    6
bước  6:    4      bước 15:    5
bước  7:   11      bước 16:    5
bước  8:   28      bước 17:   23
bước  9:  240      bước 18:  914
```

**1.057 hợp đồng đứng ở bước 12 "Đã xong tiệc"** — tiệc chụp xong mà chưa gửi
ảnh gốc tiệc. Đó chính là chỗ mối nối "gửi ảnh gốc → 13" sẽ giải phóng, và là lý
do nhánh tiệc đáng nối chứ không chỉ nhánh chụp.

Bước 3 chỉ có **1 hợp đồng** — bằng chứng số cho cái bẫy anh nói: *"đôi lúc chụp
xong quên đổi từ số 2 sang số 3"*. Không ai dùng bước 3, nên mối nối phải nhận
cả bước 2.

---

## 8. Điều kiện để mọi mối nối chạy được

**177/182 album chưa gắn hợp đồng (97%).** Mọi thứ trong tài liệu này chỉ chạy
trên album đã gắn, nên hiện chỉ **5 album**. Ghép album với hợp đồng là việc
quyết định độ hữu dụng của cả phần nối này.
