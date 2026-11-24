import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/*
  `npm run lint` CHẾT VÌ HẾT BỘ NHỚ — sửa 24/11/2026.

  Lệnh `eslint` không kèm đường dẫn thì quét từ thư mục gốc. ESLint 9 chỉ tự
  bỏ qua `node_modules` và `.git`; nó KHÔNG đọc `.gitignore`. Nên mọi thư mục
  sản phẩm dựng nằm trong kho đều bị quét như mã nguồn thật.

  Đếm 24/11:

      .open-next     24.083 tệp .js
      .wrangler           4
      src/generated      50  (Prisma Client sinh từ schema)
      ─────────────────────
      mã thật trong src  289

  Hai mươi tư nghìn tệp với bộ quy tắc có đọc kiểu của `eslint-config-next`
  thì V8 hết heap, báo `node::OnFatalError` rồi đổ một đống địa chỉ máy —
  nhìn như ESLint hỏng, thật ra chỉ là quét nhầm chỗ.

  DANH SÁCH DƯỚI ĐÂY PHẢI KHỚP `.gitignore`. Thêm thư mục sinh ra nào vào
  `.gitignore` thì thêm cả ở đây, không thì lệnh lint lại chết lần nữa.

  Đã cân nhắc `includeIgnoreFile` của `@eslint/compat` để đọc thẳng
  `.gitignore` — gọn hơn về nguyên tắc "một nguồn duy nhất", nhưng phải thêm
  một gói phụ thuộc chỉ để khỏi chép mười dòng. Chép mười dòng rẻ hơn.
*/
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Sản phẩm dựng cho Cloudflare (nhánh thử) — 24.083 tệp.
    ".open-next/**",
    ".wrangler/**",

    // Prisma Client sinh lại được bằng `npx prisma generate`; lint mã sinh ra
    // không sửa được gì mà `tsc` vẫn kiểm nó qua mọi chỗ import.
    "src/generated/**",

    // Bản đồ tri thức graphify và kho dữ liệu tạm khi chạy ở máy.
    "graphify-out/**",
    "data/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
