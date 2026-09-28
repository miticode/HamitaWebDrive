import { NextRequest, NextResponse } from "next/server";
import { quyenAlbum } from "@/lib/quyenAlbum";
import { COOKIE_XEM_THU, HAN_XEM_THU_GIAY } from "@/lib/moMuc";

/**
 * Cửa vào trang khách dành cho người trong tiệm — anh yêu cầu 28/09/2026.
 *
 * Vì sao cần: nút "Logs" ghi lần đầu khách mở từng thư mục, và web bỏ qua lượt
 * của người ĐANG ĐĂNG NHẬP. Nhưng studio hay mở link khách trên điện thoại
 * (không đăng nhập) để kiểm tra — những lượt đó vẫn bị ghi, làm log nói dối là
 * khách đã xem.
 *
 * Đi qua cửa này thì máy được đóng một dấu (cookie) sống bốn tiếng, và mọi thư
 * mục mở trong khoảng đó không vào log. Bốn tiếng vì studio kiểm tra xong là
 * thôi; để lâu hơn thì hôm sau chính điện thoại đó mở link thật cũng không ghi.
 *
 * Dấu chỉ đóng cho NGƯỜI CÓ QUYỀN. Link này lỡ lọt ra ngoài (studio chép nhầm
 * gửi khách) thì khách vẫn vào xem bình thường và vẫn được ghi log như thường.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const den = new URL(`/g/${slug}`, req.url);
  const res = NextResponse.redirect(den);

  if (await quyenAlbum()) {
    res.cookies.set(COOKIE_XEM_THU, "1", {
      maxAge: HAN_XEM_THU_GIAY,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
