import { cached } from "@/lib/cache";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { loadTree } from "@/lib/gallery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Đường kiểm tra sức khoẻ, dành cho dịch vụ theo dõi bên ngoài gọi vào.
 *
 * TRẢ VỀ 200 khi mọi thứ chạy, **503** khi có bộ phận hỏng. Mọi dịch vụ theo
 * dõi đều dựa vào mã trạng thái này, nên đó mới là phần quan trọng — phần chữ
 * trả về chỉ để người đọc log biết hỏng ở đâu.
 *
 * VÌ SAO KHÔNG PHẢI CHỈ GỌI TRANG CHỦ: trang chủ trả về 200 ngay cả khi kết nối
 * Drive đã đứt — lúc đó khách vẫn mở được link nhưng thấy màn hình "ảnh vẫn còn
 * nguyên" thay vì ảnh. Đó là kiểu hỏng dễ xảy ra hơn hẳn việc cả Vercel sập, mà
 * một phép kiểm "trang có trả về 200 không" lại bỏ sót đúng nó. Ở đây kiểm
 * ĐÚNG hai thứ mà khách cần: database đọc được, và ảnh trên Drive đọc được.
 *
 * VÌ SAO ĐỂ CÔNG KHAI, không đòi mã: dịch vụ theo dõi nào cũng gọi được ngay
 * mà không phải cấu hình gì thêm. Đổi lại thì phần trả về cố ý nghèo nàn —
 * đúng/sai cho từng bộ phận, không tên album, không số liệu, không thông báo
 * lỗi gốc. Người ngoài đọc được cũng không biết thêm gì về studio.
 *
 * Kết quả có cache 60 giây nên ai gọi dồn dập cũng không làm tốn thêm lần gọi
 * Drive nào.
 */

const TTL_MS = 60 * 1000;

type SucKhoe = {
  ok: boolean;
  kiem: { database: boolean; drive: boolean };
  luc: string;
};

async function kiemTra(): Promise<SucKhoe> {
  let database = false;
  let drive = false;

  /*
    Album dùng để thử: chọn cái có ÍT thư mục con nhất. Mỗi thư mục con là một
    lần gọi Drive, nên thử album 8 thư mục thay vì album 1 thư mục là tốn gấp
    tám lần cho cùng một câu trả lời.

    Dùng album thật chứ không phải một mã thư mục bịa: mã bịa thì Drive trả về
    404 ngay cả khi kết nối hoàn toàn khoẻ, không phân biệt được.

    CHỈ LẤY ALBUM ĐÃ CÓ THƯ MỤC (`albumCount > 0`). Studio gửi link cho khách
    TRƯỚC khi có ảnh — album rỗng là trạng thái bình thường, cố ý, không phải
    hỏng hóc. Thiếu điều kiện này thì `orderBy` luôn chọn đúng một album rỗng
    (0 là nhỏ nhất), đọc ra cây không có thư mục nào, rồi kết luận Drive hỏng.

    Đã xảy ra thật: ngày 03/09/2026 đường này trả 503 suốt trong khi Drive
    hoàn toàn khoẻ — ảnh vẫn tải về 77 KB trong 1,9 giây và cả ba trang album
    đều mở 200. Kiểu báo nhầm này còn tệ hơn không có phép kiểm nào: dịch vụ
    theo dõi sẽ kêu liên tục cho tới lúc studio tắt nó đi, đúng lúc đó thì hỏng
    thật cũng không ai biết.
  */
  let folderId: string | null = null;

  if (databaseIsConfigured()) {
    try {
      const g = await getPrisma().gallery.findFirst({
        where: { albumCount: { gt: 0 } },
        orderBy: { albumCount: "asc" },
        select: { driveFolderId: true },
      });
      database = true;
      folderId = g?.driveFolderId ?? null;
    } catch {
      database = false;
    }
  }

  if (folderId) {
    try {
      const tree = await loadTree(folderId);
      // Đọc được cây nhưng rỗng cũng là hỏng: khách mở link sẽ không thấy ảnh nào.
      drive = tree.albums.length > 0;
    } catch {
      drive = false;
    }
  } else if (database) {
    /*
      Database khoẻ nhưng không có album nào ĐỦ ĐIỀU KIỆN để thử — chưa tạo
      album nào, hoặc mọi album đang còn rỗng chờ media đổ ảnh vào. Không có gì
      để thử thì coi là khoẻ chứ không phải hỏng: cả hai trường hợp đều là
      trạng thái bình thường, không có gì sai.
    */
    drive = true;
  }

  return {
    ok: database && drive,
    kiem: { database, drive },
    luc: new Date().toISOString(),
  };
}

export async function GET() {
  const kq = await cached("suc-khoe", TTL_MS, kiemTra);

  return Response.json(kq, {
    status: kq.ok ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
