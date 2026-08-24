import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

/**
 * Sinh /sitemap.xml tu dong.
 *
 * Chi co trang chu. Album khach (/g/[slug]) khong dua vao day: chung da tu
 * khai bao "khong index" nen dua vao sitemap — noi chuyen de bao Google "hay
 * index nhung trang nay" — la mau thuan voi chinh chi thi cua trang do.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl().origin,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
