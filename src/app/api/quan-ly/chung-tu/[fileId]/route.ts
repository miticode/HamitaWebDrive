import { getPrisma } from "@/lib/db";
import { docTuKho } from "@/lib/khoAnh";
import { layNguoiDung, xemTienVaKhach } from "@/lib/phienNhanVien";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phục vụ ảnh chứng từ thu chi, đọc từ kho Drive (`src/lib/khoAnh.ts`).
 *
 * VÌ SAO PHẢI ĐI VÒNG QUA MÁY CHỦ thay vì trỏ thẳng link Drive cho trình
 * duyệt: chứng từ là giấy tờ tiền bạc của tiệm. Trỏ thẳng thì ai có đường dẫn
 * cũng mở được, mà đường dẫn thì lọt ra ngoài rất dễ — khác hẳn ảnh cưới của
 * khách, thứ vốn đã cố ý cho xem tự do (nguyên tắc 1).
 *
 * Ba lớp chặn, theo thứ tự:
 *   1. Phải đăng nhập và phải được xem tiền (cùng mức với trang Sổ quỹ).
 *   2. Mã tệp phải ĐANG ĐƯỢC MỘT DÒNG SỔ TRỎ TỚI. Không cho lấy mã bất kỳ rồi
 *      đọc mọi thứ web từng ghi lên kho — ảnh chấm công cũng nằm trên ổ đó.
 *   3. Chỉ lúc đó mới hỏi Drive.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const nguoi = await layNguoiDung();
  if (!xemTienVaKhach(nguoi)) {
    return Response.json({ error: "Không có quyền xem chứng từ." }, { status: 403 });
  }

  const { fileId } = await params;
  if (!/^[A-Za-z0-9_-]{10,100}$/.test(fileId)) {
    return Response.json({ error: "Mã tệp không hợp lệ." }, { status: 400 });
  }

  const co = await getPrisma().chiTieu.findFirst({
    where: { anhKho: fileId },
    select: { id: true },
  });
  if (!co) return Response.json({ error: "Không tìm thấy chứng từ." }, { status: 404 });

  const tep = await docTuKho(fileId);
  if (!tep) return Response.json({ error: "Không đọc được chứng từ trên Drive." }, { status: 502 });

  return new Response(tep.duLieu, {
    headers: {
      "Content-Type": tep.kieu,
      /*
        `private` — chỉ trình duyệt của chính người đang đăng nhập được giữ lại,
        không để máy trung gian nào nhớ hộ. Giữ một giờ là đủ cho một lượt xem
        đi xem lại, mà không giữ lâu tới mức gỡ quyền xong vẫn mở được.
      */
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
