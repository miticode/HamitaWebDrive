import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { saveConnection, type KetNoi } from "@/lib/googleAuth";

export const runtime = "nodejs";

/** Chuyen ve trang admin kem thong bao, thay vi hien mot trang JSON tro tren. */
function backToAdmin(req: NextRequest, params: Record<string, string>) {
  const url = new URL("/admin", req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return Response.redirect(url, 302);
}

export async function GET(req: NextRequest) {
  if (!(await quyenAlbumNguyHiem())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 403 });
  }

  const jar = await cookies();
  const expected = jar.get("google_oauth_state")?.value;
  jar.delete("google_oauth_state");

  const state = req.nextUrl.searchParams.get("state");
  const code = req.nextUrl.searchParams.get("code");
  const denied = req.nextUrl.searchParams.get("error");

  if (denied) return backToAdmin(req, { drive: "loi", chitiet: denied });
  if (!expected || state !== expected) {
    return backToAdmin(req, { drive: "loi", chitiet: "Phiên kết nối hết hạn, thử lại." });
  }
  if (!code) return backToAdmin(req, { drive: "loi", chitiet: "Google không trả về mã." });

  /*
    Ket noi nao duoc giau o dau chuoi `state` (xem /api/google/connect). Doc tu
    chuoi DA DOI CHIEU voi cookie o tren, khong doc tu tham so tren dia chi —
    nguoi la sua dia chi thi khong doi duoc chuoi trong cookie.
  */
  const ket: KetNoi = expected.startsWith("kho:") ? "kho" : "default";

  try {
    const account = await saveConnection(code, ket);
    return backToAdmin(req, { drive: "ok", email: account.email, ket });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return backToAdmin(req, { drive: "loi", chitiet: message.slice(0, 200), ket });
  }
}
