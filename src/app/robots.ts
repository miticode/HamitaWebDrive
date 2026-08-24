import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

/**
 * Sinh /robots.txt tu dong.
 *
 * Chi chan /admin va /api — hai noi khong co gia tri gi de bot doc, chan bot
 * khoi phi cong suc quet vao do. KHONG chan /g/ (album khach): trang do da tu
 * khai bao "khong index" ngay trong the metadata cua chinh no (generateMetadata
 * trong g/[slug]/page.tsx) — chan crawl luon o day se khien Google khong doc
 * duoc chi thi "khong index" do, co the van lay URL vao ket qua tim kiem ma
 * khong co noi dung. De crawler tu ghe qua roi tu rut lui la dung cach hon.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl().origin}/sitemap.xml`,
  };
}
