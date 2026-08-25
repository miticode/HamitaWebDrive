import { NextRequest } from "next/server";
import { STUDIO_NAME } from "@/lib/constants";
import { getGalleryBySlug } from "@/lib/store";

export const runtime = "nodejs";

/**
 * Bản khai báo để album mở ra như một ứng dụng trên điện thoại khách.
 *
 * Mỗi album một bản riêng, không dùng chung một bản cho cả web: `start_url`
 * phải trỏ đúng album đó thì lối tắt khách bấm mới vào thẳng ảnh nhà mình,
 * chứ không rơi về trang giới thiệu studio. Tên hiện dưới biểu tượng cũng là
 * tên khách, nên lưu vài album vẫn phân biệt được.
 */
/** Tối đa bao nhiêu ký tự thì tên dưới biểu tượng còn hiện đủ, không bị cắt. */
const TOI_DA = 12;

/**
 * Rút tên cho vừa chỗ dưới biểu tượng, cắt ở chỗ ngắt gần nhất.
 *
 * Cắt cứng theo số ký tự sẽ ra những cái tên trông như lỗi: "HC-Her-His-Ngọc
 * Thơ & Bá Bền" thành "HC-Her-His-N". Lùi về chỗ ngắt cuối cùng còn nằm trong
 * giới hạn thì được một cụm trọn vẹn — "HC-Her-His".
 *
 * Tính cả dấu gạch làm chỗ ngắt, không chỉ khoảng trắng: tên album ở đây hay
 * mang mã ghép bằng gạch nối ("HC-Her-His-…"), mười hai ký tự đầu có khi không
 * có lấy một khoảng trắng nào để lùi về.
 */
function tenNgan(ten: string): string {
  const sach = ten.trim();
  if (sach.length <= TOI_DA) return sach;

  const cat = sach.slice(0, TOI_DA);
  const ngat = Math.max(
    cat.lastIndexOf(" "),
    cat.lastIndexOf("-"),
    cat.lastIndexOf("–"),
    cat.lastIndexOf("—")
  );

  // Bỏ luôn dấu ngắt và khoảng trắng thừa ở cuối, khỏi ra "HC-Her-His-".
  return (ngat > 0 ? cat.slice(0, ngat) : cat).replace(/[\s\-–—]+$/, "").trim();
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return Response.json({ error: "Không tìm thấy" }, { status: 404 });

  const ten = gallery.clientName ?? gallery.title;

  return Response.json(
    {
      name: `${ten} — ${STUDIO_NAME}`,
      /*
        Tên dưới biểu tượng chỉ hiện được khoảng 12 ký tự rồi bị cắt, nên cắt
        sẵn cho gọn. Cắt ở khoảng trắng gần nhất chứ không cắt cứng giữa chữ —
        "HC-Her-His-Ngọc Thơ & Bá Bền" cắt cứng ra "HC-Her-His-N" trông như bị
        lỗi, còn cắt theo từ ra "HC-Her-His" thì đọc được.
      */
      short_name: tenNgan(ten),
      description: `Bộ ảnh của ${ten} do ${STUDIO_NAME} thực hiện`,
      start_url: `/g/${slug}`,
      /*
        Giới hạn phạm vi đúng album này. Nhờ vậy khách bấm lối tắt là vào thẳng
        ảnh nhà mình; lỡ bấm một liên kết ra ngoài phạm vi thì trình duyệt mở
        tab thường, không lẫn vào cửa sổ app.
      */
      scope: `/g/${slug}`,
      /* standalone = mở toàn màn hình như app, không có thanh địa chỉ. */
      display: "standalone",
      orientation: "portrait",
      /* Nền kem của web, để lúc mở app không loé lên một khung trắng lạ. */
      background_color: "#fdfcfa",
      theme_color: "#fdfcfa",
      lang: "vi",
      icons: [
        {
          src: `/g/${slug}/icon/192`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: `/g/${slug}/icon/512`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        /*
          Bản "maskable" cho Android: hệ điều hành tự bo tròn hoặc cắt theo hình
          của máy. Dùng lại đúng tấm ảnh — ảnh cưới chủ thể nằm giữa nên cắt
          viền không mất mặt người.
        */
        {
          src: `/g/${slug}/icon/512`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json; charset=utf-8",
        // Studio đổi tên album hay ảnh bìa thì bản khai báo nên đổi theo trong ngày.
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
