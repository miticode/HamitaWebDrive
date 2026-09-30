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
| Neon (database) | **$8–13** | Được, nếu đo đạt mốc |
| Tên miền | ~$1,7 (mua ở Vercel) | Giảm còn $0,9 |
| Cloudflare Worker | $0 | đang miễn phí |
| **Tổng** | **~$30** | |

Trước đợt sửa là **$92/tháng**, nên phần lớn đã cắt rồi. Ba bậc dưới đây là
phần còn lại.

---

## Bậc 1 — Làm ngay, rủi ro thấp

**Tiết kiệm: $9–14/tháng. Công: một buổi.**

### 1a. Hạ Neon về gói miễn phí — CHỜ ĐO

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

Phải dùng **Workers Paid $5/tháng**. Gói đó cho 30 triệu ms CPU, web này ước
dùng **12,6 triệu** — dư gấp đôi.

**Ba chỗ phải xử khi chuyển:**

1. **`sharp` không chạy trên Cloudflare.** Hiện nó chỉ còn là đường lui của
   `/api/img` khi Google chưa kịp dựng ảnh sẵn. Phải bỏ đường lui đó hoặc đổi
   cách khác.
2. **Cỡ gói mã tối đa 10 MB nén.** Prisma Client khá nặng, phải đo trước khi
   bắt tay.
3. **Windows không được khuyến nghị** để dựng — có thể phải cài WSL.

**Đề nghị:** làm trên một nhánh riêng, dựng thử ở địa chỉ tạm `.workers.dev`,
chạy song song với Vercel vài ngày, so từng trang. Ổn hẳn mới đổi DNS. Không
bao giờ tắt Vercel trước khi bên kia chạy thật.

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
| Sau bậc 1 | ~$21 | ~535.000đ |
| Sau bậc 2 | **~$6** | ~150.000đ |
| Sau bậc 3 | ~$0,9 | ~22.000đ |

**Em đề nghị: làm bậc 1, rồi dừng lại xem.**

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
