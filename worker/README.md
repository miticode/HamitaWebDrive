# Worker bắn ảnh — hướng dẫn dựng

Worker này thay máy chủ Vercel giao ảnh cho khách. Lý do: mỗi GB đi từ máy chủ
Vercel ra ngoài tốn **$0,27**, chiếm gần như toàn bộ phần vượt của hoá đơn;
Cloudflare không tính tiền băng thông ra khách và cho 100.000 lượt mỗi ngày
miễn phí, trong khi studio chỉ dùng khoảng 3.300.

Worker làm **hai việc, hai đường riêng**:

| Đường | Việc | Giữ an toàn bằng |
|---|---|---|
| `/t/{mã}` | Khách **tải** bản gốc về máy | Chữ ký của Vercel, sống 10 phút |
| `/i/{mã}?w=960` | Khách **xem** ảnh trên trang album | Chặn nhúng từ web khác |

**Đường tải:** Vercel vẫn kiểm đủ như cũ (album có cho tải không, ảnh có đúng
thuộc album đó không) rồi mới ký. Worker chỉ giao đúng tấm trong đường dẫn đã ký.

**Đường xem:** không ký, vì địa chỉ ảnh nằm trong mã HTML và trình duyệt phải
gọi lại được sau khi trang đã tải — y như `/api/img` bên Vercel vẫn làm suốt.
Lớp bảo vệ là chặn nhúng, giữ đúng mức cũ.

Ảnh xem **không qua `sharp`**: Google có sẵn bản dựng ở mọi cỡ, thêm hậu tố
`-rw` vào `thumbnailLink` là ra thẳng WebP. Đã đo 28/09/2026 trên 4 ảnh thật,
so với ảnh mốc (thang 0-255): cỡ 640 `sharp` hơn 0,4; cỡ 960 hơn 0,2; **cỡ
2048 Google hơn 0,4**. Chênh dưới 0,5 ở mọi cỡ, mắt người không thấy.

Bỏ được `sharp` nghĩa là bỏ luôn tiền CPU và bộ nhớ của Vercel, chứ không chỉ
tiền truyền dữ liệu.

---

## Dựng lần đầu

### 1. Lấy đủ bí mật bằng MỘT lệnh

Ở thư mục gốc dự án:

```bash
npm run bi-mat-worker
```

Lệnh in ra đủ bốn chuỗi cần khai cho Worker, kèm sẵn lệnh phải chạy, và hai
biến phải khai ở Vercel. Cứ để cửa sổ đó mở, lát nữa chép dần.

Vì sao cần lệnh này thay vì vào Vercel xem: Vercel **khoá không cho xem lại**
giá trị đã khai. Nhưng hai chuỗi của Google vốn nằm sẵn trong `.env.local`
trên máy studio, còn mã làm mới thì trong database **ở dạng đã mã hoá** —
lệnh trên tự giải ra.

### 2. Đưa Worker lên Cloudflare

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Xong sẽ hiện địa chỉ dạng `https://hamita-tai-anh.<tên-anh>.workers.dev`.

### 3. Khai bốn thứ bí mật cho Worker

Ba thứ của Google khai bằng máy, ở thư mục gốc dự án:

```bash
npm run khai-bi-mat-worker
```

Lệnh này đọc thẳng giá trị từ `.env.local` và database rồi bơm vào wrangler,
không qua tay dán. Nó cũng thử xin vé Drive trước khi khai, hỏng thì dừng luôn.

Vì sao không dán tay: mã làm mới dài 103 ký tự, có cả `/` và `-`. Đứt một ký
tự lúc dán là khách bấm tải gặp **502 "Không vào được Drive lúc này"**, mà
Cloudflare khoá không cho xem lại giá trị đã khai nên không cách nào soi ra.
Đã vấp đúng lỗi này 28/09/2026.

Còn `KY_CHUNG` thì khai tay, trong thư mục `worker`:

```bash
npx wrangler secret put KY_CHUNG
```

Nó phải khớp với `TAI_ANH_KY_CHUNG` bên Vercel — mà bên đó người khai bằng
tay, nên để máy tự sinh một bên là lệch.

### 4. Bật ở Vercel

Vào Vercel → Settings → Environment Variables, thêm hai biến cho **Production**:

| Tên | Giá trị | Type |
|---|---|---|
| `TAI_ANH_WORKER_URL` | địa chỉ Worker ở bước 2 | Config |
| `TAI_ANH_KY_CHUNG` | chuỗi `KY_CHUNG` ở bước 1 | **Secret** |
| `NEXT_PUBLIC_ANH_WORKER_URL` | địa chỉ Worker ở bước 2 | Config |

Rồi **Redeploy**. Hai biến đầu lo ảnh tải về, biến thứ ba lo ảnh xem trên trang.

Khai riêng lẻ được: chỉ khai hai biến đầu thì ảnh xem vẫn đi đường cũ, và
ngược lại. Mỗi đường tự tắt bật độc lập.

---

## Tắt đi khi cần

Xoá biến ở Vercel rồi redeploy. Ảnh quay lại đi đường cũ ngay, khách không mất
gì. Worker vẫn nằm đó, không ảnh hưởng.

- Tắt **đường tải**: xoá `TAI_ANH_WORKER_URL` và `TAI_ANH_KY_CHUNG`
- Tắt **đường xem**: xoá `NEXT_PUBLIC_ANH_WORKER_URL`

Tắt được từng đường một, không phải tắt cả hai.

---

## Kiểm sau khi bật

1. Mở một album, bấm tải một tấm — file về đúng tên, mở lên xem được.
2. **Đừng tin dòng "From" trong mục tải xuống của Chrome** — nó ghi trang bấm
   nút, tức `hamitastudio.com`, kể cả khi ảnh đi qua Worker. Muốn nhìn tận
   mắt thì mở DevTools → Network trước khi bấm tải: dòng `/api/download` phải
   trả **302** và dòng kế tiếp là `workers.dev`.
3. Sau một ngày, vào Vercel → Observability → Fast Data Transfer: dòng
   `/api/download` phải **tụt xuống gần 0**.

---

## Kiểm đường xem ảnh

Bộ kiểm dưới đây chạy được bất cứ lúc nào, không đụng dữ liệu gì. Thay `MA`
bằng mã một tấm ảnh thật (lấy trong địa chỉ `img` trên trang album):

```bash
NEN=https://hamita-tai-anh.hamitastudio.workers.dev
MA=<mã ảnh thật>
# Trang mình nhúng ảnh -> 200
curl -s -o /dev/null -w "%{http_code}
" -H "Referer: https://www.hamitastudio.com/" "$NEN/i/$MA?w=960"
# Web khác nhúng trộm -> 403
curl -s -o /dev/null -w "%{http_code}
" -H "Referer: https://ai-do.com/" "$NEN/i/$MA?w=960"
# Web khác giấu nguồn -> 403
curl -s -o /dev/null -w "%{http_code}
" -H "Sec-Fetch-Dest: image" -H "Sec-Fetch-Site: cross-site" "$NEN/i/$MA?w=960"
# Bot Facebook, hệ thống dựng ảnh sẵn -> 200
curl -s -o /dev/null -w "%{http_code}
" "$NEN/i/$MA?w=960"
```

Vừa đổi Worker xong mà kết quả sai thì **đợi một phút rồi thử lại**: Cloudflare
mất một lúc để đưa bản mới ra hết các máy chủ. Đã mắc lừa chuyện này 28/09/2026.

## Những chỗ dễ vấp

- **Đổi kết nối Google** (bấm "Ngắt kết nối Drive" rồi nối lại ở trang quản lý)
  làm mã làm mới cũ chết. Phải lấy mã mới và khai lại
  `GOOGLE_REFRESH_TOKEN` cho Worker, nếu không khách tải sẽ gặp lỗi 502.
- **`worker/src/jpeg.ts` là bản sao của `src/lib/jpeg.ts`.** Sửa một bên thì
  phải sửa bên kia, nếu không ảnh tải từ Worker và từ Vercel sẽ khác nhau.
- **`npm run bi-mat-worker` sinh `KY_CHUNG` MỚI mỗi lần chạy.** Chạy lại để
  xem ba thứ của Google thì cứ xem, nhưng đừng khai lại riêng `KY_CHUNG` —
  Worker và Vercel lệch nhau là khách bấm tải gặp 403. Muốn đổi thì đổi cả hai
  nơi cùng lúc: `npx wrangler secret put KY_CHUNG` rồi sửa `TAI_ANH_KY_CHUNG`
  ở Vercel và redeploy.
- **Ảnh xem chặn nhúng bằng `Referer`, không phải `Sec-Fetch-Site`.** Bên
  Vercel dùng `Sec-Fetch-Site` được vì ảnh và trang cùng tên miền; sang Worker
  thì header đó luôn báo `cross-site` nên vô dụng. Chỗ này đã suýt lỏng hơn
  bản cũ: web khác chỉ cần `<img referrerpolicy="no-referrer">` là không gửi
  Referer và lọt. Nay bịt bằng cách chặn đúng bộ ba "không Referer +
  `Sec-Fetch-Dest: image` + `Sec-Fetch-Site: cross-site`". Sửa lớp này thì
  phải chạy lại bộ kiểm ở trên, đủ cả sáu dòng.
- **`HOST_CHO_PHEP` trong `wrangler.toml` phải theo kịp tên miền.** Đổi tên
  miền web mà quên sửa đây là ảnh mất sạch trên trang, trong khi trang vẫn tải
  bình thường — rất khó đoán ra.
- **Cỡ ảnh trong `worker/src/anhXem.ts` phải khớp `ALLOWED_SIZES` của
  `/api/img`.** Lệch nhau thì bật/tắt Worker là ảnh đổi kích thước giữa chừng.
- **Quyền của mã làm mới là `drive.readonly`** — đọc được toàn bộ Drive của
  tài khoản studio, không riêng thư mục ảnh khách. Đây là điều đã biết và chấp
  nhận khi chọn cách này (28/09/2026).
