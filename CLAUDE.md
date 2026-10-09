@AGENTS.md

# Web giao ảnh Hamita Studio

Web cho khách xem ảnh cưới và tự chọn ảnh. **Ảnh nằm nguyên trên Google Drive
của studio**, web chỉ là lớp hiển thị — không upload lại, không tốn chỗ chứa.
Thay thế dịch vụ Gump studio đang thuê.

Đang chạy tại **https://www.hamitastudio.com** · trang quản lý ở `/admin`.
Gói Vercel **Pro** từ 27/08/2026. Địa chỉ cũ `hamita-gallery.vercel.app` **vẫn
phục vụ** — link đã gửi khách không chết, và cố ý chưa bật chuyển hướng để nhà
nào đang chọn dở không bị hỏi lại mã.
Tài khoản dùng chung cho Google, Neon và Vercel: `hamita.studio@gmail.com`.

Ba tệp nữa, đọc khi cần — **đừng nạp sẵn cả ba**:

| Tệp | Khi nào mở |
|---|---|
| **`docs/NGUYEN-TAC.md`** | trước khi sửa bất cứ phần nào — 65 nguyên tắc kèm lý do, bẫy đã gặp, thứ đã thử và loại |
| **`BAN-GIAO.md`** | muốn biết trạng thái hiện tại, việc còn treo, lịch sử chi phí |
| **`README.md`** | kiến trúc từng tệp và các bước cài đặt |


---

## CÓ SẴN BẢN ĐỒ CẢ HỆ THỐNG — DÙNG NÓ TRƯỚC KHI ĐỌC CODE

Dựng ngày 09/10/2026 bằng `graphify`. Nằm ở `graphify-out/` (**không** commit, đã
cho vào `.gitignore` — nó dựng lại được từ chính mã nguồn).

**1.680 node · 4.818 cạnh · 87 cụm** — gồm 230 tệp mã (đọc bằng AST, chính xác)
và 7 tài liệu (CLAUDE.md, BAN-GIAO.md, README, hướng dẫn admin…).

Mục đích: **đỡ phải grep cả kho để tìm một hàm**. Hỏi bản đồ trước, mở tệp sau.

```
graphify explain "<tên hàm>"      # gọn nhất — hàm ở tệp nào, dòng nào, ai gọi, gọi ai
graphify path "<A>" "<B>"         # đường ngắn nhất giữa hai thứ
graphify query "<câu hỏi>"        # rộng, dễ loãng — chỉ dùng khi chưa biết tên gì
```

Lệnh nằm ở `C:\Users\Admin\.local\bin\graphify.exe`. **PATH của phiên có thể
chưa có nó** (uv thêm vào lúc cài; phiên mở trước đó không thấy) — gặp
"command not found" thì gọi thẳng đường dẫn tuyệt đối, đừng vội cài lại gì.

`explain` là lệnh đáng dùng nhất:

```
laMucHoanThien()  —  src/lib/constants.ts L241
  <-- AlbumView.tsx  [imports]  L2
  <-- AlbumView()    [calls]    L83
  --> boDau()        [calls]    L242
```

Tên trùng ở hai tệp thì nó báo và liệt kê cả hai, gọi lại bằng
`<đường dẫn>::<tên>` hoặc id đầy đủ.

**Bản đồ CŨ DẦN theo mỗi lần sửa code.** Sửa nhiều rồi thì chạy lại:

```
graphify . --update      # chỉ trích lại tệp đã đổi, giữ phần còn lại
```

**Ba điều phải nhớ khi đọc bản đồ này:**

- **Nó không thay việc đọc code.** Bản đồ nói *ở đâu* và *nối với gì*; muốn biết
  *làm gì* thì vẫn phải mở tệp. Dùng nó để nhảy thẳng tới đúng dòng.
- **Phần tài liệu có thể lệch với code.** `docs/huong-dan-admin.html` bản
  28/08/2026 vẫn mô tả nút tick đã bỏ (15/09), giá 12.000đ (nay 15.000đ) và ô
  "Trang giới thiệu" đã gỡ (17/09) — bản đồ ghi đúng như tài liệu viết, nên
  **CLAUDE.md mới là bản gốc khi hai bên nói khác nhau**.
- **21 cạnh cụt đầu**: chỗ tài liệu nhắc tên một tệp mà bản đồ chưa nối được
  vào node mã tương ứng. Không phải lỗi dữ liệu, chỉ là thiếu liên kết.

*Số đo đáng nhớ từ lần dựng đầu:* `getPrisma()` có **151 cạnh**, bắc qua **28
cụm** — mọi đường vào database đều chui qua một cửa đó (`src/lib/db.ts`). Ba
trục lớn tiếp theo: `quyenAlbum()` 58, `databaseIsConfigured()` 48,
`laQuanTri()` 46.

---

## Giao tiếp

- **Tên của trợ lý trong dự án này là Tris** — do anh đặt. Dùng khi tự giới
  thiệu hoặc khi được hỏi tên.
- **Luôn trả lời bằng tiếng Việt.** Xưng "em", gọi người dùng là "anh".
- Giải thích **lý do**, không chỉ đưa kết quả.
- **Đo đạc thật, không đoán.** Có số liệu thì đưa số liệu.
- **Báo lỗi trung thực**, kể cả lỗi do chính mình gây ra.

---

## Nguyên tắc — DANH MỤC (chi tiết ở `docs/NGUYEN-TAC.md`)

Đây là những quyết định đã chốt sau khi thử và loại các phương án khác.
**Muốn đổi thì phải hỏi trước và nêu rõ lý do.**

Bảng dưới chỉ có TÊN. Lý do, số đo và bẫy đi kèm nằm trong
**`docs/NGUYEN-TAC.md`** — mở tệp đó đọc đúng mục trước khi đụng vào phần
nào, đừng làm theo mỗi cái tên. Tệp đó còn hai mục nữa: *Đã thử và bị loại*
(đừng đề xuất lại) và *Bẫy kỹ thuật đã gặp*.

Tách khỏi tệp này ngày 09/10/2026 vì CLAUDE.md nạp vào **mọi phiên** —
2.700 dòng tốn khoảng 45.000 token mỗi lần, trong khi phần lớn chỉ cần tới
khi thật sự sửa đúng chỗ đó.

- **1.** Chỉ có MỘT chế độ truy cập: xem tự do, cần mã để chọn ảnh.
- **2.** Cả album dùng chung MỘT mã, nên chung MỘT danh sách chọn.
- **3.** Kiểm tra mã ở PHÍA MÁY CHỦ, không chỉ giấu nút.
- **4.** Không chụp danh sách ảnh vào database.
- **5.** Kích thước ảnh tính theo CẠNH DÀI, không phải chiều rộng.
- **6.** Luôn ưu tiên bản dựng sẵn của Google, dùng tham số `=s`.
- **7.** Không dùng `next/image`.
- **8.** Chỉ nhận 5 cỡ ảnh cố định.
- **9.** Trang quản lý KHÔNG gọi Drive.
- **10.** Ảnh bìa do người dùng chọn có cờ `coverPinned`.
- **11.** Mọi lớp CSS dùng chung phải nằm trong `@layer components`.
- **12.** Giao diện cố định tông sáng.
- **13.** `/api/download/[fileId]` bắt buộc kèm `?slug=`.
- **14.** Ô nhập mã album dùng chung `rateLimit.ts` với khoá tiền tố `code:`.
- **15.** Tên studio chỉ có MỘT nguồn duy nhất: `STUDIO_NAME` trong `constants.ts`.
- **16.** `/api/img` chặn nhúng từ web khác nhưng LUÔN cho qua khi thiếu cả `Sec-Fetch-Site` lẫn `Referer`.
- **17.** Mọi slug album đều có đuôi ngẫu nhiên 6 ký tự.
- **18.** Refresh token Google phải mã hoá trước khi ghi vào database.
- **19.** Trang khách không được chết vì Drive trục trặc.
- **20.** Trạng thái "đã chọn xong" tính RIÊNG từng thư mục con.
- **21.** Service worker (`public/sw.js`) TUYỆT ĐỐI không cache.
- **22.** Biểu tượng app là LOGO STUDIO, không phải ảnh của khách.
- **23.** Khi chọn ảnh, máy khách gửi Ý ĐỊNH lên máy chủ, không để máy chủ lật ngược.
- **24.** Khung ảnh mỗi khu trang giới thiệu đặt theo TỈ LỆ THẬT của ảnh trong đó.
- **25.** Trang giới thiệu kể chuyện HÀNH TRÌNH CỦA KHÁCH, không kể lịch sử studio.
- **26.** Bản sao lưu KHÔNG được chứa chìa khoá: phiếu Google, mật khẩu nhân viên.
- **27.** `/api/suc-khoe` kiểm ĐÚNG hai thứ khách cần, không phải "trang có mở được không".
- **28.** Đơn giao in CHỈ tính danh sách "Ảnh in" (trái tim) — từ 15/09/2026 cũng là danh sách duy nhất.
- **29.** Thống kê xếp theo VIỆC CẦN LÀM, không theo con số đẹp.
- **30.** Ba kích thước trên trang khách là chuyện AN TOÀN, không phải thẩm mỹ.
- **31.** Ô ghi chú phải có nút xác nhận nhìn thấy được — lưu ngầm là chưa đủ.
- **32.** Thứ gì gắn với một THƯ MỤC CON thì phải là bảng riêng, tra theo `albumId`.
- **33.** Lời mời cài app phải chốt TRƯỚC khi React chạy, và Android không bao giờ bị giấu nút.
- **34.** "Làm mới" và "Gửi thông báo" là HAI NÚT TÁCH BẠCH.
- **35.** Mọi phép chia theo NGÀY THÁNG đều tính theo giờ studio, không theo giờ máy.
- **36.** Bộ lọc theo tháng ở trang quản lý xếp theo NGÀY TẠO LINK.
- **37.** Bộ mã đầu tên album có MỘT nguồn duy nhất: `src/lib/maAlbum.ts`.
- **38.** Thông tin gói ảnh là khối riêng, NẰM NGOÀI phần hướng dẫn thu gọn được.
- **39.** Khung "Thông báo" ở trang quản lý chỉ chứa VIỆC CỦA STUDIO.
- **40.** Khung xem ảnh to ở trang quản lý dùng ĐÚNG bộ phím của khung phía khách.
- **41.** Số đỏ trên biểu tượng app (Badging API).
- **42.** Không tìm thấy thư mục thì ĐỌC LẠI Drive rồi mới kết luận `notFound()`.
- **43.** Đếm lượt tải theo SỐ TẤM, không theo số lần bấm.
- **44.** Điện thoại tải TỪNG TẤM ẢNH, máy tính tải FILE NÉN.
- **45.** Trang quản lý: từ 1536px thì TRANG KHÔNG CUỘN, chỉ lưới thẻ album cuộn.
- **46.** Khay chia sẻ CHỈ dành cho iPhone — máy tính và Android tải thẳng.
- **47.** Thẻ album nói rõ ĐÃ GỬI THÔNG BÁO CHƯA, và có BA trạng thái.
- **48.** Khung "Hỏi Hamita" trên trang album KHÔNG DÙNG AI, và khách BẤM chứ không GÕ.
- **49.** Thư mục ẢNH ĐÃ CHỈNH XONG hỏi khách một câu khác hẳn thư mục file gốc.
- **50.** Mỗi thư mục con có thể mang một GÓI ẢNH RIÊNG.
- **51.** Phần quản lý studio (`/quan-ly`) đăng nhập bằng TÊN + MẬT KHẨU, không phải Google.
- **52.** Hợp đồng: WEB LÀ NƠI LẬP (từ 21/09/2026). AppSheet chỉ còn để tra dữ liệu cũ.
- **53.** Neon tính tiền theo THỜI GIAN DATABASE THỨC, nên thứ gọi ĐỀU ĐẶN mới là thứ tốn tiền.
- **54.** Khu "Đội ngũ" lấy người từ bảng NhanVien, KHÔNG có danh sách thứ hai.
- **55.** Danh sách nhân viên: quản lý + sale, KHÔNG cho nhân viên thường.
- **56.** XOÁ ALBUM: quản lý + phòng Media.
- **57.** Địa chỉ ảnh xem luôn đi qua `duongDanAnh()`.
- **58.** Trang công khai dùng bản dựng sẵn — đụng vào thì phải gọi `revalidatePath`.
- **59.** Trang "Ảnh khách chọn": mỗi thư mục là một khối có ranh giới, thư mục khách chọn SAU đứng TRƯỚC.
- **60.** Quyền tải ảnh bật/tắt được bất cứ lúc nào, ở cửa sổ Cài đặt.
- **61.** Ảnh trang khách sắp theo GIỜ CHỤP, trừ thư mục ảnh đã chỉnh.
- **62.** Nút "Gửi link cho người thân" — chia sẻ ĐÚNG THƯ MỤC đang mở.
- **63.** Link chia sẻ GIẤU hết đường sang thư mục khác — nhưng chỉ giấu, không chặn.
- **64.** Mỗi thư mục có nút "Chép mã số" riêng; nút ở đầu trang nói rõ là CẢ ALBUM.
- **65.** Thư mục ảnh đã chỉnh có HAI lối ra: "Đã ok" và "Cần chỉnh lại".

## Ranh giới khi thao tác

- **Không tự ý gỡ `ADMIN_PASSWORD`** khỏi `.env.local` để xem giao diện. Người
  dùng đã tỏ ý không thoải mái. Nhờ họ tự kiểm tra thay vì tự mở khoá.
- **Cách kiểm chứng thay thế cho trang cần đăng nhập:** dựng một route thử tạm
  (`src/app/thu-xxx/page.tsx`, không đọc `isAdmin()`) render thẳng component
  cần xem với dữ liệu giả (hoặc bọc `SelectionProvider` thật với props giả cho
  các component phía khách), đo bằng `getBoundingClientRect()`/`getComputedStyle()`
  qua trình duyệt, rồi **xoá thư mục thử ngay sau khi xong** — kiểm tra lại
  bằng `git status` để chắc không sót. Dùng cách này đã kiểm chứng được cả giao
  diện admin lẫn client mà không cần mật khẩu.
- **Muốn thao tác trên dữ liệu thật (không phải chỉ đọc)** — ví dụ test toggle
  lựa chọn, test cảnh báo tải lớn — được phép miễn **dọn sạch ngay sau khi
  kiểm chứng xong** và **đo lại bằng script để xác nhận đã sạch** (không chỉ
  tin là đã dọn). Đã làm nhiều lần với gallery `le-han` trong phiên 24/08.
- **Thao tác phá huỷ dữ liệu thật sự (không định dọn lại) phải hỏi trước** —
  xoá cột, xoá bảng, xoá album của khách. Cột `accessMode` hiện không dùng
  nhưng vẫn giữ, vì xoá là không lùi được.
- **Không thêm tính năng không được yêu cầu.** Người dùng đã gỡ nhiều thứ dư.
- **Không đoán khi không đủ căn cứ** — ví dụ định dạng link Zalo: đã thử vài
  cách, kết quả không rõ ràng, nên hỏi lại người dùng thay vì đoán liều một
  link có thể chết trên trang thật.

---

- **Deploy bằng `git push`** — kho `miticode/HamitaWebDrive` đã nối với dự án
  Vercel **chiều 26/08/2026** (anh tự nối trong Settings → Git). Đẩy lên nhánh
  `main` là Vercel tự dựng bản production.
  *Lịch sử để khỏi lặp lại nhầm lẫn:* bản bàn giao 25/08 ghi câu này khi kho
  **chưa** nối, nên suốt ngày 25 và sáng 26 mọi cú push đều không dựng gì mà
  không ai biết. Cách phát hiện: `npx vercel ls hamita-gallery --scope hamita`
  cho thấy bản mới nhất vẫn cũ hàng chục tiếng.
- **Đừng tin là đã lên, phải kiểm.** Sau khi push, xem `npx vercel ls` có bản
  mới với `Username` là tên tài khoản GitHub (deploy do git kích hoạt) hay
  không, rồi **gọi một đường API vừa đổi và xem nó trả kiểu cũ hay kiểu mới**.
  Đừng đoán theo thời gian.
- **Đường lui khi cần đẩy gấp** (git trục trặc, hoặc muốn dựng từ mã chưa
  commit): `npx vercel deploy --prod --yes --scope hamita`. Lệnh này đôi khi
  báo "Not authorized" vì phiên CLI hết hạn — chạy `npx vercel login` rồi làm lại.
- Kiểm tra bản mới đã lên chưa bằng cách **gọi một đường API vừa đổi và xem nó
  trả về kiểu cũ hay kiểu mới**, đừng đoán theo thời gian.
- **Tài khoản Vercel phải nối với tài khoản GitHub** (Settings → Authentication →
  Login Connections). Từ khi kho có remote GitHub, Vercel đối chiếu email người
  tạo commit với tài khoản GitHub đã nối; chưa nối thì mọi bản deploy đều bị
  chặn ở trạng thái BLOCKED, không có log build nào để lần ra. Email git của kho
  này đặt là địa chỉ noreply của GitHub nên chắc chắn khớp.

---

## Lệnh hay dùng

| Lệnh | Việc |
|---|---|
| `npm run dev` | Chạy ở máy |
| `git push` | **Đưa lên mạng** (Vercel tự dựng) |
| `npx vercel deploy --prod --yes --scope hamita` | Đường lui khi git trục trặc |
| `npm run db:check` | Xem album nào khách đã chọn bao nhiêu ảnh |
| `npm run db:sync` | Chụp lại số liệu Drive cho toàn bộ album |
| `npm run db:backup` | **Sao lưu database** ra `data/sao-luu/` |
| `npm run db:restore` | Liệt kê các bản sao lưu · xem trước · phục hồi |
| `npm run kiem:domain -- https://...` | **Kiểm một domain mới đã sẵn sàng chưa** (16 phép kiểm) |
| `npm run db:push` | Cập nhật cấu trúc database |
