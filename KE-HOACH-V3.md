# Audit theo Master Plan V3 — 14/11/2026

Đây là lượt **chỉ audit, thiết kế và lập kế hoạch** — đúng yêu cầu trong
`writing-block.md`. Không sửa dòng code nào, không chạy migration, không deploy.

Mọi con số dưới đây đo trên database thật hôm nay, không ước lượng.

---

# 1. Kết luận trước, lý lẽ sau

## 1.1. Phát hiện quan trọng nhất của cả bản audit

**Chức năng liên kết album ↔ hợp đồng đã có từ 16/09/2026. Gần như không ai dùng.**

| Đo 14/11/2026 | Con số |
|---|---|
| Album trong hệ thống | **169** |
| Album đã gắn hợp đồng | **3** (2%) |
| Hợp đồng có album | **3** / 2.402 (0%) |
| Album tạo TỪ 16/09 — ngày có tính năng gắn | **123** |
| …trong đó được gắn | **1** |
| Số lần bấm "Gắn hợp đồng" trong nhật ký, gần hai tháng | **2** |

Cột `Gallery.hopDongId` đã nằm sẵn trong database, đã có màn hình gắn, đã có
gợi ý tự động, đã có khối "Album ảnh" trên trang hợp đồng. Tất cả chạy được.

**Chỉ là không ai bấm.**

Điều này đổi hẳn thứ tự ưu tiên của Master Plan. Phần 4, 5 và 8 của kế hoạch —
tab Album & Tiến độ, Kanban sản xuất, dashboard album, tự động tạo việc
Retouch — **đều đứng trên nền "album đã gắn hợp đồng"**. Xây mười tầng trên một
cái nền 2% thì mười tầng đó đều rỗng.

Đây cũng đúng cái đã làm lần chuyển 21/09 thất bại: *không phải thiếu tính
năng, mà là không ai đổi thói quen.*

## 1.2. Vậy việc đáng làm nhất không phải xây mới

Ba việc, theo đúng thứ tự:

1. **Gắn được 166 album cũ** — một lần, bán tự động.
2. **Album mới tự gắn khi tạo**, thay vì chờ ai đó nhớ bấm.
3. **Chỉ khi đó** mới xây tab tiến độ, Kanban, tự động hoá.

Chi tiết ở phần 4.

---

# 2. Bảng audit các module

Phần lớn module đã soi kỹ trong hai ngày 13–14/11 và **đã sửa**, có bằng chứng
trong `KE-HOACH-UX.md` và lịch sử git. Bảng này gộp lại để anh nhìn một chỗ.

| Module | Hiện trạng | Vấn đề | Bằng chứng | Ưu tiên |
|---|---|---|---|---|
| Dashboard | ✅ vừa dựng lại 13/11 | đã sửa: trang cũ liệt kê việc "sắp có" đã xong hai tháng; không nói ai làm gì | đo: 14/16 người mở lên không thấy con số nào | xong |
| Khách tiềm năng | ✅ mới làm 13/11 | bảng CRM bên AppSheet **bỏ hoang 7 tháng** — hẹn gọi lại mới nhất 10/04/2026 | 16/17 người "Đã chốt" đã thành khách thật → công cụ có tác dụng, chỉ không ai duy trì | theo dõi |
| Khách hàng | ✅ vá 13/11 | đã sửa: trước đó không thêm/sửa khách độc lập được | 24/2.125 nhà mang mã khác số điện thoại | xong |
| Hợp đồng | ✅ thử kỹ 14/11 | đã sửa 2 lỗi: dòng "gõ tay" không lưu được; tiền thu dư vô hình | 45 phép kiểm tiền, 2 hợp đồng đang thu dư 60.000đ | xong |
| **Album ↔ hợp đồng** | ⚠️ **có mà không ai dùng** | **2% album được gắn** | 123 album từ 16/09, gắn 1 | **P0** |
| Lịch chụp | ✅ sửa 13/11 | thiếu **ekip, địa điểm, phòng makeup, trang phục** — kế hoạch mục 7.1 | cột `gio` vừa thêm, 1.454 buổi đều trống | P2 |
| Đầu việc | ✅ sửa 14/11 | chưa có Kanban; 169 việc quá hạn tồn kho từ 23/03/2025 | giao được cho học viên từ hôm nay | P2 |
| Phiếu thu · Sổ quỹ | ✅ thử kỹ | 1 phiếu thu 1.500.000đ từ 2023 **không thuộc hợp đồng nào** | chép từ AppSheet | tra lại |
| Chấm công · Lương · Đơn từ | ✅ làm 13/11 | đã sửa lỗi 500 với người thiếu mã NV | lương đo ngược 341/341 dòng | xong |
| Nhân viên | ✅ sửa 14/11 | đã thêm nút Cho nghỉ, ô mã NV, chức vụ Học viên | | xong |
| Dịch vụ & trang phục | ⚠️ chưa soi | kế hoạch mục 7.3 muốn quản lý **lịch đặt váy, giao nhận, bảo trì** — hiện chỉ là bảng giá | | P3 |
| Sổ sự cố | ✅ mới làm | 22 dòng chép về đều không có thời điểm | | xong |
| Nhật ký thao tác | ✅ | 830 dòng, ghi đủ | | xong |
| Quản lý album | ✅ chạy tốt | nút "Gắn hợp đồng" nằm sâu trong từng album | | P0 |
| **Báo cáo** | ❌ **chưa có** | kế hoạch mục 8.3 muốn 12 loại báo cáo | `KyBaoCao` 27 dòng chưa chép | P4 |
| **Công nợ** | ❌ chưa có trang riêng | hiện chỉ là chip "Còn nợ" trên danh sách hợp đồng | 127 hợp đồng · 743.185.910đ | P3 |
| **Kanban sản xuất** | ❌ chưa có | kế hoạch mục 5.2 | | P2 |

---

# 3. Ba chỗ em phải nói ngược lại kế hoạch

Em làm theo nguyên tắc số 8 và 10 của chính kế hoạch: *kiểm tra hiện trạng
trước khi đề xuất* và *không đổi quy trình khi chưa được duyệt*.

## 3.1. Đừng thay design system — mục 3.2

Kế hoạch đề xuất: font **Be Vietnam Pro / Inter**, icon **Lucide**, xem xét
**shadcn/ui hoặc Radix**.

Ba điều đáng cân nhắc trước khi làm:

- Web **đã có** hệ thống riêng: `@layer components` với `.btn`, `.btn-gon`,
  `.input`, `.notice`, token màu, và nguyên tắc 11–12 đã chốt. Thêm shadcn là
  **hai hệ thống làm cùng một việc** — đúng thứ nguyên tắc số 5 của kế hoạch
  cấm ("không tạo module trùng lặp").
- Đổi font là đổi **toàn bộ** cảm giác của cả web, kể cả phần khách xem album.
  Font hiện tại là một phần nhận diện của studio.
- Hôm 13/11 em đã soát UX toàn bộ, 13 việc, và **cố ý không đề xuất đổi màu hay
  font** — vì tiệm đã quen, đổi là bắt họ học lại mà không được gì. Anh duyệt
  theo hướng đó.

**Đề xuất:** giữ hệ thống hiện tại, chuẩn hoá nốt những gì còn thiếu (Drawer,
Toast, Skeleton, Pagination — bốn thứ web chưa có). Nếu anh vẫn muốn đổi sang
diện mạo Attio/Linear thì đó là một dự án riêng, nên làm sau khi phần nghiệp vụ
ổn, không trộn vào đợt này.

## 3.2. Menu đề xuất ở mục 3.3 làm hỏng việc vừa sửa

Kế hoạch gom **Lịch chụp** vào nhóm "Vận hành", **Công việc của tôi** vào
"Tổng quan".

Hôm 13/11 em vừa đưa **Lịch chụp và Đầu việc lên trên cùng**, không nhóm —
vì Photo và Hậu kỳ dùng hai mục đó mỗi ngày, mà trước đó chúng nằm lẫn trong
nhóm có mục Hợp đồng mà họ không mở được. Đẩy lại vào nhóm "Vận hành" là quay
về đúng chỗ vừa sửa.

**Đề xuất:** giữ ba mục hằng ngày ở trên cùng; nhóm còn lại có thể đổi tên theo
kế hoạch (Kinh doanh / Tài chính / Nhân sự / Hệ thống) — việc đó vô hại.

## 3.3. Quy mô: kế hoạch này là nhiều tháng

14 phần, 6 mức ưu tiên, 19 module, cộng Kanban, báo cáo, trang phục, tự động
hoá, AI. Với một tiệm **16 người vừa mới bắt đầu dùng web tuần này**, làm hết
một lượt có hai rủi ro:

- Tiệm chưa kịp quen phần đang có thì đã đổi tiếp.
- Lặp lại đúng lần 21/09: xây xong, không ai dùng.

**Đề xuất:** làm theo đợt nhỏ, mỗi đợt **có người dùng thật trước khi đi tiếp** —
đúng cách anh đang làm với chấm công và đơn từ.

---

# 4. Thiết kế: liên kết album ↔ hợp đồng

## 4.1. Quan hệ dữ liệu — KHÔNG cần đổi gì

Kế hoạch mục 4.2 đề xuất `Customer ↔ Contract ↔ ContractAlbum ↔ Gallery`.

**Không cần bảng `ContractAlbum`.** Hiện đã là:

```
KhachHang 1 ─── n HopDong 1 ─── n Gallery
                                 (Gallery.hopDongId, onDelete: SetNull)
```

Quan hệ một-nhiều này **đã cho phép một hợp đồng có nhiều album** — đúng yêu
cầu mục 4.1. Kiểm trên dữ liệu: chưa hợp đồng nào có hơn một album, nhưng đó
là vì mới gắn 3 cái, không phải vì cấu trúc chặn.

Và nó đã thoả mọi yêu cầu ở mục 4.2:

| Yêu cầu của kế hoạch | Hiện trạng |
|---|---|
| Liên kết dựa trên ID ổn định | ✅ `hopDongId` là cuid |
| Không dùng tên khách làm khoá | ✅ |
| Liên kết album đã tồn tại | ✅ màn hình gắn có sẵn |
| Tìm album theo tên hoặc mã | ✅ `timHopDong` |
| Một khách nhiều hợp đồng | ✅ |
| Không tự ghép khi trùng tên | ✅ cố ý — chỉ gợi ý |
| Gỡ liên kết không xoá album | ✅ `onDelete: SetNull` |
| Đổi tên album không mất liên kết | ✅ khoá là id, không phải tên |

**Bảng trung gian chỉ cần khi một album thuộc nhiều hợp đồng.** Em chưa thấy
tình huống đó ở Hamita — nếu anh biết có thì nói, lúc đó mới tính.

## 4.2. Việc thật phải làm: làm cho album được gắn

### P0-A · Gắn hàng loạt 166 album cũ — một lần

Em thử gợi ý tự động trên 40 album mới nhất chưa gắn:

```
  có ít nhất một gợi ý     39/40
  không gợi ý nào           1/40
```

Và gợi ý đầu tiên nhìn rất khớp:

```
  "Hữu Đức & Ngọc Hằng"  → Hữu đức - ngọc hằng 31/12
  "Trúc Hà & Hữu Lợi"    → Trúc Hà - Hữu Lợi 23-24/12
  "Hữu Luân & Mỹ Tuyền"  → Hữu Luân - Mỹ Tuyền 11-12/
```

Nhưng hàm hiện **luôn trả 6 gợi ý**, không nói được "chắc chắn là cái này" —
nên **0/40 ghép tự động được**.

**Đề xuất:** thêm *điểm tin cậy*. Khi gợi ý đầu hơn hẳn gợi ý thứ hai (ví dụ
khớp ≥ 2 từ và hơn ít nhất 2 điểm), đánh dấu là **chắc**. Rồi dựng một màn hình
**"Ghép album với hợp đồng"**: web xếp sẵn từng cặp, người chỉ việc **duyệt
hoặc bỏ qua** — không phải gõ gì. 166 album có thể xong trong một buổi.

**Tuyệt đối không tự ghép ngầm.** Gắn nhầm là tiền và tiến độ của nhà này hiện
sang nhà kia — đúng cảnh báo đã ghi sẵn trong `noiAlbum.ts`.

### P0-B · Album mới tự đề nghị gắn ngay lúc tạo

Hiện tạo album xong là xong; muốn gắn phải mở lại album rồi bấm.

**Đề xuất:** ngay sau khi tạo album, nếu có gợi ý chắc thì hỏi một câu —
*"Album này của hợp đồng [tên khách] phải không?"* — với hai nút Đúng / Để sau.
Một cú bấm, đúng lúc người ta còn nhớ album vừa tạo cho ai.

### P0-C · Nhắc ở chỗ người ta nhìn

Thêm vào trang Tổng quan một dòng: *"X album chưa gắn hợp đồng"* → mở thẳng
màn hình ghép. Cùng kiểu với dòng "206 đầu việc chưa giao cho ai" vừa làm.

## 4.3. Tab "Album & Tiến độ" — mục 4.3 của kế hoạch

Khối "Album ảnh" trên trang hợp đồng **đã có**, hiện: tên album, số ảnh thả
tim, số thư mục khách báo xong, thời điểm xong, link mở album, và lời nhắc
chuyển bước khi khách đã chọn xong mà hợp đồng còn đứng ở bước 4 hoặc 13.

Kế hoạch muốn thêm: ảnh bìa, số ảnh theo gói, người phụ trách, deadline, công
đoạn hiện tại.

**Ba trong năm thứ đó chưa có chỗ nào trong database:** *người phụ trách
album*, *deadline album*, *công đoạn sản xuất*. Thêm chúng là thêm cột mới —
nên để sang P2 cùng với workflow sản xuất, đừng làm lẻ.

Hai thứ còn lại (ảnh bìa, số ảnh trong gói) đã có sẵn trong `Gallery`, thêm
vào hiển thị là việc nhẹ.

## 4.4. Một điều về "khách đã chọn xong"

Kế hoạch mục 4.5 nhấn mạnh phải phân biệt *chọn đủ* / *xác nhận hoàn tất* /
*sửa sau xác nhận*. Đúng, và web đã phân biệt — nhưng theo cách khác kế hoạch
hình dung:

Khách Hamita **báo xong theo TỪNG THƯ MỤC**, không phải cả album (nguyên tắc
20). Đo được: **214 lượt báo xong theo thư mục**, còn cột "xong cả album"
(`selectionsDoneAt`) thì **0 album nào có**.

Nên mọi thiết kế về sau phải bám mức **thư mục**, không phải mức album. Nếu làm
theo đúng chữ của kế hoạch — một cờ "đã xác nhận hoàn tất" cho cả album — thì
nó sẽ không bao giờ bật.

---

# 5. Kế hoạch theo đợt

Em xếp lại theo thứ tự **có ích sớm nhất**, không theo thứ tự trong Master Plan.

| Đợt | Việc | Vì sao trước | Ước lượng |
|---|---|---|---|
| **1** | P0-A, B, C — làm cho album được gắn | nền của mọi thứ còn lại; hiện 2% | 2–3 buổi |
| **2** | Khối Album trên hợp đồng: thêm ảnh bìa, số ảnh/gói, tiến độ từng thư mục | dữ liệu đã có, chỉ hiện ra | 1 buổi |
| **3** | Chuẩn hoá bốn component còn thiếu: Drawer, Toast, Skeleton, Pagination | dùng lại cho mọi màn hình sau | 1–2 buổi |
| **4** | Workflow sản xuất + cột người phụ trách / deadline album | cần db:push; làm một lần cho cả Kanban | 3–4 buổi |
| **5** | Kanban tiến độ | đứng trên đợt 4 | 2–3 buổi |
| **6** | Trang Công nợ riêng | 127 hợp đồng, 743 triệu — đang chỉ là một chip | 1–2 buổi |
| **7** | Lịch chụp: ekip, địa điểm, trang phục, chống trùng lịch | nhiều cột mới, đụng nghiệp vụ | 4–5 buổi |
| **8** | Báo cáo | cần `KyBaoCao` và quy tắc tính; làm sau cùng | 3–4 buổi |

**Không nằm trong kế hoạch của em:** đổi design system, đổi font, thêm
shadcn/ui, AI hỗ trợ. Lý do ở phần 3.

---

# 6. Kiểm thử và rollback

Nền đã có sẵn, không phải dựng lại:

| Có sẵn | Nội dung |
|---|---|
| `scripts/thu-toan-bo.mts` | 123 phép kiểm nghiệp vụ, 16 phần |
| `scripts/thu-tien.mts` | 45 phép kiểm riêng phần tiền |
| `scripts/thu-tai-khoan.mts` | tạo/xoá tài khoản thử theo vai trò |
| `scripts/thu-don-dep.mts` | dọn sạch dữ liệu thử, đo lại 12 bảng |
| `npm run db:backup` / `db:restore` | sao lưu và phục hồi |

**Mỗi đợt sẽ thêm phép kiểm vào hai kịch bản trên trước khi đẩy lên.**

Rollback: mọi thay đổi đi qua git, một commit một việc. Đợt nào chạm database
thì chỉ **thêm cột cho phép trống**, không đổi và không xoá cột có sẵn — cùng
cách đã làm với `gio` hôm qua, hoàn nguyên được bằng cách bỏ dùng cột đó.

---

# 7. Những gì cần anh quyết

1. **Đồng ý đảo thứ tự ưu tiên không?** Master Plan xếp UX/UI và tab Album
   ngang nhau ở P1. Em đề nghị **gắn album trước mọi thứ**, vì 98% album chưa
   gắn thì tab tiến độ mở ra cũng trống.

2. **Giữ design system hiện tại chứ?** Hay anh thật sự muốn đổi sang diện mạo
   Attio/Linear — nếu có thì em tách thành dự án riêng, không trộn vào đợt này.

3. **Một album có bao giờ thuộc hai hợp đồng không?** Nếu không thì cấu trúc
   hiện tại đủ, không cần bảng trung gian.

4. **Workflow sản xuất bao nhiêu bước?** Kế hoạch nêu 15 bước, trong khi hợp
   đồng đã có 18 bước đang chạy. Hai thang này chồng nhau. Em cần biết: 15 bước
   đó **thay** 18 bước cũ, hay là một thang **riêng cho từng album** chạy song
   song?

5. **Phiếu thu 1.500.000đ ngày 01/10/2023 không thuộc hợp đồng nào** — chép từ
   AppSheet. Anh có muốn tra lại không?

6. **Bảng CRM khách tiềm năng bỏ hoang 7 tháng** — có định dùng lại thật không?
   Nếu không thì các đề xuất ở mục 6.1–6.2 (lead pipeline, nhắc gọi lại, báo
   cáo chuyển đổi) nên hoãn.
