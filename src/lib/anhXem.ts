/**
 * Địa chỉ một tấm ảnh để HIỂN THỊ trên trang (không phải để tải về).
 *
 * Một chỗ duy nhất quyết định ảnh đi đường nào, vì trước đây địa chỉ `/api/img`
 * nằm rải rác hơn hai chục chỗ — sửa tay từng chỗ thì kiểu gì cũng sót một cái,
 * mà sót thì không ai thấy: ảnh vẫn hiện bình thường, chỉ là tháng sau hoá đơn
 * không giảm như tính.
 *
 * CÓ khai NEXT_PUBLIC_ANH_WORKER_URL  -> ảnh đi qua Cloudflare Worker.
 * KHÔNG khai                          -> ảnh đi đường cũ qua Vercel.
 *
 * Xoá biến rồi dựng lại là về đường cũ ngay, khách không mất ảnh lúc nào. Giữ
 * đúng cách đã làm với đường tải (TAI_ANH_WORKER_URL) hôm 28/09/2026.
 *
 * KHÔNG ĐƯỢC nhập gì dính Prisma vào tệp này (nguyên tắc 43): nó bị các thành
 * phần chạy ở máy khách gọi tới, kéo theo Prisma là hỏng cả bản dựng.
 */

/**
 * Vì sao là NEXT_PUBLIC_: địa chỉ này phải có mặt trong mã chạy ở máy khách —
 * lưới ảnh đổi cỡ ảnh ngay trên trình duyệt khi khách bấm xem to. Biến thường
 * chỉ máy chủ đọc được.
 *
 * Hệ quả phải nhớ: Next thay chuỗi này vào lúc DỰNG, nên đổi biến ở Vercel
 * xong phải Redeploy mới ăn.
 */
const NEN = process.env.NEXT_PUBLIC_ANH_WORKER_URL?.trim().replace(/\/+$/, "");

export function duongDanAnh(fileId: string, co: number): string {
  if (!NEN) return `/api/img/${fileId}?w=${co}`;
  return `${NEN}/i/${fileId}?w=${co}`;
}
