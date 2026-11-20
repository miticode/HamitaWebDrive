# Kế hoạch nâng cấp giao diện CRM `/quan-ly` — 20/11/2026

> **Chưa sửa dòng code nào.** Tài liệu này để anh duyệt trước.
> Mọi đề xuất giữ nguyên nghiệp vụ, API, database, đăng nhập và phân quyền.

Mọi con số đo thật hôm nay trên mã nguồn và database, không ước lượng.

---

## 0. Đọc kết luận trước

### 0.1. Thời điểm này là đúng — nhưng không phải vì giao diện xấu

Đo nhật ký thao tác 14 ngày qua:

| | |
|---|---|
| Tổng thao tác | **351** |
| Người thao tác | **15** (10 nhân viên có tài khoản + script) |
| Hôm nay | **39** |
| Xu hướng | tăng đều, 6 → 39 |

CRM **đã bắt đầu sống**. Khác hẳn con số trong `KE-HOACH-CRM.md` ngày 13/11:
*"Thao tác CRM trên web trong 8 tuần: 0"*.

Nhưng nhìn kỹ hơn thì chưa phải đang chạy thật:

```
15  lap-hop-dong        ← lập 15 lần
14  xoa-hop-dong        ← xoá 14 lần
 1  hợp đồng còn lại    ← TTT142, lập hôm nay
```

Anh đang **thử**, chưa chuyển. Phần giao ảnh thì ngược lại — dùng thật hàng
ngày: 98 lần sửa album, 57 lần gửi thông báo, 36 lần tạo album.

**Vì sao điều này quan trọng:** làm đẹp một hệ thống chưa ai dùng là xây tầng
hai trên nền chưa xong. Nhưng ở đây giao diện đang **là rào cản của chính việc
chuyển sang dùng thật** — form lập hợp đồng 1.482 dòng, 21 bảng phải vuốt
ngang trên điện thoại. Nên việc này đáng làm, miễn là nhớ bài học đã ghi hai
lần trong hồ sơ dự án:

> *Lần chuyển 21/09 hỏng không phải vì thiếu tính năng. Hỏng vì không ai đổi
> thói quen.* — `KE-HOACH-CRM.md`
>
> *Album ↔ hợp đồng có từ 16/09, 123 album tạo sau đó, 1 cái được gắn.* —
> `KE-HOACH-V3.md`

Hôm nay con số ấy là **8/186 album đã gắn hợp đồng (4%)**. Sau hai tháng và
một bản audit, nó nhích từ 2% lên 4%. Giao diện đẹp hơn không tự sửa chuyện đó.

### 0.2. Ba đề xuất lớn của anh — em trả lời thẳng

| Anh đề xuất | Em khuyến nghị | Vì sao |
|---|---|---|
| **shadcn/ui** | **Không cài** | Dự án đã có design system riêng, đủ dùng — xem §1.2. Cài vào là dựng hệ thứ hai song song |
| **TanStack Table** | **Không cài** | 21 bảng hiện render ở máy chủ. Dùng TanStack là phải đổi hết sang client component |
| **Shadcn Admin / Square UI** | **Chỉ tham khảo bố cục** | Không chép template vào dự án, đúng như anh dặn ở mục 9 |

Thay vào đó: **rút gọn cái đang có**. Chi tiết ở §2 và §3.

---

## 1. Bảng đánh giá giao diện hiện tại

### 1.1. Quy mô

| | |
|---|---|
| Tệp `.ts`/`.tsx` trong `/quan-ly` | **91** |
| Dòng mã | **18.420** |
| Trang (`page.tsx`) | **28** |
| Component riêng | **46** |
| `globals.css` | **1.007 dòng** |
| Thư viện giao diện ngoài | **0** |

Tệp dài nhất, gấp gần ba lần tệp thứ hai:

```
1.482  hop-dong/moi/FormHopDongMoi.tsx
  567  hop-dong/ChonDichVu.tsx
  500  hop-dong/[id]/page.tsx
  495  lich/page.tsx
  429  nhan-vien/HangNhanVien.tsx
  419  (he-thong)/page.tsx          ← Dashboard
```

### 1.2. Thứ ĐANG LÀM TỐT — phải giữ

Phần này quan trọng không kém phần hỏng: nó là lý do em khuyên không cài
shadcn.

| Đang có | Đánh giá |
|---|---|
| **Token màu hai tầng** — 10 biến ngữ nghĩa (`--bg`, `--fg-muted`, `--accent`…), khai lại trọn bộ cho bản tối | Đúng cách làm của một design system thật. shadcn cũng chỉ làm vậy |
| **`@layer components`** — `.btn`, `.btn-primary`, `.btn-gon`, `.card`, `.input`, `.eyebrow`, `.nen-hien`, `.hop-hien` | Nguyên tắc 11 của dự án. Có sẵn và đang dùng khắp nơi |
| **Bản tối riêng cho `/quan-ly`** (`[data-admin-theme="dark"]`) | Trang khách cố định tông sáng (nguyên tắc 12), phần quản lý thì có tối. Phân biệt đúng |
| **Hệ màu lịch 6 nhóm** (`.l-cuoi`, `.l-pre`, `.l-makeup`…) | Mỗi nhóm ba biến, bản tối khai lại đúng ba biến đó |
| **Empty state** — "Chưa có hợp đồng nào", "Chưa có dòng nào"… | Có ở gần như mọi bảng. Nhiều dự án lớn hơn vẫn thiếu |
| **Chữ trong giao diện** | Viết bằng tiếng người, không phải tiếng hệ thống |

Một bộ token + một lớp component dùng chung, có bản tối, không phụ thuộc thư
viện nào — đó chính xác là thứ shadcn/ui sinh ra để cho. Cài nó vào đây là
**thêm Radix + CVA + tailwind-merge + clsx** để có lại thứ đã có.

### 1.3. Thứ ĐANG HỎNG — xếp theo mức

#### Mức A — thấy ngay, ảnh hưởng hàng ngày

| # | Vấn đề | Số đo |
|---|---|---|
| **A1** | **21 bảng chỉ cuộn ngang trên điện thoại.** Không một bảng nào có dạng thẻ | `md:hidden`/`sm:hidden` dùng ở **0** chỗ trong `/quan-ly` |
| **A2** | **Màn hình trắng khi chờ.** Mọi trang `force-dynamic`, đọc database xong mới vẽ | **28/28** trang, **0** `loading.tsx`, **0** `<Suspense>` |
| **A3** | **Form lập hợp đồng 1.482 dòng** trong một tệp, một component | Gấp 2,6 lần tệp thứ hai |

**A1 đáng kể nhất.** Ảnh anh gửi suốt mấy hôm nay đều chụp từ iPhone — tức
anh làm việc trên điện thoại thật. Mà bảng Hợp đồng có 7 cột, bảng Phiếu thu 6
cột, bảng Đầu việc 6 cột: trên màn 375px chúng chỉ hiện được hai cột rưỡi.

#### Mức B — lặp và lệch, lộ dần theo thời gian

| # | Vấn đề | Số đo |
|---|---|---|
| **B1** | Khung bảng chép lại từng trang: cùng một chuỗi `overflow-x-auto rounded-md border border-line bg-bg-raised` | **21 tệp** |
| **B2** | Hàng tiêu đề bảng chép lại cùng một chuỗi lớp | **21 chỗ** |
| **B3** | Chip/badge tự chế, mỗi nơi một kiểu | **~10 biến thể** của `rounded-full border … text-[11px]` |
| **B4** | Nút "Sửa"/"Xoá" trong bảng viết tay từng chỗ: `btn px-3 py-1 text-xs` | rải khắp |

Hậu quả không phải xấu — mà là **sửa một thứ phải sửa 21 chỗ**. Đổi bo góc
bảng, đổi màu hàng tiêu đề, thêm dạng thẻ cho điện thoại: mỗi việc là 21 lần.

#### Mức C — đánh bóng

| # | Vấn đề |
|---|---|
| ~~**C1**~~ | ~~Dashboard là một lưới thẻ phẳng~~ — **SAI, em đọc sót**. Nó đã chia bốn tầng từ đợt 13/11: *Hôm nay · Chờ anh duyệt · Tiệm đang thế nào · Đi tới*. Không có việc gì để làm ở đây |
| **C2** | Trang chi tiết hợp đồng xếp dọc 6 khối rời; mở ra phải cuộn mới thấy album và tiến độ |
| **C3** | Không có breadcrumb; đang ở trang con chỉ có một link "← Hợp đồng" |
| **C4** | Thanh bên 18 mục, không thu gọn được trên màn hình vừa |

---

## 2. Component — giữ, sửa, tạo mới

### 2.1. GIỮ NGUYÊN (17 thứ)

Không đụng vào. Chúng đang đúng và đang được dùng.

| Thứ | Lý do |
|---|---|
| Toàn bộ token màu + `@layer components` trong `globals.css` | §1.2 |
| `.chip-lich`, `.cham-lich` và 6 lớp màu lịch | Vừa làm hôm nay, đã đo |
| `ThanhBen` | Chạy tốt cả hai cỡ màn hình |
| `NutViec` | Ba trang dùng chung, vừa siết quyền xong |
| `BangDongBo`, `ChipTrangThai`, `TieuDeKhoi`, `The` (thẻ Dashboard) | Đã là component dùng chung |
| `KhoiLich`, `KhoiTien`, `KhoiViec` | Khối của trang hợp đồng, mới và sạch |
| `OBuoiChup`, `BangGiaHangMuc`, `ChonDichVu` | Logic nghiệp vụ nặng, không nên đụng lúc này |
| `NutGuiIn`, `NutViecLich`, `KhoiMuc` | Mới làm trong tuần, đã kiểm chứng |

### 2.2. TẠO MỚI (6 thứ) — đây là phần chính

| Component | Thay cho | Số chỗ gom được |
|---|---|---|
| **`Bang`** — khung + `<thead>` + rỗng + **dạng thẻ dưới 768px** | khung bảng chép tay | **21** |
| **`Chip`** — một component, `kieu` nhận `trung-tinh` \| `nhe` \| `canh-bao` \| `nguy` \| `nhan` | ~10 biến thể | ~30 chỗ |
| **`NutBang`** — nút nhỏ trong hàng bảng | `btn px-3 py-1 text-xs` viết tay | ~15 chỗ |
| **`KhungTrang`** — tiêu đề + mô tả + hàng nút bên phải | mỗi trang tự dựng | 28 trang |
| **`Xuong`** (skeleton) — khung xám lúc chờ | chưa có gì | 6 trang ưu tiên |
| **`Khoi`** — khối có tiêu đề nhỏ trong trang chi tiết | `TieuDeKhoi` + `<section>` viết tay | ~12 chỗ |

`Bang` là thứ đáng giá nhất: nó biến **A1 từ 21 việc thành 1 việc**. Dạng thẻ
cho điện thoại khai một lần trong `Bang`, cả 21 bảng có ngay.

### 2.3. SỬA (6 chỗ)

| Chỗ | Việc |
|---|---|
| `FormHopDongMoi.tsx` (1.482 dòng) | Tách thành 4 tệp theo đúng 3 bước nó đã có: `BuocKhach`, `BuocDichVu`, `BuocLich`, + phần khung. **Không đổi một dòng logic nào** |
| `(he-thong)/page.tsx` — Dashboard | Chia hai tầng: "Hôm nay cần làm" và "Số liệu" |
| `hop-dong/[id]/page.tsx` | Bố cục workspace — §4.3 |
| `hop-dong/page.tsx` | Dùng `Bang`, thêm dạng thẻ |
| `lich/page.tsx` + `LuoiLich.tsx` | Dùng `Bang` cho bảng danh sách; lưới giữ nguyên |
| `cong-viec/page.tsx` | Dùng `Bang` |

---

## 3. Thư viện cần bổ sung

### 3.1. Khuyến nghị: KHÔNG cài gì cả

| Thư viện | Nếu cài sẽ kéo theo | Em khuyến nghị |
|---|---|---|
| `shadcn/ui` | `@radix-ui/*` (8–15 gói), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` | **Không.** Dựng hệ thứ hai song song với `@layer components` đang có. Nguyên tắc 11 chốt "mọi lớp CSS dùng chung nằm trong `@layer components`" |
| `@tanstack/react-table` | ~45 KB | **Không.** 21 bảng đang render ở máy chủ, không sort/filter phía client. Dùng nó là đổi hết sang `"use client"`, mất lợi thế server render và tăng gói gửi xuống |
| `lucide-react` | ~? KB tuỳ cây rung | **Không.** Đã có `BieuTuong.tsx` vẽ SVG thẳng cho từng mục menu |

Dự án hiện có **0 thư viện giao diện**. Gói gửi xuống trình duyệt nhỏ, và đó
là thứ có giá trị thật trên mạng 4G ở tiệm.

### 3.2. Nếu sau này thật sự cần

Hai trường hợp duy nhất em thấy đáng cân nhắc, và **chưa phải bây giờ**:

- **Bảng cần sort/filter/phân trang phía client** — khi một bảng vượt ~500
  dòng và người dùng than. Hiện bảng lớn nhất là Dịch vụ, đã giải bằng lọc
  máy chủ + "xem thêm 150 dòng".
- **Lịch kéo-thả để xếp người** — nếu anh muốn kéo thợ vào buổi chụp. Lúc đó
  mới tính `dnd-kit`.

---

## 4. Giao diện đề xuất — 6 màn hình ưu tiên

### 4.1. Dashboard `/quan-ly`

**Hiện tại:** một lưới thẻ phẳng, mọi con số ngang hàng nhau.

**Đề xuất:** chia hai tầng rõ rệt.

```
┌─ HÔM NAY ─────────────────────────────────────────────┐
│  Chưa vào ca      3 việc quá hạn      2 buổi chụp     │
│  [Bấm để chấm công]   [Xem việc]      [Xem lịch]      │
└───────────────────────────────────────────────────────┘

Việc cần duyệt                          chỉ quản lý
  2 phiếu thu chờ duyệt   ·   1 đơn từ chờ   ·   0 phiếu chi

Số liệu tháng 11                        chỉ quản lý
  Hợp đồng mới 12 · Đã thu 45,2tr · Còn nợ 180,5tr
```

Khác biệt: **tầng trên là việc có thể bấm làm ngay**, tầng dưới là số liệu để
biết. Hiện tại hai loại trộn lẫn, nên không tầng nào nổi.

### 4.2. Hợp đồng `/quan-ly/hop-dong`

**Máy tính:** giữ bảng, nhưng qua `Bang` — hàng tiêu đề dính khi cuộn, hàng
có trạng thái tô nhạt theo bước.

**Điện thoại:** `Bang` tự đổi sang thẻ.

```
┌───────────────────────────────────────┐
│ Trấn Thành & Việt Hương      ❶ bước 10│
│ CUỐI · 22/11/2026                      │
│ 17.890.000đ        còn nợ 17.390.000đ │
└───────────────────────────────────────┘
```

Ba dòng, đọc được bằng một mắt nhìn, không vuốt ngang.

### 4.3. Chi tiết hợp đồng `/quan-ly/hop-dong/[id]` — **workspace**

Đây là màn hình anh nhấn mạnh. Hiện tại là 6 khối xếp dọc: Khách · Tiền ·
Album · Dịch vụ · Lịch · Đầu việc · Phiếu thu. Phải cuộn hết mới nắm được.

**Đề xuất:** một dải tiến độ trên cùng, rồi hai cột trên máy tính.

```
┌─ Trấn Thành & Việt Hương ───────── [In] [Sửa] [Xoá] ─┐
│ ①Cọc ──●── ②Chụp ──○── ③Chọn ──○── ④In ──○── ⑤Giao  │
│         đang ở bước 10 · tiếp theo 11. Đã giao váy    │
└──────────────────────────────────────────────────────┘

┌─ CỘT TRÁI (rộng) ─────────┐  ┌─ CỘT PHẢI (hẹp) ────┐
│ Lịch chụp + Đầu việc      │  │ Tiền                │
│   nhà gái 22/11 · 4 việc  │  │   17.890.000đ       │
│   nhà trai 23/11 · 3 việc │  │   còn nợ 17.390.000đ│
│                           │  │   [Thêm phiếu thu]  │
│ Dịch vụ, trang phục       │  │                     │
│                           │  │ Album ảnh           │
│ Phiếu thu                 │  │   HIS-HER · 0 tấm   │
└───────────────────────────┘  │   [Đơn giao in]     │
                               │ Khách               │
                               │   0123123124        │
                               └─────────────────────┘
```

Điện thoại: một cột, thứ tự Tiền → Lịch+Việc → Album → Dịch vụ → Phiếu thu.

**Dải tiến độ là thứ đáng làm nhất ở đây.** 18 bước hợp đồng hiện chỉ hiện
dưới dạng một chip chữ. Gom thành 5 chặng nhìn thấy được thì mở hợp đồng ra
là biết ngay đang kẹt chỗ nào — và đó cũng là thứ kéo người ta gắn album vào
hợp đồng, vì chặng "Chọn" chỉ sáng khi có album.

### 4.4. Album ảnh `/admin`

**Lưu ý:** trang này nằm ngoài `/quan-ly` và **đang được dùng thật hàng ngày**
(98 lần sửa album trong 14 ngày). Em đề nghị **đụng vào ít nhất**: chỉ thống
nhất chip và nút với phần còn lại, không đổi bố cục thẻ album.

Một việc duy nhất đáng thêm: trên thẻ album, nếu chưa gắn hợp đồng thì hiện
một dòng mờ *"chưa gắn hợp đồng"* có thể bấm. Đó là chỗ 178/186 album đang
thiếu, và là nền của mọi thứ trong `KE-HOACH-V3.md`.

### 4.5. Lịch chụp `/quan-ly/lich`

Lưới và màu vừa làm xong hôm nay — **giữ nguyên**. Ba việc nhỏ:

- Bảng danh sách dùng `Bang` (có dạng thẻ)
- Panel ngày: khi một ngày có nhiều buổi, gom theo buổi bằng khối có viền
- Nút "+ Thêm việc" cũng đặt ở đầu trang, không chỉ trong panel

### 4.6. Đầu việc `/quan-ly/cong-viec`

- Bảng dùng `Bang`
- Thêm một hàng chip lọc nhanh: *Của tôi · Chưa giao · Quá hạn · Hôm nay*
  (ba chip đầu đã có, thiếu "Hôm nay")
- Trên điện thoại: thẻ, mỗi thẻ một việc, ô chọn người chiếm trọn hàng

---

## 5. Kế hoạch triển khai

Bốn giai đoạn. **Mỗi giai đoạn là một commit riêng, dựng và đo xong mới sang
giai đoạn sau.**

### Giai đoạn 1 — Nền (không ai thấy gì đổi)

Tạo 6 component mới ở `src/app/quan-ly/(he-thong)/_ui/`. Chưa thay chỗ nào.
Dựng một route thử tạm để đo cả 6, rồi xoá.

- Rủi ro: gần như không. Không tệp nào đang chạy bị đụng.
- Rollback: xoá thư mục `_ui/`.

### Giai đoạn 2 — Thay bảng (việc đáng giá nhất)

Đổi 21 bảng sang `Bang`, một trang một lượt, bắt đầu từ Hợp đồng.

- Đo sau mỗi trang: máy tính 1024, điện thoại 375 — không cuộn ngang, số dòng
  đúng như trước.
- Rủi ro: trung bình. Bảng là chỗ hiện dữ liệu thật, sai cột là sai nghiệp vụ.
- Rollback: `git revert` đúng commit của trang đó. Mỗi trang một commit nên
  lùi được từng cái.

### Giai đoạn 3 — Sáu màn hình ưu tiên

Dashboard → Hợp đồng → Chi tiết hợp đồng → Lịch → Đầu việc → Album.

- Rủi ro: cao nhất ở chi tiết hợp đồng (đổi bố cục, 500 dòng).
- Rollback: mỗi màn hình một commit.

### Giai đoạn 4 — Tách `FormHopDongMoi`

Để cuối cùng vì nó là tệp rủi ro nhất: 1.482 dòng, và là đường duy nhất lập
hợp đồng.

- Tách thuần tuý, **không đổi một dòng logic**.
- Kiểm chứng: lập một hợp đồng thử đầy đủ trên route thử, so từng trường với
  dữ liệu ghi vào database, rồi xoá hợp đồng đó.
- Rollback: `git revert`, một commit duy nhất.

### Cách lùi bất cứ lúc nào

```powershell
git log --oneline -15
```

```powershell
git revert <mã-commit>
```

Mỗi giai đoạn đứng riêng một commit, không commit nào phụ thuộc commit sau.
Không có migration database nào trong cả bốn giai đoạn — **không đụng tới
schema, không `db:push`** — nên lùi code là lùi trọn vẹn.

---

## 6. Thứ em KHÔNG làm, trừ khi anh bảo

- Không cài thư viện giao diện nào (§3)
- Không đổi nghiệp vụ, API, quyền, database
- Không đụng trang khách (`/`, `/album/…`) — nguyên tắc 12 chốt tông sáng cố định
- Không đổi bố cục `/admin` (đang dùng thật)
- Không thêm tính năng mới. Mọi thứ trên đây là **cùng chức năng, bố cục khác**

---

## 7. Việc còn treo từ các phiên trước — nhắc để anh khỏi quên

| Việc | Của ai |
|---|---|
| Khai bảng giá hạng mục cho 85 gói chưa có | anh nhập |
| Khai buổi chụp cho gói nhiều ngày (mọi gói "2 ngày" chưa khai) | anh nhập |
| Gắn 178 album còn lại vào hợp đồng | anh bấm |
| Dòng nhắc khi khai bảng đầu việc nửa chừng | em làm, chờ anh chốt |
| Gán buổi cho đầu việc của 5.310 dòng cũ từ AppSheet | em làm, chờ anh chốt |
