import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/constants";

/**
 * Sinh /sitemap.xml tu dong.
 *
 * Chi co cac trang quang ba cong khai (trang chu, phim truong, anh cuoi). Album khach (/g/[slug]) khong dua vao
 * day: chung da tu khai bao "khong index" nen dua vao sitemap — noi chuyen de
 * bao Google "hay index nhung trang nay" — la mau thuan voi chinh chi thi cua
 * trang do.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const goc = siteUrl().origin;
  return [
    {
      url: goc,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      /*
        Trang phim truong dung o day chu khong phai trang album cua khach: no
        cong khai, khong doi ma, va la thu khach hay tim ("phim truong chup
        cuoi Long An"). Anh doi bo canh thi trang doi theo nen bao Google ghe
        lai hang tuan.
      */
      url: `${goc}/dich-vu/hamita-garden`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      // Trang Ảnh cưới (17/09/2026); tự chuyển tới mục đầu tiên đang có ảnh.
      url: `${goc}/dich-vu/anh-cuoi`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
