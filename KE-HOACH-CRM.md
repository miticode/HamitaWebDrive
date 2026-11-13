# Kế hoạch thay hẳn AppSheet bằng CRM trên web

Lập **13/11/2026** theo yêu cầu của anh: *"bây giờ a đang muốn tạo 1 bản crm
hoàn chỉnh lên web để thay thế hẳn appsheet"*.

Mọi con số dưới đây **đo thật hôm nay**, không ước lượng.

---

## 1. Tình hình hôm nay — phải nhìn thẳng

| | |
|---|---|
| Web chép dữ liệu AppSheet lần cuối | **21/09/2026** (53 ngày trước) |
| Hợp đồng mới nhất trong web | 20/09/2026 |
| File AppSheet sửa lần cuối | **hôm nay** |
| Hợp đồng lập trên web từ 21/09 tới nay | **0** |
| Thao tác CRM trên web trong 8 tuần | **0** |
| Thao tác phần giao ảnh cùng kỳ | **592** |

Ngày 21/09 mình chốt "web là nơi lập hợp đồng" và tắt lịch chép đêm để bản
AppSheet không đè lên web. Nhưng rồi **không ai chuyển sang web**, nên suốt hai
tháng web vừa không nhận dữ liệu mới, vừa không tự sinh dữ liệu.

**Bài học phải nhớ cho lần này:** lần trước hỏng không phải vì thiếu tính năng
— hợp đồng, phiếu thu, dịch vụ đều đã lập được trên web từ 21/09. Hỏng vì
**chuyển nửa vời**: tắt đường cũ chưa xong mà đường mới chưa đủ để sống bằng
nó. Kế hoạch này phải chốt **ngày chuyển** và **điều kiện đủ**, chứ không chỉ
liệt kê tính năng.

---

## 2. AppSheet thật sự chứa gì

File `Home` (Google Sheet, 3,3 MB, của `admin@appquanlystudio.net`) có **29
trang tính, khoảng 33.100 dòng**.

### Bốn bảng RỖNG — đừng làm lại

| Bảng | Dòng |
|---|---|
| Nhập xuất váy | 0 |
| Sản phẩm | 0 |
| Ngày chấm công | 0 |
| ĐỐI TÁC | 0 |

Có cấu trúc nhưng chưa ai nhập dòng nào trong suốt 3 năm. **Không đưa vào kế
hoạch.** Sau này tiệm cần thì làm riêng, đừng ôm vào đợt chuyển.

### Web ĐÃ CÓ — 24.177 dòng (73%)

| AppSheet | Dòng | Bảng trên web | Lập/sửa được trên web? |
|---|---|---|---|
| Hợp đồng CT | 7.240 | `ChiTietHopDong` | có |
| Tiến độ công việc | 5.285 | `CongViec` | có |
| Thu | 4.303 | `PhieuThu` | có, kèm duyệt |
| Hợp đồng | 2.401 | `HopDong` | có |
| Khách hàng | 2.124 | `KhachHang` | **chỉ khi lập hợp đồng** |
| Lịch | 1.453 | `LichChup` | có |
| Dịch vụ | 1.020 | `DichVu` | có |
| Dịch vụ CT | 316 | `GiaHangMuc` | có |
| Nhân viên | 27 | `NhanVien` | có |
| Nội quy | 7 | `NoiQuy` | có |
| Thông tin | 1 | `ThongTinStudio` | có |

Phần này **tốt hơn em tưởng**. Việc còn lại ở đây chỉ là chép hai tháng dữ liệu
bị lệch về, cộng một chỗ vá: **thêm/sửa khách hàng độc lập** (hiện khách chỉ
được tạo kèm lúc lập hợp đồng).

### Web CHƯA CÓ — 8.919 dòng

| AppSheet | Dòng | Là gì |
|---|---|---|
| **Chấm công** | **6.114** | giờ vào/ra, ảnh, toạ độ |
| **Chi** | **1.397** | sổ chi — đối trọng của Thu |
| **Yêu cầu** | **456** | đơn nghỉ phép, tạm ứng, có duyệt |
| **Đánh giá** | **444** | thưởng/phạt, đổ vào lương |
| **Lương nhân viên** | **341** | bảng lương từng người từng tháng |
| CRM | 35 | khách tiềm năng, nguồn, ngày hẹn gọi lại |
| Lương | 30 | kỳ lương tổng |
| Kỳ báo cáo | 27 | mốc chốt sổ |
| Log | 22 | sổ sự cố |
| Trạng thái | 18 | bảng 18 bước quy trình |
| Tài liệu | 7 | tài liệu nội bộ |
| Báo cáo / Tính điểm hoà vốn | 2 | bảng tính rời |

**83% phần thiếu nằm trong đúng một mảng: nhân sự.** Chấm công + lương + đơn từ
+ đánh giá = 7.355 dòng. Cộng sổ Chi nữa là xong gần hết.

Nói cách khác: **việc còn lại không phải "làm CRM", mà là "làm phần nhân sự và
sổ quỹ"** — phần bán hàng đã xong rồi.

---

## 3. Ba việc phải quyết TRƯỚC khi viết dòng code nào

### 3a. Ảnh và tệp đính kèm lưu ở đâu — ✅ ĐÃ CHỐT 13/11/2026, ĐÃ LÀM XONG

**Anh chốt: Google Drive của `hamitaweddinghouse@gmail.com` (ổ 5 TB).**

Không để trong Postgres được: 6.114 lượt chấm công, mỗi lượt một ảnh, cỡ
200 KB một tấm là **1,2 GB**, mà gói Neon miễn phí chỉ cho **0,5 GB**.

**Cái bẫy đã tránh được.** Chỉ chia sẻ một thư mục của ổ 5 TB là *không* đủ:
trên Google Drive, **tệp thuộc về người tải lên chứ không thuộc về chủ thư
mục**. Web đang đăng nhập Google bằng `hamita.studio@gmail.com`, nên ghi vào
thư mục chia sẻ thì dung lượng vẫn trừ vào ổ của tài khoản đó — mà đo
13/11/2026 ổ đó **đã dùng 1.880/2.048 GB, chỉ còn 167 GB**. Chỉ "Shared Drive"
mới tính ngược lại, nhưng cái đó phải mua Google Workspace.

**Cách đã làm:** nối **thêm** một tài khoản Google thứ hai, chỉ dùng để ghi tệp
CRM. Kết nối gốc giữ nguyên để đọc ảnh cưới.

| | Kết nối gốc | Kho ảnh CRM (mới) |
|---|---|---|
| Khoá trong `GoogleAccount` | `default` | `kho` |
| Tài khoản | `hamita.studio@gmail.com` | `hamitaweddinghouse@gmail.com` |
| Quyền xin | `drive.readonly` + `drive.file` | **chỉ `drive.file`** |
| Dùng để | đọc ảnh cưới, đọc AppSheet, ghi sao lưu | ảnh chấm công, chứng từ thu chi |

Kết nối kho xin **ít quyền hơn hẳn**: `drive.file` chỉ cho đụng vào những tệp
do chính web tạo ra, nên nó không nhìn thấy phần còn lại của ổ 5 TB.

**Mã đã viết:** `src/lib/googleAuth.ts` (kiểu `KetNoi`),
`src/lib/khoAnh.ts` (ghi/đọc/xoá tệp), `src/app/admin/KhoAnhCrm.tsx` (nút nối
trên trang quản lý album).

**Việc của anh:** vào trang quản lý album, bấm **"Nối kho ảnh"**, chọn
`hamitaweddinghouse@gmail.com`. Nhớ chọn đúng tài khoản — đừng chọn
`hamita.studio`.

> **Lưu ý riêng — ổ 2 TB sắp đầy.** Ảnh CRM *không* phải thứ làm đầy ổ: 25 nhân
> viên × 2 lần/ngày × 200 KB ≈ **3,6 GB/năm**, với 167 GB trống thì chạy được
> 40 năm. Thứ đang làm đầy 2 TB là **ảnh cưới**. Đó là việc riêng, to hơn
> chuyện CRM, và nên tính sớm.

### 3b. Lấy lại quyền sở hữu dữ liệu — làm NGAY, không đợi

Toàn bộ khách, hợp đồng, sổ thu chi và bảng lương đang nằm trong file **đứng
tên người bán app**. Bản sao duy nhất của tiệm là *"Bản sao của AppSheet Hamita
– sao lưu 15-09-2026"* — **đứng yên từ 15/09, chưa chép lại lần nào**, dù
`BAN-GIAO.md` ghi phải lặp lại mỗi tuần.

Hôm mình tắt AppSheet cũng là hôm họ có lý do ngưng chia sẻ. Mất quyền trước
khi chép xong là mất trắng.

**Việc cụ thể:** mở file `Home` → *Tệp → Tạo bản sao* vào Drive Hamita, **lặp
lại mỗi tuần cho tới khi chuyển xong**. Mất 2 phút.

### 3c. Chốt NGÀY CHUYỂN trước, rồi mới làm

Lần trước chuyển kiểu "xong tới đâu dùng tới đó", kết quả là không ai dùng. Lần
này chọn một ngày, báo cả tiệm, và từ ngày đó **AppSheet thành chỉ-đọc** —
không phải "dùng song song tuỳ ý".

---

## 4. Kế hoạch theo đợt

Thứ tự xếp theo **cái gì chặn đường tắt AppSheet**, không theo cái gì dễ làm.

### ✅ Đợt 3 — Sổ quỹ đủ hai chiều · XONG 13/11/2026

Web có Thu mà không có Chi nên không ra được số dư. Xong đợt này là phần tiền
của tiệm sống được hoàn toàn trên web.

- Bảng `ChiTieu` (1.397 dòng) — loại chi, tài khoản, người nhận, duyệt
- Trang **Sổ quỹ**: thu − chi theo kỳ, theo tài khoản, số dư
- Ảnh chứng từ (theo quyết định 3a)
- ~~Script chép 1.397 dòng Chi~~ → làm thẳng trong lịch chép đêm (mục 7 của
  `dongBoAppSheet.ts`), khỏi script riêng

**Đã đối chiếu sau lượt chép đầu tiên:** 1.397 dòng, tổng **6.419.308.436đ** —
khớp tuyệt đối với bên AppSheet, 0 dòng lệch. Lượt chép đó cũng kéo luôn 53
ngày bị bỏ: thêm 132 khách, 162 hợp đồng, 331 phiếu thu, 634 đầu việc.

**Còn nợ ở đợt này:** `KyBaoCao` (27 dòng, mốc chốt sổ) chưa làm — sổ quỹ hiện
cộng theo tháng dương lịch, chưa theo kỳ của tiệm.

### ✅ Đợt 4 — Chấm công · XONG 13/11/2026

Phần nặng nhất và nhiều người dùng nhất: **mỗi nhân viên bấm hai lần mỗi ngày.**
Đây cũng là thứ quyết định tiệm có thật sự chuyển hay không — ngày nào cả tiệm
còn mở AppSheet để chấm công thì ngày đó họ còn ở bên kia.

- Bảng `ChamCong` (6.114 dòng)
- Màn chấm công trên **điện thoại**: vào ca / ra ca, chụp ảnh, lấy toạ độ
- Kiểm toạ độ so với vị trí tiệm — `ThongTinStudio` đã có sẵn toạ độ
- **Hai cơ sở**: ~~phải hỏi nhân viên có chấm ở cả hai không~~ → **đo ra, không
  cần hỏi**: gom cụm 6.114 toạ độ ra một cụm 1.248 lượt cách Wedding House
  411m, đó là Hami Baby. Đã thêm ô toạ độ thứ hai vào Thông tin studio.
- Bảng công theo tháng cho quản lý
- ~~Script chép 6.114 dòng~~ → làm thẳng trong lịch chép đêm (mục 8)

**Đã đối chiếu:** 6.114 dòng, **46.185,3 giờ**, **5.741,8 ngày công** — khớp
tuyệt đối với AppSheet.

**Ba quyết định bị dữ liệu thật bẻ lại:**

1. `maNV` **không** là khoá ngoại — 28/46 mã đã nghỉ việc, chiếm 51% số dòng.
2. **Không chặn theo vị trí** — 34,7% lượt chấm cách tiệm hơn 200m (giữa
   4,3 km) vì đi chụp ngoài. Chặn là từ chối 1 trong 3 lần chấm thật.
3. **Không ghi nhật ký** mỗi lượt chấm — 1.500 dòng/tháng sẽ làm ngập nhật ký.

**Phân bố vị trí sau khi khai đủ hai toạ độ:** tại tiệm 59,9% (Wedding House
39,3% + Hami Baby 20,6%), ngoài tiệm 34,7%, không rõ vị trí 5,5%.

**Còn nợ ở đợt này:** ảnh chấm công cũ (675 tấm) nằm trong thư mục
`Chấm công_Images` của người bán, chưa bao giờ được chia sẻ — chép sang không
được, chỉ giữ lại đường dẫn.

### Đợt 5 — Đơn từ và lương · ~1,5 tuần

Làm sau chấm công vì lương ăn số từ bảng công.

- `DonTu` (456) — nghỉ phép, tạm ứng; gửi → duyệt → ghi vào lương
- `DanhGia` (444) — thưởng/phạt, nối với bảng Nội quy đã có
- `Luong` (30) + `LuongNhanVien` (341) — tính từ công + thưởng/phạt + tạm ứng
- Phiếu lương từng người xem được trên điện thoại
- Script chép cả bốn bảng

### Đợt 6 — Phần nhỏ còn lại · ~3–4 buổi

- **Thêm/sửa khách hàng độc lập** (vá lỗ hiện tại)
- `KhachTiemNang` (35) — nguồn khách, khả năng chốt, ngày hẹn gọi lại
- `TaiLieu` (7), `SoSuCo` (22)
- Bảng 18 trạng thái đưa vào database thay vì để cứng trong code

### Đợt 7 — Chuyển hẳn · 1 ngày + 2 tuần theo dõi

1. Chép lần cuối toàn bộ AppSheet, **đối chiếu từng bảng về số đếm và tổng
   tiền** — như đợt 2 đã làm (*còn nợ 101 hợp đồng, 783.935.909đ — khớp*)
2. Tạo bản sao cuối cùng của file AppSheet vào Drive Hamita
3. Báo cả tiệm ngày chuyển; AppSheet thành **chỉ đọc**
4. **Xoá hẳn** `src/app/api/cron/dong-bo/` và `src/lib/dongBoAppSheet.ts` —
   không để lại nút nào có thể đè ngược lên web
5. Theo dõi 2 tuần, AppSheet vẫn để đó phòng khi thiếu
6. Hết 2 tuần không ai cần thì ngưng trả tiền AppSheet

**Tổng: khoảng 5–6 tuần làm thật.**

---

## 5. Từ giờ tới ngày chuyển, làm gì với đường đồng bộ

Web đang lệch 53 ngày. Hai cách:

- **Bật lại lịch chép đêm** cho tới ngày chuyển. An toàn **lúc này** vì chưa có
  hợp đồng nào lập trên web để mà đè. Nhưng **phải tắt ngay** khi bắt đầu có
  người lập hợp đồng trên web, nếu không đêm đó bản AppSheet cũ đè lên.
- **Chép tay** bằng nút "Đồng bộ ngay" mỗi khi cần nhìn số mới.

**✅ ĐÃ CHỐT VÀ ĐÃ LÀM 13/11/2026:** anh cho bật lại lịch. `vercel.json` đã
thêm `/api/cron/dong-bo` lúc 19:30 UTC (2 giờ 30 sáng giờ Việt Nam), đúng mốc
cũ — trước bản sao lưu 3 giờ để bản sao lưu đêm đó có dữ liệu mới.

Dải báo trên trang Hợp đồng đã viết lại cho đúng. Câu quan trọng nhất trong đó
giờ là **cảnh báo ghi đè**: lịch chép chỉ đụng vào dòng mang dấu vân tay
AppSheet, nên hợp đồng **lập trên web** không bao giờ bị đụng — nhưng hợp đồng
**cũ** mà sửa trên web thì đêm nào bên AppSheet đổi dòng đó là bị đè mất.

---

## 6. Rủi ro

| Rủi ro | Mức | Cách chặn |
|---|---|---|
| Mất quyền đọc file AppSheet giữa chừng | **cao** | mục 3b — bản sao hằng tuần |
| Ảnh chấm công làm vỡ gói Neon | **cao** | mục 3a — quyết trước đợt 4 |
| Lại chuyển nửa vời như lần trước | **cao** | chốt ngày, AppSheet thành chỉ-đọc |
| Nhân viên không đổi thói quen | vừa | chấm công trên điện thoại phải DỄ HƠN AppSheet |
| Lệch tiền giữa hai bên | vừa | đối chiếu tổng tiền từng bảng ở đợt 7 |

---

## 7. Chi phí

Thêm khoảng **8.900 dòng** vào database. Database hiện 22 MB — không đáng kể.

Chỗ tốn là **ảnh**: hơn 6.000 ảnh chấm công cộng chứng từ thu chi. Để trong
Postgres là vỡ gói Neon miễn phí (mục 3a); để trên Drive là **0 đồng**.

CRM làm nặng thêm máy chủ nên dính tới chuyện Vercel/Cloudflare ở
`KE-HOACH-CHI-PHI.md`. Nhưng CRM chỉ 25 người dùng nội bộ, so với khách xem ảnh
thì không đáng kể — **cứ làm CRM trước, chuyện nền tảng tính sau.**

---

## 8. Việc của anh

### Đã chốt 13/11/2026

- ✅ Ảnh lưu trên Drive `hamitaweddinghouse@gmail.com` (mục 3a) — **đã làm xong**
- ✅ Bật lại lịch chép đêm (mục 5) — **đã làm xong**

### Còn chờ

- ⬜ **Bấm "Nối kho ảnh"** trên trang quản lý album, chọn
  `hamitaweddinghouse@gmail.com`. Chưa nối thì đợt 3 không ghi được chứng từ.
- ⬜ **Ngày chuyển hẳn là ngày nào?** Khoảng 5–6 tuần nữa nếu bắt đầu ngay.
- ⬜ **Tạo bản sao file AppSheet vào Drive Hamita** (mục 3b) — 2 phút, bản của
  tiệm đang cũ hai tháng.
- ⬜ **"File Google Sheet riêng" anh nhắc tới là ý nào?** Em còn chưa rõ:
  1. Bản sao an toàn của file AppSheet, anh tự tạo định kỳ → chính là mục 3b,
     không cần viết mã gì.
  2. Web đọc từ bản sao đó thay vì file gốc → **không chạy được**: app AppSheet
     chỉ ghi vào file của người bán, bản sao sẽ đứng yên và lịch chép đêm sẽ
     chép đi chép lại dữ liệu chết.
  3. Một file Sheet mới, web **tự ghi dữ liệu CRM ra đó** để tiệm luôn có bản
     mở được bằng Excel, nằm trong Drive của chính mình → làm được, là tính
     năng mới.
