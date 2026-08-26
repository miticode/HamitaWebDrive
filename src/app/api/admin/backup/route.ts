import { isAdmin } from "@/lib/auth";
import { databaseIsConfigured, getPrisma } from "@/lib/db";
import { taoBanSaoLuu, tenTepSaoLuu } from "@/lib/saoLuu";

export const runtime = "nodejs";

/*
  Doc het moi bang roi dung tep — nang hon mot request thuong, cho them thoi
  gian de database lon dan van kip.
*/
export const maxDuration = 60;

/**
 * Nut "Sao luu ngay" ở trang quản lý gọi đường này.
 *
 * VÌ SAO TRẢ VỀ TỆP TẢI XUỐNG thay vì lưu lại ở đâu đó: Vercel có hệ thống tệp
 * **chỉ đọc**, không ghi được. Mà kể cả ghi được thì cũng vô nghĩa — bản sao
 * lưu nằm cùng chỗ với thứ nó bảo vệ thì mất là mất cả hai. Gửi thẳng về máy
 * anh mới đúng tinh thần sao lưu.
 *
 * Dùng chung `taoBanSaoLuu()` với lệnh `npm run db:backup`, nên hai đường không
 * bao giờ lệch nội dung.
 *
 * GET chứ không phải POST, dù nó có ghi lại mốc thời gian: trình duyệt phải
 * điều hướng tới đường này thì mới nhận được tệp tải xuống, mà điều hướng chỉ
 * gửi được GET.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  if (!databaseIsConfigured()) {
    return Response.json({ error: "Chưa có database" }, { status: 503 });
  }

  const luc = new Date();
  const ban = await taoBanSaoLuu(luc);
  const noiDung = JSON.stringify(ban, null, 2);

  /*
    Ghi lại mốc để trang quản lý nói được "lần cuối cách đây bao lâu".
    Nuốt lỗi: ghi mốc hỏng thì cũng không được làm hỏng việc giao tệp — tệp mới
    là thứ anh cần, cái mốc chỉ để nhắc.
  */
  await getPrisma()
    .moc.upsert({
      where: { ten: "saoLuu" },
      create: { ten: "saoLuu", luc },
      update: { luc },
    })
    .catch(() => {});

  const tenTep = tenTepSaoLuu(luc);

  return new Response(noiDung, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tenTep}"`,
      // Bản sao lưu là ảnh chụp tại một thời điểm — không đời nào được cache lại.
      "Cache-Control": "no-store",
    },
  });
}
