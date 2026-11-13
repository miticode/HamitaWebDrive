import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { quyenAlbumNguyHiem } from "@/lib/quyenAlbum";
import { NextRequest } from "next/server";
import { consentUrl, oauthIsConfigured, type KetNoi } from "@/lib/googleAuth";

export const runtime = "nodejs";

/**
 * `?ket=kho` de noi tai khoan Drive thu hai (kho anh CRM); khong truyen gi thi
 * van la ket noi goc nhu truoc.
 *
 * Dia chi quay ve cua Google (`/api/google/callback`) phai khop TUNG KY TU voi
 * cai khai trong Google Cloud Console, nen khong duoc them tham so vao do. Vi
 * vay ket noi nao duoc giau trong chuoi `state` — thu Google tra lai nguyen
 * van — chu khong nam tren dia chi.
 */
export async function GET(req: NextRequest) {
  if (!(await quyenAlbumNguyHiem())) {
    return Response.json({ error: "Chưa đăng nhập quản trị." }, { status: 403 });
  }
  if (!oauthIsConfigured()) {
    return Response.json(
      { error: "Chưa khai báo GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET." },
      { status: 500 }
    );
  }

  const ket: KetNoi = req.nextUrl.searchParams.get("ket") === "kho" ? "kho" : "default";

  // Chuoi ngau nhien de luc Google tra ve, minh biet chac la dung yeu cau minh gui di.
  const state = `${ket}:${randomBytes(16).toString("hex")}`;
  (await cookies()).set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return Response.redirect(consentUrl(state, ket), 302);
}
