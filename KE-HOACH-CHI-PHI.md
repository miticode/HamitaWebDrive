# Kế hoạch đưa chi phí về gần 0

Lập 30/09/2026 theo yêu cầu của anh: *"a không muốn phải trả tiền cho bất cứ
chi phí nào"*.

---

## Nói trước điều không làm được

**Tên miền `.com` không có chỗ nào cho không.** Rẻ nhất là mua thẳng từ
Cloudflare Registrar — nơi bán đúng giá gốc của nhà quản lý tên miền, không ăn
chênh lệch: **$10,44/năm**, và từ 01/11/2026 là **$11,15/năm** do Verisign tăng
giá 7%. Quy ra khoảng **22–24 nghìn một tháng**.

Cách duy nhất để hoàn toàn 0 đồng là bỏ `hamitastudio.com` mà dùng địa chỉ cho
sẵn kiểu `hamita.pages.dev`. **Không nên.** Tên miền riêng là thứ khách nhìn
thấy đầu tiên khi nhận link, và là tài sản thương hiệu của studio — tiết kiệm
22 nghìn một tháng mà đánh đổi cái đó thì lỗ.

Vậy **sàn thật sự là ~$0,9/tháng**, không phải $0.

---

## Đang trả những gì (sau đợt sửa 28–30/09)

| Khoản | Mỗi tháng | Cắt được không |
|---|---|---|
| Vercel Pro | **$20** | Được, nhưng phải đổi nền tảng |
| Neon (database) | **$8–13** | **KHÔNG** — đã đo, xem 1a |
| Tên miền | ~$1,7 (mua ở Vercel) | Giảm còn $0,9 |
| Cloudflare Worker | $0 | đang miễn phí |
| **Tổng** | **~$30** | |

**Vercel dùng thật bao nhiêu** (đo trên hoá đơn kỳ **27/09 – 27/10/2026**):
hạ tầng **$6,36**, mà gói Pro gồm sẵn $20 tín dụng — nên hoá đơn vẫn đúng $20
và **$13,64 là phí nền tảng thuần**. Chi tiết:

| Khoản | Dùng | Tiền |
|---|---|---|
| Fast Origin Transfer | 9 GB | $2,37 |
| Fluid Active CPU | **8 giờ** | $1,43 |
| Fluid Provisioned Memory | 86,86 GB-giờ | $1,16 |
| Build CPU | 3 giờ | $0,64 |
| Observability | 308K sự kiện | $0,37 |
| Function Invocations | 467,44K | $0,28 |
| Fast Data Transfer | 11 GB **/ 1 TB** | $0,00 |
| CDN Requests | 621,81K **/ 10M** | $0,00 |

Hai dòng $0,00 cuối nói hết: băng thông dùng **1%** hạn mức, lượt CDN **6%**.
Web này nhỏ hơn gói Pro một bậc rất xa, vì toàn bộ ảnh đã sang Worker từ 28/09.

Trước đợt sửa là **$92/tháng**, nên phần lớn đã cắt rồi. Ba bậc dưới đây là
phần còn lại.

---

## Bậc 1 — Làm ngay, rủi ro thấp

**Tiết kiệm: $9–14/tháng. Công: một buổi.**

### 1a. Hạ Neon về gói miễn phí — ĐÃ ĐO, KHÔNG HẠ ĐƯỢC

> **Kết quả (08/10/2026):** đo thật **3,98 CU-giờ/ngày**, trong khi hạn mức gói
> miễn phí là **3,2–3,33**. Vượt. Và đã truy ra nguyên nhân: **không có nguồn
> gọi lén nào** — 186 lượt khách xem mỗi ngày, 80/97 album còn sống, 5.073 mốc
> hoạt động. 16 giờ database thức mỗi ngày là hệ quả tự nhiên của lượng khách
> thật. **Bỏ mục này, đừng thử lại trừ khi lượng khách giảm hẳn.**

Phần dưới giữ lại để biết đã đo theo cách nào.

Gói miễn phí cho **100 CU-giờ/tháng** (3,33 mỗi ngày) và 0,5 GB dung lượng.
Database hiện chỉ **22 MB**, thừa sức. Vướng duy nhất là compute.

Chu kỳ Neon mới bắt đầu **01/10**, nên từ đó mọi ngày đều là ngày đã sửa xong.
Khoảng **05–06/10** vào `console.neon.tech` → Billing, lấy số compute hours chia
cho số ngày đã qua:

| Kết quả | Làm gì |
|---|---|
| dưới **2,5** CU-giờ/ngày | hạ được, còn dư an toàn |
| **2,5 – 3,3** | **đừng hạ** — sát quá |
| trên **3,3** | còn thứ gì gọi lén, tìm tiếp |

**Vì sao đòi dư 25%:** vượt hạn mức gói miễn phí là database bị khoá và **web
sập** — đúng cái đã xảy ra ngày 21/09. Mùa cưới đông khách chỉ cần một tuần là
vượt. Gói Launch hiện tại không có phí cố định, dùng ít trả ít, nên chênh lệch
thật có khi chỉ $6–8/tháng.

### 1b. Chuyển tên miền về Cloudflare Registrar

Tên miền đang mua ở Vercel. Chuyển sang Cloudflare Registrar rẻ hơn và **cộng
thêm một năm** vào hạn hiện có.

**Lưu ý:** tên miền mới mua bị khoá chuyển **60 ngày** theo luật chung của
ngành. Phải kiểm ngày mua trước khi làm.

Các bước: Cloudflare → Domain Registration → Transfer Domains → nhập
`hamitastudio.com` → lấy mã uỷ quyền bên Vercel (Settings → Domains) → trả tiền
một năm → đợi 5–7 ngày.

**Làm bước này TRƯỚC bậc 2**, vì lúc đó DNS đã nằm sẵn ở Cloudflare, đỡ phải
chuyển hai lần.

---

## Bậc 2 — Bỏ Vercel, chuyển sang Cloudflare

**Tiết kiệm thêm: $15/tháng. Công: vài ngày. Rủi ro: vừa.**

Đưa cả web sang Cloudflare Workers bằng `@opennextjs/cloudflare`.

**Tin tốt:**
- Bộ chuyển đổi đó **hỗ trợ Next.js 16**, đúng bản dự án đang dùng
- Chạy được App Router, ISR, `after()`, Turbopack — tức mọi thứ web này cần
- Cloudflare **cho phép dùng vào việc kinh doanh** trên gói miễn phí, khác hẳn
  Vercel Hobby
- Worker bắn ảnh đã chạy sẵn ở đó rồi, không phải dựng lại

**Nhưng KHÔNG dùng được gói miễn phí của Cloudflare.** Đã đo: web này tốn trung
bình **54 ms CPU mỗi lượt gọi**, mà gói miễn phí chỉ cho **10 ms**. Không có
cách nào lách — dựng một trang React ở máy chủ vốn tốn chừng đó.

Phải dùng **Workers Paid $5/tháng**: 30 triệu ms CPU và 10 triệu lượt gọi.

**SỐ CPU ĐÃ ĐO LẠI (05/11/2026) — bản cũ ước SAI.** Trang này từng ghi "ước
dùng 12,6 triệu ms, dư gấp đôi". Hoá đơn Vercel thật kỳ 27/09–27/10 cho
**8 giờ Fluid Active CPU = 28,8 triệu ms**, tức **gấp 2,3 lần** con số ước.
Mỗi lượt gọi 61 ms (khớp mức 54 ms đo trước), sai là ở chỗ ước thiếu số lượt.

| | Cần | Được cấp | Dùng hết |
|---|---|---|---|
| CPU | 28,8 triệu ms | 30 triệu | **96%** |
| Lượt gọi | 467,44K | 10 triệu | 5% |

Biên hẹp thật, nhưng **hậu quả không đáng sợ**: vượt tính thêm **$0,02 mỗi
triệu ms**. Lưu lượng gấp đôi (57,6 triệu) cũng chỉ thành **$5,55/tháng**.
Và băng thông ra của Cloudflare **miễn phí**, nên dòng Fast Origin Transfer
$2,37 bên Vercel về thẳng $0.

**Ba chỗ từng lo — nay đã đo hết:**

1. **`sharp` không chạy trên Cloudflare — HẾT VƯỚNG.** Code đã gỡ hẳn sharp
   khỏi máy chủ ngày 30/09; `/api/img` nay lấy thẳng bản WebP dựng sẵn của
   Google. Nó chỉ còn trong `devDependencies` cho script dựng logo chạy ở máy.
2. **Cỡ gói mã tối đa 10 MB nén — LỌT, DƯ HƠN GẤP ĐÔI.** Đo 05/11/2026 trên
   mã nguồn hôm đó bằng `wrangler deploy --dry-run`: **18.764 KiB thô /
   4.690,95 KiB nén = 4,58 MB**. Nhỏ hơn cả lần đo 30/09 (4,73 MB) dù mã đã
   thêm 21 commit. Giữ được nhờ `outputFileTracingExcludes` trong
   `next.config.ts` — không có nó thì gói phình lên **20,1 MB** vì Next kéo
   theo cả wrangler.exe, Prisma engine, Prisma Studio, pglite và bộ biên dịch
   cho MỌI loại database.
3. **Windows không được khuyến nghị — dựng được, có cằn nhằn.** Lệnh
   `npm run cf:dung` chạy xong trên Windows, chỉ báo "Failed to copy" ở 6 gói
   phụ (lỗi symlink) mà không chặn bản dựng. Bước xem thử cục bộ từng cần
   quyền quản trị (EPERM symlink).

**Đề nghị:** làm trên một nhánh riêng, dựng thử ở địa chỉ tạm `.workers.dev`,
chạy song song với Vercel vài ngày, so từng trang. Ổn hẳn mới đổi DNS. Không
bao giờ tắt Vercel trước khi bên kia chạy thật.

**Nhánh đó đã có sẵn: `thu-cloudflare`** (hợp nhất với `main` ngày 05/11). Nó
mang `open-next.config.ts`, `wrangler.jsonc`, hai bản Prisma (Node và workerd —
xem chú thích đầu `schema.prisma`) và phần cắt gói mã trong `next.config.ts`.
Dựng bằng `npm run cf:dung`; lệnh đó **tự đổi lại Prisma về bản Node** sau khi
xong, để `npm run dev` ngày thường không đổ.

**Việc còn phải làm trước khi dám đổi DNS** (chưa ai kiểm, đừng tin là chạy):

- Chạy thử thật với `.dev.vars` đủ bí mật, xem `/api/img` và `/api/download`
  còn trả 500 không — hai đường này từng hỏng vì thiếu sharp, mà sharp nay đã
  gỡ hẳn, nên nhiều khả năng đã tự khỏi. **Phải đo, không được đoán.**
- Cron sao lưu hằng đêm: Cloudflare dùng Cron Triggers chứ không đọc
  `vercel.json`, phải khai lại trong `wrangler.jsonc`.
- Đối chiếu từng biến môi trường giữa Vercel và `wrangler.jsonc` — thiếu một
  cái là hỏng âm thầm, không có lỗi nào hiện ra.

---

## Bậc 3 — Thật sự gần 0 đồng

**Tiết kiệm thêm: $5/tháng. Rủi ro: CAO. Em không khuyên.**

Tự dựng máy chủ trên **Oracle Cloud Always Free** — họ cho không vĩnh viễn 2 máy
ảo ARM, 24 GB RAM, 10 TB truyền dữ liệu mỗi tháng.

Lúc đó chỉ còn tiền tên miền **$10,44/năm ≈ 22 nghìn/tháng**.

**Vì sao em không khuyên:**
- Phải tự lo hệ điều hành, chứng chỉ bảo mật, tự dựng lại mỗi lần sửa mã, tự
  sao lưu, tự canh khi máy treo. Studio không có người làm việc này.
- Oracle **có quyền thu hồi** máy miễn phí khi thiếu tài nguyên, và họ đã làm
  vậy với nhiều người.
- Một máy ảo là **một điểm chết**. Vercel và Cloudflare có hàng trăm máy; máy
  này tắt là web tắt, không ai báo cho anh biết.
- Tiết kiệm $5/tháng — 127 nghìn — đổi lấy ngần ấy rủi ro cho web đang phục vụ
  70 album khách thì không đáng.

Chỉ nên tính tới bậc này nếu studio có người rành máy chủ.

---

## Tóm tắt

| | Mỗi tháng | Quy ra tiền Việt |
|---|---|---|
| Trước khi sửa (tháng 9) | $92 | ~2.350.000đ |
| **Bây giờ** | **~$30** | ~765.000đ |
| Sau bậc 1 | ~$29 | ~740.000đ |
| Sau bậc 2 | **~$14** | ~360.000đ |
| Sau bậc 3 | ~$9 | ~230.000đ |

**Sửa 05/11/2026:** bảng cũ tính bậc 1 cắt được $9–14 nhờ hạ Neon. Neon đã đo
và **không hạ được**, nên bậc 1 chỉ còn khoản tên miền (~$0,8). Cột dưới tính
lại theo đó — và vì Neon $8–13 ở lại trong mọi bậc, con số cuối không còn gần 0.

**Khoản cắt lớn nhất còn lại là bậc 2: $15/tháng ≈ 4,6 triệu một năm.**

Bậc 1 lấy được $9–14/tháng mà gần như không rủi ro gì. Bậc 2 lấy thêm $15 nhưng
phải dựng lại cách triển khai cả web — đáng làm, nhưng nên để sau khi mọi thứ đã
chạy ổn định vài tuần, và làm lúc studio ít việc chứ không phải giữa mùa cưới.

Bậc 3 thì chỉ đáng khi có người trông máy chủ.

---

## Nguồn

- [Vercel — quy định dùng vào việc kinh doanh](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)
- [Cloudflare Workers — hạn mức](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Workers — giá](https://developers.cloudflare.com/workers/platform/pricing/)
- [OpenNext cho Cloudflare](https://opennext.js.org/cloudflare)
- [Giá tên miền Cloudflare Registrar](https://startupowl.com/reviews/cloudflare-registrar)
- [Neon — bảng giá](https://neon.com/pricing)
