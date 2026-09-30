import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

/**
 * Cấu hình đưa web lên Cloudflare Workers — ĐANG THỬ, chưa dùng thật.
 *
 * `incrementalCache` là chỗ chứa bản dựng sẵn của các trang. Trên Vercel việc
 * này có sẵn; sang Cloudflare phải tự chỉ định chỗ chứa, ở đây là một thùng R2.
 *
 * Thiếu nó thì trang giới thiệu và trang dịch vụ quay lại dựng mỗi lượt khách
 * ghé — tức đọc database mỗi lượt, đúng thứ vừa bỏ công cắt (nguyên tắc 58).
 */
export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
