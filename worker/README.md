# Worker bắn ảnh — hướng dẫn dựng

Worker này thay máy chủ Vercel giao ảnh gốc cho khách tải về. Lý do: chặng
Vercel → khách tốn **168 GB/tháng ≈ 45 đô**, hơn nửa hoá đơn; Cloudflare
không tính tiền băng thông ra khách và cho 100.000 lượt mỗi ngày miễn phí,
trong khi studio chỉ dùng khoảng 3.300.

**Worker không tự quyết được gì.** Vercel vẫn kiểm đủ như cũ (album có cho tải
không, ảnh có đúng thuộc album đó không) rồi mới ký một đường dẫn sống 10 phút.
Worker chỉ giao đúng tấm ảnh trong đường dẫn đã ký.

---

## Dựng lần đầu

### 1. Lấy ba thứ từ Google

Vào Vercel → project `hamita-gallery` → Settings → Environment Variables, chép
ra hai giá trị:

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Thứ ba — **mã làm mới của tài khoản studio** — nằm trong database, lấy bằng:

```bash
npm run xem:refresh-token
```

### 2. Nghĩ một chuỗi bí mật dùng chung

Chuỗi này để Vercel ký và Worker kiểm chữ ký. Sinh một chuỗi ngẫu nhiên:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Giữ nguyên chuỗi đó, lát nữa khai ở **cả hai nơi**.

### 3. Đưa Worker lên Cloudflare

```bash
cd worker
npx wrangler login
npx wrangler deploy
```

Xong sẽ hiện địa chỉ dạng `https://hamita-tai-anh.<tên-anh>.workers.dev`.

### 4. Khai bốn thứ bí mật cho Worker

```bash
npx wrangler secret put KY_CHUNG
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
```

Mỗi lệnh sẽ hỏi rồi anh dán giá trị vào. Những thứ này **không hiện lại** trên
bảng điều khiển Cloudflare sau khi khai.

### 5. Bật ở Vercel

Vào Vercel → Settings → Environment Variables, thêm hai biến cho **Production**:

| Tên | Giá trị |
|---|---|
| `TAI_ANH_WORKER_URL` | địa chỉ Worker ở bước 3 |
| `TAI_ANH_KY_CHUNG` | chuỗi bí mật ở bước 2 |

Rồi **Redeploy**. Từ lúc này ảnh tải về đi qua Cloudflare.

---

## Tắt đi khi cần

Xoá hai biến `TAI_ANH_WORKER_URL` và `TAI_ANH_KY_CHUNG` ở Vercel rồi redeploy.
Ảnh quay lại đi đường cũ qua Vercel ngay, khách không mất đường tải. Worker
vẫn nằm đó, không ảnh hưởng gì.

---

## Kiểm sau khi bật

1. Mở một album, bấm tải một tấm — file về đúng tên, mở lên xem được.
2. Xem trong mục tải xuống của trình duyệt: nguồn phải là `workers.dev`.
3. Sau một ngày, vào Vercel → Observability → Fast Data Transfer: dòng
   `/api/download` phải **tụt xuống gần 0**.

---

## Những chỗ dễ vấp

- **Đổi kết nối Google** (bấm "Ngắt kết nối Drive" rồi nối lại ở trang quản lý)
  làm mã làm mới cũ chết. Phải lấy mã mới và khai lại
  `GOOGLE_REFRESH_TOKEN` cho Worker, nếu không khách tải sẽ gặp lỗi 502.
- **`worker/src/jpeg.ts` là bản sao của `src/lib/jpeg.ts`.** Sửa một bên thì
  phải sửa bên kia, nếu không ảnh tải từ Worker và từ Vercel sẽ khác nhau.
- **Quyền của mã làm mới là `drive.readonly`** — đọc được toàn bộ Drive của
  tài khoản studio, không riêng thư mục ảnh khách. Đây là điều đã biết và chấp
  nhận khi chọn cách này (28/09/2026).
