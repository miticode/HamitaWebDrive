import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Cấu hình đưa web lên Cloudflare Workers — ĐANG THỬ, chưa dùng thật.
 *
 * TẠM BỎ `incrementalCache` (05/11/2026). Bản gốc dùng một thùng R2 làm chỗ
 * chứa bản dựng sẵn của các trang, nhưng tài khoản chưa bật R2 (lỗi 10042
 * "Please enable R2 through the Cloudflare Dashboard"), mà việc bật R2 là
 * thao tác trong bảng điều khiển của anh Hậu chứ máy không tự làm được.
 *
 * Bỏ đi để đẩy được bản thử lên đo CPU trước — đó mới là câu hỏi đáng tiền.
 * Hệ quả: trang giới thiệu và trang dịch vụ dựng lại mỗi lượt ghé thay vì đọc
 * bản có sẵn, tức là BẢN THỬ TỐN CPU NHIỀU HƠN mức thật sẽ tốn. Số đo được ở
 * đây là trần trên, không phải số cuối cùng.
 *
 * Khôi phục khi bật R2 xong:
 *
 *   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
 *   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
 *
 * và trả lại khối "r2_buckets" trong wrangler.jsonc.
 */
export default defineCloudflareConfig({});
