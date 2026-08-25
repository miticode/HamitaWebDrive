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
      /*
        Biểu tượng là LOGO STUDIO, không phải ảnh trong album khách.

        Bản đầu lấy ảnh bìa album để khách lưu nhiều nhà thì phân biệt được,
        nhưng studio muốn giữ nhận diện thương hiệu — mở màn hình điện thoại ra
        là thấy logo Hamita. Tên khách vẫn nằm ngay dưới biểu tượng nên không
        lẫn được.

        Dùng tệp tĩnh dựng sẵn trong public/ chứ không sinh theo yêu cầu: logo
        giống nhau ở mọi album, không việc gì phải gọi Drive và cắt ảnh lại cho
        từng album.

        Nền kem đặc chứ không để trong suốt: logo gốc trong suốt, mà iOS lấp
        khoảng trong suốt bằng màu đen — icon sẽ thành một ô đen xấu.
      */
      icons: [
        { src: "/icon-app-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        /*
          Bản riêng cho Android: hệ điều hành tự cắt theo hình của máy (bo tròn,
          giọt nước…), nên bản này để logo nhỏ hơn hẳn cho khỏi bị xén mép.
        */
        {
          src: "/icon-app-maskable-512.png",
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
